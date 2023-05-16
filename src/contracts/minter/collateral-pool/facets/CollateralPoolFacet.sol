// SPDX-LICENSE-Identifier: MIT

pragma solidity >=0.8.14;

import {SafeERC20Upgradeable, IERC20Upgradeable} from "../../../shared/SafeERC20Upgradeable.sol";
import {DiamondModifiers, MinterModifiers} from "../../../shared/Modifiers.sol";
import {ms} from "../../MinterStorage.sol";
import {ICollateralPoolFacet} from "../interfaces/ICollateralPoolFacet.sol";
import {cps} from "../CollateralPoolState.sol";

contract CollateralPoolFacet is ICollateralPoolFacet, DiamondModifiers, MinterModifiers {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    /// @inheritdoc ICollateralPoolFacet
    function poolDeposit(address _account, address _collateralAsset, uint256 _amount) external nonReentrant {
        // Transfer tokens into this contract prior to any state changes as an extra measure against re-entrancy.
        IERC20Upgradeable(_collateralAsset).safeTransferFrom(msg.sender, address(this), _amount);

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
        require(
            cps().checkRatio(_collateralAsset, collateralOut, cps().minimumCollateralizationRatio),
            "withdraw-mcr-violation"
        );

        // Send out the collateral.
        IERC20Upgradeable(_collateralAsset).safeTransfer(_account, collateralOut + feesOut);

        // Emit event.
        emit CollateralPoolWithdraw(_account, _collateralAsset, collateralOut, feesOut);
    }
}
