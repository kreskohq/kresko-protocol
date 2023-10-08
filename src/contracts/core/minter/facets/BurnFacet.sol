// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {Arrays} from "libs/Arrays.sol";
import {Role} from "common/Types.sol";
import {burnKrAsset} from "common/funcs/Actions.sol";
import {cs} from "common/State.sol";
import {Asset, Action} from "common/Types.sol";
import {CModifiers} from "common/Modifiers.sol";
import {CError} from "common/CError.sol";
import {IBurnFacet} from "minter/interfaces/IBurnFacet.sol";
import {MinterFee} from "minter/Types.sol";
import {ms, MinterState} from "minter/State.sol";
import {MEvent} from "minter/Events.sol";
import {handleMinterFee} from "minter/funcs/Fees.sol";

/**
 * @author Kresko
 * @title BurnFacet
 * @notice Main end-user functionality concerning burning of kresko assets
 */
contract BurnFacet is CModifiers, IBurnFacet {
    using Arrays for address[];

    /// @inheritdoc IBurnFacet
    function burnKreskoAsset(
        address _account,
        address _kreskoAsset,
        uint256 _burnAmount,
        uint256 _mintedKreskoAssetIndex
    ) external nonReentrant isKrAsset(_kreskoAsset) onlyRoleIf(_account != msg.sender, Role.MANAGER) {
        if (_burnAmount == 0) revert CError.ZERO_BURN(_kreskoAsset);

        MinterState storage s = ms();
        Asset storage asset = cs().assets[_kreskoAsset];

        if (cs().safetyStateSet) {
            ensureNotPaused(_kreskoAsset, Action.Repay);
        }

        // Get accounts principal debt
        uint256 debtAmount = s.accountDebtAmount(_account, _kreskoAsset, asset);
        if (debtAmount == 0) revert CError.ZERO_DEBT(_kreskoAsset);

        if (_burnAmount != type(uint256).max) {
            if (_burnAmount > debtAmount) revert CError.BURN_AMOUNT_OVERFLOW(_burnAmount, debtAmount);
            // Ensure principal left is either 0 or >= minDebtValue
            _burnAmount = asset.checkDust(_burnAmount, debtAmount);
        } else {
            // Burn full debt
            _burnAmount = debtAmount;
        }

        // Charge the burn fee from collateral of _account
        handleMinterFee(_account, asset, _burnAmount, MinterFee.Close);

        // Record the burn
        s.kreskoAssetDebt[_account][_kreskoAsset] -= burnKrAsset(_burnAmount, msg.sender, asset.anchor);

        // If sender repays all scaled debt of asset, remove it from minted assets array.
        if (s.accountDebtAmount(_account, _kreskoAsset, asset) == 0) {
            s.mintedKreskoAssets[_account].removeAddress(_kreskoAsset, _mintedKreskoAssetIndex);
        }

        // Emit logs
        emit MEvent.KreskoAssetBurned(_account, _kreskoAsset, _burnAmount);
    }
}
