// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.21;

import {SafeTransfer} from "kresko-lib/token/SafeTransfer.sol";
import {IERC20} from "kresko-lib/token/IERC20.sol";
import {WadRay} from "libs/WadRay.sol";
import {PercentageMath} from "libs/PercentageMath.sol";

import {Errors} from "common/Errors.sol";
import {burnSCDP} from "common/funcs/Actions.sol";
import {fromWad, valueToAmount} from "common/funcs/Math.sol";
import {Modifiers} from "common/Modifiers.sol";
import {cs} from "common/State.sol";
import {Asset, MaxLiqInfo} from "common/Types.sol";

import {SEvent} from "scdp/SEvent.sol";
import {SCDPAssetData} from "scdp/STypes.sol";
import {ISCDPFacet} from "scdp/interfaces/ISCDPFacet.sol";
import {scdp, sdi, SCDPState} from "scdp/SState.sol";
import {Role} from "common/Constants.sol";

using PercentageMath for uint256;
using PercentageMath for uint16;
using SafeTransfer for IERC20;
using WadRay for uint256;

contract SCDPFacet is ISCDPFacet, Modifiers {
    /// @inheritdoc ISCDPFacet
    function depositSCDP(address _account, address _collateralAsset, uint256 _amount) external nonReentrant gate {
        // Transfer tokens into this contract prior to any state changes as an extra measure against re-entrancy.
        IERC20(_collateralAsset).safeTransferFrom(msg.sender, address(this), _amount);

        // Record the collateral deposit.
        scdp().handleDepositSCDP(cs().onlyFeeAccumulatingCollateral(_collateralAsset), _account, _collateralAsset, _amount);

        emit SEvent.SCDPDeposit(_account, _collateralAsset, _amount);
    }

    /// @inheritdoc ISCDPFacet
    function withdrawSCDP(address _receiver, address _collateralAsset, uint256 _amount) external nonReentrant gate {
        SCDPState storage s = scdp();
        // When principal deposits are less or equal to requested amount. We send full deposit + fees in this case.
        s.handleWithdrawSCDP(cs().onlyActiveSharedCollateral(_collateralAsset), msg.sender, _collateralAsset, _amount);

        // ensure that global pool is left with CR over MCR.
        s.ensureCollateralRatio(s.minCollateralRatio);

        // Send out the collateral.
        IERC20(_collateralAsset).safeTransfer(_receiver, _amount);

        // Emit event.
        emit SEvent.SCDPWithdraw(_receiver, msg.sender, _collateralAsset, _amount);
    }

    /// @inheritdoc ISCDPFacet
    function claimFeesSCDP(
        address _account,
        address _collateralAsset
    ) external onlyRoleIf(_account != msg.sender, Role.MANAGER) returns (uint256 feeAmount) {
        feeAmount = scdp().handleFeeClaim(cs().onlyFeeAccumulatingCollateral(_collateralAsset), _account, _collateralAsset);
        if (feeAmount == 0) revert Errors.NO_FEES_TO_CLAIM(Errors.id(_collateralAsset), _account);
    }

    /// @inheritdoc ISCDPFacet
    function repaySCDP(address _repayAssetAddr, uint256 _repayAmount, address _seizeAssetAddr) external nonReentrant gate {
        Asset storage repayAsset = cs().onlySwapMintable(_repayAssetAddr);
        Asset storage seizeAsset = cs().onlySwapMintable(_seizeAssetAddr);

        SCDPState storage s = scdp();
        SCDPAssetData storage repayAssetData = s.assetData[_repayAssetAddr];
        SCDPAssetData storage seizeAssetData = s.assetData[_seizeAssetAddr];

        uint256 existingDebt = repayAsset.toRebasingAmount(repayAssetData.debt);
        if (_repayAmount > existingDebt) {
            revert Errors.REPAY_OVERFLOW(Errors.id(_repayAssetAddr), Errors.id(_seizeAssetAddr), _repayAmount, existingDebt);
        }

        uint256 seizedAmount = fromWad(repayAsset.krAssetUSD(_repayAmount).wadDiv(seizeAsset.price()), seizeAsset.decimals);

        if (seizedAmount == 0) {
            revert Errors.ZERO_REPAY(Errors.id(_repayAssetAddr), _repayAmount, seizedAmount);
        }

        uint256 swapDeposits = seizeAsset.toRebasingAmount(seizeAssetData.swapDeposits);
        if (seizedAmount > swapDeposits) {
            revert Errors.NOT_ENOUGH_SWAP_DEPOSITS_TO_SEIZE(
                Errors.id(_repayAssetAddr),
                Errors.id(_seizeAssetAddr),
                seizedAmount,
                swapDeposits
            );
        }

        repayAssetData.debt -= burnSCDP(repayAsset, _repayAmount, msg.sender);

        uint128 seizedAmountInternal = uint128(seizeAsset.toNonRebasingAmount(seizedAmount));
        seizeAssetData.swapDeposits -= seizedAmountInternal;
        seizeAssetData.totalDeposits -= seizedAmountInternal;

        IERC20(_seizeAssetAddr).safeTransfer(msg.sender, seizedAmount);
        // solhint-disable-next-line avoid-tx-origin
        emit SEvent.SCDPRepay(tx.origin, _repayAssetAddr, _repayAmount, _seizeAssetAddr, seizedAmount);
    }

    function getLiquidatableSCDP() external view returns (bool) {
        return scdp().totalCollateralValueSCDP(false) < sdi().effectiveDebtValue().percentMul(scdp().liquidationThreshold);
    }

    function getMaxLiqValueSCDP(address _repayAssetAddr, address _seizeAssetAddr) external view returns (MaxLiqInfo memory) {
        Asset storage repayAsset = cs().onlySwapMintable(_repayAssetAddr);
        Asset storage seizeAsset = cs().onlySharedCollateral(_seizeAssetAddr);
        uint256 maxLiqValue = _getMaxLiqValue(repayAsset, seizeAsset, _seizeAssetAddr);
        uint256 seizeAssetPrice = seizeAsset.price();
        uint256 repayAssetPrice = repayAsset.price();
        uint256 seizeAmount = fromWad(
            valueToAmount(maxLiqValue, seizeAssetPrice, repayAsset.liqIncentiveSCDP),
            seizeAsset.decimals
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
    function liquidateSCDP(address _repayAssetAddr, uint256 _repayAmount, address _seizeAssetAddr) external nonReentrant gate {
        SCDPState storage s = scdp();
        s.ensureLiquidatableSCDP();

        Asset storage seizeAsset = cs().onlyActiveSharedCollateral(_seizeAssetAddr);
        Asset storage repayAsset = cs().onlySwapMintable(_repayAssetAddr);
        SCDPAssetData storage repayAssetData = s.assetData[_repayAssetAddr];

        uint256 existingDebt = repayAsset.toRebasingAmount(repayAssetData.debt);
        if (_repayAmount > existingDebt) {
            revert Errors.LIQUIDATION_AMOUNT_GREATER_THAN_DEBT(Errors.id(_repayAssetAddr), _repayAmount, existingDebt);
        }

        uint256 repayValue = _getMaxLiqValue(repayAsset, seizeAsset, _seizeAssetAddr);

        // Bound to max liquidation value
        (repayValue, _repayAmount) = repayAsset.boundRepayValue(repayValue, _repayAmount);
        if (repayValue == 0 || _repayAmount == 0) {
            revert Errors.LIQUIDATION_VALUE_IS_ZERO(Errors.id(_repayAssetAddr), Errors.id(_seizeAssetAddr));
        }

        uint256 seizedAmount = fromWad(
            valueToAmount(repayValue, seizeAsset.price(), repayAsset.liqIncentiveSCDP),
            seizeAsset.decimals
        );

        s.assetData[_repayAssetAddr].debt -= burnSCDP(repayAsset, _repayAmount, msg.sender);
        s.handleSeizeSCDP(seizeAsset, _seizeAssetAddr, seizedAmount);

        IERC20(_seizeAssetAddr).safeTransfer(msg.sender, seizedAmount);

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
                maxLiquidationRatio
            );
    }

    function _calcMaxLiqValue(
        Asset storage _repayAsset,
        Asset storage _seizeAsset,
        uint256 _minCollateralValue,
        uint256 _totalCollateralValue,
        uint256 _seizeAssetValue,
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
        // Maximum value possible for the seize asset
        return maxLiquidationValue < _seizeAssetValue ? maxLiquidationValue : _seizeAssetValue;
    }
}
