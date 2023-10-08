// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.21;

import {CError} from "common/CError.sol";
import {Role} from "common/Types.sol";
import {mintKrAsset} from "common/funcs/Actions.sol";
import {CModifiers} from "common/Modifiers.sol";
import {cs} from "common/State.sol";
import {Asset, Action} from "common/Types.sol";
import {Strings} from "libs/Strings.sol";

import {IKreskoAsset} from "kresko-asset/IKreskoAsset.sol";
import {IMintFacet} from "minter/interfaces/IMintFacet.sol";

import {MEvent} from "minter/Events.sol";
import {MinterFee} from "minter/Types.sol";
import {ms, MinterState} from "minter/State.sol";
import {handleMinterFee} from "minter/funcs/Fees.sol";

// solhint-disable code-complexity

/**
 * @author Kresko
 * @title MintFacet
 * @notice Main end-user functionality concerning minting kresko assets
 */
contract MintFacet is IMintFacet, CModifiers {
    using Strings for bytes32;
    using Strings for bytes12;

    /* -------------------------------------------------------------------------- */
    /*                                  KrAssets                                  */
    /* -------------------------------------------------------------------------- */

    /// @inheritdoc IMintFacet
    function mintKreskoAsset(
        address _account,
        address _kreskoAsset,
        uint256 _mintAmount
    ) external nonReentrant gate isKrAsset(_kreskoAsset) onlyRoleIf(_account != msg.sender, Role.MANAGER) {
        if (_mintAmount == 0) revert CError.ZERO_MINT(_kreskoAsset);

        MinterState storage s = ms();

        if (cs().safetyStateSet) {
            super.ensureNotPaused(_kreskoAsset, Action.Borrow);
        }
        // Enforce krAsset's total supply limit
        Asset storage asset = cs().assets[_kreskoAsset];

        if (!asset.marketStatus()) revert CError.MARKET_CLOSED(_kreskoAsset, asset.underlyingId.toString());

        uint256 newSupply = IKreskoAsset(_kreskoAsset).totalSupply() + _mintAmount;
        if (newSupply > asset.supplyLimit) revert CError.MAX_SUPPLY_EXCEEDED(_kreskoAsset, newSupply, asset.supplyLimit);

        // If there is a fee for opening a position, handle it
        if (asset.openFee > 0) {
            handleMinterFee(_account, asset, _mintAmount, MinterFee.Open);
        }
        uint256 existingDebt = s.accountDebtAmount(_account, _kreskoAsset, asset);

        // The synthetic asset debt position must be greater than the minimum debt position value
        asset.checkMinDebtValue(_kreskoAsset, existingDebt + _mintAmount);

        // If this is the first time the account mints this asset, add to its minted assets
        if (existingDebt == 0) {
            s.maybePushToMintedAssets(_account, _kreskoAsset);
        }

        // Record the mint.
        unchecked {
            s.kreskoAssetDebt[_account][_kreskoAsset] += mintKrAsset(_mintAmount, _account, asset.anchor);
        }

        // Check if the account has sufficient collateral to back the new debt
        s.checkAccountCollateral(_account);

        // Emit logs
        emit MEvent.KreskoAssetMinted(_account, _kreskoAsset, _mintAmount);
    }
}
