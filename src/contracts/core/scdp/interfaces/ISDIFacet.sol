// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

interface ISDIFacet {
    /// @notice Get the total debt of the SCDP.
    function getTotalSDIDebt() external view returns (uint256);

    /// @notice Get the effective debt value of the SCDP.
    function getEffectiveSDIDebtUSD() external view returns (uint256);

    /// @notice Get the effective debt amount of the SCDP.
    function getEffectiveSDIDebt() external view returns (uint256);

    /// @notice Get the total normalized amount of cover.
    function getSDICoverAmount() external view returns (uint256);

    function previewSCDPBurn(
        address _assetAddr,
        uint256 _burnAmount,
        bool _ignoreFactors
    ) external view returns (uint256 shares);

    function previewSCDPMint(
        address _assetAddr,
        uint256 _mintAmount,
        bool _ignoreFactors
    ) external view returns (uint256 shares);

    /// @notice Simply returns the total supply of SDI.
    function totalSDI() external view returns (uint256);

    /// @notice Get the price of SDI in USD, oracle precision.
    function getSDIPrice() external view returns (uint256);

    /// @notice Cover debt by providing collateral without getting anything in return.
    function coverSCDP(address _assetAddr, uint256 _coverAmount) external returns (uint256 value);

    /// @notice Cover debt by providing collateral, receiving small incentive in return.
    function coverWithIncentiveSCDP(
        address _assetAddr,
        uint256 _coverAmount,
        address _seizeAssetAddr
    ) external returns (uint256 value, uint256 seizedAmount);

    /// @notice Enable a cover asset to be used.
    function enableCoverAssetSDI(address _assetAddr) external;

    /// @notice Disable a cover asset to be used.
    function disableCoverAssetSDI(address _assetAddr) external;

    /// @notice Set the contract holding cover assets.
    function setCoverRecipientSDI(address _coverRecipient) external;

    /// @notice Get all accepted cover assets.
    function getCoverAssetsSDI() external view returns (address[] memory);
}
