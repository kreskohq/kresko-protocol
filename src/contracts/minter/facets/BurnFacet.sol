// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {Arrays} from "libs/Arrays.sol";
import {Role} from "common/Types.sol";
import {Error} from "common/Errors.sol";
import {burnKrAsset} from "common/funcs/Actions.sol";

import {DSModifiers} from "diamond/Modifiers.sol";

import {IBurnFacet} from "minter/interfaces/IBurnFacet.sol";
import {MSModifiers} from "minter/Modifiers.sol";
import {ms, MinterState} from "minter/State.sol";
import {MEvent} from "minter/Events.sol";
import {Action} from "minter/Types.sol";
import {handleMinterCloseFee} from "minter/funcs/Fees.sol";

/**
 * @author Kresko
 * @title BurnFacet
 * @notice Main end-user functionality concerning burning of kresko assets
 */
contract BurnFacet is DSModifiers, MSModifiers, IBurnFacet {
    using Arrays for address[];

    /// @inheritdoc IBurnFacet
    function burnKreskoAsset(
        address _account,
        address _kreskoAsset,
        uint256 _burnAmount,
        uint256 _mintedKreskoAssetIndex
    ) external nonReentrant kreskoAssetExists(_kreskoAsset) onlyRoleIf(_account != msg.sender, Role.MANAGER) {
        require(_burnAmount > 0, Error.ZERO_BURN);
        MinterState storage s = ms();

        if (s.safetyStateSet) {
            ensureNotPaused(_kreskoAsset, Action.Repay);
        }

        // Get accounts principal debt
        uint256 debtAmount = s.accountDebtAmount(_account, _kreskoAsset);
        require(debtAmount != 0, Error.ZERO_DEBT);

        if (_burnAmount != type(uint256).max) {
            require(_burnAmount <= debtAmount, Error.KRASSET_BURN_AMOUNT_OVERFLOW);
            // Ensure principal left is either 0 or >= minDebtValue
            _burnAmount = s.handleDustPosition(_kreskoAsset, _burnAmount, debtAmount);
        } else {
            // _burnAmount of uint256 max, burn all principal debt
            _burnAmount = debtAmount;
        }

        // Charge the burn fee from collateral of _account
        handleMinterCloseFee(_account, _kreskoAsset, _burnAmount);

        // Record the burn
        s.kreskoAssetDebt[_account][_kreskoAsset] -= burnKrAsset(
            _burnAmount,
            _account,
            s.kreskoAssets[_kreskoAsset].anchor
        );

        // If sender repays all scaled debt of asset, remove it from minted assets array.
        if (s.accountDebtAmount(_account, _kreskoAsset) == 0) {
            s.mintedKreskoAssets[_account].removeAddress(_kreskoAsset, _mintedKreskoAssetIndex);
        }

        // Emit logs
        emit MEvent.KreskoAssetBurned(_account, _kreskoAsset, _burnAmount);
    }
}
