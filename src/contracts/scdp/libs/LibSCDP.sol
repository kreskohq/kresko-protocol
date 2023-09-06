// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {SafeERC20, IERC20Permit} from "common/SafeERC20.sol";
import {WadRay} from "common/libs/WadRay.sol";
import {ms, LibDecimals, CollateralAsset} from "minter/libs/LibMinter.sol";
import {sdi} from "./LibSDI.sol";

/* solhint-disable not-rely-on-time */
/* solhint-disable var-name-mixedcase */

// Storage layout
struct SCDPState {
    /// @notice The minimum ratio of collateral to debt that can be taken by direct action.
    uint256 minimumCollateralizationRatio;
    /// @notice The collateralization ratio at which positions may be liquidated.
    uint256 liquidationThreshold;
    /// @notice Mapping of krAsset -> pooled debt
    mapping(address => uint256) debt;
    /// @notice Mapping of collateral -> pooled deposits
    mapping(address => uint256) totalDeposits;
    /// @notice Mapping of asset -> swap owned collateral deposits
    mapping(address => uint256) swapDeposits;
    /// @notice Mapping of account -> collateral -> collateral deposits.
    mapping(address => mapping(address => uint256)) deposits;
    /// @notice Mapping of account -> collateral -> principal collateral deposits.
    mapping(address => mapping(address => uint256)) depositsPrincipal;
    /// @notice Mapping of collateral -> PoolCollateral
    mapping(address => PoolCollateral) poolCollateral;
    /// @notice Mapping of krAsset -> PoolKreskoAsset
    mapping(address => PoolKrAsset) poolKrAsset;
    /// @notice Mapping of asset -> asset -> swap enabled
    mapping(address => mapping(address => bool)) isSwapEnabled;
    /// @notice Mapping of asset -> enabled
    mapping(address => bool) isEnabled;
    /// @notice Array of collateral assets that can be deposited
    address[] collaterals;
    /// @notice Array of kresko assets that can be minted and swapped.
    address[] krAssets;
    /// @notice User swap fee receiver
    address swapFeeRecipient;
    /// @notice Liquidation Overflow Multiplier, multiplies max liquidatable value.
    uint256 maxLiquidationMultiplier;
    address feeAsset;
}

// Storage position
bytes32 constant SCDP_STORAGE_POSITION = keccak256("kresko.scdp.storage");

// solhint-disable func-visibility
function scdp() pure returns (SCDPState storage state) {
    bytes32 position = SCDP_STORAGE_POSITION;
    assembly {
        state.slot := position
    }
}

using LibSCDP for SCDPState global;
using LibAmounts for SCDPState global;
using LibSwap for SCDPState global;

struct PoolCollateral {
    uint128 liquidityIndex;
    uint256 depositLimit;
    uint8 decimals;
}

struct PoolKrAsset {
    uint256 liquidationIncentive;
    uint256 protocolFee; // Taken from the open+close fee. Goes to protocol.
    uint256 openFee;
    uint256 closeFee;
    uint256 supplyLimit;
}

/**
 * @author Kresko
 * @title Internal functions for SCDP
 */
