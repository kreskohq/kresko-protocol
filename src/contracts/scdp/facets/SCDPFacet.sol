// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {SafeERC20, IERC20Permit} from "common/SafeERC20.sol";
import {Error} from "common/Errors.sol";
import {WadRay} from "common/libs/WadRay.sol";

import {DiamondModifiers} from "diamond/libs/LibDiamond.sol";
import {ms, LibDecimals, LibCalculation, CollateralAsset, KrAsset} from "minter/libs/LibMinter.sol";

import {scdp, LibAmounts, PoolKrAsset} from "scdp/libs/LibSCDP.sol";
import {ISCDPFacet} from "../interfaces/ISCDPFacet.sol";

contract SCDPFacet is ISCDPFacet, DiamondModifiers {
    using SafeERC20 for IERC20Permit;
    using WadRay for uint256;
    using LibDecimals for uint8;

    /// @inheritdoc ISCDPFacet
    function poolDeposit(address _account, address _collateralAsset, uint256 _amount) external nonReentrant {
        // Transfer tokens into this contract prior to any state changes as an extra measure against re-entrancy.
        IERC20Permit(_collateralAsset).safeTransferFrom(msg.sender, address(this), _amount);

        // Record the collateral deposit.
        scdp().recordCollateralDeposit(_account, _collateralAsset, _amount);

        emit CollateralPoolDeposit(_account, _collateralAsset, _amount);
    }

    /// @inheritdoc ISCDPFacet
    function poolWithdraw(address _account, address _collateralAsset, uint256 _amount) external nonReentrant {
        // When principal deposits are less or equal to requested amount. We send full deposit + fees in this case.
        (uint256 collateralOut, uint256 feesOut) = scdp().recordCollateralWithdrawal(
            msg.sender,
            _collateralAsset,
            _amount
        );

        // ensure that global pool is left with CR over MCR.
        require(scdp().checkRatioWithdrawal(scdp().minimumCollateralizationRatio), "withdraw-mcr-violation");
        // Send out the collateral.
        IERC20Permit(_collateralAsset).safeTransfer(_account, collateralOut + feesOut);

        // Emit event.
        emit CollateralPoolWithdraw(_account, _collateralAsset, collateralOut, feesOut);
    }

    /// @inheritdoc ISCDPFacet
    function poolRepay(address _repayKrAsset, uint256 _repayAmount, address _seizeCollateral) external nonReentrant {
        require(_repayAmount != 0, "repay-zero");
        require(scdp().debt[_repayKrAsset] >= _repayAmount, "repay-too-much");

        uint256 seizedAmount = ms().kreskoAssets[_repayKrAsset].uintUSD(_repayAmount, ms().oracleDeviationPct).wadDiv(
            ms().collateralAssets[_seizeCollateral].uintPrice(ms().oracleDeviationPct)
        );
        require(scdp().swapDeposits[_seizeCollateral] >= seizedAmount, "no-swap-deposits");

        scdp().debt[_repayKrAsset] -= ms().repaySwap(_repayKrAsset, _repayAmount, msg.sender);

        uint256 seizedAmountInternal = LibAmounts.getCollateralAmountWrite(_repayKrAsset, seizedAmount);
        scdp().swapDeposits[_seizeCollateral] -= seizedAmountInternal;
        scdp().totalDeposits[_seizeCollateral] -= seizedAmountInternal;

        // solhint-disable-next-line avoid-tx-origin
        emit CollateralPoolRepayment(tx.origin, _repayKrAsset, _repayAmount, _seizeCollateral, seizedAmount);
    }

    function poolIsLiquidatable() external view returns (bool) {
        return scdp().isLiquidatable();
    }

    function getMaxLiquidationSCDP(address _kreskoAsset, address _seizeCollateral) external view returns (uint256) {
        return
            ms().getMaxLiquidationShared(
                scdp().poolKrAsset[_kreskoAsset],
                ms().kreskoAssets[_kreskoAsset],
                _seizeCollateral
            );
    }

    /// @inheritdoc ISCDPFacet
    function poolLiquidate(
        address _repayKrAsset,
        uint256 _repayAmount,
        address _seizeCollateral
    ) external nonReentrant {
        require(scdp().debt[_repayKrAsset] >= _repayAmount, "liquidate-too-much");
        require(scdp().isLiquidatable(), "not-liquidatable");

        KrAsset memory krAsset = ms().kreskoAssets[_repayKrAsset];
        PoolKrAsset memory poolKrAsset = scdp().poolKrAsset[_repayKrAsset];
        CollateralAsset memory collateral = ms().collateralAssets[_seizeCollateral];
        uint256 repayAmountUSD = krAsset.uintUSD(_repayAmount, ms().oracleDeviationPct);

        require(
            ms().getMaxLiquidationShared(poolKrAsset, krAsset, _seizeCollateral) >= repayAmountUSD,
            Error.LIQUIDATION_OVERFLOW
        );

        uint256 seizeAmount = collateral.decimals.fromWad(
            LibCalculation.calculateAmountToSeize(
                poolKrAsset.liquidationIncentive,
                collateral.uintPrice(ms().oracleDeviationPct),
                repayAmountUSD
            )
        );

        scdp().debt[_repayKrAsset] -= ms().repaySwap(_repayKrAsset, _repayAmount, msg.sender);
        scdp().adjustSeizedCollateral(_seizeCollateral, seizeAmount);

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
