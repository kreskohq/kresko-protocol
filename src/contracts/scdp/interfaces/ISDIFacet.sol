// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

import {CoverAsset} from "scdp/Types.sol";

interface ISDIFacet {
    function initialize(address coverRecipient) external;

    function getTotalSDIDebt() external view returns (uint256);

    function addAssetSDI(address asset, address oracle, bytes32 redstoneId) external;

    function getEffectiveSDIDebtUSD() external view returns (uint256);

    function getEffectiveSDIDebt() external view returns (uint256);

    function getSDICoverAmount() external view returns (uint256);

    function previewSCDPBurn(address asset, uint256 burnAmount, bool ignoreFactors) external view returns (uint256 shares);

    function previewSCDPMint(address asset, uint256 mintAmount, bool ignoreFactors) external view returns (uint256 shares);

    function disableAssetSDI(address asset) external;

    function enableAssetSDI(address asset) external;

    function setCoverRecipientSDI(address coverRecipient) external;

    function getSDICoverAsset(address asset) external view returns (CoverAsset memory);

    /// @notice Simply returns the total supply of SDI.
    function totalSDI() external view returns (uint256);

    /// @notice Get the price of SDI in USD, oracle precision.
    function getSDIPrice() external view returns (uint256);

    function SDICover(address asset, uint256 amount) external returns (uint256 shares, uint256 value);
}