library LibSCDP {
    using WadRay for uint256;
    using WadRay for uint128;
    using LibAmounts for SCDPState;
    using LibSCDP for SCDPState;
    using LibDecimals for uint8;

    /**
     * @notice Records a deposit of collateral asset.
     * @dev Saves principal, scaled and global deposit amounts.
     * @param _account depositor
     * @param _collateralAsset the collateral asset
     * @param _depositAmount amount of collateral asset to deposit
     */
    function recordCollateralDeposit(
        SCDPState storage self,
        address _account,
        address _collateralAsset,
        uint256 _depositAmount
    ) internal {
        require(self.isEnabled[_collateralAsset], "asset-disabled");
        uint256 depositAmount = LibAmounts.getCollateralAmountWrite(_collateralAsset, _depositAmount);

        unchecked {
            // Save global deposits.
            self.totalDeposits[_collateralAsset] += depositAmount;
            // Save principal deposits.
            self.depositsPrincipal[_account][_collateralAsset] += depositAmount;
            // Save scaled deposits.
            self.deposits[_account][_collateralAsset] += depositAmount.wadToRay().rayDiv(
                self.poolCollateral[_collateralAsset].liquidityIndex
            );
        }

        require(
            self.totalDeposits[_collateralAsset] <= self.poolCollateral[_collateralAsset].depositLimit,
            "deposit-limit"
        );
    }

    /**
     * @notice Records a withdrawal of collateral asset.
     * @param self Collateral Pool State
     * @param _account withdrawer
     * @param _collateralAsset collateral asset
     * @param collateralOut The actual amount of collateral withdrawn
     */
    function recordCollateralWithdrawal(
        SCDPState storage self,
        address _account,
        address _collateralAsset,
        uint256 _amount
    ) internal returns (uint256 collateralOut, uint256 feesOut) {
        // Do not check for isEnabled, always allow withdrawals.

        // Get accounts principal deposits.
        uint256 depositsPrincipal = self.getAccountPrincipalDeposits(_account, _collateralAsset);

        if (depositsPrincipal >= _amount) {
            // == Principal can cover possibly rebased `_amount` requested.
            // 1. We send out the requested amount.
            collateralOut = _amount;
            // 2. No fees.
            // 3. Possibly un-rebased amount for internal bookeeping.
            uint256 withdrawAmountInternal = LibAmounts.getCollateralAmountWrite(_collateralAsset, _amount);
            unchecked {
                // 4. Reduce global deposits.
                self.totalDeposits[_collateralAsset] -= withdrawAmountInternal;
                // 5. Reduce principal deposits.
                self.depositsPrincipal[_account][_collateralAsset] -= withdrawAmountInternal;
                // 6. Reduce scaled deposits.
                self.deposits[_account][_collateralAsset] -= withdrawAmountInternal.wadToRay().rayDiv(
                    self.poolCollateral[_collateralAsset].liquidityIndex
                );
            }
        } else {
            // == Principal can't cover possibly rebased `_amount` requested, send full collateral available.
            // 1. We send all collateral.
            collateralOut = depositsPrincipal;
            // 2. With fees.
            feesOut = self.getAccountDepositsWithFees(_account, _collateralAsset) - depositsPrincipal;
            // 3. Ensure this is actually the case.
            require(feesOut > 0, "withdrawal-violation");
            // 4. Wipe account collateral deposits.
            self.depositsPrincipal[_account][_collateralAsset] = 0;
            self.deposits[_account][_collateralAsset] = 0;
            // 5. Reduce global by ONLY by the principal, fees are not collateral.
            self.totalDeposits[_collateralAsset] -= LibAmounts.getCollateralAmountWrite(
                _collateralAsset,
                depositsPrincipal
            );
        }
    }

    /**
     * @notice Checks whether the collateral ratio is equal to or above to ratio supplied.
     * @param self Collateral Pool State
     * @param _collateralRatio ratio to check
     */
    function checkRatioWithdrawal(SCDPState storage self, uint256 _collateralRatio) internal view returns (bool) {
        return
            self.getTotalPoolDepositValue(
                false // dont ignore cFactor
            ) >= self.getTotalPoolKrAssetValueAtRatio(_collateralRatio, false); // dont ignore kFactors or MCR;
    }

    /**
     * @notice Checks whether the collateral ratio is equal to or above to ratio supplied.
     * @param self Collateral Pool State
     * @param _collateralRatio ratio to check
     */
    function checkRatio(SCDPState storage self, uint256 _collateralRatio) internal view returns (bool) {
        return
            self.getTotalPoolDepositValue(
                false // dont ignore cFactor
            ) >= sdi().effectiveDebtUSD().wadMul(_collateralRatio);
    }

    /**
     * @notice Checks whether the shared debt pool can be liquidated.
     * @param self Collateral Pool State
     */
    function isLiquidatable(SCDPState storage self) internal view returns (bool) {
        return !self.checkRatio(self.liquidationThreshold);
    }

    /* -------------------------------------------------------------------------- */
    /*                             Value Calculations                             */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Returns the value of the krAsset held in the pool at a ratio.
     * @param self Collateral Pool State
     * @param _ratio ratio
     * @param _ignorekFactor ignore kFactor
     * @return value in USD
     */
    function getTotalPoolKrAssetValueAtRatio(
        SCDPState storage self,
        uint256 _ratio,
        bool _ignorekFactor
    ) internal view returns (uint256 value) {
        address[] memory assets = self.krAssets;
        for (uint256 i; i < assets.length; ) {
            address asset = assets[i];
            value += ms().getKrAssetValue(asset, ms().getKreskoAssetAmount(asset, self.debt[asset]), _ignorekFactor);
            unchecked {
                i++;
            }
        }

        // We dont need to multiply this.
        if (_ratio == 1 ether) {
            return value;
        }

        return value.wadMul(_ratio);
    }

    /**
     * @notice Calculates the total collateral value of collateral assets in the pool.
     * @param self Collateral Pool State
     * @param _ignoreFactors whether to ignore factors
     * @return value in USD
     */
    function getTotalPoolDepositValue(
        SCDPState storage self,
        bool _ignoreFactors
    ) internal view returns (uint256 value) {
        address[] memory assets = self.collaterals;
        for (uint256 i; i < assets.length; ) {
            address asset = assets[i];
            (uint256 assetValue, ) = ms().getCollateralValueAndOraclePrice(
                asset,
                self.getPoolDeposits(asset),
                _ignoreFactors
            );
            value += assetValue;

            unchecked {
                i++;
            }
        }
    }

    /**
     * @notice Returns the value of the collateral asset in the pool and the value of the amount.
     * Saves gas for getting the values in the same execution.
     * @param _collateralAsset collateral asset
     * @param _amount amount of collateral asset
     * @param _ignoreFactors whether to ignore cFactor and kFactor
     */
    function getTotalPoolDepositValue(
        SCDPState storage self,
        address _collateralAsset,
        uint256 _amount,
        bool _ignoreFactors
    ) internal view returns (uint256 totalValue, uint256 amountValue) {
        address[] memory assets = self.collaterals;
        for (uint256 i; i < assets.length; ) {
            address asset = assets[i];
            (uint256 assetValue, uint256 price) = ms().getCollateralValueAndOraclePrice(
                asset,
                self.getPoolDeposits(asset),
                _ignoreFactors
            );

            totalValue += assetValue;
            if (asset == _collateralAsset) {
                CollateralAsset memory collateral = ms().collateralAssets[_collateralAsset];
                amountValue = collateral.decimals.toWad(_amount).wadMul(
                    _ignoreFactors ? price : price.wadMul(collateral.factor)
                );
            }

            unchecked {
                i++;
            }
        }
    }

    /**
     * @notice Returns the value of the collateral assets in the pool for `_account`.
     * @param _account account
     * @param _ignoreFactors whether to ignore cFactor and kFactor
     */
    function getAccountTotalDepositValuePrincipal(
        SCDPState storage self,
        address _account,
        bool _ignoreFactors
    ) internal view returns (uint256 totalValue) {
        address[] memory assets = self.collaterals;
        for (uint256 i; i < assets.length; ) {
            address asset = assets[i];
            (uint256 assetValue, ) = ms().getCollateralValueAndOraclePrice(
                asset,
                self.getAccountPrincipalDeposits(_account, asset),
                _ignoreFactors
            );

            totalValue += assetValue;

            unchecked {
                i++;
            }
        }
    }

    /**
     * @notice Returns the value of the collateral assets in the pool for `_account` with fees.
     * @notice Ignores all factors.
     * @param _account account
     */
    function getAccountTotalDepositValueWithFees(
        SCDPState storage self,
        address _account
    ) internal view returns (uint256 totalValue) {
        address[] memory assets = self.collaterals;
        for (uint256 i; i < assets.length; ) {
            address asset = assets[i];
            (uint256 assetValue, ) = ms().getCollateralValueAndOraclePrice(
                asset,
                self.getAccountDepositsWithFees(_account, asset),
                true
            );

            totalValue += assetValue;

            unchecked {
                i++;
            }
        }
    }

    /// @notice This function seizes collateral from the shared pool
    /// @notice Adjusts all deposits in the case where swap deposits do not cover the amount.
    function adjustSeizedCollateral(SCDPState storage self, address _seizeAsset, uint256 _seizeAmount) internal {
        uint256 swapDeposits = self.getPoolSwapDeposits(_seizeAsset); // current "swap" collateral

        if (swapDeposits >= _seizeAmount) {
            uint256 amountOutInternal = LibAmounts.getCollateralAmountWrite(_seizeAsset, _seizeAmount);
            // swap deposits cover the amount
            self.swapDeposits[_seizeAsset] -= amountOutInternal;
            self.totalDeposits[_seizeAsset] -= amountOutInternal;
        } else {
            // swap deposits do not cover the amount
            uint256 amountToCover = _seizeAmount - swapDeposits;
            // reduce everyones deposits by the same ratio
            self.poolCollateral[_seizeAsset].liquidityIndex -= uint128(
                amountToCover.wadToRay().rayDiv(self.getUserPoolDeposits(_seizeAsset).wadToRay())
            );
            self.swapDeposits[_seizeAsset] = 0;
            self.totalDeposits[_seizeAsset] -= LibAmounts.getCollateralAmountWrite(_seizeAsset, amountToCover);
        }
    }
}

