// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >=0.8.20;
import {IKreskoAsset} from "./IKreskoAsset.sol";

interface IERC4626Upgradeable {
    /**
     * @notice The underlying Kresko Asset
     */
    function asset() external view returns (IKreskoAsset);

    function deposit(uint256, address) external returns (uint256);

    function withdraw(uint256, address, address) external returns (uint256);

    function maxDeposit(address) external view returns (uint256);

    function maxMint(address) external view returns (uint256 assets);

    function maxRedeem(address owner) external view returns (uint256 assets);

    function maxWithdraw(address owner) external view returns (uint256 assets);

    function mint(uint256 _shares, address _receiver) external returns (uint256 assets);

    function previewDeposit(uint256 assets) external view returns (uint256 shares);

    function previewMint(uint256 shares) external view returns (uint256 assets);

    function previewRedeem(uint256 shares) external view returns (uint256 assets);

    function previewWithdraw(uint256 assets) external view returns (uint256 shares);

    /**
     * @notice Track the underlying amount
     * @return Total supply for the underlying
     */
    function totalAssets() external view returns (uint256);
}
