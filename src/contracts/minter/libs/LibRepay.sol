// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

// solhint-disable-next-line
import {SafeERC20Upgradeable, IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import {Arrays} from "../../libs/Arrays.sol";
import {MinterEvent} from "../../libs/Events.sol";
import {FixedPoint} from "../../libs/FixedPoint.sol";
import {Math} from "../../libs/Math.sol";

import {LibCalc} from "./LibCalculation.sol";
import {KrAsset} from "../MinterTypes.sol";
import {MinterState} from "../MinterState.sol";
import {IKreskoAsset} from "../../krAsset/IKreskoAsset.sol";

import "hardhat/console.sol";

library LibRepay {
    using Arrays for address[];
    using Math for uint8;
    using Math for uint256;
    using FixedPoint for FixedPoint.Unsigned;
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using LibCalc for MinterState;

    /**
     * @notice Charges the protocol close fee based off the value of the burned asset.
     * @dev Takes the fee from the account's collateral assets. Attempts collateral assets
     *   in reverse order of the account's deposited collateral assets array.
     * @param _account The account to charge the close fee from.
     * @param _kreskoAsset The address of the kresko asset being burned.
     * @param _kreskoAssetAmountBurned The amount of the kresko asset being burned.
     */
    function chargeCloseFee(
        MinterState storage self,
        address _account,
        address _kreskoAsset,
        uint256 _kreskoAssetAmountBurned
    ) internal {
        KrAsset memory krAsset = self.kreskoAssets[_kreskoAsset];
        // Calculate the value of the fee according to the value of the krAssets being burned.
        FixedPoint.Unsigned memory feeValue = FixedPoint.Unsigned(
            _kreskoAssetAmountBurned *
            FixedPoint.Unsigned(
                uint256(krAsset.oracle.latestAnswer())
            ).div(10*10**7).rawValue *
            krAsset.closeFee.rawValue);

        // expectedFeeValue: 100000000000000000000000000000000000
        // feeValueONE:      100000000000000000000000000000000000
        
        console.log("feeValue:", feeValue.rawValue); //
        // This is the amount in $$ that the user must pay (in the collateral type)
        
        // Do nothing if the fee value is 0.
        if (feeValue.rawValue == 0) {
            console.log("feeValue.rawValue == 0");
            return;
        }

        address[] memory accountCollateralAssets = self.depositedCollateralAssets[_account];
        // Iterate backward through the account's deposited collateral assets to safely
        // traverse the array while still being able to remove elements if necessary.
        // This is because removing the last element of the array does not shift around
        // other elements in the array.

        for (uint256 i = accountCollateralAssets.length - 1; i >= 0; i--) {
            address collateralAssetAddress = accountCollateralAssets[i];

            (uint256 transferAmount, FixedPoint.Unsigned memory feeValuePaid) = self.calcCloseFee(
                collateralAssetAddress,
                _account,
                feeValue,
                i
            );

            console.log("----------- IN THE ARRAY ---------------------");
            console.log("feeValuePaid:", feeValuePaid.rawValue);
            console.log("transferAmount:", transferAmount);
            console.log("depositAmount:", self.collateralDeposits[_account][collateralAssetAddress]);

            // Remove the transferAmount from the stored deposit for the account.
            self.collateralDeposits[_account][collateralAssetAddress] -= transferAmount;
            console.log("A");
            // Transfer the fee to the feeRecipient.
            console.log(IERC20Upgradeable(collateralAssetAddress).balanceOf(address(this)));
            IERC20Upgradeable(collateralAssetAddress).safeTransfer(self.feeRecipient, transferAmount);
            emit MinterEvent.CloseFeePaid(_account, collateralAssetAddress, transferAmount, feeValuePaid.rawValue);
            console.log("B");

            console.log("feeValue:", feeValue.rawValue);
            // 100000000000000000000000000000000000
            console.log("feeValuePaid:", feeValuePaid.rawValue);
            // We want 10000000000000000000000000000000000
            // We have 10000000000000 (we are missing 21 zeros)
            console.log("feeValue.sub(feeValuePaid):", feeValue.sub(feeValuePaid).rawValue);

            feeValue = feeValue.sub(feeValuePaid);
            console.log("C");

            // If the entire fee has been paid, no more action needed.
            if (feeValue.rawValue == 0) {
                return;
            }
        }
    }
}
