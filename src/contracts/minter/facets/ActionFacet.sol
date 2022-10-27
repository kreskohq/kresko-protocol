// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

import {IActionFacet} from "../interfaces/IActionFacet.sol";
import {IKreskoAsset} from "../../kreskoasset/IKreskoAsset.sol";
import {IKreskoAssetIssuer} from "../../kreskoasset/IKreskoAssetIssuer.sol";

import {Arrays} from "../../libs/Arrays.sol";
import {Error} from "../../libs/Errors.sol";
import {Role} from "../../libs/Authorization.sol";
import {WadRay} from "../../libs/WadRay.sol";
import {MinterEvent} from "../../libs/Events.sol";

import {SafeERC20Upgradeable, IERC20Upgradeable} from "../../shared/SafeERC20Upgradeable.sol";
import {DiamondModifiers, MinterModifiers} from "../../shared/Modifiers.sol";
import {Action, FixedPoint, KrAsset} from "../MinterTypes.sol";
import {ms, MinterState} from "../MinterStorage.sol";
import {irs} from "../InterestRateState.sol";

contract ActionFacet is DiamondModifiers, MinterModifiers, IActionFacet {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using FixedPoint for FixedPoint.Unsigned;
    using Arrays for address[];

    /* -------------------------------------------------------------------------- */
    /*                                 Collateral                                 */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Deposits collateral into the protocol.
     * @param _account The user to deposit collateral for.
     * @param _collateralAsset The address of the collateral asset.
     * @param _amount The amount of the collateral asset to deposit.
     */
    function depositCollateral(
        address _account,
        address _collateralAsset,
        uint256 _amount
    ) external nonReentrant collateralAssetExists(_collateralAsset) {
        if (ms().safetyStateSet) {
            ensureNotPaused(_collateralAsset, Action.Deposit);
        }

        // Transfer tokens into this contract prior to any state changes as an extra measure against re-entrancy.
        IERC20Upgradeable(_collateralAsset).safeTransferFrom(msg.sender, address(this), _amount);

        // Record the collateral deposit.
        ms().recordCollateralDeposit(_account, _collateralAsset, _amount);
    }

    /**
     * @notice Withdraws sender's collateral from the protocol.
     * @dev Requires the post-withdrawal collateral value to violate minimum collateral requirement.
     * @param _account The address to withdraw assets for.
     * @param _collateralAsset The address of the collateral asset.
     * @param _amount The amount of the collateral asset to withdraw.
     * @param _depositedCollateralAssetIndex The index of the collateral asset in the sender's deposited collateral
     * assets array. Only needed if withdrawing the entire deposit of a particular collateral asset.
     */
    function withdrawCollateral(
        address _account,
        address _collateralAsset,
        uint256 _amount,
        uint256 _depositedCollateralAssetIndex
    ) external nonReentrant collateralAssetExists(_collateralAsset) onlyRoleIf(_account != msg.sender, Role.MANAGER) {
        if (ms().safetyStateSet) {
            ensureNotPaused(_collateralAsset, Action.Withdraw);
        }

        uint256 depositAmount = ms().getCollateralDeposits(_account, _collateralAsset);
        _amount = (_amount > depositAmount ? depositAmount : _amount);
        ms().verifyAndRecordCollateralWithdrawal(
            _account,
            _collateralAsset,
            _amount,
            depositAmount,
            _depositedCollateralAssetIndex
        );

        IERC20Upgradeable(_collateralAsset).safeTransfer(_account, _amount);
    }

    /* -------------------------------------------------------------------------- */
    /*                                  KrAssets                                  */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Mints new Kresko assets.
     * @param _account The address to mint assets for.
     * @param _kreskoAsset The address of the Kresko asset.
     * @param _amount The amount of the Kresko asset to be minted.
     */
    function mintKreskoAsset(
        address _account,
        address _kreskoAsset,
        uint256 _amount
    ) external nonReentrant kreskoAssetExists(_kreskoAsset) onlyRoleIf(_account != msg.sender, Role.MANAGER) {
        require(_amount > 0, Error.ZERO_MINT);

        MinterState storage s = ms();

        if (s.safetyStateSet) {
            ensureNotPaused(_kreskoAsset, Action.Borrow);
        }

        // Enforce krAsset's total supply limit
        KrAsset memory krAsset = s.kreskoAssets[_kreskoAsset];

        require(
            IKreskoAsset(_kreskoAsset).totalSupply() + _amount <= krAsset.supplyLimit,
            Error.KRASSET_MAX_SUPPLY_REACHED
        );

        if (krAsset.openFee.rawValue > 0) {
            s.chargeOpenFee(_account, _kreskoAsset, _amount);
        }
        {
            // Get the account's current minimum collateral value required to maintain current debts.
            // Calculate additional collateral amount required to back requested additional mint.
            // Verify that minter has sufficient collateral to back current debt + new requested debt.
            require(
                s
                    .getAccountMinimumCollateralValueAtRatio(_account, s.minimumCollateralizationRatio)
                    .add(s.getMinimumCollateralValueAtRatio(_kreskoAsset, _amount, s.minimumCollateralizationRatio))
                    .isLessThanOrEqual(s.getAccountCollateralValue(_account)),
                Error.KRASSET_COLLATERAL_LOW
            );
        }

        // The synthetic asset debt position must be greater than the minimum debt position value
        uint256 existingDebt = s.getKreskoAssetDebt(_account, _kreskoAsset);
        require(
            s.getKrAssetValue(_kreskoAsset, existingDebt + _amount, true).isGreaterThanOrEqual(s.minimumDebtValue),
            Error.KRASSET_MINT_AMOUNT_LOW
        );

        // If the account does not have an existing debt for this Kresko Asset,
        // push it to the list of the account's minted Kresko Assets.
        if (existingDebt == 0) {
            s.mintedKreskoAssets[_account].push(_kreskoAsset);
        }

        // Record the mint.
        s.mint(_kreskoAsset, krAsset.anchor, _amount, _account);

        emit MinterEvent.KreskoAssetMinted(_account, _kreskoAsset, _amount);
    }

    /**
     * @notice Burns existing Kresko assets.
     * @param _account The address to burn kresko assets for
     * @param _kreskoAsset The address of the Kresko asset.
     * @param _burnAmount The amount of the Kresko asset to be burned.
     * @param _mintedKreskoAssetIndex The index of the collateral asset in the user's minted assets array.
     * @notice Only needed if withdrawing the entire deposit of a particular collateral asset.
     */
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

        uint256 debtAmount = s.getKreskoAssetDebt(_account, _kreskoAsset);
        if (_burnAmount != type(uint256).max) {
            require(_burnAmount <= debtAmount, Error.KRASSET_BURN_AMOUNT_OVERFLOW);
            // Ensure amount is either 0 or >= minDebtValue
            _burnAmount = s.ensureNotDustPosition(_kreskoAsset, _burnAmount, debtAmount);
        } else {
            _burnAmount = debtAmount;
        }

        // If the sender is burning all of the kresko asset, remove it from minted assets array.
        if (_burnAmount == debtAmount) {
            s.mintedKreskoAssets[_account].removeAddress(_kreskoAsset, _mintedKreskoAssetIndex);
        }
        // Charge the burn fee from collateral of _account
        s.chargeCloseFee(_account, _kreskoAsset, _burnAmount);

        // Record the burn
        s.repay(_kreskoAsset, s.kreskoAssets[_kreskoAsset].anchor, _burnAmount, _account);

        emit MinterEvent.KreskoAssetBurned(_account, _kreskoAsset, _burnAmount);
    }

    /// @dev Simple check for the enabled flag
    function ensureNotPaused(address _asset, Action _action) internal view {
        require(!ms().safetyState[_asset][_action].pause.enabled, Error.ACTION_PAUSED_FOR_ASSET);
    }
}
