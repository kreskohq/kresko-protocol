// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.23;

import {SafeTransfer} from "kresko-lib/token/SafeTransfer.sol";
import {IERC20} from "kresko-lib/token/IERC20.sol";
import {WadRay} from "libs/WadRay.sol";
import {PercentageMath} from "libs/PercentageMath.sol";

import {Errors} from "common/Errors.sol";
import {burnSCDP} from "common/funcs/Actions.sol";
import {fromWad, valueToAmount} from "common/funcs/Math.sol";
import {Modifiers} from "common/Modifiers.sol";
import {cs, gm} from "common/State.sol";
import {Asset, MaxLiqInfo} from "common/Types.sol";

import {SEvent} from "scdp/SEvent.sol";
import {SCDPAssetData} from "scdp/STypes.sol";
import {ISCDPFacet} from "scdp/interfaces/ISCDPFacet.sol";
import {scdp, sdi, SCDPState} from "scdp/SState.sol";
import {Role} from "common/Constants.sol";
import {SCDPLiquidationArgs, SCDPRepayArgs, SCDPWithdrawArgs} from "common/Args.sol";
import {handlePythUpdate} from "common/funcs/Utils.sol";

using PercentageMath for uint256;
using PercentageMath for uint16;
using SafeTransfer for IERC20;
using WadRay for uint256;

// solhint-disable avoid-tx-origin

