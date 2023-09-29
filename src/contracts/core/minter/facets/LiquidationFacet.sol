// SPDX-License-Identifier: BUSL-1.1

pragma solidity >=0.8.19;

import {IERC20Permit} from "vendor/IERC20Permit.sol";
import {SafeERC20Permit} from "vendor/SafeERC20Permit.sol";
import {Arrays} from "libs/Arrays.sol";
import {WadRay} from "libs/WadRay.sol";

import {IKreskoAssetIssuer} from "kresko-asset/IKreskoAssetIssuer.sol";

import {CError} from "common/Errors.sol";
import {valueToAmount, fromWad} from "common/funcs/Math.sol";
import {CModifiers} from "common/Modifiers.sol";
import {Asset} from "common/Types.sol";
import {cs} from "common/State.sol";
import {Constants} from "common/Constants.sol";

import {ILiquidationFacet} from "minter/interfaces/ILiquidationFacet.sol";
import {MEvent} from "minter/Events.sol";
import {ms, MinterState} from "minter/State.sol";
import {handleMinterCloseFee} from "minter/funcs/Fees.sol";
import {maxLiquidatableValue} from "minter/funcs/Liquidations.sol";

// solhint-disable code-complexity
/**
 * @author Kresko
 * @title LiquidationFacet
 * @notice Main end-user functionality concerning liquidations within the Kresko protocol
 */
contract LiquidationFacet is CModifiers, ILiquidationFacet {
    using Arrays for address[];
    using WadRay for uint256;
    using SafeERC20Permit for IERC20Permit;

    /// @inheritdoc ILiquidationFacet
    function liquidate(
        address _account,
        address _repayAsset,
        uint256 _repayAmount,
        address _seizeAsset,
        uint256 _repayAssetIndex,
        uint256 _seizeAssetIndex,
        bool _allowSeizeUnderflow
    ) external nonReentrant gate {
        MinterState storage s = ms();

        Asset memory collateral = cs().assets[_seizeAsset];
        Asset memory krAsset = cs().assets[_repayAsset];

        /* ------------------------------ Sanity checks ----------------------------- */
        {
            if (_repayAmount == 0) {
                // No zero repays
                revert CError.ZERO_REPAY();
            } else if (msg.sender == _account) {
                // Borrower cannot liquidate themselves
                revert CError.SELF_LIQUIDATION();
            } else if (!krAsset.isKrAsset) {
                // krAsset exists
                revert CError.KRASSET_DOES_NOT_EXIST(_repayAsset);
            } else if (!collateral.isCollateral) {
                // Collateral exists
                revert CError.COLLATERAL_DOES_NOT_EXIST(_seizeAsset);
            } else if (!s.isAccountLiquidatable(_account)) {
                // Check that this account is below its minimum collateralization ratio and can be liquidated.
                revert CError.CANNOT_LIQUIDATE();
            }
        }

        /* ------------------------------ Amount checks ----------------------------- */
        // Repay amount USD = repay amount * KR asset USD exchange rate.
        uint256 repayAmountUSD = krAsset.uintUSD(_repayAmount);

        // Avoid deep stack
        {
            // Get the principal debt amount
            uint256 krAssetDebt = s.accountDebtAmount(_account, _repayAsset, krAsset);

            // Cannot liquidate more than the account's debt
            if (_repayAmount > krAssetDebt) {
                revert CError.LIQUIDATION_AMOUNT_OVERFLOW(krAssetDebt, _repayAmount);
            }

            // We limit liquidations to exactly Liquidation Threshold here.
            uint256 maxLiquidatableUSD = maxLiquidatableValue(_account, krAsset, collateral, _seizeAsset);

            if (repayAmountUSD > maxLiquidatableUSD) {
                _repayAmount = maxLiquidatableUSD.wadDiv(krAsset.price());
                repayAmountUSD = maxLiquidatableUSD;
            }
        }

        /* ------------------------------- Charge fee ------------------------------- */
        handleMinterCloseFee(_account, krAsset, _repayAmount);

        /* -------------------------------- Liquidate ------------------------------- */
        uint256 seizedAmount = _liquidateAssets(
            ExecutionParams(
                _account,
                _repayAmount,
                fromWad(collateral.decimals, valueToAmount(collateral.liqIncentive, collateral.price(), repayAmountUSD)),
                _repayAsset,
                krAsset,
                _repayAssetIndex,
                _seizeAsset,
                collateral,
                _seizeAssetIndex,
                _allowSeizeUnderflow
            )
        );
        /* ---------------------------- Balance transfer ---------------------------- */
        // Send liquidator the seized collateral.
        IERC20Permit(_seizeAsset).safeTransfer(msg.sender, seizedAmount);

        emit MEvent.LiquidationOccurred(
            _account,
            // solhint-disable-next-line avoid-tx-origin
            msg.sender,
            _repayAsset,
            _repayAmount,
            _seizeAsset,
            seizedAmount
        );
    }

    function _liquidateAssets(ExecutionParams memory params) internal returns (uint256 seizedAmount) {
        MinterState storage s = ms();

        /* -------------------------------------------------------------------------- */
        /*                                 Reduce debt                                */
        /* -------------------------------------------------------------------------- */
        {
            /* ----------------------------- Destroy assets ----------------------------- */
            uint256 destroyed = IKreskoAssetIssuer(params.krAsset.anchor).destroy(params.repayAmount, msg.sender);
            s.kreskoAssetDebt[params.account][params.repayAsset] -= destroyed;
        }

        // If the liquidation repays entire asset debt, remove from minted assets array.
        if (s.accountDebtAmount(params.account, params.repayAsset, params.krAsset) == 0) {
            s.mintedKreskoAssets[params.account].removeAddress(params.repayAsset, params.repayAssetIndex);
        }

        /* -------------------------------------------------------------------------- */
        /*                              Reduce collateral                             */
        /* -------------------------------------------------------------------------- */

        uint256 collateralDeposits = s.accountCollateralAmount(params.account, params.seizedAsset, params.collateral);

        /* ------------------------ Above collateral deposits ----------------------- */

        if (collateralDeposits > params.seizeAmount) {
            uint256 newDepositAmount = collateralDeposits - params.seizeAmount;

            // If the collateral asset is also a kresko asset, ensure that collateral remains over minimum amount required.
            if (newDepositAmount < Constants.MIN_KRASSET_COLLATERAL_AMOUNT && params.collateral.anchor != address(0)) {
                params.seizeAmount -= Constants.MIN_KRASSET_COLLATERAL_AMOUNT - newDepositAmount;
                newDepositAmount = Constants.MIN_KRASSET_COLLATERAL_AMOUNT;
            }

            s.collateralDeposits[params.account][params.seizedAsset] = params.collateral.toNonRebasingAmount(newDepositAmount);

            return params.seizeAmount;
        } else if (collateralDeposits < params.seizeAmount) {
            revert CError.SEIZE_UNDERFLOW(collateralDeposits, params.seizeAmount);
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
    function getMaxLiquidation(
        address _account,
        address _repayKreskoAsset,
        address _collateralAssetToSeize
    ) public view returns (uint256 maxLiquidatableUSD) {
        return
            maxLiquidatableValue(
                _account,
                cs().assets[_repayKreskoAsset],
                cs().assets[_collateralAssetToSeize],
                _collateralAssetToSeize
            );
    }
}
