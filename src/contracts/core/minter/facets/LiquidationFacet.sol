// SPDX-License-Identifier: BUSL-1.1

pragma solidity >=0.8.19;

import {IERC20Permit} from "vendor/IERC20Permit.sol";
import {SafeERC20Permit} from "vendor/SafeERC20Permit.sol";
import {Arrays} from "libs/Arrays.sol";
import {WadRay} from "libs/WadRay.sol";
import {PercentageMath} from "libs/PercentageMath.sol";

import {IKreskoAssetIssuer} from "kresko-asset/IKreskoAssetIssuer.sol";

import {CError} from "common/CError.sol";
import {valueToAmount, fromWad} from "common/funcs/Math.sol";
import {CModifiers} from "common/Modifiers.sol";
import {Asset, MaxLiqInfo} from "common/Types.sol";
import {cs} from "common/State.sol";
import {Constants} from "common/Constants.sol";

import {ILiquidationFacet} from "minter/interfaces/ILiquidationFacet.sol";
import {MEvent} from "minter/Events.sol";
import {ms, MinterState} from "minter/State.sol";
import {handleMinterCloseFee} from "minter/funcs/Fees.sol";

using Arrays for address[];
using WadRay for uint256;
using SafeERC20Permit for IERC20Permit;
using PercentageMath for uint256;
using PercentageMath for uint16;

// solhint-disable code-complexity
/**
 * @author Kresko
 * @title LiquidationFacet
 * @notice Main end-user functionality concerning liquidations within Kresko's Minter system.
 */
