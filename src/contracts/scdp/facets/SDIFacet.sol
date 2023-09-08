// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {sdi, Asset} from "scdp/libs/LibSDI.sol";
// import {ms} from "minter/libs/LibMinterBig.sol";
// import {scdp} from "scdp/libs/LibSCDP.sol";
import {Shared} from "common/libs/Shared.sol";
import {ISDIFacet} from "scdp/interfaces/ISDIFacet.sol";
import {IERC20Permit} from "common/IERC20Permit.sol";
import {DiamondModifiers} from "diamond/libs/LibDiamond.sol";
import {Role} from "common/libs/Authorization.sol";
import {AggregatorV3Interface} from "common/AggregatorV3Interface.sol";

contract SDIFacet is ISDIFacet, DiamondModifiers {
    function initialize(address coverRecipient) external onlyOwner {
        sdi().coverRecipient = coverRecipient;
    }

    /* -------------------------------------------------------------------------- */
    /*                                    Views                                   */
    /* -------------------------------------------------------------------------- */
    /// @notice Simply returns the total supply of SDI.
    function totalSDI() external view returns (uint256) {
        return sdi().totalSDI();
    }

    function getTotalSDIDebt() external view returns (uint256) {
        return uint256(sdi().totalDebt);
    }

    function getEffectiveSDIDebt() external view returns (uint256) {
        return sdi().effectiveDebt();
    }

    function getEffectiveSDIDebtUSD() external view returns (uint256) {
        return sdi().effectiveDebtUSD();
    }

    function getSDICoverAmount() external view returns (uint256) {
        return sdi().totalCoverAmount();
    }

    function previewSCDPBurn(
        address asset,
        uint256 burnAmount,
        bool ignoreFactors
    ) external view returns (uint256 shares) {
        return Shared.previewSCDPBurn(asset, burnAmount, ignoreFactors);
    }

    function previewSCDPMint(
        address asset,
        uint256 mintAmount,
        bool ignoreFactors
    ) external view returns (uint256 shares) {
        return Shared.previewSCDPMint(asset, mintAmount, ignoreFactors);
    }

    /// @notice Get the price of SDI in USD, oracle precision.
    function getSDIPrice() external view returns (uint256) {
        return Shared.SDIPrice();
    }

    function getSDICoverAsset(address asset) external view returns (Asset memory) {
        return sdi().coverAssets[asset];
    }

    /* -------------------------------------------------------------------------- */
    /*                                Functionality                               */
    /* -------------------------------------------------------------------------- */

    function SDICover(address asset, uint256 amount) external returns (uint256 shares, uint256 value) {
        return sdi().cover(asset, amount);
    }

    /* -------------------------------------------------------------------------- */
    /*                                    Admin                                   */
    /* -------------------------------------------------------------------------- */

    function addAssetSDI(address asset, address oracle, bytes32 redstoneId) external onlyRole(Role.ADMIN) {
        require(sdi().coverAssets[asset].decimals == 0, "ASSET_ALREADY_ADDED");
        sdi().coverAssets[asset] = Asset(
            AggregatorV3Interface(oracle),
            redstoneId,
            true,
            IERC20Permit(asset).decimals()
        );
        sdi().coverAssetList.push(asset);
    }

    function disableAssetSDI(address asset) external onlyRole(Role.ADMIN) {
        require(sdi().coverAssets[asset].decimals != 0, "ASSET_NOT_ADDED");
        sdi().coverAssets[asset].enabled = false;
    }

    function enableAssetSDI(address asset) external onlyRole(Role.ADMIN) {
        require(sdi().coverAssets[asset].decimals != 0, "ASSET_NOT_ADDED");
        sdi().coverAssets[asset].enabled = true;
    }

    function setCoverRecipientSDI(address coverRecipient) external onlyRole(Role.ADMIN) {
        sdi().coverRecipient = coverRecipient;
    }
}
