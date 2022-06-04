// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import {Error} from "./Errors.sol";
import {LibMeta} from "./libraries/LibMeta.sol";
import {WithStorage} from "./WithStorage.sol";
import {AccessControl} from "./libraries/AccessControl.sol";

abstract contract DiamondModifiers is WithStorage {
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
        AccessControl.checkRole(role);
        _;
    }

    modifier onlyOwner() {
        require(LibMeta.msgSender() == ds().contractOwner, Error.DIAMOND_INVALID_OWNER);
        _;
    }

    modifier onlyPendingOwner() {
        require(LibMeta.msgSender() == ds().pendingOwner, Error.DIAMOND_INVALID_PENDING_OWNER);
        _;
    }
}

abstract contract MinterModifiers is DiamondModifiers {
    /**
     * @notice Reverts if a collateral asset does not exist within the protocol.
     * @param _collateralAsset The address of the collateral asset.
     */
    modifier collateralAssetExists(address _collateralAsset) {
        require(ms().collateralAssets[_collateralAsset].exists, "KR: !collateralExists");
        _;
    }

    /**
     * @notice Reverts if a collateral asset already exists within the protocol.
     * @param _collateralAsset The address of the collateral asset.
     */
    modifier collateralAssetDoesNotExist(address _collateralAsset) {
        require(!ms().collateralAssets[_collateralAsset].exists, "KR: collateralExists");
        _;
    }

    /**
     * @notice Reverts if a Kresko asset does not exist within the protocol or is not mintable.
     * @param _kreskoAsset The address of the Kresko asset.
     */
    modifier kreskoAssetExistsAndMintable(address _kreskoAsset) {
        require(ms().kreskoAssets[_kreskoAsset].exists, "KR: !krAssetExist");
        require(ms().kreskoAssets[_kreskoAsset].mintable, "KR: !krAssetMintable");
        _;
    }

    /**
     * @notice Reverts if a Kresko asset does not exist within the protocol. Does not revert if
     * the Kresko asset is not mintable.
     * @param _kreskoAsset The address of the Kresko asset.
     */
    modifier kreskoAssetExistsMaybeNotMintable(address _kreskoAsset) {
        require(ms().kreskoAssets[_kreskoAsset].exists, "KR: !krAssetExist");
        _;
    }

    /**
     * @notice Reverts if the symbol of a Kresko asset already exists within the protocol.
     * @param _kreskoAsset The address of the Kresko asset.
     * @param _symbol The symbol of the Kresko asset.
     */
    modifier kreskoAssetDoesNotExist(address _kreskoAsset, string calldata _symbol) {
        require(!ms().kreskoAssets[_kreskoAsset].exists, "KR: krAssetExists");
        require(!ms().kreskoAssetSymbols[_symbol], "KR: symbolExists");
        _;
    }

    /**
     * @notice Reverts if provided string is empty.
     * @param _str The string to ensure is not empty.
     */
    modifier nonNullString(string calldata _str) {
        require(bytes(_str).length > 0, "KR: !string");
        _;
    }
}