library LibAmounts {
    using WadRay for uint256;
    using WadRay for uint128;
    using LibAmounts for SCDPState;

    /**
     * @notice Get accounts interested scaled debt amount for a KreskoAsset.
     * @param _asset The asset address
     * @param _account The account to get the amount for
     * @return Amount of scaled debt.
     */
    function getAccountDepositsWithFees(
        SCDPState storage self,
        address _account,
        address _asset
    ) internal view returns (uint256) {
        uint256 deposits = getCollateralAmountRead(_asset, self.deposits[_account][_asset]);
        if (deposits == 0) {
            return 0;
        }
        return deposits.rayMul(self.poolCollateral[_asset].liquidityIndex).rayToWad();
    }

    /**
     * @notice Get accounts principle collateral deposits.
     * @param _account The account to get the amount for
     * @param _collateralAsset The collateral asset address
     * @return Amount of scaled debt.
     */
    function getAccountPrincipalDeposits(
        SCDPState storage self,
        address _account,
        address _collateralAsset
    ) internal view returns (uint256) {
        uint256 deposits = self.getAccountDepositsWithFees(_account, _collateralAsset);
        uint256 depositsPrincipal = getCollateralAmountRead(
            _collateralAsset,
            self.depositsPrincipal[_account][_collateralAsset]
        );

        if (deposits == 0) {
            return 0;
        } else if (deposits < depositsPrincipal) {
            return deposits;
        }
        return depositsPrincipal;
    }

    /**
     * @notice Get pool collateral deposits of an asset.
     * @param _asset The asset address
     * @return Amount of scaled debt.
     */
    function getPoolDeposits(SCDPState storage self, address _asset) internal view returns (uint256) {
        return getCollateralAmountRead(_asset, self.totalDeposits[_asset]);
    }

    /**
     * @notice Get pool user collateral deposits of an asset.
     * @param _asset The asset address
     * @return Amount of scaled debt.
     */
    function getUserPoolDeposits(SCDPState storage self, address _asset) internal view returns (uint256) {
        return getCollateralAmountRead(_asset, self.totalDeposits[_asset] - self.swapDeposits[_asset]);
    }

    /**
     * @notice Get "swap" collateral deposits.
     * @param _asset The asset address
     * @return Amount of debt.
     */
    function getPoolSwapDeposits(SCDPState storage self, address _asset) internal view returns (uint256) {
        return getCollateralAmountRead(_asset, self.swapDeposits[_asset]);
    }

    /**
     * @notice Get collateral asset amount for saving, it will be unrebased if the asset is a KreskoAsset
     * @param _asset The asset address
     * @param _amount The asset amount
     * @return possiblyUnrebasedAmount The possibly unrebased amount
     */
    function getCollateralAmountWrite(
        address _asset,
        uint256 _amount
    ) internal view returns (uint256 possiblyUnrebasedAmount) {
        return ms().collateralAssets[_asset].toNonRebasingAmount(_amount);
    }

    /**
     * @notice Get collateral asset amount for viewing, since if the asset is a KreskoAsset, it can be rebased.
     * @param _asset The asset address
     * @param _amount The asset amount
     * @return possiblyRebasedAmount amount of collateral for `_asset`
     */
    function getCollateralAmountRead(
        address _asset,
        uint256 _amount
    ) internal view returns (uint256 possiblyRebasedAmount) {
        return ms().collateralAssets[_asset].toRebasingAmount(_amount);
    }
}

