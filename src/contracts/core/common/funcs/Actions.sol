// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.21;

import {sdi} from "scdp/State.sol";
import {IKreskoAssetIssuer} from "kresko-asset/IKreskoAssetIssuer.sol";
import {Asset} from "common/Types.sol";
import {CError} from "common/CError.sol";

/* -------------------------------------------------------------------------- */
/*                                   Actions                                  */
/* -------------------------------------------------------------------------- */

/// @notice Burn kresko assets with anchor already known.
/// @param _anchor The anchor token of the asset being burned.
/// @param _burnAmount The amount being burned
/// @param _from The account to burn assets from.
function burnKrAsset(uint256 _burnAmount, address _from, address _anchor) returns (uint256 burned) {
    burned = IKreskoAssetIssuer(_anchor).destroy(_burnAmount, _from);
    if (burned == 0) revert CError.ZERO_BURN(_anchor);
}

/// @notice Mint kresko assets with anchor already known.
/// @param _amount The asset amount being minted
/// @param _to The account receiving minted assets.
/// @param _anchor The anchor token of the minted asset.
function mintKrAsset(uint256 _amount, address _to, address _anchor) returns (uint256 minted) {
    minted = IKreskoAssetIssuer(_anchor).issue(_amount, _to);
    if (minted == 0) revert CError.ZERO_MINT(_anchor);
}

/// @notice Repay SCDP swap debt.
/// @param _asset the asset being repaid
/// @param _burnAmount the asset amount being burned
/// @param _from the account to burn assets from
function burnSCDP(Asset storage _asset, uint256 _burnAmount, address _from) returns (uint256 destroyed) {
    destroyed = burnKrAsset(_burnAmount, _from, _asset.anchor);
    sdi().totalDebt -= _asset.debtAmountToSDI(destroyed, false);
}

/// @notice Mint kresko assets from SCDP swap.
/// @param _asset the asset requested
/// @param _amount the asset amount requested
/// @param _to the account to mint the assets to
function mintSCDP(Asset storage _asset, uint256 _amount, address _to) returns (uint256 issued) {
    issued = mintKrAsset(_amount, _to, _asset.anchor);
    unchecked {
        sdi().totalDebt += _asset.debtAmountToSDI(issued, false);
    }
}
