// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {Role} from "common/Types.sol";
import {SDIPrice} from "common/funcs/Prices.sol";
import {cs} from "common/State.sol";
import {CModifiers} from "common/Modifiers.sol";
import {CError} from "common/Errors.sol";
import {Asset} from "common/Types.sol";

import {DSModifiers} from "diamond/Modifiers.sol";

import {SError} from "scdp/Errors.sol";
import {sdi} from "scdp/State.sol";
import {ISDIFacet} from "scdp/interfaces/ISDIFacet.sol";

contract SDIFacet is ISDIFacet, DSModifiers, CModifiers {
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

    function previewSCDPBurn(address _asset, uint256 _burnAmount, bool _ignoreFactors) external view returns (uint256 shares) {
        return cs().assets[_asset].debtAmountToSDI(_burnAmount, _ignoreFactors);
    }

    function previewSCDPMint(address _asset, uint256 _mintAmount, bool _ignoreFactors) external view returns (uint256 shares) {
        return cs().assets[_asset].debtAmountToSDI(_mintAmount, _ignoreFactors);
    }

    /// @notice Get the price of SDI in USD, oracle precision.
    function getSDIPrice() external view returns (uint256) {
        return SDIPrice();
    }

    function getCoverAssetsSDI() external view returns (address[] memory) {
        return sdi().coverAssets;
    }

    /* -------------------------------------------------------------------------- */
    /*                                Functionality                               */
    /* -------------------------------------------------------------------------- */

    function SDICover(address _asset, uint256 _amount) external returns (uint256 shares, uint256 value) {
        return sdi().cover(_asset, _amount);
    }

    /* -------------------------------------------------------------------------- */
    /*                                    Admin                                   */
    /* -------------------------------------------------------------------------- */

    function enableCoverAssetSDI(address _asset) external onlyRole(Role.ADMIN) {
        Asset memory asset = cs().assets[_asset];
        if (asset.id == bytes12("")) {
            revert SError.INVALID_ASSET_SDI();
        } else if (asset.pushedPrice().price == 0) {
            revert CError.NO_PUSH_PRICE(string(abi.encodePacked(asset.id)));
        } else if (asset.isSCDPCoverAsset) {
            revert SError.ASSET_ALREADY_ENABLED_SDI();
        }

        cs().assets[_asset].isSCDPCoverAsset = true;
        bool shouldPushToAssets = true;
        for (uint256 i; i < sdi().coverAssets.length; i++) {
            if (sdi().coverAssets[i] == _asset) {
                shouldPushToAssets = false;
            }
        }
        if (shouldPushToAssets) {
            sdi().coverAssets.push(_asset);
        }
    }

    function disableCoverAssetSDI(address _asset) external onlyRole(Role.ADMIN) {
        if (!cs().assets[_asset].isSCDPCoverAsset) {
            revert SError.ASSET_ALREADY_DISABLED_SDI();
        }

        cs().assets[_asset].isSCDPCoverAsset = false;
    }

    function setCoverRecipientSDI(address _coverRecipient) external onlyRole(Role.ADMIN) {
        sdi().coverRecipient = _coverRecipient;
    }
}
