// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {SafeERC20Permit} from "vendor/SafeERC20Permit.sol";
import {IERC20Permit} from "vendor/IERC20Permit.sol";
import {WadRay} from "libs/WadRay.sol";
import {PercentageMath} from "libs/PercentageMath.sol";

import {CError} from "common/CError.sol";
import {burnSCDP} from "common/funcs/Actions.sol";
import {fromWad, valueToAmount} from "common/funcs/Math.sol";
import {CModifiers} from "common/Modifiers.sol";
import {cs} from "common/State.sol";
import {Asset, MaxLiqInfo} from "common/Types.sol";
import {SEvent} from "scdp/Events.sol";

import {SCDPAssetData} from "scdp/Types.sol";
import {ISCDPFacet} from "scdp/interfaces/ISCDPFacet.sol";
import {scdp, sdi, SCDPState} from "scdp/State.sol";

using PercentageMath for uint256;
using PercentageMath for uint16;
using SafeERC20Permit for IERC20Permit;
using WadRay for uint256;

contract SCDPFacet is ISCDPFacet, CModifiers {
    /// @inheritdoc ISCDPFacet
    function depositSCDP(
        address _account,
        address _collateralAsset,
        uint256 _amount
    ) external isSCDPDepositAsset(_collateralAsset) nonReentrant {
        // Transfer tokens into this contract prior to any state changes as an extra measure against re-entrancy.
        IERC20Permit(_collateralAsset).safeTransferFrom(msg.sender, address(this), _amount);

        // Record the collateral deposit.
        scdp().handleDepositSCDP(_account, _collateralAsset, _amount);

        emit SEvent.SCDPDeposit(_account, _collateralAsset, _amount);
    }

    /// @inheritdoc ISCDPFacet
    function withdrawSCDP(address _account, address _collateralAsset, uint256 _amount) external nonReentrant {
        SCDPState storage s = scdp();
        // When principal deposits are less or equal to requested amount. We send full deposit + fees in this case.
        (uint256 collateralOut, uint256 feesOut) = s.handleWithdrawSCDP(msg.sender, _collateralAsset, _amount);

        // ensure that global pool is left with CR over MCR.
        s.checkCollateralValue(s.minCollateralRatio);

        // Send out the collateral.
        IERC20Permit(_collateralAsset).safeTransfer(_account, collateralOut + feesOut);

        // Emit event.
        emit SEvent.SCDPWithdraw(_account, _collateralAsset, collateralOut, feesOut);
    }

    /// @inheritdoc ISCDPFacet
    function repaySCDP(address _repayAssetAddr, uint256 _repayAmount, address _seizeAssetAddr) external nonReentrant {
        if (_repayAmount == 0) {
            revert CError.ZERO_REPAY(_repayAssetAddr);
        }
        SCDPState storage s = scdp();
        SCDPAssetData storage repayAssetData = s.assetData[_repayAssetAddr];

        if (_repayAmount > repayAssetData.debt) {
            revert CError.REPAY_OVERFLOW(_repayAmount, repayAssetData.debt);
        }

        Asset storage krAsset = cs().assets[_repayAssetAddr];
        Asset storage seizeAsset = cs().assets[_seizeAssetAddr];

        uint256 seizedAmount = krAsset.uintUSD(_repayAmount).wadDiv(seizeAsset.price());
        if (seizedAmount > repayAssetData.swapDeposits) {
            revert CError.REPAY_TOO_MUCH(seizedAmount, repayAssetData.swapDeposits);
        }

        repayAssetData.debt -= burnSCDP(krAsset, _repayAmount, msg.sender);

        uint128 seizedAmountInternal = uint128(seizeAsset.toNonRebasingAmount(seizedAmount));
        s.assetData[_seizeAssetAddr].swapDeposits -= seizedAmountInternal;
        s.assetData[_seizeAssetAddr].totalDeposits -= seizedAmountInternal;

        IERC20Permit(_seizeAssetAddr).safeTransfer(msg.sender, seizedAmount);
        // solhint-disable-next-line avoid-tx-origin
        emit SEvent.SCDPRepay(tx.origin, _repayAssetAddr, _repayAmount, _seizeAssetAddr, seizedAmount);
    }

    function getLiquidatableSCDP() external view returns (bool) {
        return scdp().totalCollateralValueSCDP(false) < sdi().effectiveDebtValue().percentMul(scdp().liquidationThreshold);
    }

    function getMaxLiqValueSCDP(address _repayAssetAddr, address _seizeAssetAddr) external view returns (MaxLiqInfo memory) {
        Asset storage seizeAsset = cs().assets[_seizeAssetAddr];
        Asset storage repayAsset = cs().assets[_repayAssetAddr];
        uint256 maxLiqValue = _getMaxLiqValue(repayAsset, seizeAsset, _seizeAssetAddr);
        uint256 seizeAssetPrice = seizeAsset.price();
        uint256 repayAssetPrice = repayAsset.price();
        uint256 seizeAmount = fromWad(
            seizeAsset.decimals,
            valueToAmount(repayAsset.liqIncentiveSCDP, seizeAssetPrice, maxLiqValue)
        );
        return
            MaxLiqInfo({
                account: address(0),
                repayValue: maxLiqValue,
                repayAssetAddr: _repayAssetAddr,
                repayAmount: maxLiqValue.wadDiv(repayAssetPrice),
                repayAssetIndex: 0,
                repayAssetPrice: repayAssetPrice,
                seizeAssetAddr: _seizeAssetAddr,
                seizeAmount: seizeAmount,
                seizeValue: seizeAmount.wadMul(seizeAssetPrice),
                seizeAssetPrice: seizeAssetPrice,
                seizeAssetIndex: 0
            });
    }

    /// @inheritdoc ISCDPFacet
    function liquidateSCDP(address _repayAssetAddr, uint256 _repayAmount, address _seizeAssetAddr) external nonReentrant {
        if (_repayAmount == 0) {
            revert CError.ZERO_REPAY(_repayAssetAddr);
        }

        SCDPState storage s = scdp();
        SCDPAssetData storage repayAssetData = s.assetData[_repayAssetAddr];

        if (_repayAmount > repayAssetData.debt) revert CError.LIQ_AMOUNT_OVERFLOW(_repayAmount, repayAssetData.debt);
        s.checkLiquidatableSCDP();

        Asset storage krAsset = cs().assets[_repayAssetAddr];
        Asset storage seizeAsset = cs().assets[_seizeAssetAddr];

        uint256 repayValue = _getMaxLiqValue(krAsset, seizeAsset, _seizeAssetAddr);

        // Possibly clamped values
        (repayValue, _repayAmount) = krAsset.ensureRepayValue(repayValue, _repayAmount);

        uint256 seizedAmount = fromWad(
            seizeAsset.decimals,
            valueToAmount(krAsset.liqIncentiveSCDP, seizeAsset.price(), repayValue)
        );

        s.assetData[_repayAssetAddr].debt -= burnSCDP(krAsset, _repayAmount, msg.sender);
        s.handleSeizeSCDP(_seizeAssetAddr, seizeAsset, seizedAmount);

        IERC20Permit(_seizeAssetAddr).safeTransfer(msg.sender, seizedAmount);

        emit SEvent.SCDPLiquidationOccured(
            // solhint-disable-next-line avoid-tx-origin
            tx.origin,
            _repayAssetAddr,
            _repayAmount,
            _seizeAssetAddr,
            seizedAmount
        );
    }

    function _getMaxLiqValue(
        Asset storage _repayAsset,
        Asset storage _seizeAsset,
        address _seizeAssetAddr
    ) internal view returns (uint256 maxLiquidatableUSD) {
        uint32 maxLiquidationRatio = scdp().maxLiquidationRatio;
        (uint256 totalCollateralValue, uint256 seizeAssetValue) = scdp().totalCollateralValueSCDP(_seizeAssetAddr, false);
        return
            _calcMaxLiqValue(
                _repayAsset,
                _seizeAsset,
                sdi().effectiveDebtValue().percentMul(maxLiquidationRatio),
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
        uint256 seizeReductionPct = _repayAsset.liqIncentiveSCDP.percentMul(_seizeAsset.factor);
        // Calculate adjusted seized asset value
        _seizeAssetValue = _seizeAssetValue.percentDiv(seizeReductionPct);
        // Substract reductions from gains to get liquidation factor
        uint256 liquidationFactor = _repayAsset.kFactor.percentMul(_maxLiquidationRatio) - seizeReductionPct;
        // Calculate maximum liquidation value
        uint256 maxLiquidationValue = (_minCollateralValue - _totalCollateralValue).percentDiv(liquidationFactor);
        // Clamped to minimum debt value
        if (_minDebtValue > maxLiquidationValue) return _minDebtValue;
        // Maximum value possible for the seize asset
        return maxLiquidationValue < _seizeAssetValue ? maxLiquidationValue : _seizeAssetValue;
    }
}

// function calculateMLV(
//     Asset storage _repayAsset,
//     Asset storage _seizeAsset,
//     uint256 _minCollateralValue,
//     uint256 _totalCollateralValue,
//     uint32 _maxLiquidationRatio
// ) view returns (uint256) {
//     uint256 surplusPerUSDRepaid = _repayAsset.kFactor.percentMul(_maxLiquidationRatio) -
//         _repayAsset.liqIncentiveSCDP.percentMul(_seizeAsset.factor);

//     return (_minCollateralValue - _totalCollateralValue).percentDiv(surplusPerUSDRepaid);
// }
