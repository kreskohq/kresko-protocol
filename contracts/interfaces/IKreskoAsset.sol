// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

interface IKreskoAsset is IERC20Metadata {
    /**
     * @notice Mints tokens to any address.
     * @dev Only callable by owner.
     * @param _account The recipient address of the mint.
     * @param _amount The amount of tokens to mint.
     */
    function mint(address _account, uint256 _amount) external;

    /**
     * @notice Burns tokens from the owner's address.
     * @dev Only callable by owner.
     * @param _amount The amount of tokens to burn.
     */
    function burn(uint256 _amount) external;
}
