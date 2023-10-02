// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {SafeERC20Permit} from "vendor/SafeERC20Permit.sol";
import {IERC20Permit} from "vendor/IERC20Permit.sol";
import {WadRay} from "libs/WadRay.sol";

import {CError} from "common/Errors.sol";
import {burnSCDP} from "common/funcs/Actions.sol";
import {fromWad, valueToAmount} from "common/funcs/Math.sol";
import {CModifiers} from "common/Modifiers.sol";
import {cs} from "common/State.sol";
import {Asset} from "common/Types.sol";

import {SError} from "scdp/Errors.sol";
import {SCDPAssetData} from "scdp/Types.sol";
import {ISCDPFacet} from "scdp/interfaces/ISCDPFacet.sol";
import {scdp, SCDPState} from "scdp/State.sol";
import {maxLiqValueSCDP, maxLiqValueSCDPStorage} from "scdp/funcs/Liquidations.sol";
import {SEvent} from "scdp/Events.sol";

contract SCDPFacet is ISCDPFacet, CModifiers {
    using SafeERC20Permit for IERC20Permit;
    using WadRay for uint256;

    /// @inheritdoc ISCDPFacet
    function depositSCDP(address _account, address _collateralAsset, uint256 _amount) external nonReentrant {
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
        if (s.debtExceedsCollateral(s.minCollateralRatio)) {
            revert CError.DEBT_EXCEEDS_COLLATERAL();
        }
        // Send out the collateral.
        IERC20Permit(_collateralAsset).safeTransfer(_account, collateralOut + feesOut);

        // Emit event.
        emit SEvent.SCDPWithdraw(_account, _collateralAsset, collateralOut, feesOut);
    }

    /// @inheritdoc ISCDPFacet
    function repaySCDP(address _repayKrAsset, uint256 _repayAmount, address _seizeCollateral) external nonReentrant {
        if (_repayAmount == 0) {
            revert CError.ZERO_REPAY();
        }
        SCDPState storage s = scdp();
        SCDPAssetData storage repayAssetData = s.assetData[_repayKrAsset];

        if (_repayAmount > repayAssetData.debt) {
            revert CError.REPAY_OVERFLOW(_repayAmount, repayAssetData.debt);
        }

        Asset memory krAsset = cs().assets[_repayKrAsset];
        Asset memory seizeAsset = cs().assets[_seizeCollateral];

        uint256 seizedAmount = krAsset.uintUSD(_repayAmount).wadDiv(seizeAsset.price());
        if (seizedAmount > repayAssetData.swapDeposits) {
            revert SError.SWAP_DEPOSITS_OVERFLOW(seizedAmount, repayAssetData.swapDeposits);
        }

        repayAssetData.debt -= burnSCDP(krAsset, _repayAmount, msg.sender);

        uint128 seizedAmountInternal = uint128(seizeAsset.toNonRebasingAmount(seizedAmount));
        s.assetData[_seizeCollateral].swapDeposits -= seizedAmountInternal;
        s.assetData[_seizeCollateral].totalDeposits -= seizedAmountInternal;

        IERC20Permit(_seizeCollateral).safeTransfer(msg.sender, seizedAmount);
        // solhint-disable-next-line avoid-tx-origin
        emit SEvent.SCDPRepay(tx.origin, _repayKrAsset, _repayAmount, _seizeCollateral, seizedAmount);
    }

    function getLiquidatableSCDP() external view returns (bool) {
        return scdp().isLiquidatableSCDP();
    }

    function getMaxLiqValueSCDP(address _kreskoAsset, address _seizeCollateral) external view returns (uint256) {
        Asset memory krAsset = cs().assets[_kreskoAsset];
        Asset memory seizeAsset = cs().assets[_seizeCollateral];
        return maxLiqValueSCDP(krAsset, seizeAsset, _seizeCollateral);
    }

    function gasTester(
        address _repayKrAsset,
        uint256 _repayAmount,
        address _seizeCollateral
    ) external nonReentrant returns (uint256) {
        if (_repayAmount == 0) {
            revert CError.ZERO_REPAY();
        }
        SCDPState storage s = scdp();
        SCDPAssetData storage repayAssetData = s.assetData[_repayKrAsset];
        if (_repayAmount > repayAssetData.debt) {
            revert CError.LIQUIDATION_AMOUNT_OVERFLOW(_repayAmount, repayAssetData.debt);
        } else if (!s.isLiquidatableSCDPStorage()) {
            revert CError.CANNOT_LIQUIDATE();
        }
        Asset storage krAsset = cs().assets[_repayKrAsset];
        Asset storage seizeAsset = cs().assets[_seizeCollateral];
        uint256 repayAmountUSD = krAsset.uintUSDStorage(_repayAmount);
        if (repayAmountUSD > maxLiqValueSCDPStorage(krAsset, seizeAsset, _seizeCollateral)) {
            revert CError.LIQUIDATION_VALUE_OVERFLOW(repayAmountUSD);
        }

        uint256 seizedAmount = fromWad(
            seizeAsset.decimals,
            valueToAmount(krAsset.liqIncentiveSCDP, seizeAsset.priceStorage(), repayAmountUSD)
        );
        s.assetData[_repayKrAsset].debt -= burnSCDP(krAsset, _repayAmount, msg.sender);
        s.handleSeizeSCDPStorage(_seizeCollateral, seizeAsset, seizedAmount);

        IERC20Permit(_seizeCollateral).safeTransfer(msg.sender, seizedAmount);

        emit SEvent.SCDPLiquidationOccured(
            // solhint-disable-next-line avoid-tx-origin
            tx.origin,
            _repayKrAsset,
            _repayAmount,
            _seizeCollateral,
            seizedAmount
        );
    }

    function gasTesterMemory(
        address _repayKrAsset,
        uint256 _repayAmount,
        address _seizeCollateral
    ) external nonReentrant returns (uint256) {
        if (_repayAmount == 0) {
            revert CError.ZERO_REPAY();
        }
        SCDPState storage s = scdp();
        SCDPAssetData storage repayAssetData = s.assetData[_repayKrAsset];
        if (_repayAmount > repayAssetData.debt) {
            revert CError.LIQUIDATION_AMOUNT_OVERFLOW(_repayAmount, repayAssetData.debt);
        } else if (!s.isLiquidatableSCDP()) {
            revert CError.CANNOT_LIQUIDATE();
        }
        Asset memory krAsset = cs().assets[_repayKrAsset];
        Asset memory seizeAsset = cs().assets[_seizeCollateral];
        uint256 repayAmountUSD = krAsset.uintUSD(_repayAmount);
        if (repayAmountUSD > maxLiqValueSCDP(krAsset, seizeAsset, _seizeCollateral)) {
            revert CError.LIQUIDATION_VALUE_OVERFLOW(repayAmountUSD);
        }

        uint256 seizedAmount = fromWad(
            seizeAsset.decimals,
            valueToAmount(krAsset.liqIncentiveSCDP, seizeAsset.price(), repayAmountUSD)
        );
        s.assetData[_repayKrAsset].debt -= burnSCDP(krAsset, _repayAmount, msg.sender);
        s.handleSeizeSCDP(_seizeCollateral, seizeAsset, seizedAmount);

        IERC20Permit(_seizeCollateral).safeTransfer(msg.sender, seizedAmount);

        emit SEvent.SCDPLiquidationOccured(
            // solhint-disable-next-line avoid-tx-origin
            tx.origin,
            _repayKrAsset,
            _repayAmount,
            _seizeCollateral,
            seizedAmount
        );
    }

    /// @inheritdoc ISCDPFacet
    function liquidateSCDP(address _repayKrAsset, uint256 _repayAmount, address _seizeCollateral) external nonReentrant {
        if (_repayAmount == 0) {
            revert CError.ZERO_REPAY();
        }

        SCDPState storage s = scdp();
        SCDPAssetData storage repayAssetData = s.assetData[_repayKrAsset];

        if (_repayAmount > repayAssetData.debt) {
            revert CError.LIQUIDATION_AMOUNT_OVERFLOW(_repayAmount, repayAssetData.debt);
        } else if (!s.isLiquidatableSCDP()) {
            revert CError.CANNOT_LIQUIDATE();
        }

        Asset memory krAsset = cs().assets[_repayKrAsset];
        Asset memory seizeAsset = cs().assets[_seizeCollateral];
        uint256 repayAmountUSD = krAsset.uintUSD(_repayAmount);
        if (repayAmountUSD > maxLiqValueSCDP(krAsset, seizeAsset, _seizeCollateral)) {
            revert CError.LIQUIDATION_VALUE_OVERFLOW(repayAmountUSD);
        }

        uint256 seizedAmount = fromWad(
            seizeAsset.decimals,
            valueToAmount(krAsset.liqIncentiveSCDP, seizeAsset.price(), repayAmountUSD)
        );

        s.assetData[_repayKrAsset].debt -= burnSCDP(krAsset, _repayAmount, msg.sender);
        s.handleSeizeSCDP(_seizeCollateral, seizeAsset, seizedAmount);

        IERC20Permit(_seizeCollateral).safeTransfer(msg.sender, seizedAmount);

        emit SEvent.SCDPLiquidationOccured(
            // solhint-disable-next-line avoid-tx-origin
            tx.origin,
            _repayKrAsset,
            _repayAmount,
            _seizeCollateral,
            seizedAmount
        );
    }

    error LiquidateZero();
}
