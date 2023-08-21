// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

// solhint-disable not-rely-on-time

import {IKreskoAssetIssuer} from "kresko-asset/IKreskoAssetIssuer.sol";

import {Arrays} from "common/libs/Arrays.sol";
import {WadRay} from "common/libs/WadRay.sol";
import {Error} from "common/Errors.sol";
import {MinterEvent} from "common/Events.sol";
import {SafeERC20, IERC20Permit} from "common/SafeERC20.sol";

import {LibDecimals} from "minter/libs/LibDecimals.sol";
import {LibCalculation} from "minter/libs/LibCalculation.sol";
import {ILiquidationFacet} from "minter/interfaces/ILiquidationFacet.sol";

import {DiamondModifiers} from "diamond/DiamondModifiers.sol";

import {Constants, KrAsset, CollateralAsset} from "../MinterTypes.sol";
import {ms, MinterState} from "../MinterStorage.sol";

/**
 * @author Kresko
 * @title LiquidationFacet
 * @notice Main end-user functionality concerning liquidations within the Kresko protocol
 */
contract LiquidationFacet is DiamondModifiers, ILiquidationFacet {
    using Arrays for address[];
    using LibDecimals for uint8;
    using LibDecimals for uint256;
    using WadRay for uint256;
    using SafeERC20 for IERC20Permit;

    /// @inheritdoc ILiquidationFacet
    function liquidate(
        address _account,
        address _repayAsset,
        uint256 _repayAmount,
        address _seizeAsset,
        uint256 _repayAssetIndex,
        uint256 _seizeAssetIndex,
        bool _allowSeizeUnderflow
    ) external nonReentrant {
        MinterState storage s = ms();

        CollateralAsset memory collateral = s.collateralAssets[_seizeAsset];
        KrAsset memory krAsset = s.kreskoAssets[_repayAsset];

        /* ------------------------------ Sanity checks ----------------------------- */
        {
            // No zero repays
            require(_repayAmount != 0, Error.ZERO_REPAY);
            // Borrower cannot liquidate themselves
            require(msg.sender != _account, Error.SELF_LIQUIDATION);
            // krAsset exists
            require(krAsset.exists, Error.KRASSET_DOESNT_EXIST);
            // Collateral exists
            require(collateral.exists, Error.COLLATERAL_DOESNT_EXIST);
            // Check that this account is below its minimum collateralization ratio and can be liquidated.
            require(s.isAccountLiquidatable(_account), Error.NOT_LIQUIDATABLE);
        }

        /* ------------------------------ Amount checks ----------------------------- */
        // Repay amount USD = repay amount * KR asset USD exchange rate.
        uint256 repayAmountUSD = krAsset.uintUSD(_repayAmount, s.oracleDeviationPct);

        // Avoid deep stack
        {
            // Get the principal debt amount
            uint256 krAssetDebt = s.getKreskoAssetDebtPrincipal(_account, _repayAsset);

            // Cannot liquidate more than the account's debt
            require(krAssetDebt >= _repayAmount, Error.KRASSET_BURN_AMOUNT_OVERFLOW);

            // We limit liquidations to exactly Liquidation Threshold here.
            uint256 maxLiquidableUSD = s.getMaxLiquidation(_account, krAsset, _seizeAsset);

            if (repayAmountUSD > maxLiquidableUSD) {
                _repayAmount = maxLiquidableUSD.wadDiv(krAsset.uintPrice(s.oracleDeviationPct));
                repayAmountUSD = maxLiquidableUSD;
            }
        }

        /* ------------------------------- Charge fee ------------------------------- */
        s.chargeCloseFee(_account, _repayAsset, _repayAmount);

        /* -------------------------------- Liquidate ------------------------------- */
        uint256 seizedAmount = _liquidateAssets(
            ExecutionParams(
                _account,
                _repayAmount,
                collateral.decimals.fromWad(
                    LibCalculation.calculateAmountToSeize(
                        collateral.liquidationIncentive,
                        collateral.uintPrice(s.oracleDeviationPct),
                        repayAmountUSD
                    )
                ),
                _repayAsset,
                _repayAssetIndex,
                _seizeAsset,
                _seizeAssetIndex,
                _allowSeizeUnderflow
            )
        );

        /* ---------------------------- Balance transfer ---------------------------- */
        // Send liquidator the seized collateral.
        IERC20Permit(_seizeAsset).safeTransfer(msg.sender, seizedAmount);

        emit MinterEvent.LiquidationOccurred(
            _account,
            // solhint-disable-next-line avoid-tx-origin
            msg.sender,
            _repayAsset,
            _repayAmount,
            _seizeAsset,
            seizedAmount
        );
    }

    /// @notice Execute the liquidation
    function _liquidateAssets(ExecutionParams memory params) internal returns (uint256 seizedAmount) {
        MinterState storage s = ms();

        /* -------------------------------------------------------------------------- */
        /*                                 Reduce debt                                */
        /* -------------------------------------------------------------------------- */
        {
            /* ----------------------------- Destroy assets ----------------------------- */
            uint256 destroyed = IKreskoAssetIssuer(s.kreskoAssets[params.repayAsset].anchor).destroy(
                params.repayAmount,
                msg.sender
            );
            s.kreskoAssetDebt[params.account][params.repayAsset] -= destroyed;
        }

        // If the liquidation repays entire asset debt, remove from minted assets array.
        if (s.getKreskoAssetDebtPrincipal(params.account, params.repayAsset) == 0) {
            s.mintedKreskoAssets[params.account].removeAddress(params.repayAsset, params.repayAssetIndex);
        }

        /* -------------------------------------------------------------------------- */
        /*                              Reduce collateral                             */
        /* -------------------------------------------------------------------------- */

        uint256 collateralDeposits = s.getCollateralDeposits(params.account, params.seizedAsset);

        /* ------------------------ Above collateral deposits ----------------------- */

        if (collateralDeposits > params.seizeAmount) {
            uint256 newDepositAmount = collateralDeposits - params.seizeAmount;

            // If the collateral asset is also a kresko asset, ensure that collateral remains over minimum amount required.
            if (
                ms().collateralAssets[params.seizedAsset].anchor != address(0) &&
                newDepositAmount < Constants.MIN_KRASSET_COLLATERAL_AMOUNT
            ) {
                params.seizeAmount -= Constants.MIN_KRASSET_COLLATERAL_AMOUNT - newDepositAmount;
                newDepositAmount = Constants.MIN_KRASSET_COLLATERAL_AMOUNT;
            }

            s.collateralDeposits[params.account][params.seizedAsset] = ms()
                .collateralAssets[params.seizedAsset]
                .toNonRebasingAmount(newDepositAmount);

            return params.seizeAmount;
        } else if (collateralDeposits < params.seizeAmount) {
            require(params.allowSeizeUnderflow, Error.SEIZED_COLLATERAL_UNDERFLOW);
        }

        /* ------------------- Exact or below collateral deposits ------------------- */
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
    function getMaxLiquidation(
        address _account,
        address _repayKreskoAsset,
        address _collateralAssetToSeize
    ) public view returns (uint256 maxLiquidatableUSD) {
        return ms().getMaxLiquidation(_account, ms().kreskoAssets[_repayKreskoAsset], _collateralAssetToSeize);
    }
}
