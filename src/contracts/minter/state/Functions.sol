// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;
import {IERC20MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import {SafeERC20Upgradeable, IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import "../../shared/Arrays.sol";
import "../../shared/Errors.sol";
import "../../shared/Events.sol";
import "../../shared/Meta.sol";
import {ONE_HUNDRED_PERCENT} from "./Constants.sol";
import {FPConversions} from "../../shared/FPConversions.sol";

import {MinterState, FixedPoint, CollateralAsset, KrAsset} from "./Layout.sol";

using SafeERC20Upgradeable for IERC20MetadataUpgradeable;
using Arrays for address[];
using FPConversions for uint8;
using FPConversions for uint256;

/**
 * @notice Calculates if an account's current collateral value is under its minimum collateral value
 * @dev Returns true if the account's current collateral value is below the minimum collateral value
 * required to consider the position healthy.
 * @param _account The account to check.
 * @return A boolean indicating if the account can be liquidated.
 */
function isAccountLiquidatable(MinterState storage self, address _account) view returns (bool) {
    return self.getAccountCollateralValue(_account).isLessThan(self.getAccountMinimumCollateralValue(_account));
}

/**
 * @notice Gets an account's minimum collateral value for its Kresko Asset debts.
 * @dev Accounts that have their collateral value under the minimum collateral value are considered unhealthy
 * and therefore to avoid liquidations users should maintain a collateral value higher than the value returned.
 * @param _account The account to calculate the minimum collateral value for.
 * @return The minimum collateral value of a particular account.
 */
function getAccountMinimumCollateralValue(MinterState storage self, address _account)
    view
    returns (FixedPoint.Unsigned memory)
{
    FixedPoint.Unsigned memory minCollateralValue = FixedPoint.Unsigned(0);

    address[] memory assets = self.mintedKreskoAssets[_account];
    for (uint256 i = 0; i < assets.length; i++) {
        address asset = assets[i];
        uint256 amount = self.kreskoAssetDebt[_account][asset];
        minCollateralValue = minCollateralValue.add(self.getMinimumCollateralValue(asset, amount));
    }

    return minCollateralValue;
}

/**
 * @notice Gets the collateral value of a particular account.
 * @dev O(# of different deposited collateral assets by account) complexity.
 * @param _account The account to calculate the collateral value for.
 * @return The collateral value of a particular account.
 */
function getAccountCollateralValue(MinterState storage self, address _account)
    view
    returns (FixedPoint.Unsigned memory)
{
    FixedPoint.Unsigned memory totalCollateralValue = FixedPoint.Unsigned(0);

    address[] memory assets = self.depositedCollateralAssets[_account];
    for (uint256 i = 0; i < assets.length; i++) {
        address asset = assets[i];
        (FixedPoint.Unsigned memory collateralValue, ) = self.getCollateralValueAndOraclePrice(
            asset,
            self.collateralDeposits[_account][asset],
            false // Take the collateral factor into consideration.
        );
        totalCollateralValue = totalCollateralValue.add(collateralValue);
    }

    return totalCollateralValue;
}

/**
 * @notice Get the minimum collateral value required to keep a individual debt position healthy.
 * @param _krAsset The address of the Kresko asset.
 * @param _amount The Kresko Asset debt amount.
 * @return minCollateralValue is the minimum collateral value required for this Kresko Asset amount.
 */
function getMinimumCollateralValue(
    MinterState storage self,
    address _krAsset,
    uint256 _amount
) view returns (FixedPoint.Unsigned memory minCollateralValue) {
    // Calculate the Kresko asset's value weighted by its k-factor.
    FixedPoint.Unsigned memory weightedKreskoAssetValue = self.getKrAssetValue(_krAsset, _amount, false);
    // Calculate the minimum collateral required to back this Kresko asset amount.
    return weightedKreskoAssetValue.mul(self.minimumCollateralizationRatio);
}

/**
 * @notice Gets the collateral value for a single collateral asset and amount.
 * @param _collateralAsset The address of the collateral asset.
 * @param _amount The amount of the collateral asset to calculate the collateral value for.
 * @param _ignoreCollateralFactor Boolean indicating if the asset's collateral factor should be ignored.
 * @return The collateral value for the provided amount of the collateral asset.
 */
function getCollateralValueAndOraclePrice(
    MinterState storage self,
    address _collateralAsset,
    uint256 _amount,
    bool _ignoreCollateralFactor
) view returns (FixedPoint.Unsigned memory, FixedPoint.Unsigned memory) {
    CollateralAsset memory asset = self.collateralAssets[_collateralAsset];

    FixedPoint.Unsigned memory fixedPointAmount = asset.decimals._toCollateralFixedPointAmount(_amount);
    FixedPoint.Unsigned memory oraclePrice = FixedPoint.Unsigned(uint256(asset.oracle.latestAnswer()));
    FixedPoint.Unsigned memory value = fixedPointAmount.mul(oraclePrice);

    if (!_ignoreCollateralFactor) {
        value = value.mul(asset.factor);
    }
    return (value, oraclePrice);
}

/**
 * @notice Gets an array of collateral assets the account has deposited.
 * @param _account The account to get the deposited collateral assets for.
 * @return An array of addresses of collateral assets the account has deposited.
 */
function getDepositedCollateralAssets(MinterState storage self, address _account) view returns (address[] memory) {
    return self.depositedCollateralAssets[_account];
}

/**
 * @notice Gets an index for the collateral asset the account has deposited.
 * @param _account The account to get the index for.
 * @param _collateralAsset The asset lookup address.
 * @return i = index of the minted collateral asset.
 */
function getDepositedCollateralAssetIndex(
    MinterState storage self,
    address _account,
    address _collateralAsset
) view returns (uint256 i) {
    for (i; i < self.depositedCollateralAssets[_account].length; i++) {
        if (self.depositedCollateralAssets[_account][i] == _collateralAsset) {
            break;
        }
    }
}

/**
 * @notice Returns true if the @param _krAsset exists in the protocol
 */
function krAssetExists(MinterState storage self, address _krAsset) view returns (bool) {
    return self.kreskoAssets[_krAsset].exists;
}

/**
 * @notice Gets an array of Kresko assets the account has minted.
 * @param _account The account to get the minted Kresko assets for.
 * @return An array of addresses of Kresko assets the account has minted.
 */
function getMintedKreskoAssets(MinterState storage self, address _account) view returns (address[] memory) {
    return self.mintedKreskoAssets[_account];
}

/**
 * @notice Get the state of a specific krAsset
 * @param _asset Address of the asset.
 * @return State of assets `KrAsset` struct
 */
function kreskoAsset(MinterState storage self, address _asset) view returns (KrAsset memory) {
    return self.kreskoAssets[_asset];
}

/**
 * @notice Get the state of a specific collateral asset
 * @param _asset Address of the asset.
 * @return State of assets `CollateralAsset` struct
 */
function collateralAsset(MinterState storage self, address _asset) view returns (CollateralAsset memory) {
    return self.collateralAssets[_asset];
}

/**
 * @notice Gets an index for the Kresko asset the account has minted.
 * @param _account The account to get the minted Kresko assets for.
 * @param _kreskoAsset The asset lookup address.
 * @return i = index of the minted Kresko asset.
 */
function getMintedKreskoAssetsIndex(
    MinterState storage self,
    address _account,
    address _kreskoAsset
) view returns (uint256 i) {
    for (i; i < self.mintedKreskoAssets[_account].length; i++) {
        if (self.mintedKreskoAssets[_account][i] == _kreskoAsset) {
            break;
        }
    }
}

/**
 * @notice Gets the Kresko asset value in USD of a particular account.
 * @param _account The account to calculate the Kresko asset value for.
 * @return The Kresko asset value of a particular account.
 */
function getAccountKrAssetValue(MinterState storage self, address _account) view returns (FixedPoint.Unsigned memory) {
    FixedPoint.Unsigned memory value = FixedPoint.Unsigned(0);

    address[] memory assets = self.mintedKreskoAssets[_account];
    for (uint256 i = 0; i < assets.length; i++) {
        address asset = assets[i];
        value = value.add(self.getKrAssetValue(asset, self.kreskoAssetDebt[_account][asset], false));
    }
    return value;
}

/**
 * @notice Gets the USD value for a single Kresko asset and amount.
 * @param _kreskoAsset The address of the Kresko asset.
 * @param _amount The amount of the Kresko asset to calculate the value for.
 * @param _ignoreKFactor Boolean indicating if the asset's k-factor should be ignored.
 * @return The value for the provided amount of the Kresko asset.
 */
function getKrAssetValue(
    MinterState storage self,
    address _kreskoAsset,
    uint256 _amount,
    bool _ignoreKFactor
) view returns (FixedPoint.Unsigned memory) {
    KrAsset memory krAsset = self.kreskoAssets[_kreskoAsset];

    FixedPoint.Unsigned memory oraclePrice = FixedPoint.Unsigned(uint256(krAsset.oracle.latestAnswer()));

    FixedPoint.Unsigned memory value = FixedPoint.Unsigned(_amount).mul(oraclePrice);

    if (!_ignoreKFactor) {
        value = value.mul(krAsset.kFactor);
    }

    return value;
}

/**
 * @dev Calculates the total value that can be liquidated for a liquidation pair
 * @param _account address to liquidate
 * @param _repayKreskoAsset address of the kreskoAsset being repaid on behalf of the liquidatee
 * @param _collateralAssetToSeize address of the collateral asset being seized from the liquidatee
 * @return maxLiquidatableUSD USD value that can be liquidated, 0 if the pair has no liquidatable value
 */
function calculateMaxLiquidatableValueForAssets(
    MinterState storage self,
    address _account,
    address _repayKreskoAsset,
    address _collateralAssetToSeize
) view returns (FixedPoint.Unsigned memory maxLiquidatableUSD) {
    // Minimum collateral value required for the krAsset position
    FixedPoint.Unsigned memory minCollateralValue = self.getMinimumCollateralValue(
        _repayKreskoAsset,
        self.kreskoAssetDebt[_account][_repayKreskoAsset]
    );

    // Collateral value for this position
    (FixedPoint.Unsigned memory collateralValueAvailable, ) = self.getCollateralValueAndOraclePrice(
        _collateralAssetToSeize,
        self.collateralDeposits[_account][_collateralAssetToSeize],
        false // take cFactor into consideration
    );
    if (collateralValueAvailable.isGreaterThanOrEqual(minCollateralValue)) {
        return FixedPoint.Unsigned(0);
    } else {
        // Get the factors of the assets
        FixedPoint.Unsigned memory kFactor = self.kreskoAssets[_repayKreskoAsset].kFactor;
        FixedPoint.Unsigned memory cFactor = self.collateralAssets[_collateralAssetToSeize].factor;

        // Calculate how much value is under
        FixedPoint.Unsigned memory valueUnderMin = minCollateralValue.sub(collateralValueAvailable);

        // Get the divisor which calculates the max repayment from the underwater value
        FixedPoint.Unsigned memory repayDivisor = kFactor.mul(self.minimumCollateralizationRatio).sub(
            self.liquidationIncentiveMultiplier.sub(self.burnFee).mul(cFactor)
        );

        // Max repayment value for this pair
        maxLiquidatableUSD = valueUnderMin.div(repayDivisor);

        // Get the future collateral value that is being used for the liquidation
        FixedPoint.Unsigned memory collateralValueRepaid = maxLiquidatableUSD.div(
            kFactor.mul(self.liquidationIncentiveMultiplier.add(self.burnFee))
        );

        // If it's more than whats available get the max value from how much value is available instead.
        if (collateralValueRepaid.isGreaterThan(collateralValueAvailable)) {
            // Reverse the divisor formula to achieve the max repayment from available collateral.
            // We end up here if the user has multiple positions with different risk profiles.
            maxLiquidatableUSD = collateralValueAvailable.div(collateralValueRepaid.div(valueUnderMin));
        }

        // Cascade the liquidations if user has multiple collaterals and cFactor < 1.
        // This is desired because pairs with low cFactor have higher collateral requirement
        // than positions with high cFactor.

        // Main reason here is keep the liquidations from happening only on pairs that have a high risk profile.
        if (self.depositedCollateralAssets[_account].length > 1 && cFactor.isLessThan(ONE_HUNDRED_PERCENT)) {
            // To mitigate:
            // cFactor^4 the collateral available (cFactor = 1 == nothing happens)
            // Get the ratio between max liquidatable USD and diminished collateral available
            // = (higher value -> higher the risk ratio of this pair)
            // Divide the maxValue by this ratio and a diminishing max value is returned.

            // For a max profit liquidation strategy jumps to other pairs must happen before
            // the liquidation value of the risky position becomes the most profitable again.

            return
                maxLiquidatableUSD.div(maxLiquidatableUSD.div(collateralValueAvailable.mul(cFactor.pow(4)))).mul(
                    // Include a burnFee surplus in the liquidation
                    // so the users can repay their debt.
                    FixedPoint.Unsigned(ONE_HUNDRED_PERCENT).add(self.burnFee)
                );
        } else {
            // For collaterals with cFactor = 1 / accounts with only single collateral
            // the debt is just repaid in full with a single transaction
            return maxLiquidatableUSD.mul(FixedPoint.Unsigned(ONE_HUNDRED_PERCENT).add(self.burnFee));
        }
    }
}

/**
 * @notice Charges the protocol burn fee based off the value of the burned asset.
 * @dev Takes the fee from the account's collateral assets. Attempts collateral assets
 *   in reverse order of the account's deposited collateral assets array.
 * @param _account The account to charge the burn fee from.
 * @param _kreskoAsset The address of the kresko asset being burned.
 * @param _kreskoAssetAmountBurned The amount of the kresko asset being burned.
 */
function chargeBurnFee(
    MinterState storage self,
    address _account,
    address _kreskoAsset,
    uint256 _kreskoAssetAmountBurned
) {
    KrAsset memory krAsset = self.kreskoAssets[_kreskoAsset];
    // Calculate the value of the fee according to the value of the krAssets being burned.
    FixedPoint.Unsigned memory feeValue = FixedPoint
        .Unsigned(uint256(krAsset.oracle.latestAnswer()))
        .mul(FixedPoint.Unsigned(_kreskoAssetAmountBurned))
        .mul(self.burnFee);

    // Do nothing if the fee value is 0.
    if (feeValue.rawValue == 0) {
        return;
    }

    address[] memory accountCollateralAssets = self.depositedCollateralAssets[_account];
    // Iterate backward through the account's deposited collateral assets to safely
    // traverse the array while still being able to remove elements if necessary.
    // This is because removing the last element of the array does not shift around
    // other elements in the array.

    for (uint256 i = accountCollateralAssets.length - 1; i >= 0; i--) {
        address collateralAssetAddress = accountCollateralAssets[i];

        (uint256 transferAmount, FixedPoint.Unsigned memory feeValuePaid) = self.calcBurnFee(
            collateralAssetAddress,
            _account,
            feeValue,
            i
        );

        // Remove the transferAmount from the stored deposit for the account.
        self.collateralDeposits[_account][collateralAssetAddress] -= transferAmount;
        // Transfer the fee to the feeRecipient.
        IERC20MetadataUpgradeable(collateralAssetAddress).safeTransfer(self.feeRecipient, transferAmount);
        emit MinterEvent.BurnFeePaid(_account, collateralAssetAddress, transferAmount, feeValuePaid.rawValue);

        feeValue = feeValue.sub(feeValuePaid);
        // If the entire fee has been paid, no more action needed.
        if (feeValue.rawValue == 0) {
            return;
        }
    }
}

/**
 * @notice Calculates the burn fee for a burned asset.
 * @param _collateralAssetAddress The collateral asset from which to take to the fee.
 * @param _account The owner of the collateral.
 * @param _feeValue The original value of the fee.
 * @param _collateralAssetIndex The collateral asset's index in the user's depositedCollateralAssets array.
 * @return The transfer amount to be received as a uint256 and a FixedPoint.Unsigned
 * representing the fee value paid.
 */
function calcBurnFee(
    MinterState storage self,
    address _collateralAssetAddress,
    address _account,
    FixedPoint.Unsigned memory _feeValue,
    uint256 _collateralAssetIndex
) returns (uint256, FixedPoint.Unsigned memory) {
    uint256 depositAmount = self.collateralDeposits[_account][_collateralAssetAddress];

    // Don't take the collateral asset's collateral factor into consideration.
    (FixedPoint.Unsigned memory depositValue, FixedPoint.Unsigned memory oraclePrice) = self
        .getCollateralValueAndOraclePrice(_collateralAssetAddress, depositAmount, true);

    FixedPoint.Unsigned memory feeValuePaid;
    uint256 transferAmount;
    // If feeValue < depositValue, the entire fee can be charged for this collateral asset.
    if (_feeValue.isLessThan(depositValue)) {
        // We want to make sure that transferAmount is < depositAmount.
        // Proof:
        //   depositValue <= oraclePrice * depositAmount (<= due to a potential loss of precision)
        //   feeValue < depositValue
        // Meaning:
        //   feeValue < oraclePrice * depositAmount
        // Solving for depositAmount we get:
        //   feeValue / oraclePrice < depositAmount
        // Due to integer division:
        //   transferAmount = floor(feeValue / oracleValue)
        //   transferAmount <= feeValue / oraclePrice
        // We see that:
        //   transferAmount <= feeValue / oraclePrice < depositAmount
        //   transferAmount < depositAmount
        transferAmount = self.collateralAssets[_collateralAssetAddress].decimals._fromCollateralFixedPointAmount(
            _feeValue.div(oraclePrice)
        );
        feeValuePaid = _feeValue;
    } else {
        // If the feeValue >= depositValue, the entire deposit
        // should be taken as the fee.
        transferAmount = depositAmount;
        feeValuePaid = depositValue;
        // Because the entire deposit is taken, remove it from the depositCollateralAssets array.
        self.depositedCollateralAssets[_account].removeAddress(_collateralAssetAddress, _collateralAssetIndex);
    }
    return (transferAmount, feeValuePaid);
}

/**
 * @notice Records account as having deposited an amount of a collateral asset.
 * @dev Token transfers are expected to be done by the caller.
 * @param _account The address of the collateral asset.
 * @param _collateralAsset The address of the collateral asset.
 * @param _amount The amount of the collateral asset deposited.
 */
function recordCollateralDeposit(
    MinterState storage self,
    address _account,
    address _collateralAsset,
    uint256 _amount
) {
    // Because the depositedCollateralAssets[_account] is pushed to if the existing
    // deposit amount is 0, require the amount to be > 0. Otherwise, the depositedCollateralAssets[_account]
    // could be filled with duplicates, causing collateral to be double-counted in the collateral value.
    require(_amount > 0, "KR: 0-deposit");

    // If the account does not have an existing deposit for this collateral asset,
    // push it to the list of the account's deposited collateral assets.
    uint256 existingDepositAmount = self.collateralDeposits[_account][_collateralAsset];
    if (existingDepositAmount == 0) {
        self.depositedCollateralAssets[_account].push(_collateralAsset);
    }
    // Record the deposit.
    unchecked {
        self.collateralDeposits[_account][_collateralAsset] = existingDepositAmount + _amount;
    }

    emit MinterEvent.CollateralDeposited(_account, _collateralAsset, _amount);
}

function verifyAndRecordCollateralWithdrawal(
    MinterState storage self,
    address _account,
    address _collateralAsset,
    uint256 _amount,
    uint256 _depositAmount,
    uint256 _depositedCollateralAssetIndex
) {
    require(_amount > 0, "KR: 0-withdraw");

    // Ensure the withdrawal does not result in the account having a collateral value
    // under the minimum collateral amount required to maintain a healthy position.
    // I.e. the new account's collateral value must still exceed the account's minimum
    // collateral value.
    // Get the account's current collateral value.
    FixedPoint.Unsigned memory accountCollateralValue = self.getAccountCollateralValue(_account);
    // Get the collateral value that the account will lose as a result of this withdrawal.
    (FixedPoint.Unsigned memory withdrawnCollateralValue, ) = self.getCollateralValueAndOraclePrice(
        _collateralAsset,
        _amount,
        false // Take the collateral factor into consideration.
    );
    // Get the account's minimum collateral value.
    FixedPoint.Unsigned memory accountMinCollateralValue = self.getAccountMinimumCollateralValue(_account);
    // Require accountCollateralValue - withdrawnCollateralValue >= accountMinCollateralValue.
    require(
        accountCollateralValue.sub(withdrawnCollateralValue).isGreaterThanOrEqual(accountMinCollateralValue),
        "KR: collateralTooLow"
    );

    // Record the withdrawal.
    self.collateralDeposits[_account][_collateralAsset] = _depositAmount - _amount;

    // If the user is withdrawing all of the collateral asset, remove the collateral asset
    // from the user's deposited collateral assets array.
    if (_amount == _depositAmount) {
        self.depositedCollateralAssets[_account].removeAddress(_collateralAsset, _depositedCollateralAssetIndex);
    }

    emit MinterEvent.CollateralWithdrawn(_account, _collateralAsset, _amount);
}
