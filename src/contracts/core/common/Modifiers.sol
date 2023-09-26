// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

import {Error} from "common/Errors.sol";
import {Auth} from "common/Auth.sol";
import {NOT_ENTERED, ENTERED, Action} from "common/Types.sol";
import {cs} from "common/State.sol";
import {IERC1155} from "common/interfaces/IERC1155.sol";

contract CModifiers {
    /**
     * @dev Modifier that checks that an account has a specific role. Reverts
     * with a standardized message including the required role.
     *
     * The format of the revert reason is given by the following regular expression:
     *
     *  /^AccessControl: account (0x[0-9a-f]{40}) is missing role (0x[0-9a-f]{64})$/
     *
     * _Available since v4.1._
     */
    modifier onlyRole(bytes32 role) {
        Auth.checkRole(role);
        _;
    }

    /**
     * @notice Ensure only trusted contracts can act on behalf of `_account`
     * @param _accountIsNotMsgSender The address of the collateral asset.
     */
    modifier onlyRoleIf(bool _accountIsNotMsgSender, bytes32 role) {
        if (_accountIsNotMsgSender) {
            Auth.checkRole(role);
        }
        _;
    }

    modifier nonReentrant() {
        require(cs().entered == NOT_ENTERED, Error.RE_ENTRANCY);
        cs().entered = ENTERED;
        _;
        cs().entered = NOT_ENTERED;
    }

    /**
     * @notice Reverts if a collateral asset does not exist within the protocol.
     * @param _collateralAsset The address of the collateral asset.
     */
    modifier collateralAssetExists(address _collateralAsset) {
        require(cs().assets[_collateralAsset].isCollateral, Error.COLLATERAL_DOESNT_EXIST);
        _;
    }

    /**
     * @notice Reverts if a collateral asset already exists within the protocol.
     * @param _collateralAsset The address of the collateral asset.
     */
    modifier collateralAssetDoesNotExist(address _collateralAsset) {
        require(!cs().assets[_collateralAsset].isCollateral, Error.COLLATERAL_EXISTS);
        _;
    }

    /**
     * @notice Reverts if a Kresko asset does not exist within the protocol. Does not revert if
     * the Kresko asset is not mintable.
     * @param _kreskoAsset The address of the Kresko asset.
     */
    modifier kreskoAssetExists(address _kreskoAsset) {
        require(cs().assets[_kreskoAsset].isKrAsset, Error.KRASSET_DOESNT_EXIST);
        _;
    }

    /**
     * @notice Reverts if the symbol of a Kresko asset already exists within the protocol.
     * @param _kreskoAsset The address of the Kresko asset.
     */
    modifier kreskoAssetDoesNotExist(address _kreskoAsset) {
        require(!cs().assets[_kreskoAsset].isKrAsset, Error.KRASSET_EXISTS);
        _;
    }

    /// @notice Reverts if the caller does not have the required NFT's for the gated phase
    modifier gate() {
        uint8 phase = cs().phase;
        if (phase <= 2) {
            require(IERC1155(cs().kreskian).balanceOf(msg.sender, 0) > 0, Error.MISSING_PHASE_3_NFT);
        }
        if (phase == 1) {
            require(
                IERC1155(cs().questForKresk).balanceOf(msg.sender, 2) > 0 ||
                    IERC1155(cs().questForKresk).balanceOf(msg.sender, 3) > 0,
                Error.MISSING_PHASE_2_NFT
            );
        } else if (phase == 0) {
            require(IERC1155(cs().questForKresk).balanceOf(msg.sender, 3) > 0, Error.MISSING_PHASE_1_NFT);
        }
        _;
    }

    /// @dev Simple check for the enabled flag
    function ensureNotPaused(address _asset, Action _action) internal view virtual {
        require(!cs().safetyState[_asset][_action].pause.enabled, Error.ACTION_PAUSED_FOR_ASSET);
    }
}
