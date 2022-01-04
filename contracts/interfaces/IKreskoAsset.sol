// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";

interface IKreskoAsset is IERC20MetadataUpgradeable {
    /**
     * @notice returns the operator role hash
     */
    function OPERATOR_ROLE() external returns (bytes32);

    /**
     * @notice Mints tokens to an address.
     * @dev Only callable by owner.
     * @param _account The recipient address of the mint.
     * @param _amount The amount of tokens to mint.
     */
    function mint(address _account, uint256 _amount) external;

    /**
     * @notice Burns tokens from an address that have been approved to the sender.
     * @dev Only callable by owner which must have the appropriate allowance for _account.
     * @param _account The address to burn tokens from.
     * @param _amount The amount of tokens to burn.
     */
    function burn(address _account, uint256 _amount) external;

    /**
     * @dev Returns `true` if `account` has been granted `role`.
     */
    function hasRole(bytes32 role, address account) external returns (bool);
}
