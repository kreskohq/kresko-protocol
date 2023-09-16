// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

import {ms} from "./State.sol";
import {Action} from "./Types.sol";
import {Error} from "common/Errors.sol";

abstract contract MSModifiers {
    /**
     * @notice Reverts if a collateral asset does not exist within the protocol.
     * @param _collateralAsset The address of the collateral asset.
     */
    modifier collateralAssetExists(address _collateralAsset) {
        require(ms().collateralAssets[_collateralAsset].exists, Error.COLLATERAL_DOESNT_EXIST);
        _;
    }

    /**
     * @notice Reverts if a collateral asset already exists within the protocol.
     * @param _collateralAsset The address of the collateral asset.
     */
    modifier collateralAssetDoesNotExist(address _collateralAsset) {
        require(!ms().collateralAssets[_collateralAsset].exists, Error.COLLATERAL_EXISTS);
        _;
    }

    /**
     * @notice Reverts if a Kresko asset does not exist within the protocol. Does not revert if
     * the Kresko asset is not mintable.
     * @param _kreskoAsset The address of the Kresko asset.
     */
    modifier kreskoAssetExists(address _kreskoAsset) {
        require(ms().kreskoAssets[_kreskoAsset].exists, Error.KRASSET_DOESNT_EXIST);
        _;
    }

    /**
     * @notice Reverts if the symbol of a Kresko asset already exists within the protocol.
     * @param _kreskoAsset The address of the Kresko asset.
     */
    modifier kreskoAssetDoesNotExist(address _kreskoAsset) {
        require(!ms().kreskoAssets[_kreskoAsset].exists, Error.KRASSET_EXISTS);
        _;
    }

    /// @dev Simple check for the enabled flag
    function ensureNotPaused(address _asset, Action _action) internal view virtual {
        require(!ms().safetyState[_asset][_action].pause.enabled, Error.ACTION_PAUSED_FOR_ASSET);
    }
}
