// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

// solhint-disable-next-line
import {SafeERC20Upgradeable, IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import {Arrays} from "../../libs/Arrays.sol";
import {MinterEvent} from "../../libs/Events.sol";
import {Error} from "../../libs/Errors.sol";
import {FixedPoint} from "../../libs/FixedPoint.sol";
import {Math} from "../../libs/Math.sol";

import {LibCalc} from "./LibCalculation.sol";
import {KrAsset, Fee} from "../MinterTypes.sol";
import {MinterState} from "../MinterState.sol";

library LibFees {
    using Arrays for address[];
    using Math for uint8;
    using Math for uint256;
    using FixedPoint for FixedPoint.Unsigned;
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using LibCalc for MinterState;

    /**
     * @notice Charges the protocol open fee based off the value of the minted asset.
     * @dev Takes the fee from the account's collateral assets. Attempts collateral assets
     *   in reverse order of the account's deposited collateral assets array.
     * @param _account The account to charge the open fee from.
     * @param _kreskoAsset The address of the kresko asset being burned.
     * @param _kreskoAssetAmount The kresko asset amount amount.
     * @param _feeType The fee type (open, close, etc).
     */
    function chargeFee(
        MinterState storage self,
        address _account,
        address _kreskoAsset,
        uint256 _kreskoAssetAmount,
        Fee _feeType
    ) internal {
        // Calculate the value of the fee according to the value of the krAssets being minted.
        FixedPoint.Unsigned memory feeValue;
        {
            KrAsset memory krAsset = self.kreskoAssets[_kreskoAsset];
            feeValue = FixedPoint
                .Unsigned(uint256(krAsset.oracle.latestAnswer()))
                .mul(FixedPoint.Unsigned(_kreskoAssetAmount))
                .mul(_feeType == Fee.Open ? krAsset.openFee : krAsset.closeFee);
        }

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

            (uint256 transferAmount, FixedPoint.Unsigned memory feeValuePaid) = self.calcFeeCollateralAmount(
                collateralAssetAddress,
                _account,
                feeValue,
                i
            );

            // Remove the transferAmount from the stored deposit for the account.
            self.collateralDeposits[_account][collateralAssetAddress] -= transferAmount;
            // Transfer the fee to the feeRecipient.
            IERC20Upgradeable(collateralAssetAddress).safeTransfer(self.feeRecipient, transferAmount);
            if(Fee(_feeType) == Fee.Open) {
                emit MinterEvent.OpenFeePaid(_account, collateralAssetAddress, transferAmount, feeValuePaid.rawValue);
            } else {
                emit MinterEvent.CloseFeePaid(_account, collateralAssetAddress, transferAmount, feeValuePaid.rawValue);
            }

            feeValue = feeValue.sub(feeValuePaid);
            // If the entire fee has been paid, no more action needed.
            if (feeValue.rawValue == 0) {
                return;
            }
        }
    }

    /**
     * @notice Calculates the fee to be taken from a user's deposited collateral assets.
     * @param _collateralAssetAddress The collateral asset from which to take to the fee.
     * @param _account The owner of the collateral.
     * @param _feeValue The original value of the fee.
     * @param _collateralAssetIndex The collateral asset's index in the user's depositedCollateralAssets array.
     * @return The transfer amount to be received as a uint256 and a FixedPoint.Unsigned
     * representing the fee value paid.
     */
    function calcFeeCollateralAmount(
        MinterState storage self,
        address _collateralAssetAddress,
        address _account,
        FixedPoint.Unsigned memory _feeValue,
        uint256 _collateralAssetIndex
    ) internal returns (uint256, FixedPoint.Unsigned memory) {
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
}
