// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {Error} from "common/Errors.sol";
import {Role} from "common/Types.sol";
import {mintKrAsset} from "common/funcs/Actions.sol";
import {CModifiers} from "common/Modifiers.sol";
import {cs} from "common/State.sol";
import {Asset, Action} from "common/Types.sol";

import {IKreskoAsset} from "kresko-asset/IKreskoAsset.sol";
import {IMintFacet} from "minter/interfaces/IMintFacet.sol";

import {MEvent} from "minter/Events.sol";
import {ms, MinterState} from "minter/State.sol";
import {handleMinterOpenFee} from "minter/funcs/Fees.sol";

/**
 * @author Kresko
 * @title MintFacet
 * @notice Main end-user functionality concerning minting kresko assets
 */
contract MintFacet is IMintFacet, CModifiers {
    /* -------------------------------------------------------------------------- */
    /*                                  KrAssets                                  */
    /* -------------------------------------------------------------------------- */

    /// @inheritdoc IMintFacet
    function mintKreskoAsset(
        address _account,
        address _kreskoAsset,
        uint256 _mintAmount
    ) external nonReentrant gate isKrAsset(_kreskoAsset) onlyRoleIf(_account != msg.sender, Role.MANAGER) {
        require(_mintAmount > 0, Error.ZERO_MINT);

        MinterState storage s = ms();
        if (cs().safetyStateSet) {
            super.ensureNotPaused(_kreskoAsset, Action.Borrow);
        }
        // Enforce krAsset's total supply limit
        Asset memory krAsset = cs().assets[_kreskoAsset];
        require(krAsset.marketStatus(), Error.KRASSET_MARKET_CLOSED);

        require(
            IKreskoAsset(_kreskoAsset).totalSupply() + _mintAmount <= krAsset.supplyLimit,
            Error.KRASSET_MAX_SUPPLY_REACHED
        );
        // If there is a fee for opening a position, handle it
        if (krAsset.openFee > 0) {
            handleMinterOpenFee(_account, krAsset, _mintAmount);
        }
        {
            // Check if the account has sufficient collateral to back the new debt
            require(
                s.accountMinCollateralAtRatio(_account, s.minCollateralRatio) +
                    krAsset.minCollateralValueAtRatio(_mintAmount, s.minCollateralRatio) <=
                    s.accountCollateralValue(_account),
                Error.KRASSET_COLLATERAL_LOW
            );
        }

        // The synthetic asset debt position must be greater than the minimum debt position value
        uint256 existingDebt = s.accountDebtAmount(_account, _kreskoAsset, krAsset);
        require(krAsset.uintUSD(existingDebt + _mintAmount) >= cs().minDebtValue, Error.KRASSET_MINT_AMOUNT_LOW);

        // If this is the first time the account mints this asset, add to its minted assets
        if (existingDebt == 0) {
            bool exists = false;
            uint256 length = s.mintedKreskoAssets[_account].length;
            for (uint256 i; i < length; ) {
                if (s.mintedKreskoAssets[_account][i] == _kreskoAsset) {
                    exists = true;
                    break;
                }
                unchecked {
                    ++i;
                }
            }

            if (!exists) {
                s.mintedKreskoAssets[_account].push(_kreskoAsset);
            }
        }

        // Record the mint.
        unchecked {
            s.kreskoAssetDebt[_account][_kreskoAsset] += mintKrAsset(_mintAmount, _account, krAsset.anchor);
        }

        // Emit logs
        emit MEvent.KreskoAssetMinted(_account, _kreskoAsset, _mintAmount);
    }
}
