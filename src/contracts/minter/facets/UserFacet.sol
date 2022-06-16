// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

import {IERC20MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import {INonRebasingWrapperToken} from "../interfaces/INonRebasingWrapperToken.sol";
import {IKreskoAsset} from "../interfaces/IKreskoAsset.sol";
import {IUserFacet} from "../interfaces/IUserFacet.sol";

import "../../shared/Arrays.sol";
import {Error} from "../../shared/Errors.sol";
import {Meta} from "../../shared/Meta.sol";
import {DiamondModifiers, MinterModifiers, Role} from "../../shared/Modifiers.sol";

import {MinterState, ms, FixedPoint, MinterEvent, Action} from "../MinterStorage.sol";

contract UserFacet is DiamondModifiers, MinterModifiers {
    using SafeERC20Upgradeable for IERC20MetadataUpgradeable;
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
        IERC20MetadataUpgradeable(_collateralAsset).safeTransferFrom(msg.sender, address(this), _amount);

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

        uint256 depositAmount = ms().collateralDeposits[_account][_collateralAsset];
        _amount = (_amount <= depositAmount ? _amount : depositAmount);
        ms().verifyAndRecordCollateralWithdrawal(
            _account,
            _collateralAsset,
            _amount,
            depositAmount,
            _depositedCollateralAssetIndex
        );

        IERC20MetadataUpgradeable(_collateralAsset).safeTransfer(_account, _amount);
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
    )
        external
        nonReentrant
        kreskoAssetExistsAndMintable(_kreskoAsset)
        kreskoAssetPriceNotStale(_kreskoAsset)
        onlyRoleIf(_account != msg.sender, Role.MANAGER)
    {
        if (ms().safetyStateSet) {
            ensureNotPaused(_kreskoAsset, Action.Borrow);
        }
        require(_amount > 0, Error.ZERO_MINT);

        MinterState storage s = ms();
        // Enforce synthetic asset's maximum market capitalization limit
        require(
            ms().getKrAssetValue(_kreskoAsset, IKreskoAsset(_kreskoAsset).totalSupply() + _amount, true).rawValue <=
                s.kreskoAssets[_kreskoAsset].marketCapUSDLimit,
            Error.KRASSET_MAX_SUPPLY_REACHED
        );

        // Get the value of the minter's current deposited collateral.
        FixedPoint.Unsigned memory accountCollateralValue = s.getAccountCollateralValue(_account);
        // Get the account's current minimum collateral value required to maintain current debts.
        FixedPoint.Unsigned memory minAccountCollateralValue = s.getAccountMinimumCollateralValue(_account);
        // Calculate additional collateral amount required to back requested additional mint.
        FixedPoint.Unsigned memory additionalCollateralValue = s.getMinimumCollateralValue(_kreskoAsset, _amount);

        // Verify that minter has sufficient collateral to back current debt + new requested debt.
        require(
            minAccountCollateralValue.add(additionalCollateralValue).isLessThanOrEqual(accountCollateralValue),
            Error.KRASSET_COLLATERAL_LOW
        );

        // The synthetic asset debt position must be greater than the minimum debt position value
        uint256 existingDebtAmount = s.kreskoAssetDebt[_account][_kreskoAsset];
        require(
            s.getKrAssetValue(_kreskoAsset, existingDebtAmount + _amount, true).isGreaterThanOrEqual(
                s.minimumDebtValue
            ),
            Error.KRASSET_MINT_AMOUNT_LOW
        );

        // If the account does not have an existing debt for this Kresko Asset,
        // push it to the list of the account's minted Kresko Assets.
        if (existingDebtAmount == 0) {
            s.mintedKreskoAssets[_account].push(_kreskoAsset);
        }
        // Record the mint.
        s.kreskoAssetDebt[_account][_kreskoAsset] = existingDebtAmount + _amount;

        IKreskoAsset(_kreskoAsset).mint(_account, _amount);

        emit MinterEvent.KreskoAssetMinted(_account, _kreskoAsset, _amount);
    }

    /**
     * @notice Burns existing Kresko assets.
     * @param _account The address to burn kresko assets for
     * @param _kreskoAsset The address of the Kresko asset.
     * @param _amount The amount of the Kresko asset to be burned.
     * @param _mintedKreskoAssetIndex The index of the collateral asset in the user's minted assets array.
     * @notice Only needed if withdrawing the entire deposit of a particular collateral asset.
     */
    function burnKreskoAsset(
        address _account,
        address _kreskoAsset,
        uint256 _amount,
        uint256 _mintedKreskoAssetIndex
    )
        external
        nonReentrant
        kreskoAssetExistsMaybeNotMintable(_kreskoAsset)
        onlyRoleIf(_account != msg.sender, Role.MANAGER)
    {
        if (ms().safetyStateSet) {
            ensureNotPaused(_kreskoAsset, Action.Repay);
        }
        require(_amount > 0, Error.ZERO_BURN);
        MinterState storage s = ms();

        // Ensure the amount being burned is not greater than the user's debt.
        uint256 debtAmount = s.kreskoAssetDebt[_account][_kreskoAsset];
        require(_amount <= debtAmount, Error.KRASSET_BURN_AMOUNT_OVERFLOW);

        {
            // If the requested burn would put the user's debt position below the minimum
            // debt value, close up to the minimum debt value instead.
            FixedPoint.Unsigned memory krAssetValue = s.getKrAssetValue(_kreskoAsset, debtAmount - _amount, true);
            if (krAssetValue.isGreaterThan(0) && krAssetValue.isLessThan(s.minimumDebtValue)) {
                FixedPoint.Unsigned memory oraclePrice = FixedPoint.Unsigned(
                    uint256(s.kreskoAssets[_kreskoAsset].oracle.latestAnswer())
                );
                FixedPoint.Unsigned memory minDebtAmount = s.minimumDebtValue.div(oraclePrice);
                _amount = debtAmount - minDebtAmount.rawValue;
            }
        }

        // Record the burn.
        s.kreskoAssetDebt[_account][_kreskoAsset] -= _amount;

        // If the sender is burning all of the kresko asset, remove it from minted assets array.
        if (_amount == debtAmount) {
            s.mintedKreskoAssets[_account].removeAddress(_kreskoAsset, _mintedKreskoAssetIndex);
        }

        s.chargeBurnFee(_account, _kreskoAsset, _amount);

        // Burn the received kresko assets, removing them from circulation.
        IKreskoAsset(_kreskoAsset).burn(msg.sender, _amount);

        emit MinterEvent.KreskoAssetBurned(_account, _kreskoAsset, _amount);
    }

    /// @dev Simple check for the enabled flag
    function ensureNotPaused(address _asset, Action _action) internal view {
        require(!ms().safetyState[_asset][_action].pause.enabled, Error.ACTION_PAUSED_FOR_ASSET);
    }
}