contract LiquidationFacet is CModifiers, ILiquidationFacet {
    /// @inheritdoc ILiquidationFacet
    function liquidate(
        address _account,
        address _repayAssetAddr,
        uint256 _repayAmount,
        address _seizeAssetAddr,
        uint256 _repayAssetIndex,
        uint256 _seizeAssetIndex
    ) external nonReentrant gate {
        MinterState storage s = ms();

        Asset storage collateral = cs().assets[_seizeAssetAddr];
        Asset storage krAsset = cs().assets[_repayAssetAddr];

        /* ------------------------------ Sanity checks ----------------------------- */
        // No zero repays
        if (_repayAmount == 0) revert CError.ZERO_REPAY(_repayAssetAddr);
        // Borrower cannot liquidate themselves
        else if (msg.sender == _account) revert CError.SELF_LIQUIDATION();
        // krAsset exists
        else if (!krAsset.isKrAsset) revert CError.KRASSET_DOES_NOT_EXIST(_repayAssetAddr);
        // Collateral exists
        else if (!collateral.isCollateral) revert CError.COLLATERAL_DOES_NOT_EXIST(_seizeAssetAddr);
        // The obvious
        s.checkAccountLiquidatable(_account);

        /* -------------------------- Amount & Value Checks ------------------------- */
        uint256 repayValue = _getMaxLiqValue(_account, krAsset, collateral, _seizeAssetAddr);
        // Possibly clamped values
        (repayValue, _repayAmount) = krAsset.ensureRepayValue(repayValue, _repayAmount);

        /* ------------------------------- Charge fee ------------------------------- */
        handleMinterCloseFee(_account, krAsset, _repayAmount);

        /* -------------------------------- Liquidate ------------------------------- */
        ExecutionParams memory params = ExecutionParams(
            _account,
            _repayAmount,
            fromWad(collateral.decimals, valueToAmount(collateral.liqIncentive, collateral.price(), repayValue)),
            _repayAssetAddr,
            _repayAssetIndex,
            _seizeAssetAddr,
            _seizeAssetIndex
        );
        uint256 seizedAmount = _liquidateAssets(collateral, krAsset, params);

        // Send liquidator the seized collateral.
        IERC20Permit(_seizeAssetAddr).safeTransfer(msg.sender, seizedAmount);

        emit MEvent.LiquidationOccurred(
            _account,
            // solhint-disable-next-line avoid-tx-origin
            msg.sender,
            _repayAssetAddr,
            _repayAmount,
            _seizeAssetAddr,
            seizedAmount
        );
    }

    /// @inheritdoc ILiquidationFacet
    function getMaxLiqValue(
        address _account,
        address _repayAssetAddr,
        address _seizeAssetAddr
    ) external view returns (MaxLiqInfo memory) {
        Asset storage seizeAsset = cs().assets[_seizeAssetAddr];
        Asset storage repayAsset = cs().assets[_repayAssetAddr];
        uint256 maxLiqValue = _getMaxLiqValue(_account, repayAsset, seizeAsset, _seizeAssetAddr);
        uint256 seizeAssetPrice = seizeAsset.price();
        uint256 repayAssetPrice = repayAsset.price();
        uint256 seizeAmount = fromWad(
            seizeAsset.decimals,
            valueToAmount(seizeAsset.liqIncentive, seizeAssetPrice, maxLiqValue)
        );
        return
            MaxLiqInfo({
                account: _account,
                repayValue: maxLiqValue,
                repayAssetAddr: _repayAssetAddr,
                repayAmount: maxLiqValue.wadDiv(repayAssetPrice),
                repayAssetIndex: ms().mintedKreskoAssets[_account].find(_repayAssetAddr).index,
                repayAssetPrice: repayAssetPrice,
                seizeAssetAddr: _seizeAssetAddr,
                seizeAmount: seizeAmount,
                seizeValue: seizeAmount.wadMul(seizeAssetPrice),
                seizeAssetPrice: seizeAssetPrice,
                seizeAssetIndex: ms().depositedCollateralAssets[_account].find(_seizeAssetAddr).index
            });
    }

    function _liquidateAssets(
        Asset storage collateral,
        Asset storage krAsset,
        ExecutionParams memory params
    ) internal returns (uint256 seizedAmount) {
        MinterState storage s = ms();

        /* -------------------------------------------------------------------------- */
        /*                                 Reduce debt                                */
        /* -------------------------------------------------------------------------- */
        s.kreskoAssetDebt[params.account][params.repayAssetAddr] -= IKreskoAssetIssuer(krAsset.anchor).destroy(
            params.repayAmount,
            msg.sender
        );

        // If the liquidation repays entire asset debt, remove from minted assets array.
        if (s.accountDebtAmount(params.account, params.repayAssetAddr, krAsset) == 0) {
            s.mintedKreskoAssets[params.account].removeAddress(params.repayAssetAddr, params.repayAssetIndex);
        }

        /* -------------------------------------------------------------------------- */
        /*                              Reduce collateral                             */
        /* -------------------------------------------------------------------------- */
        uint256 collateralDeposits = s.accountCollateralAmount(params.account, params.seizedAssetAddr, collateral);

        /* ------------------------ Above collateral deposits ----------------------- */

        if (collateralDeposits > params.seizeAmount) {
            uint256 newDepositAmount = collateralDeposits - params.seizeAmount;
            // If the collateral asset is also a kresko asset, ensure that collateral remains over minimum amount required.
            if (newDepositAmount < Constants.MIN_KRASSET_COLLATERAL_AMOUNT && collateral.anchor != address(0)) {
                params.seizeAmount -= Constants.MIN_KRASSET_COLLATERAL_AMOUNT - newDepositAmount;
                newDepositAmount = Constants.MIN_KRASSET_COLLATERAL_AMOUNT;
            }

            s.collateralDeposits[params.account][params.seizedAssetAddr] = collateral.toNonRebasingAmount(newDepositAmount);
            return params.seizeAmount;
        } else if (collateralDeposits < params.seizeAmount) {
            revert CError.SEIZE_UNDERFLOW(collateralDeposits, params.seizeAmount);
        }

        /* ------------------- Exact or below collateral deposits ------------------- */
        // Remove the collateral deposits.
        s.collateralDeposits[params.account][params.seizedAssetAddr] = 0;
        // Remove from the deposits array.
        s.depositedCollateralAssets[params.account].removeAddress(params.seizedAssetAddr, params.seizedAssetIndex);
        // Seized amount is the collateral deposits.
        return collateralDeposits;
    }

    function _getMaxLiqValue(
        address _account,
        Asset storage _repayAsset,
        Asset storage _seizeAsset,
        address _seizeAssetAddr
    ) internal view returns (uint256 maxValue) {
        uint32 maxLiquidationRatio = ms().maxLiquidationRatio;
        (uint256 totalCollateralValue, uint256 seizeAssetValue) = ms().accountTotalCollateralValue(_account, _seizeAssetAddr);

        return
            _calcMaxLiqValue(
                _repayAsset,
                _seizeAsset,
                ms().accountMinCollateralAtRatio(_account, maxLiquidationRatio),
                totalCollateralValue,
                seizeAssetValue,
                cs().minDebtValue,
                maxLiquidationRatio
            );
    }

    function _calcMaxLiqValue(
        Asset storage _repayAsset,
        Asset storage _seizeAsset,
        uint256 _minCollateralValue,
        uint256 _totalCollateralValue,
        uint256 _seizeAssetValue,
        uint96 _minDebtValue,
        uint32 _maxLiquidationRatio
    ) internal view returns (uint256) {
        if (!(_totalCollateralValue < _minCollateralValue)) return 0;
        // Calculate reduction percentage from seizing collateral
        uint256 seizeReductionPct = (_seizeAsset.liqIncentive + _repayAsset.closeFee).percentMul(_seizeAsset.factor);
        // Calculate adjusted seized asset value
        _seizeAssetValue = _seizeAssetValue.percentDiv(seizeReductionPct);
        // Substract reduction from increase to get liquidation factor
        uint256 liquidationFactor = _repayAsset.kFactor.percentMul(_maxLiquidationRatio) - seizeReductionPct;
        // Calculate maximum liquidation value
        uint256 maxLiquidationValue = (_minCollateralValue - _totalCollateralValue).percentDiv(liquidationFactor);
        // Clamped to minimum debt value
        if (_minDebtValue > maxLiquidationValue) return _minDebtValue;
        // Maximum value possible for the seize asset
        return maxLiquidationValue < _seizeAssetValue ? maxLiquidationValue : _seizeAssetValue;
    }
}
