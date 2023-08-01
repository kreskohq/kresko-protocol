// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {SafeERC20, IERC20Permit} from "../../../shared/SafeERC20.sol";
import {DiamondModifiers} from "../../../diamond/DiamondModifiers.sol";
import {ms} from "../../MinterStorage.sol";
import {CollateralAsset, KrAsset} from "../../MinterTypes.sol";
import {ICollateralPoolFacet} from "../interfaces/ICollateralPoolFacet.sol";
import {cps} from "../CollateralPoolState.sol";
import {LibAmounts} from "../libs/LibAmounts.sol";
import {LibCalculation} from "../../libs/LibCalculation.sol";
import {LibDecimals} from "../../libs/LibDecimals.sol";
import {Error} from "../../../libs/Errors.sol";
import {WadRay} from "../../../libs/WadRay.sol";

contract CollateralPoolFacet is ICollateralPoolFacet, DiamondModifiers {
    using SafeERC20 for IERC20Permit;
    using WadRay for uint256;
    using LibDecimals for uint8;

    /// @inheritdoc ICollateralPoolFacet
    function poolDeposit(address _account, address _collateralAsset, uint256 _amount) external nonReentrant {
        // Transfer tokens into this contract prior to any state changes as an extra measure against re-entrancy.
        IERC20Permit(_collateralAsset).safeTransferFrom(msg.sender, address(this), _amount);

        // Record the collateral deposit.
        cps().recordCollateralDeposit(_account, _collateralAsset, _amount);

        emit CollateralPoolDeposit(_account, _collateralAsset, _amount);
    }

    /// @inheritdoc ICollateralPoolFacet
    function poolWithdraw(address _account, address _collateralAsset, uint256 _amount) external nonReentrant {
        // When principal deposits are less or equal to requested amount. We send full deposit + fees in this case.
        (uint256 collateralOut, uint256 feesOut) = cps().recordCollateralWithdrawal(
            msg.sender,
            _collateralAsset,
            _amount
        );

        // ensure that global pool is left with CR over MCR.
        require(cps().checkRatio(cps().minimumCollateralizationRatio), "withdraw-mcr-violation");

        // Send out the collateral.
        IERC20Permit(_collateralAsset).safeTransfer(_account, collateralOut + feesOut);

        // Emit event.
        emit CollateralPoolWithdraw(_account, _collateralAsset, collateralOut, feesOut);
    }

    /// @inheritdoc ICollateralPoolFacet
    function poolRepay(address _repayKrAsset, uint256 _repayAmount, address _seizeCollateral) external nonReentrant {
        require(cps().debt[_repayKrAsset] >= 0, "repay-no-debt");
        require(cps().debt[_repayKrAsset] >= _repayAmount, "repay-too-much");
        require(cps().swapDeposits[_seizeCollateral] >= 0, "repay-no-assets-available");

        uint256 seizedAmount = ms().kreskoAssets[_repayKrAsset].uintUSD(_repayAmount).wadDiv(
            ms().collateralAssets[_seizeCollateral].uintPrice()
        );
        require(cps().swapDeposits[_seizeCollateral] >= seizedAmount, "repay-too-much");

        cps().debt[_repayKrAsset] -= ms().repaySwap(_repayKrAsset, _repayAmount, msg.sender);

        uint256 seizedAmountInternal = LibAmounts.getCollateralAmountWrite(_repayKrAsset, seizedAmount);
        cps().swapDeposits[_seizeCollateral] -= seizedAmountInternal;
        cps().totalDeposits[_seizeCollateral] -= seizedAmountInternal;

        // solhint-disable-next-line avoid-tx-origin
        emit CollateralPoolRepayment(tx.origin, _repayKrAsset, _repayAmount, _seizeCollateral, seizedAmount);
    }

    function poolIsLiquidatable() external view returns (bool) {
        return cps().isLiquidatable();
    }

    /// @inheritdoc ICollateralPoolFacet
    function poolLiquidate(
        address _repayKrAsset,
        uint256 _repayAmount,
        address _seizeCollateral
    ) external nonReentrant {
        require(_repayAmount > 0, "liquidate-zero-amount");
        require(cps().debt[_repayKrAsset] >= _repayAmount, "liquidate-too-much");
        require(cps().isLiquidatable(), "not-liquidatable");

        KrAsset memory krAsset = ms().kreskoAssets[_repayKrAsset];
        CollateralAsset memory collateral = ms().collateralAssets[_seizeCollateral];
        uint256 repayAmountUSD = krAsset.uintUSD(_repayAmount);

        require(
            ms().getMaxLiquidation(address(0), krAsset, _seizeCollateral) >= repayAmountUSD,
            Error.LIQUIDATION_OVERFLOW
        );

        uint256 seizeAmount = collateral.decimals.fromWad(
            LibCalculation.calculateAmountToSeize(
                collateral.liquidationIncentive,
                collateral.uintPrice(),
                repayAmountUSD
            )
        );

        cps().debt[_repayKrAsset] -= ms().repaySwap(_repayKrAsset, _repayAmount, msg.sender);
        cps().adjustSeizedCollateral(_seizeCollateral, seizeAmount);

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
}
