// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.23;

import {Errors} from "common/Errors.sol";
import {Role, Enums} from "common/Constants.sol";
import {mintKrAsset} from "common/funcs/Actions.sol";
import {Modifiers} from "common/Modifiers.sol";
import {cs} from "common/State.sol";
import {Asset} from "common/Types.sol";
import {Strings} from "libs/Strings.sol";

import {IMinterMintFacet} from "minter/interfaces/IMinterMintFacet.sol";

import {MEvent} from "minter/MEvent.sol";
import {ms, MinterState} from "minter/MState.sol";
import {handleMinterFee} from "minter/funcs/MFees.sol";
import {Arrays} from "libs/Arrays.sol";
import {MintArgs} from "common/Args.sol";

/**
 * @author Kresko
 * @title MinterMintFacet
 * @notice Core minting functionality for Kresko Minter.
 */
contract MinterMintFacet is IMinterMintFacet, Modifiers {
    using Strings for bytes32;
    using Arrays for address[];

    /// @inheritdoc IMinterMintFacet
    function mintKreskoAsset(
        MintArgs memory _args,
        bytes[] calldata _updateData
    ) external payable onlyRoleIf(_args.account != msg.sender, Role.MANAGER) nonReentrant usePyth(_updateData) {
        if (_args.amount == 0) revert Errors.ZERO_MINT(Errors.id(_args.krAsset));
        Asset storage asset = cs().onlyMinterMintable(_args.krAsset, Enums.Action.Borrow);

        MinterState storage s = ms();

        if (!asset.isMarketOpen()) revert Errors.MARKET_CLOSED(Errors.id(_args.krAsset), asset.ticker.toString());

        asset.validateMinterDebtLimit(_args.krAsset, _args.amount);

        // If there is a fee for opening a position, handle it
        if (asset.openFee > 0) {
            handleMinterFee(asset, _args.account, _args.amount, Enums.MinterFee.Open);
        }

        uint256 existingDebt = s.accountDebtAmount(_args.account, _args.krAsset, asset);

        // The synthetic asset debt position must be greater than the minimum debt position value
        asset.ensureMinDebtValue(_args.krAsset, existingDebt + _args.amount);

        // If this is the first time the account mints this asset, add to its minted assets
        if (existingDebt == 0) {
            s.mintedKreskoAssets[_args.account].pushUnique(_args.krAsset);
        }

        _args.receiver = _args.receiver == address(0) ? _args.account : _args.receiver;

        // Record the mint.
        unchecked {
            s.kreskoAssetDebt[_args.account][_args.krAsset] += mintKrAsset(_args.amount, _args.receiver, asset.anchor);
        }

        // Check if the account has sufficient collateral to back the new debt
        s.checkAccountCollateral(_args.account);

        // Emit logs
        emit MEvent.KreskoAssetMinted(_args.account, _args.krAsset, _args.amount, _args.receiver);
    }
}