contract SCDPFacet is ISCDPFacet, Modifiers {
    /// @inheritdoc ISCDPFacet
    function depositSCDP(
        address _account,
        address _collateralAsset,
        uint256 _amount
    ) external payable nonReentrant gate(_account) {
        // Transfer tokens into this contract prior to any state changes as an extra measure against re-entrancy.
        IERC20(_collateralAsset).safeTransferFrom(msg.sender, address(this), _amount);

        emit SEvent.SCDPDeposit(
            _account,
            _collateralAsset,
            _amount,
            // Record the collateral deposit.
            scdp().handleDepositSCDP(cs().onlyFeeAccumulatingCollateral(_collateralAsset), _account, _collateralAsset, _amount),
            block.timestamp
        );
    }

    /// @inheritdoc ISCDPFacet
    function withdrawSCDP(
        SCDPWithdrawArgs memory _args,
        bytes[] calldata _updateData
    ) external payable onlyRoleIf(_args.account != msg.sender, Role.MANAGER) nonReentrant usePyth(_updateData) {
        SCDPState storage s = scdp();
        _args.receiver = _args.receiver == address(0) ? _args.account : _args.receiver;

        // When principal deposits are less or equal to requested amount. We send full deposit + fees in this case.
        uint256 feeIndex = s.handleWithdrawSCDP(
            cs().onlyActiveSharedCollateral(_args.asset),
            _args.account,
            _args.asset,
            _args.amount,
            _args.receiver,
            false
        );

        // ensure that global pool is left with CR over MCR.
        s.ensureCollateralRatio(s.minCollateralRatio);

        // Send out the collateral.
        IERC20(_args.asset).safeTransfer(_args.receiver, _args.amount);

        // Emit event.
        emit SEvent.SCDPWithdraw(
            _args.account,
            _args.receiver,
            _args.asset,
            msg.sender,
            _args.amount,
            feeIndex,
            block.timestamp
        );
    }

    /// @inheritdoc ISCDPFacet
    function emergencyWithdrawSCDP(
        SCDPWithdrawArgs memory _args,
        bytes[] calldata _updateData
    ) external payable onlyRoleIf(_args.account != msg.sender, Role.MANAGER) nonReentrant usePyth(_updateData) {
        SCDPState storage s = scdp();
        _args.receiver = _args.receiver == address(0) ? _args.account : _args.receiver;

        // When principal deposits are less or equal to requested amount. We send full deposit + fees in this case.
        uint256 feeIndex = s.handleWithdrawSCDP(
            cs().onlyActiveSharedCollateral(_args.asset),
            _args.account,
            _args.asset,
            _args.amount,
            _args.receiver,
            true
        );

        // ensure that global pool is left with CR over MCR.
        s.ensureCollateralRatio(s.minCollateralRatio);

        // Send out the collateral.
        IERC20(_args.asset).safeTransfer(_args.receiver, _args.amount);

        // Emit event.
        emit SEvent.SCDPWithdraw(
            _args.account,
            _args.receiver,
            _args.asset,
            msg.sender,
            _args.amount,
            feeIndex,
            block.timestamp
        );
    }

    /// @inheritdoc ISCDPFacet
    function claimFeesSCDP(
        address _account,
        address _collateralAsset,
        address _receiver
    ) external payable onlyRoleIf(_account != msg.sender, Role.MANAGER) returns (uint256 feeAmount) {
        feeAmount = scdp().handleFeeClaim(
            cs().onlyFeeAccumulatingCollateral(_collateralAsset),
            _account,
            _collateralAsset,
            _receiver == address(0) ? _account : _receiver,
            false
        );
        if (feeAmount == 0) revert Errors.NO_FEES_TO_CLAIM(Errors.id(_collateralAsset), _account);
    }

    /// @inheritdoc ISCDPFacet
    function repaySCDP(SCDPRepayArgs calldata _args) external payable nonReentrant gate(tx.origin) {
        // inlined modifier (for stack)
        handlePythUpdate(_args.prices);

        Asset storage repayAsset = cs().onlySwapMintable(_args.repayAsset);
        Asset storage seizeAsset = cs().onlySwapMintable(_args.seizeAsset);

        SCDPAssetData storage repayAssetData = scdp().assetData[_args.repayAsset];
        SCDPAssetData storage seizeAssetData = scdp().assetData[_args.seizeAsset];

        if (_args.repayAmount > repayAsset.toRebasingAmount(repayAssetData.debt)) {
            revert Errors.REPAY_OVERFLOW(
                Errors.id(_args.repayAsset),
                Errors.id(_args.seizeAsset),
                _args.repayAmount,
                repayAsset.toRebasingAmount(repayAssetData.debt)
            );
        }

        uint256 seizedAmount = fromWad(
            repayAsset.krAssetUSD(_args.repayAmount).wadDiv(seizeAsset.price()),
            seizeAsset.decimals
        );

        if (seizedAmount == 0) {
            revert Errors.ZERO_REPAY(Errors.id(_args.repayAsset), _args.repayAmount, seizedAmount);
        }

        uint256 swapDeposits = seizeAsset.toRebasingAmount(seizeAssetData.swapDeposits);
        if (seizedAmount > swapDeposits) {
            revert Errors.NOT_ENOUGH_SWAP_DEPOSITS_TO_SEIZE(
                Errors.id(_args.repayAsset),
                Errors.id(_args.seizeAsset),
                seizedAmount,
                swapDeposits
            );
        }

        repayAssetData.debt -= burnSCDP(repayAsset, _args.repayAmount, msg.sender);

        uint128 seizedAmountInternal = uint128(seizeAsset.toNonRebasingAmount(seizedAmount));
        seizeAssetData.swapDeposits -= seizedAmountInternal;
        seizeAssetData.totalDeposits -= seizedAmountInternal;

        IERC20(_args.seizeAsset).safeTransfer(msg.sender, seizedAmount);
        // solhint-disable-next-line avoid-tx-origin
        emit SEvent.SCDPRepay(tx.origin, _args.repayAsset, _args.repayAmount, _args.seizeAsset, seizedAmount, block.timestamp);
    }

    /// @inheritdoc ISCDPFacet
    function getLiquidatableSCDP() external view returns (bool) {
        return scdp().totalCollateralValueSCDP(false) < sdi().effectiveDebtValue().percentMul(scdp().liquidationThreshold);
    }

    /// @inheritdoc ISCDPFacet
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
    function liquidateSCDP(SCDPLiquidationArgs memory _args, bytes[] calldata _updateData) external payable nonReentrant {
        // inlined modifier (for stack)
        if (address(gm().manager) != address(0)) {
            gm().manager.check(tx.origin);
        }

        // inlined modifier (for stack)
        handlePythUpdate(_updateData);

        // begin liquidation logic
        scdp().ensureLiquidatableSCDP();

        Asset storage seizeAsset = cs().onlyActiveSharedCollateral(_args.seizeAsset);
        Asset storage repayAsset = cs().onlySwapMintable(_args.repayAsset);
        SCDPAssetData storage repayAssetData = scdp().assetData[_args.repayAsset];

        if (_args.repayAmount > repayAsset.toRebasingAmount(repayAssetData.debt)) {
            revert Errors.LIQUIDATION_AMOUNT_GREATER_THAN_DEBT(
                Errors.id(_args.repayAsset),
                _args.repayAmount,
                repayAsset.toRebasingAmount(repayAssetData.debt)
            );
        }

        uint256 repayValue = _getMaxLiqValue(repayAsset, seizeAsset, _args.seizeAsset);

        // Bound to max liquidation value
        (repayValue, _args.repayAmount) = repayAsset.boundRepayValue(repayValue, _args.repayAmount);
        if (repayValue == 0 || _args.repayAmount == 0) {
            revert Errors.LIQUIDATION_VALUE_IS_ZERO(Errors.id(_args.repayAsset), Errors.id(_args.seizeAsset));
        }

        uint256 seizedAmount = fromWad(
            valueToAmount(repayValue, seizeAsset.price(), repayAsset.liqIncentiveSCDP),
            seizeAsset.decimals
        );

        repayAssetData.debt -= burnSCDP(repayAsset, _args.repayAmount, msg.sender);
        (uint128 prevLiqIndex, uint128 nextLiqIndex) = scdp().handleSeizeSCDP(seizeAsset, _args.seizeAsset, seizedAmount);

        emit SEvent.SCDPLiquidationOccured(
            // solhint-disable-next-line avoid-tx-origin
            tx.origin,
            _args.repayAsset,
            _args.repayAmount,
            _args.seizeAsset,
            seizedAmount,
            prevLiqIndex,
            nextLiqIndex,
            block.timestamp
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
