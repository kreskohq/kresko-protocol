// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {IERC20Permit} from "vendor/IERC20Permit.sol";
import {AggregatorV3Interface} from "vendor/AggregatorV3Interface.sol";
import {Role} from "common/Types.sol";
import {SDIPrice} from "common/funcs/Prices.sol";

import {DSModifiers} from "diamond/Modifiers.sol";

import {krAssetAmountToSDI} from "scdp/funcs/Conversions.sol";
import {sdi} from "scdp/State.sol";
import {CoverAsset} from "scdp/Types.sol";
import {ISDIFacet} from "scdp/interfaces/ISDIFacet.sol";

contract SDIFacet is ISDIFacet, DSModifiers {
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
        return sdi().effectiveDebtValue();
    }

    function getSDICoverAmount() external view returns (uint256) {
        return sdi().totalCoverAmount();
    }

    function previewSCDPBurn(address asset, uint256 burnAmount, bool ignoreFactors) external view returns (uint256 shares) {
        return krAssetAmountToSDI(asset, burnAmount, ignoreFactors);
    }

    function previewSCDPMint(address asset, uint256 mintAmount, bool ignoreFactors) external view returns (uint256 shares) {
        return krAssetAmountToSDI(asset, mintAmount, ignoreFactors);
    }

    /// @notice Get the price of SDI in USD, oracle precision.
    function getSDIPrice() external view returns (uint256) {
        return SDIPrice();
    }

    function getSDICoverAsset(address asset) external view returns (CoverAsset memory) {
        return sdi().coverAsset[asset];
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
        require(sdi().coverAsset[asset].decimals == 0, "ASSET_ALREADY_ADDED");
        sdi().coverAsset[asset] = CoverAsset(AggregatorV3Interface(oracle), redstoneId, true, IERC20Permit(asset).decimals());
        sdi().coverAssets.push(asset);
    }

    function disableAssetSDI(address asset) external onlyRole(Role.ADMIN) {
        require(sdi().coverAsset[asset].decimals != 0, "ASSET_NOT_ADDED");
        sdi().coverAsset[asset].enabled = false;
    }

    function enableAssetSDI(address asset) external onlyRole(Role.ADMIN) {
        require(sdi().coverAsset[asset].decimals != 0, "ASSET_NOT_ADDED");
        sdi().coverAsset[asset].enabled = true;
    }

    function setCoverRecipientSDI(address coverRecipient) external onlyRole(Role.ADMIN) {
        sdi().coverRecipient = coverRecipient;
    }
}
