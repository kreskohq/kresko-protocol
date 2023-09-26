// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {SafeERC20Permit} from "vendor/SafeERC20Permit.sol";
import {IERC20Permit} from "vendor/IERC20Permit.sol";
import {WadRay} from "libs/WadRay.sol";

import {Error} from "common/Errors.sol";
import {burnSCDP} from "common/funcs/Actions.sol";
import {fromWad, valueToAmount} from "common/funcs/Math.sol";
import {CModifiers} from "common/Modifiers.sol";
import {cs} from "common/State.sol";
import {Asset} from "common/Types.sol";

import {ISCDPFacet} from "scdp/interfaces/ISCDPFacet.sol";
import {scdp, SCDPState} from "scdp/State.sol";
import {maxLiqValueSCDP} from "scdp/funcs/Liquidations.sol";
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
        require(s.checkSCDPRatio(s.minCollateralRatio), "withdraw-mcr-violation");
        // Send out the collateral.
        IERC20Permit(_collateralAsset).safeTransfer(_account, collateralOut + feesOut);

        // Emit event.
        emit SEvent.SCDPWithdraw(_account, _collateralAsset, collateralOut, feesOut);
    }

    /// @inheritdoc ISCDPFacet
    function repaySCDP(address _repayKrAsset, uint256 _repayAmount, address _seizeCollateral) external nonReentrant {
        require(_repayAmount != 0, "repay-zero");
        SCDPState storage s = scdp();
        require(s.debt[_repayKrAsset] >= _repayAmount, "repay-too-much");

        Asset memory krAsset = cs().assets[_repayKrAsset];
        Asset memory seizeAsset = cs().assets[_seizeCollateral];

        uint256 seizedAmount = krAsset.uintUSD(_repayAmount).wadDiv(seizeAsset.price());
        require(s.sDeposits[_seizeCollateral].swapDeposits >= seizedAmount, "no-swap-deposits");

        s.debt[_repayKrAsset] -= burnSCDP(krAsset, _repayAmount, msg.sender);

        uint128 seizedAmountInternal = uint128(seizeAsset.amountWrite(seizedAmount));
        s.sDeposits[_seizeCollateral].swapDeposits -= seizedAmountInternal;
        s.sDeposits[_seizeCollateral].totalDeposits -= seizedAmountInternal;

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

    /// @inheritdoc ISCDPFacet
    function liquidateSCDP(address _repayKrAsset, uint256 _repayAmount, address _seizeCollateral) external nonReentrant {
        SCDPState storage s = scdp();
        require(s.debt[_repayKrAsset] >= _repayAmount, "liquidate-too-much");
        require(s.isLiquidatableSCDP(), "not-liquidatable");

        Asset memory krAsset = cs().assets[_repayKrAsset];
        Asset memory seizeAsset = cs().assets[_seizeCollateral];
        uint256 repayAmountUSD = krAsset.uintUSD(_repayAmount);

        require(maxLiqValueSCDP(krAsset, seizeAsset, _seizeCollateral) >= repayAmountUSD, Error.LIQUIDATION_OVERFLOW);

        uint256 seizeAmount = fromWad(
            seizeAsset.decimals,
            valueToAmount(krAsset.liquidationIncentive, seizeAsset.price(), repayAmountUSD)
        );

        s.debt[_repayKrAsset] -= burnSCDP(krAsset, _repayAmount, msg.sender);
        s.handleSeizeSCDP(_seizeCollateral, seizeAsset, seizeAmount);

        IERC20Permit(_seizeCollateral).safeTransfer(msg.sender, seizeAmount);

        emit SEvent.SCDPLiquidationOccured(
            // solhint-disable-next-line avoid-tx-origin
            tx.origin,
            _repayKrAsset,
            _repayAmount,
            _seizeCollateral,
            seizeAmount
        );
    }

    error LiquidateZero();
}
