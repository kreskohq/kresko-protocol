// SPDX-LICENSE-Identifier: MIT

pragma solidity >=0.8.14;

import {SafeERC20Upgradeable, IERC20Upgradeable} from "../../../shared/SafeERC20Upgradeable.sol";
import {DiamondModifiers, MinterModifiers} from "../../../shared/Modifiers.sol";

contract CollateralPoolFacet is DiamondModifieres, MinterModifiers {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    function initialize(uint256 _mcr, uint256 _lt) external onlyOwner {
        cps().minimumCollateralizationRatio = _mcr;
        cps().liquidationThreshold = _lt;
    }

    function depositCollateralPool(address _account, address _collateralAsset, uint256 _amount) external nonReentrant {
        // Transfer tokens into this contract prior to any state changes as an extra measure against re-entrancy.
        IERC20Upgradeable(_collateralAsset).safeTransferFrom(Meta.msgSender(), address(this), _depositAmount);

        // Record the collateral deposit.
        cps().recordCollateralDeposit(_account, _collateralAsset, _depositAmount);
    }

    function withdrawCollateralPool(address _account, address _collateralAsset, uint256 _amount) external nonReentrant {
        // Record the collateral withdrawal.
        cps().recordCollateralWithdrawal(msg.sender, _collateralAsset, _withdrawalAmount);

        // Transfer tokens out of this contract after all state changes.
        IERC20Upgradeable(_collateralAsset).safeTransfer(_account, _withdrawalAmount);
    }
}
