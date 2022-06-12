// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import {INonRebasingWrapperToken} from "../interfaces/INonRebasingWrapperToken.sol";
import {IKreskoAsset} from "../interfaces/IKreskoAsset.sol";

import "../libraries/Arrays.sol";

import {DiamondModifiers, MinterModifiers, Roles} from "../shared/Modifiers.sol";
import {MinterState, ms, Meta, Error, FixedPoint, MinterEvent} from "../storage/MinterStorage.sol";

contract MinterUserFacet is DiamondModifiers, MinterModifiers {
    using SafeERC20Upgradeable for IERC20MetadataUpgradeable;
    using SafeERC20Upgradeable for IERC20Upgradeable;
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
        // Transfer tokens into this contract prior to any state changes as an extra measure against re-entrancy.
        IERC20MetadataUpgradeable(_collateralAsset).safeTransferFrom(msg.sender, address(this), _amount);

        // Record the collateral deposit.
        ms().recordCollateralDeposit(_account, _collateralAsset, _amount);
    }

    /**
     * @notice Deposits a rebasing collateral into the protocol by wrapping the underlying
     * rebasing token.
     * @param _account The user to deposit collateral for.
     * @param _collateralAsset The address of the NonRebasingWrapperToken collateral asset.
     * @param _rebasingAmount The amount of the underlying rebasing token to deposit.
     */
    function depositRebasingCollateral(
        address _account,
        address _collateralAsset,
        uint256 _rebasingAmount
    ) external nonReentrant collateralAssetExists(_collateralAsset) {
        require(_rebasingAmount > 0, "KR: 0-deposit");

        address underlyingRebasingToken = ms().collateralAssets[_collateralAsset].underlyingRebasingToken;
        require(underlyingRebasingToken != address(0), "KR: !NRWTCollateral");

        // Transfer underlying rebasing token in.
        IERC20Upgradeable(underlyingRebasingToken).safeTransferFrom(msg.sender, address(this), _rebasingAmount);

        // Approve the newly received rebasing token to the NonRebasingWrapperToken in preparation
        // for calling depositUnderlying.
        require(
            IERC20Upgradeable(underlyingRebasingToken).approve(_collateralAsset, _rebasingAmount),
            "KR: ApprovalFail"
        );

        // Wrap into NonRebasingWrapperToken.
        uint256 nonRebasingAmount = INonRebasingWrapperToken(_collateralAsset).depositUnderlying(_rebasingAmount);

        // Record the collateral deposit.
        ms().recordCollateralDeposit(_account, _collateralAsset, nonRebasingAmount);
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
    )
        external
        nonReentrant
        collateralAssetExists(_collateralAsset)
        onlyRoleIf(_account != msg.sender, Roles.MINTER_HELPER_CONTRACT)
    {
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

    /**
     * @notice Withdraws NonRebasingWrapperToken collateral from the protocol and unwraps it.
     * @param _account The address to withdraw assets for.
     * @param _collateralAsset The address of the NonRebasingWrapperToken collateral asset.
     * @param _amount The amount of the NonRebasingWrapperToken collateral asset to withdraw.
     * @param _depositedCollateralAssetIndex The index of the collateral asset in the sender's deposited collateral
     * assets array. Only needed if withdrawing the entire deposit of a particular collateral asset.
     */
    function withdrawRebasingCollateral(
        address _account,
        address _collateralAsset,
        uint256 _amount,
        uint256 _depositedCollateralAssetIndex
    )
        external
        nonReentrant
        collateralAssetExists(_collateralAsset)
        onlyRoleIf(_account != msg.sender, Roles.MINTER_HELPER_CONTRACT)
    {
        uint256 depositAmount = ms().collateralDeposits[_account][_collateralAsset];
        _amount = (_amount <= depositAmount ? _amount : depositAmount);
        ms().verifyAndRecordCollateralWithdrawal(
            _account,
            _collateralAsset,
            _amount,
            depositAmount,
            _depositedCollateralAssetIndex
        );

        address underlyingRebasingToken = ms().collateralAssets[_collateralAsset].underlyingRebasingToken;
        require(underlyingRebasingToken != address(0), "KR: !NRWTCollateral");

        // Unwrap the NonRebasingWrapperToken into the rebasing underlying.
        uint256 underlyingAmountWithdrawn = INonRebasingWrapperToken(_collateralAsset).withdrawUnderlying(_amount);

        // Transfer the sender the rebasing underlying.
        IERC20MetadataUpgradeable(underlyingRebasingToken).safeTransfer(_account, underlyingAmountWithdrawn);
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
        onlyRoleIf(_account != msg.sender, Roles.MINTER_HELPER_CONTRACT)
    {
        require(_amount > 0, "KR: 0-mint");
        MinterState storage s = ms();

        // Enforce synthetic asset's maximum market capitalization limit
        require(
            ms().getKrAssetValue(_kreskoAsset, IKreskoAsset(_kreskoAsset).totalSupply() + _amount, true).rawValue <=
                s.kreskoAssets[_kreskoAsset].marketCapUSDLimit,
            "KR: MC limit"
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
            "KR: insufficientCollateral"
        );

        // The synthetic asset debt position must be greater than the minimum debt position value
        uint256 existingDebtAmount = s.kreskoAssetDebt[_account][_kreskoAsset];
        require(
            s.getKrAssetValue(_kreskoAsset, existingDebtAmount + _amount, true).isGreaterThanOrEqual(
                s.minimumDebtValue
            ),
            "KR: belowMinDebtValue"
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
        onlyRoleIf(_account != msg.sender, Roles.MINTER_HELPER_CONTRACT)
    {
        require(_amount > 0, "KR: 0-burn");
        MinterState storage s = ms();

        // Ensure the amount being burned is not greater than the user's debt.
        uint256 debtAmount = s.kreskoAssetDebt[_account][_kreskoAsset];
        require(_amount <= debtAmount, "KR: amount > debt");

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
}
