// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

// solhint-disable not-rely-on-time

import {ILiquidationFacet} from "../interfaces/ILiquidationFacet.sol";
import {IKreskoAssetIssuer} from "../../kreskoasset/IKreskoAssetIssuer.sol";

import {Arrays} from "../../libs/Arrays.sol";
import {Error} from "../../libs/Errors.sol";
import {LibDecimals, FixedPoint} from "../libs/LibDecimals.sol";
import {LibCalculation} from "../libs/LibCalculation.sol";
import {WadRay} from "../../libs/WadRay.sol";
import {MinterEvent} from "../../libs/Events.sol";

import {SafeERC20Upgradeable, IERC20Upgradeable} from "../../shared/SafeERC20Upgradeable.sol";
import {DiamondModifiers} from "../../shared/Modifiers.sol";

import {Constants, KrAsset, CollateralAsset} from "../MinterTypes.sol";
import {ms, MinterState} from "../MinterStorage.sol";
import {irs} from "../InterestRateState.sol";

/**
 * @author Kresko
 * @title LiquidationFacet
 * @notice Main end-user functionality concerning liquidations within the Kresko protocol
 */
contract LiquidationFacet is DiamondModifiers, ILiquidationFacet {
    using Arrays for address[];
    using LibDecimals for uint8;
    using LibDecimals for FixedPoint.Unsigned;
    using LibDecimals for uint256;
    using WadRay for uint256;
    using FixedPoint for FixedPoint.Unsigned;
    using FixedPoint for uint256;
    using FixedPoint for int256;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    /// @inheritdoc ILiquidationFacet
    function liquidate(
        address _account,
        address _repayAsset,
        uint256 _repayAmount,
        address _seizeAsset,
        uint256 _repayAssetIndex,
        uint256 _seizeAssetIndex
    ) external nonReentrant {
        MinterState storage s = ms();

        CollateralAsset memory collateral = s.collateralAssets[_seizeAsset];
        KrAsset memory krAsset = s.kreskoAssets[_repayAsset];

        {
            // No zero repays
            require(_repayAmount > 0, Error.ZERO_REPAY);
            // Borrower cannot liquidate themselves
            require(msg.sender != _account, Error.SELF_LIQUIDATION);
            // krAsset exists
            require(krAsset.exists, Error.KRASSET_DOESNT_EXIST);
            // Collateral exists
            require(collateral.exists, Error.COLLATERAL_DOESNT_EXIST);
            // Check that this account is below its minimum collateralization ratio and can be liquidated.
            require(s.isAccountLiquidatable(_account), Error.NOT_LIQUIDATABLE);
        }

        // Repay amount USD = repay amount * KR asset USD exchange rate.
        FixedPoint.Unsigned memory repayAmountUSD = krAsset.fixedPointUSD(_repayAmount);

        // Avoid deep stack
        {
            // Get the principal debt amount which is unscaled for interest.
            uint256 krAssetDebt = s.getKreskoAssetDebtPrincipal(_account, _repayAsset);
            // Cannot liquidate more than the account's debt
            require(krAssetDebt >= _repayAmount, Error.KRASSET_BURN_AMOUNT_OVERFLOW);

            // We limit liquidations to exactly Liquidation Threshold here.
            FixedPoint.Unsigned memory maxLiquidableUSD = s.calculateMaxLiquidatableValueForAssets(
                _account,
                krAsset,
                _seizeAsset
            );
            require(repayAmountUSD.isLessThanOrEqual(maxLiquidableUSD), Error.LIQUIDATION_OVERFLOW);
        }

        s.chargeCloseFee(_account, _repayAsset, _repayAmount);

        uint256 seizedAmount = _liquidateAssets(
            ExecutionParams(
                _account,
                _repayAmount,
                collateral.decimals.fromCollateralFixedPointAmount(
                    LibCalculation.calculateAmountToSeize(
                        collateral.liquidationIncentive,
                        collateral.fixedPointPrice(),
                        repayAmountUSD
                    )
                ),
                _repayAsset,
                _repayAssetIndex,
                _seizeAsset,
                _seizeAssetIndex
            )
        );

        // Send liquidator the seized collateral.
        IERC20Upgradeable(_seizeAsset).safeTransfer(msg.sender, seizedAmount);

        emit MinterEvent.LiquidationOccurred(
            _account,
            // solhint-disable-next-line avoid-tx-origin
            tx.origin,
            _repayAsset,
            _repayAmount,
            _seizeAsset,
            seizedAmount
        );
    }

    /// @notice Execute the liquidation
    /// @dev Also updates stability rate and debt index
    function _liquidateAssets(ExecutionParams memory params) internal returns (uint256 seizedAmount) {
        MinterState storage s = ms();

        // Subtract repaid Kresko assets from liquidated user's recorded debt and update debt index + rates.
        {
            // Subtract repaid Kresko assets from liquidated user's recorded debt.
            uint256 destroyed = IKreskoAssetIssuer(s.kreskoAssets[params.repayAsset].anchor).destroy(
                params.repayAmount,
                msg.sender
            );
            s.kreskoAssetDebt[params.account][params.repayAsset] -= destroyed;

            uint256 newDebtIndex = irs().srAssets[params.repayAsset].updateDebtIndex();
            uint256 amountScaled = destroyed.wadToRay().rayDiv(newDebtIndex);

            irs().srUserInfo[params.account][params.repayAsset].debtScaled -= uint128(amountScaled);
            irs().srUserInfo[params.account][params.repayAsset].lastDebtIndex = uint128(newDebtIndex);

            irs().srAssets[params.repayAsset].updateStabilityRate();
        }

        // If the liquidation repays entire asset debt, remove from minted assets array.
        if (s.kreskoAssetDebt[params.account][params.repayAsset] == 0) {
            s.mintedKreskoAssets[params.account].removeAddress(params.repayAsset, params.repayAssetIndex);
        }

        // Updates for collateral deposits and seized amount.
        uint256 collateralDeposits = s.collateralDeposits[params.account][params.seizedAsset];

        // Account has enough collateral deposits
        if (collateralDeposits > params.seizeAmount) {
            s.collateralDeposits[params.account][params.seizedAsset] -= ms()
                .collateralAssets[params.seizedAsset]
                .toNonRebasingAmount(params.seizeAmount);

            return params.seizeAmount; // Passthrough
        }

        /// @dev Unprofitable section. Burning more debt than the collateral deposits available.
        // Remove the collateral deposits.
        s.collateralDeposits[params.account][params.seizedAsset] = 0;
        // Remove from the deposits array.
        s.depositedCollateralAssets[params.account].removeAddress(params.seizedAsset, params.seizedAssetIndex);
        // Seized amount is the collateral deposits.
        return collateralDeposits;
    }

    /// @inheritdoc ILiquidationFacet
    function isAccountLiquidatable(address _account) external view returns (bool) {
        return ms().isAccountLiquidatable(_account);
    }

    /// @inheritdoc ILiquidationFacet
    function calculateMaxLiquidatableValueForAssets(
        address _account,
        address _repayKreskoAsset,
        address _collateralAssetToSeize
    ) public view returns (FixedPoint.Unsigned memory maxLiquidatableUSD) {
        return
            ms().calculateMaxLiquidatableValueForAssets(
                _account,
                ms().kreskoAssets[_repayKreskoAsset],
                _collateralAssetToSeize
            );
    }
}
