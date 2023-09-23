// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {ms} from "minter/State.sol";
import {sdi} from "scdp/State.sol";
import {IKreskoAssetIssuer} from "kresko-asset/IKreskoAssetIssuer.sol";
import {krAssetAmountToSDI} from "scdp/funcs/Conversions.sol";

/* -------------------------------------------------------------------------- */
/*                                   Actions                                  */
/* -------------------------------------------------------------------------- */

/// @notice Burn kresko assets.
/// @param _kreskoAsset The asset being burned.
/// @param _burnAmount The amount to burn.
/// @param _from The account to burn assets from.
function burnKrAsset(address _kreskoAsset, uint256 _burnAmount, address _from) returns (uint256 burned) {
    return burnKrAsset(_burnAmount, _from, ms().kreskoAssets[_kreskoAsset].anchor);
}

/// @notice Burn kresko assets with anchor already known.
/// @param _anchor The anchor token of the asset being burned.
/// @param _burnAmount The amount being burned
/// @param _from The account to burn assets from.
function burnKrAsset(uint256 _burnAmount, address _from, address _anchor) returns (uint256 burned) {
    burned = IKreskoAssetIssuer(_anchor).destroy(_burnAmount, _from);
    require(burned != 0, "zero-burn");
}

/// @notice Mint kresko assets.
/// @param _kreskoAsset The asset being issued
/// @param _amount The asset amount being minted
/// @param _to The account receiving minted assets.
function mintKrAsset(address _kreskoAsset, uint256 _amount, address _to) returns (uint256 minted) {
    return mintKrAsset(_amount, _to, ms().kreskoAssets[_kreskoAsset].anchor);
}

/// @notice Mint kresko assets with anchor already known.
/// @param _amount The asset amount being minted
/// @param _to The account receiving minted assets.
/// @param _anchor The anchor token of the minted asset.
function mintKrAsset(uint256 _amount, address _to, address _anchor) returns (uint256 minted) {
    minted = IKreskoAssetIssuer(_anchor).issue(_amount, _to);
    require(minted != 0, "zero-mint");
}

/// @notice Repay SCDP swap debt.
/// @param _kreskoAsset the asset being repaid
/// @param _burnAmount the asset amount being burned
/// @param _from the account to burn assets from
function burnSCDP(address _kreskoAsset, uint256 _burnAmount, address _from) returns (uint256 destroyed) {
    destroyed = burnKrAsset(_kreskoAsset, _burnAmount, _from);
    sdi().totalDebt -= krAssetAmountToSDI(_kreskoAsset, destroyed, false);
}

/// @notice Mint kresko assets from SCDP swap.
/// @param _kreskoAsset the asset requested
/// @param _amount the asset amount requested
/// @param _to the account to mint the assets to
function mintSCDP(address _kreskoAsset, uint256 _amount, address _to) returns (uint256 issued) {
    issued = mintKrAsset(_kreskoAsset, _amount, _to);
    sdi().totalDebt += krAssetAmountToSDI(_kreskoAsset, issued, false);
}