/**
 * @author Kresko
 * @title Internal functions for shared collateral pool.
 */
library LibSwap {
    using WadRay for uint256;
    using WadRay for uint128;
    using SafeERC20 for IERC20Permit;

    /**
     * @notice Check that assets can be swapped.
     * @return feePercentage fee percentage for this swap
     */
    function checkAssets(
        SCDPState storage self,
        address _assetIn,
        address _assetOut
    ) internal view returns (uint256 feePercentage, uint256 protocolFee) {
        require(self.isSwapEnabled[_assetIn][_assetOut], "swap-disabled");
        require(self.isEnabled[_assetIn], "asset-in-disabled");
        require(self.isEnabled[_assetOut], "asset-out-disabled");
        require(_assetIn != _assetOut, "same-asset");
        PoolKrAsset memory assetIn = self.poolKrAsset[_assetIn];
        PoolKrAsset memory assetOut = self.poolKrAsset[_assetOut];

        feePercentage = assetOut.openFee + assetIn.closeFee;
        protocolFee = assetIn.protocolFee + assetOut.protocolFee;
    }

    /**
     * @notice Records the assets received from account in a swap.
     * Burning any existing shared debt or increasing collateral deposits.
     * @param _assetIn The asset received.
     * @param _amountIn The amount of the asset received.
     * @param _assetsFrom The account that holds the assets to burn.
     * @return valueIn The value of the assets received into the protocol, used to calculate assets out.
     */
    function handleAssetsIn(
        SCDPState storage self,
        address _assetIn,
        uint256 _amountIn,
        address _assetsFrom
    ) internal returns (uint256 valueIn) {
        uint256 debt = ms().getKreskoAssetAmount(_assetIn, self.debt[_assetIn]);
        valueIn = ms().getKrAssetValue(_assetIn, _amountIn, true); // ignore kFactor here

        uint256 collateralIn; // assets used increase "swap" owned collateral
        uint256 debtOut; // assets used to burn debt

        // Bookkeeping
        if (debt >= _amountIn) {
            // == Debt is greater than the amount.
            // 1. Burn full amount received.
            debtOut = _amountIn;
            // 2. No increase in collateral.
        } else {
            // == Debt is less than the amount received.
            // 1. Burn full debt.
            debtOut = debt;
            // 2. Increase collateral by remainder.
            collateralIn = _amountIn - debt;
        }
        // else {
        //     // == Debt is 0.
        //     // 1. Burn nothing.
        //     // 2. Increase collateral by full amount.
        //     collateralIn = _amountIn;
        // }

        if (collateralIn > 0) {
            uint256 collateralInInternal = LibAmounts.getCollateralAmountWrite(_assetIn, collateralIn);
            // 1. Increase collateral deposits.
            self.totalDeposits[_assetIn] += collateralInInternal;
            // 2. Increase "swap" collateral.
            self.swapDeposits[_assetIn] += collateralInInternal;
        }

        if (debtOut > 0) {
            // 1. Burn debt that was repaid from the assets received.
            self.debt[_assetIn] -= ms().repaySwap(_assetIn, debtOut, _assetsFrom);
        }

        assert(_amountIn == debtOut + collateralIn);
    }

    /**
     * @notice Records the assets to send out in a swap.
     * Increasing debt of the pool by minting new assets when required.
     * @param _assetOut The asset to send out.
     * @param _valueIn The value received in.
     * @param _assetsTo The asset receiver.
     * @return amountOut The amount of the asset out.
     */
    function handleAssetsOut(
        SCDPState storage self,
        address _assetOut,
        uint256 _valueIn,
        address _assetsTo
    ) internal returns (uint256 amountOut) {
        // Calculate amount to send out from value received in.
        amountOut = _valueIn.wadDiv(ms().kreskoAssets[_assetOut].uintPrice(ms().oracleDeviationPct));
        // Well, should be more than 0.
        require(amountOut > 0, "amount-out-is-zero");

        uint256 swapDeposits = self.getPoolSwapDeposits(_assetOut); // current "swap" collateral

        uint256 collateralOut; // decrease in "swap" collateral
        uint256 debtIn; // new debt required to mint

        // Bookkeeping
        if (swapDeposits >= amountOut) {
            // == "Swap" owned collateral exceeds requested amount
            // 1. No debt issued.
            // 2. Decrease collateral by full amount.
            collateralOut = amountOut;
        } else {
            // == "Swap" owned collateral is less than requested amount.
            // 1. Issue debt for remainder.
            debtIn = amountOut - swapDeposits;
            // 2. Reduce "swap" owned collateral to zero.
            collateralOut = swapDeposits;
        }

        if (collateralOut > 0) {
            uint256 amountOutInternal = LibAmounts.getCollateralAmountWrite(_assetOut, collateralOut);
            // 1. Decrease collateral deposits.
            self.totalDeposits[_assetOut] -= amountOutInternal;
            // 2. Decrease "swap" owned collateral.
            self.swapDeposits[_assetOut] -= amountOutInternal;
            if (_assetsTo != address(this)) {
                // 3. Transfer collateral to receiver if it is not this contract.
                IERC20Permit(_assetOut).safeTransfer(_assetsTo, collateralOut);
            }
        }

        if (debtIn > 0) {
            // 1. Issue required debt to the pool, minting new assets to receiver.
            self.debt[_assetOut] += ms().mintSwap(_assetOut, debtIn, _assetsTo);
        }

        assert(amountOut == debtIn + collateralOut);
    }

    /**
     * @notice Accumulates fees to deposits as a fixed, instantaneous income.
     * @param _collateralAsset asset
     * @param _amount amount to accumulate
     * @return nextLiquidityIndex The next liquidity index of the reserve
     */
    function cumulateIncome(
        SCDPState storage self,
        address _collateralAsset,
        uint256 _amount
    ) internal returns (uint256 nextLiquidityIndex) {
        require(_amount != 0, "amount-zero");
        uint256 poolDeposits = self.getPoolDeposits(_collateralAsset);
        require(poolDeposits != 0, "no-deposits");
        // liquidity index increment is calculated this way: `(amount / totalLiquidity)`
        // division `amount / totalLiquidity` done in ray for precision

        return (self.poolCollateral[_collateralAsset].liquidityIndex += uint128(
            (_amount.wadToRay().rayDiv(poolDeposits.wadToRay()))
        ));
    }
}
