// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {SafeERC20} from "vendor/SafeERC20.sol";
import {IERC20Permit} from "vendor/IERC20Permit.sol";
import {WadRay} from "libs/WadRay.sol";
import {Error} from "common/Errors.sol";
import {fromWad, valueToAmount} from "common/funcs/Math.sol";

import {DSModifiers} from "diamond/Modifiers.sol";
import {ms, MinterState} from "minter/State.sol";
import {CollateralAsset, KrAsset} from "minter/Types.sol";
import {collateralAmountWrite} from "minter/funcs/Conversions.sol";

import {ISCDPFacet} from "scdp/interfaces/ISCDPFacet.sol";
import {PoolKrAsset} from "scdp/Types.sol";
import {scdp, SCDPState} from "scdp/State.sol";
import {maxLiquidatableValueSCDP} from "scdp/funcs/Liquidations.sol";

contract SCDPFacet is ISCDPFacet, DSModifiers {
    using SafeERC20 for IERC20Permit;
    using WadRay for uint256;

    /// @inheritdoc ISCDPFacet
    function poolDeposit(address _account, address _collateralAsset, uint256 _amount) external nonReentrant {
        // Transfer tokens into this contract prior to any state changes as an extra measure against re-entrancy.
        IERC20Permit(_collateralAsset).safeTransferFrom(msg.sender, address(this), _amount);

        // Record the collateral deposit.
        scdp().handleSCDPDeposit(_account, _collateralAsset, _amount);

        emit CollateralPoolDeposit(_account, _collateralAsset, _amount);
    }

    /// @inheritdoc ISCDPFacet
    function poolWithdraw(address _account, address _collateralAsset, uint256 _amount) external nonReentrant {
        SCDPState storage s = scdp();
        // When principal deposits are less or equal to requested amount. We send full deposit + fees in this case.
        (uint256 collateralOut, uint256 feesOut) = s.handleSCDPWithdraw(msg.sender, _collateralAsset, _amount);

        // ensure that global pool is left with CR over MCR.
        require(s.checkSCDPRatio(s.minCollateralRatio), "withdraw-mcr-violation");
        // Send out the collateral.
        IERC20Permit(_collateralAsset).safeTransfer(_account, collateralOut + feesOut);

        // Emit event.
        emit CollateralPoolWithdraw(_account, _collateralAsset, collateralOut, feesOut);
    }

    /// @inheritdoc ISCDPFacet
    function poolRepay(address _repayKrAsset, uint256 _repayAmount, address _seizeCollateral) external nonReentrant {
        require(_repayAmount != 0, "repay-zero");
        SCDPState storage s = scdp();
        MinterState storage m = ms();
        require(s.debt[_repayKrAsset] >= _repayAmount, "repay-too-much");

        uint256 seizedAmount = m.kreskoAssets[_repayKrAsset].uintUSD(_repayAmount, m.oracleDeviationPct).wadDiv(
            m.collateralAssets[_seizeCollateral].uintPrice(m.oracleDeviationPct)
        );
        require(s.swapDeposits[_seizeCollateral] >= seizedAmount, "no-swap-deposits");

        s.debt[_repayKrAsset] -= s.repaySwap(_repayKrAsset, _repayAmount, msg.sender);

        uint256 seizedAmountInternal = collateralAmountWrite(_repayKrAsset, seizedAmount);
        s.swapDeposits[_seizeCollateral] -= seizedAmountInternal;
        s.totalDeposits[_seizeCollateral] -= seizedAmountInternal;

        // solhint-disable-next-line avoid-tx-origin
        emit CollateralPoolRepayment(tx.origin, _repayKrAsset, _repayAmount, _seizeCollateral, seizedAmount);
    }

    function poolIsLiquidatable() external view returns (bool) {
        return scdp().isSCDPLiquidatable();
    }

    function getMaxLiquidationSCDP(address _kreskoAsset, address _seizeCollateral) external view returns (uint256) {
        return maxLiquidatableValueSCDP(scdp().poolKrAsset[_kreskoAsset], ms().kreskoAssets[_kreskoAsset], _seizeCollateral);
    }

    /// @inheritdoc ISCDPFacet
    function poolLiquidate(address _repayKrAsset, uint256 _repayAmount, address _seizeCollateral) external nonReentrant {
        SCDPState storage s = scdp();
        MinterState storage m = ms();
        require(s.debt[_repayKrAsset] >= _repayAmount, "liquidate-too-much");
        require(s.isSCDPLiquidatable(), "not-liquidatable");

        CollateralAsset memory collateral = m.collateralAssets[_seizeCollateral];
        KrAsset memory krAsset = m.kreskoAssets[_repayKrAsset];
        PoolKrAsset memory poolKrAsset = s.poolKrAsset[_repayKrAsset];
        uint256 repayAmountUSD = krAsset.uintUSD(_repayAmount, m.oracleDeviationPct);

        require(maxLiquidatableValueSCDP(poolKrAsset, krAsset, _seizeCollateral) >= repayAmountUSD, Error.LIQUIDATION_OVERFLOW);

        uint256 seizeAmount = fromWad(
            collateral.decimals,
            valueToAmount(poolKrAsset.liquidationIncentive, collateral.uintPrice(m.oracleDeviationPct), repayAmountUSD)
        );

        s.debt[_repayKrAsset] -= s.repaySwap(_repayKrAsset, _repayAmount, msg.sender);
        s.handleSCDPSeizeCollateral(_seizeCollateral, seizeAmount);

        IERC20Permit(_seizeCollateral).safeTransfer(msg.sender, seizeAmount);

        emit CollateralPoolLiquidationOccured(
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
