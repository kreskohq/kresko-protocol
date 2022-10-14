// SPDX-License-Identifier: agpl-3.0
pragma solidity >=0.8.14;
import {ERC20Upgradeable} from "../shared/ERC20Upgradeable.sol";

/**
 * @title DebtTokenBase
 * @notice Base contract for different types of debt tokens
 * @author Aave
 */

abstract contract DebtTokenBase is ERC20Upgradeable {
    /**
     * @dev Being non transferrable, the debt token does not implement any of the
     * standard ERC20 functions for transfer and allowance.
     **/
    function transfer(address recipient, uint256 amount) public virtual override returns (bool) {
        recipient;
        amount;
        revert("TRANSFER_NOT_SUPPORTED");
    }

    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        owner;
        spender;
        revert("ALLOWANCE_NOT_SUPPORTED");
    }

    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        spender;
        amount;
        revert("APPROVAL_NOT_SUPPORTED");
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public virtual override returns (bool) {
        sender;
        recipient;
        amount;
        revert("TRANSFER_NOT_SUPPORTED");
    }

    function increaseAllowance(address spender, uint256 addedValue) public virtual returns (bool) {
        spender;
        addedValue;
        revert("ALLOWANCE_NOT_SUPPORTED");
    }

    function decreaseAllowance(address spender, uint256 subtractedValue) public virtual returns (bool) {
        spender;
        subtractedValue;
        revert("ALLOWANCE_NOT_SUPPORTED");
    }
}
