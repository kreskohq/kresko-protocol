// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {Arrays} from "libs/Arrays.sol";
import {Error} from "common/Errors.sol";
import {Role} from "common/Types.sol";
import {mintKrAsset} from "common/funcs/Actions.sol";

import {DSModifiers} from "diamond/Modifiers.sol";
import {IKreskoAsset} from "kresko-asset/IKreskoAsset.sol";

import {IMintFacet} from "minter/interfaces/IMintFacet.sol";
import {MSModifiers} from "minter/Modifiers.sol";
import {MEvent} from "minter/Events.sol";
import {ms, MinterState} from "minter/State.sol";
import {Action, KrAsset} from "minter/Types.sol";
import {minCollateralValueAtRatio} from "minter/funcs/Common.sol";
import {handleMinterOpenFee} from "minter/funcs/Fees.sol";

/**
 * @author Kresko
 * @title MintFacet
 * @notice Main end-user functionality concerning minting kresko assets
 */

contract MintFacet is DSModifiers, MSModifiers, IMintFacet {
    /* -------------------------------------------------------------------------- */
    /*                                  KrAssets                                  */
    /* -------------------------------------------------------------------------- */

    /// @inheritdoc IMintFacet
    function mintKreskoAsset(
        address _account,
        address _kreskoAsset,
        uint256 _mintAmount
    ) external nonReentrant kreskoAssetExists(_kreskoAsset) onlyRoleIf(_account != msg.sender, Role.MANAGER) {
        require(_mintAmount > 0, Error.ZERO_MINT);

        MinterState storage s = ms();
        if (s.safetyStateSet) {
            super.ensureNotPaused(_kreskoAsset, Action.Borrow);
        }
        // Enforce krAsset's total supply limit
        KrAsset memory krAsset = s.kreskoAssets[_kreskoAsset];
        require(krAsset.marketStatus(), Error.KRASSET_MARKET_CLOSED);

        require(
            IKreskoAsset(_kreskoAsset).totalSupply() + _mintAmount <= krAsset.supplyLimit,
            Error.KRASSET_MAX_SUPPLY_REACHED
        );

        if (krAsset.openFee > 0) {
            handleMinterOpenFee(_account, _kreskoAsset, _mintAmount);
        }
        {
            // Get the account's current minimum collateral value required to maintain current debts.
            // Calculate additional collateral amount required to back requested additional mint.
            // Verify that minter has sufficient collateral to back current debt + new requested debt.
            require(
                s.accountMinCollateralAtRatio(_account, s.minCollateralRatio) +
                    minCollateralValueAtRatio(_kreskoAsset, _mintAmount, s.minCollateralRatio) <=
                    s.accountCollateralValue(_account),
                Error.KRASSET_COLLATERAL_LOW
            );
        }

        // The synthetic asset debt position must be greater than the minimum debt position value
        uint256 existingDebt = s.accountDebtAmount(_account, _kreskoAsset);
        require(
            krAsset.uintUSD(existingDebt + _mintAmount, s.oracleDeviationPct) >= s.minDebtValue,
            Error.KRASSET_MINT_AMOUNT_LOW
        );

        // If the account does not have an existing debt for this Kresko Asset,
        // push it to the list of the account's minted Kresko Assets.
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
        s.kreskoAssetDebt[_account][_kreskoAsset] += mintKrAsset(_mintAmount, _account, krAsset.anchor);

        // Emit logs
        emit MEvent.KreskoAssetMinted(_account, _kreskoAsset, _mintAmount);
    }
}
