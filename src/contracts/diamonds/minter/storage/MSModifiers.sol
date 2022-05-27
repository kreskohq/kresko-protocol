// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import {MS, MinterStorage} from "./MS.sol";

contract MSModifiers {
    /**
     * @notice Reverts if a collateral asset does not exist within the protocol.
     * @param _collateralAsset The address of the collateral asset.
     */
    modifier collateralAssetExists(address _collateralAsset) {
        require(MS.s().collateralAssets[_collateralAsset].exists, "KR: !collateralExists");
        _;
    }

    /**
     * @notice Reverts if a collateral asset already exists within the protocol.
     * @param _collateralAsset The address of the collateral asset.
     */
    modifier collateralAssetDoesNotExist(address _collateralAsset) {
        require(!MS.s().collateralAssets[_collateralAsset].exists, "KR: collateralExists");
        _;
    }

    /**
     * @notice Reverts if a Kresko asset does not exist within the protocol or is not mintable.
     * @param _kreskoAsset The address of the Kresko asset.
     */
    modifier kreskoAssetExistsAndMintable(address _kreskoAsset) {
        MinterStorage storage ms = MS.s();
        require(ms.kreskoAssets[_kreskoAsset].exists, "KR: !krAssetExist");
        require(ms.kreskoAssets[_kreskoAsset].mintable, "KR: !krAssetMintable");
        _;
    }

    /**
     * @notice Reverts if a Kresko asset does not exist within the protocol. Does not revert if
     * the Kresko asset is not mintable.
     * @param _kreskoAsset The address of the Kresko asset.
     */
    modifier kreskoAssetExistsMaybeNotMintable(address _kreskoAsset) {
        require(MS.s().kreskoAssets[_kreskoAsset].exists, "KR: !krAssetExist");
        _;
    }

    /**
     * @notice Reverts if the symbol of a Kresko asset already exists within the protocol.
     * @param _kreskoAsset The address of the Kresko asset.
     * @param _symbol The symbol of the Kresko asset.
     */
    modifier kreskoAssetDoesNotExist(address _kreskoAsset, string calldata _symbol) {
        MinterStorage storage ms = MS.s();
        require(!ms.kreskoAssets[_kreskoAsset].exists, "KR: krAssetExists");
        require(!ms.kreskoAssetSymbols[_symbol], "KR: symbolExists");
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
