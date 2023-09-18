// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;
import {IERC20Permit} from "vendor/IERC20Permit.sol";
import {SafeERC20} from "vendor/SafeERC20.sol";
import {Arrays} from "libs/Arrays.sol";
import {WadRay} from "libs/WadRay.sol";
import {fromWad} from "common/funcs/Math.sol";

import {ms} from "minter/State.sol";
import {collateralAmountToValue} from "minter/funcs/Conversions.sol";
import {KrAsset} from "minter/Types.sol";
import {MEvent} from "minter/Events.sol";

using WadRay for uint256;
using SafeERC20 for IERC20Permit;
using Arrays for address[];

/* -------------------------------------------------------------------------- */
/*                                    Fees                                    */
/* -------------------------------------------------------------------------- */

/**
 * @notice Charges the protocol open fee based off the value of the minted asset.
 * @dev Takes the fee from the account's collateral assets. Attempts collateral assets
 *   in reverse order of the account's deposited collateral assets array.
 * @param _account The account to charge the open fee from.
 * @param _kreskoAsset The address of the kresko asset being minted.
 * @param _kreskoAssetAmountMinted The amount of the kresko asset being minted.
 */
function handleMinterOpenFee(address _account, address _kreskoAsset, uint256 _kreskoAssetAmountMinted) {
    KrAsset memory krAsset = ms().kreskoAssets[_kreskoAsset];
    // Calculate the value of the fee according to the value of the krAssets being minted.
    uint256 feeValue = krAsset.uintUSD(_kreskoAssetAmountMinted, ms().oracleDeviationPct).wadMul(krAsset.openFee);

    // Do nothing if the fee value is 0.
    if (feeValue == 0) {
        return;
    }

    address[] memory accountCollaterals = ms().depositedCollateralAssets[_account];
    // Iterate backward through the account's deposited collateral assets to safely
    // traverse the array while still being able to remove elements if necessary.
    // This is because removing the last element of the array does not shift around
    // other elements in the array.
    for (uint256 i = accountCollaterals.length - 1; i >= 0; i--) {
        address currentCollateral = accountCollaterals[i];

        (uint256 transferAmount, uint256 feeValuePaid) = calcMinterFee(currentCollateral, _account, feeValue, i);

        // Remove the transferAmount from the stored deposit for the account.
        ms().collateralDeposits[_account][currentCollateral] -= ms().collateralAssets[currentCollateral].toNonRebasingAmount(
            transferAmount
        );

        // Transfer the fee to the feeRecipient.
        IERC20Permit(currentCollateral).safeTransfer(ms().feeRecipient, transferAmount);
        emit MEvent.OpenFeePaid(_account, currentCollateral, transferAmount, feeValuePaid);

        feeValue = feeValue - feeValuePaid;
        // If the entire fee has been paid, no more action needed.
        if (feeValue == 0) {
            return;
        }
    }
}

/**
 * @notice Charges the protocol close fee based off the value of the burned asset.
 * @dev Takes the fee from the account's collateral assets. Attempts collateral assets
 *   in reverse order of the account's deposited collateral assets array.
 * @param _account The account to charge the close fee from.
 * @param _kreskoAsset The address of the kresko asset being burned.
 * @param _burnAmount The amount of the kresko asset being burned.
 */
function handleMinterCloseFee(address _account, address _kreskoAsset, uint256 _burnAmount) {
    KrAsset memory krAsset = ms().kreskoAssets[_kreskoAsset];
    // Calculate the value of the fee according to the value of the krAssets being burned.
    uint256 feeValue = krAsset.uintUSD(_burnAmount, ms().oracleDeviationPct).wadMul(krAsset.closeFee);

    // Do nothing if the fee value is 0.
    if (feeValue == 0) {
        return;
    }

    address[] memory accountCollaterals = ms().depositedCollateralAssets[_account];
    // Iterate backward through the account's deposited collateral assets to safely
    // traverse the array while still being able to remove elements if necessary.
    // This is because removing the last element of the array does not shift around
    // other elements in the array.

    for (uint256 i = accountCollaterals.length - 1; i >= 0; i--) {
        address currentCollateral = accountCollaterals[i];

        (uint256 transferAmount, uint256 feeValuePaid) = calcMinterFee(currentCollateral, _account, feeValue, i);

        // Remove the transferAmount from the stored deposit for the account.
        ms().collateralDeposits[_account][currentCollateral] -= ms().collateralAssets[currentCollateral].toNonRebasingAmount(
            transferAmount
        );

        // Transfer the fee to the feeRecipient.
        IERC20Permit(currentCollateral).safeTransfer(ms().feeRecipient, transferAmount);
        emit MEvent.CloseFeePaid(_account, currentCollateral, transferAmount, feeValuePaid);

        feeValue = feeValue - feeValuePaid;
        // If the entire fee has been paid, no more action needed.
        if (feeValue == 0) {
            return;
        }
    }
}

/**
 * @notice Calculates the fee to be taken from a user's deposited collateral asset.
 * @param _collateralAsset The collateral asset from which to take to the fee.
 * @param _account The owner of the collateral.
 * @param _feeValue The original value of the fee.
 * @param _collateralAssetIndex The collateral asset's index in the user's depositedCollateralAssets array.
 *
 * @return transferAmount to be received as a uint256
 * @return feeValuePaid wad representing the fee value paid.
 */
function calcMinterFee(
    address _collateralAsset,
    address _account,
    uint256 _feeValue,
    uint256 _collateralAssetIndex
) returns (uint256 transferAmount, uint256 feeValuePaid) {
    uint256 depositAmount = ms().accountCollateralAmount(_account, _collateralAsset);

    // Don't take the collateral asset's collateral factor into consideration.
    (uint256 depositValue, uint256 oraclePrice) = collateralAmountToValue(_collateralAsset, depositAmount, true);

    if (_feeValue < depositValue) {
        // If feeValue < depositValue, the entire fee can be charged for this collateral asset.
        transferAmount = fromWad(ms().collateralAssets[_collateralAsset].decimals, _feeValue.wadDiv(oraclePrice));
        feeValuePaid = _feeValue;
    } else {
        // If the feeValue >= depositValue, the entire deposit should be taken as the fee.
        transferAmount = depositAmount;
        feeValuePaid = depositValue;
    }

    if (transferAmount == depositAmount) {
        // Because the entire deposit is taken, remove it from the depositCollateralAssets array.
        ms().depositedCollateralAssets[_account].removeAddress(_collateralAsset, _collateralAssetIndex);
    }

    return (transferAmount, feeValuePaid);
}
