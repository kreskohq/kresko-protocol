// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.23;

import {Arrays} from "libs/Arrays.sol";
import {Role, Enums} from "common/Constants.sol";
import {burnKrAsset} from "common/funcs/Actions.sol";
import {cs} from "common/State.sol";
import {Asset} from "common/Types.sol";
import {Modifiers} from "common/Modifiers.sol";
import {Errors} from "common/Errors.sol";

import {IMinterBurnFacet} from "minter/interfaces/IMinterBurnFacet.sol";
import {ms, MinterState} from "minter/MState.sol";
import {MEvent} from "minter/MEvent.sol";
import {handleMinterFee} from "minter/funcs/MFees.sol";
import {BurnArgs} from "common/Args.sol";

/**
 * @author Kresko
 * @title MinterBurnFacet
 * @notice Core burning functionality for Kresko Minter.
 */
contract MinterBurnFacet is Modifiers, IMinterBurnFacet {
    using Arrays for address[];

    /// @inheritdoc IMinterBurnFacet
    function burnKreskoAsset(
        BurnArgs memory args,
        bytes[] calldata _updateData
    )
        external
        payable
        nonReentrant
        onlyRoleIf(args.account != msg.sender || args.repayee != msg.sender, Role.MANAGER)
        usePyth(_updateData)
    {
        if (args.amount == 0) revert Errors.ZERO_BURN(Errors.id(args.krAsset));
        Asset storage asset = cs().onlyMinterMintable(args.krAsset, Enums.Action.Repay);

        MinterState storage s = ms();
        // Get accounts principal debt
        uint256 debtAmount = s.accountDebtAmount(args.account, args.krAsset, asset);
        if (debtAmount == 0) revert Errors.ZERO_DEBT(Errors.id(args.krAsset));

        if (args.amount != type(uint256).max) {
            if (args.amount > debtAmount) {
                revert Errors.BURN_AMOUNT_OVERFLOW(Errors.id(args.krAsset), args.amount, debtAmount);
            }
            // Ensure principal left is either 0 or >= minDebtValue
            args.amount = asset.checkDust(args.amount, debtAmount);
        } else {
            // Burn full debt
            args.amount = debtAmount;
        }

        // Charge the burn fee from collateral of args.account
        handleMinterFee(asset, args.account, args.amount, Enums.MinterFee.Close);

        // Record the burn
        s.kreskoAssetDebt[args.account][args.krAsset] -= burnKrAsset(args.amount, args.repayee, asset.anchor);

        // If sender repays all debt of asset, remove it from minted assets array.
        if (s.accountDebtAmount(args.account, args.krAsset, asset) == 0) {
            s.mintedKreskoAssets[args.account].removeAddress(args.krAsset, args.mintIndex);
        }

        // Emit logs
        emit MEvent.KreskoAssetBurned(args.account, args.krAsset, args.amount);
    }
}
