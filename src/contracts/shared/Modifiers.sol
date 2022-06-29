// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

import {Authorization, Role} from "../libs/Authorization.sol";
import {Meta} from "../libs/Meta.sol";
import {Error} from "../libs/Errors.sol";

import {Action} from "../minter/MinterTypes.sol";
import {ms} from "../minter/MinterStorage.sol";

import {ENTERED, NOT_ENTERED} from "../diamond/DiamondTypes.sol";
import {ds} from "../diamond/DiamondStorage.sol";

abstract contract DiamondModifiers {
    /**
     * @dev Modifier that checks that an account has a specific role. Reverts
     * with a standardized message including the required role.
     *
     * The format of the revert reason is given by the following regular expression:
     *
     *  /^Authorization: account (0x[0-9a-f]{40}) is missing role (0x[0-9a-f]{64})$/
     *
     * _Available since v4.1._
     */
    modifier onlyRole(bytes32 role) {
        Authorization.checkRole(role);
        _;
    }

    /**
     * @notice Ensure only trusted contracts can act on behalf of `_account`
     * @param _accountIsNotMsgSender The address of the collateral asset.
     */
    modifier onlyRoleIf(bool _accountIsNotMsgSender, bytes32 role) {
        if (_accountIsNotMsgSender) {
            Authorization.checkRole(role);
        }
        _;
    }

    modifier onlyOwner() {
        require(Meta.msgSender() == ds().contractOwner, Error.DIAMOND_INVALID_OWNER);
        _;
    }

    modifier onlyPendingOwner() {
        require(Meta.msgSender() == ds().pendingOwner, Error.DIAMOND_INVALID_PENDING_OWNER);
        _;
    }

    modifier nonReentrant() {
        require(ds().entered == NOT_ENTERED, Error.RE_ENTRANCY);
        ds().entered = ENTERED;
        _;
        ds().entered = NOT_ENTERED;
    }
}

abstract contract MinterModifiers {
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
     * @notice Reverts if a Kresko asset does not exist within the protocol or is not mintable.
     * @param _kreskoAsset The address of the Kresko asset.
     */
    modifier kreskoAssetExistsAndMintable(address _kreskoAsset) {
        require(ms().kreskoAssets[_kreskoAsset].exists, Error.KRASSET_DOESNT_EXIST);
        require(ms().kreskoAssets[_kreskoAsset].mintable, Error.KRASSET_NOT_MINTABLE);
        _;
    }
    /**
     * @notice Reverts if a Kresko asset's price is stale
     * @param _kreskoAsset The address of the Kresko asset.
     */
    modifier kreskoAssetPriceNotStale(address _kreskoAsset) {
        uint256 priceTimestamp = uint256(ms().kreskoAssets[_kreskoAsset].oracle.latestTimestamp());
        // Include a buffer as block.timestamp can be manipulated up to 15 seconds.
        require(block.timestamp < priceTimestamp + ms().secondsUntilStalePrice, "KR: stale price");
        _;
    }
    /**
     * @notice Reverts if a Kresko asset does not exist within the protocol. Does not revert if
     * the Kresko asset is not mintable.
     * @param _kreskoAsset The address of the Kresko asset.
     */
    modifier kreskoAssetExistsMaybeNotMintable(address _kreskoAsset) {
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
}
