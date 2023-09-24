// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

import {ms} from "./State.sol";
import {Action} from "./Types.sol";
import {Error} from "common/Errors.sol";
import {IERC1155} from "./interfaces/IERC1155.sol";

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

    /// @notice Reverts if the caller does not have the required NFT's for the gated phase
    modifier gate() {
        uint8 phase = ms().phase;
        if (phase <= 2) {
            require(IERC1155(ms().kreskian).balanceOf(msg.sender, 0) > 0, Error.MISSING_PHASE_3_NFT);
        }
        if (phase == 1) {
            require(
                IERC1155(ms().questForKresk).balanceOf(msg.sender, 2) > 0 ||
                    IERC1155(ms().questForKresk).balanceOf(msg.sender, 3) > 0,
                Error.MISSING_PHASE_2_NFT
            );
        } else if (phase == 0) {
            require(IERC1155(ms().questForKresk).balanceOf(msg.sender, 3) > 0, Error.MISSING_PHASE_1_NFT);
        }
        _;
    }

    /// @dev Simple check for the enabled flag
    function ensureNotPaused(address _asset, Action _action) internal view virtual {
        require(!ms().safetyState[_asset][_action].pause.enabled, Error.ACTION_PAUSED_FOR_ASSET);
    }
}
