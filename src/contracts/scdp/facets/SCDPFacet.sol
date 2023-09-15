// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {SafeERC20, IERC20Permit} from "common/SafeERC20.sol";
import {Error} from "common/Errors.sol";
import {WadRay} from "common/libs/WadRay.sol";

import {DiamondModifiers} from "diamond/libs/LibDiamond.sol";
import {ms} from "minter/libs/LibMinter.sol";
import {CollateralAsset, KrAsset} from "common/libs/Assets.sol";
import {Shared} from "common/libs/Shared.sol";
import {sdi} from "scdp/libs/LibSDI.sol";
import {Liquidations} from "minter/libs/Liquidations.sol";
import {scdp, PoolKrAsset} from "scdp/libs/LibSCDP.sol";
import {ISCDPFacet} from "../interfaces/ISCDPFacet.sol";
import {fromWad} from "common/funcs/Conversions.sol";
import {collateralAmountWrite} from "minter/libs/Conversions.sol";

contract SCDPFacet is ISCDPFacet, DiamondModifiers {
    using SafeERC20 for IERC20Permit;
    using WadRay for uint256;

    /// @inheritdoc ISCDPFacet
    function poolDeposit(address _account, address _collateralAsset, uint256 _amount) external nonReentrant {
        // Transfer tokens into this contract prior to any state changes as an extra measure against re-entrancy.
        IERC20Permit(_collateralAsset).safeTransferFrom(msg.sender, address(this), _amount);

        // Record the collateral deposit.
        scdp().recordPoolDeposit(_account, _collateralAsset, _amount);

        emit CollateralPoolDeposit(_account, _collateralAsset, _amount);
    }

    /// @inheritdoc ISCDPFacet
    function poolWithdraw(address _account, address _collateralAsset, uint256 _amount) external nonReentrant {
        // When principal deposits are less or equal to requested amount. We send full deposit + fees in this case.
        (uint256 collateralOut, uint256 feesOut) = scdp().recordPoolWithdraw(msg.sender, _collateralAsset, _amount);

        // ensure that global pool is left with CR over MCR.
        require(Shared.checkSCDPRatioWithdrawal(scdp().minCollateralRatio), "withdraw-mcr-violation");
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

        scdp().debt[_repayKrAsset] -= sdi().repaySwap(_repayKrAsset, _repayAmount, msg.sender);

        uint256 seizedAmountInternal = collateralAmountWrite(_repayKrAsset, seizedAmount);
        scdp().swapDeposits[_seizeCollateral] -= seizedAmountInternal;
        scdp().totalDeposits[_seizeCollateral] -= seizedAmountInternal;

        // solhint-disable-next-line avoid-tx-origin
        emit CollateralPoolRepayment(tx.origin, _repayKrAsset, _repayAmount, _seizeCollateral, seizedAmount);
    }

    function poolIsLiquidatable() external view returns (bool) {
        return Liquidations.isSCDPLiquidatable();
    }

    function getMaxLiquidationSCDP(address _kreskoAsset, address _seizeCollateral) external view returns (uint256) {
        return
            Liquidations.maxLiquidatableValueSCDP(
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
        require(Liquidations.isSCDPLiquidatable(), "not-liquidatable");

        KrAsset memory krAsset = ms().kreskoAssets[_repayKrAsset];
        PoolKrAsset memory poolKrAsset = scdp().poolKrAsset[_repayKrAsset];
        CollateralAsset memory collateral = ms().collateralAssets[_seizeCollateral];
        uint256 repayAmountUSD = krAsset.uintUSD(_repayAmount, ms().oracleDeviationPct);

        require(
            Liquidations.maxLiquidatableValueSCDP(poolKrAsset, krAsset, _seizeCollateral) >= repayAmountUSD,
            Error.LIQUIDATION_OVERFLOW
        );

        uint256 seizeAmount = fromWad(
            collateral.decimals,
            Liquidations.calcSeizeAmount(
                poolKrAsset.liquidationIncentive,
                collateral.uintPrice(ms().oracleDeviationPct),
                repayAmountUSD
            )
        );

        scdp().debt[_repayKrAsset] -= sdi().repaySwap(_repayKrAsset, _repayAmount, msg.sender);
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
