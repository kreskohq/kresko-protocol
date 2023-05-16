// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

/// @title KreskoAsset issuer interface
/// @author Kresko
/// @notice Contract that can issue/destroy Kresko Assets through Kresko
/// @dev This interface is used by KISS & KreskoAssetAnchor
interface IKreskoAssetIssuer {
    function issue(uint256 _assets, address _to) external returns (uint256 shares);

    function destroy(uint256 _assets, address _from) external returns (uint256 shares);

    function convertToShares(uint256 assets) external view returns (uint256);

    function convertToAssets(uint256 shares) external view returns (uint256);
}
