// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

// solhint-disable not-rely-on-time
// solhint-disable-next-line
import {SafeERC20Upgradeable, IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import {IKreskoAssetIssuer} from "../../kreskoasset/IKreskoAssetIssuer.sol";
import {Arrays} from "../../libs/Arrays.sol";
import {MinterEvent} from "../../libs/Events.sol";
import {Error} from "../../libs/Errors.sol";
import {FixedPoint} from "../../libs/FixedPoint.sol";
import {LibDecimals} from "../libs/LibDecimals.sol";
import {WadRay} from "../../libs/WadRay.sol";

import {LibCalculation} from "./LibCalculation.sol";
import {KrAsset} from "../MinterTypes.sol";
import {MinterState} from "../MinterState.sol";
import {irs} from "../InterestRateState.sol";

library LibMint {
    using Arrays for address[];

    using LibDecimals for uint8;
    using LibDecimals for uint256;
    using WadRay for uint256;

    using FixedPoint for FixedPoint.Unsigned;
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using LibCalculation for MinterState;

    /// @notice Mint kresko assets with stability rate updates.
    /// @dev Updates the principal in MinterState and stability rate adjusted values in InterestRateState
    /// @param _kreskoAsset the asset being repaid
    /// @param _anchor the anchor token of the asset being repaid
    /// @param _amount the asset amount being burned
    /// @param _account the account the debt is subtracted from
    function mint(
        MinterState storage self,
        address _kreskoAsset,
        address _anchor,
        uint256 _amount,
        address _account
    ) internal {
        // Update global debt index for the asset
        uint256 newDebtIndex = irs().srAssets[_kreskoAsset].updateDebtIndex();
        // Get possibly rebalanced amount of kresko asset
        uint256 issued = IKreskoAssetIssuer(_anchor).issue(_amount, _account);
        // Calculate debt index scaled value
        uint256 amountScaled = issued.wadToRay().rayDiv(newDebtIndex);
        require(amountScaled != 0, Error.INVALID_SCALED_AMOUNT);
        // Increase principal debt
        self.kreskoAssetDebt[_account][_kreskoAsset] += issued;
        // Update scaled values for the user
        irs().srAssetsUser[_account][_kreskoAsset].debtScaled += uint128(amountScaled);
        irs().srAssetsUser[_account][_kreskoAsset].lastDebtIndex = uint128(newDebtIndex);
        irs().srAssetsUser[_account][_kreskoAsset].lastUpdateTimestamp = uint40(block.timestamp);
        // Update the global rate for the asset
        irs().srAssets[_kreskoAsset].updateStabilityRate();
    }

    /**
     * @notice Charges the protocol open fee based off the value of the minted asset.
     * @dev Takes the fee from the account's collateral assets. Attempts collateral assets
     *   in reverse order of the account's deposited collateral assets array.
     * @param _account The account to charge the open fee from.
     * @param _kreskoAsset The address of the kresko asset being burned.
     * @param _kreskoAssetAmountMinted The amount of the kresko asset being minted.
     */
    function chargeOpenFee(
        MinterState storage self,
        address _account,
        address _kreskoAsset,
        uint256 _kreskoAssetAmountMinted
    ) internal {
        KrAsset memory krAsset = self.kreskoAssets[_kreskoAsset];
        // Calculate the value of the fee according to the value of the krAssets being minted.
        FixedPoint.Unsigned memory feeValue = krAsset.fixedPointUSD(_kreskoAssetAmountMinted).mul(krAsset.openFee);

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

            (uint256 transferAmount, FixedPoint.Unsigned memory feeValuePaid) = self.calcFee(
                collateralAssetAddress,
                _account,
                feeValue,
                i
            );

            // Remove the transferAmount from the stored deposit for the account.
            self.collateralDeposits[_account][collateralAssetAddress] -= self
                .collateralAssets[collateralAssetAddress]
                .toStaticAmount(transferAmount);

            // Transfer the fee to the feeRecipient.
            IERC20Upgradeable(collateralAssetAddress).safeTransfer(self.feeRecipient, transferAmount);
            emit MinterEvent.OpenFeePaid(_account, collateralAssetAddress, transferAmount, feeValuePaid.rawValue);

            feeValue = feeValue.sub(feeValuePaid);
            // If the entire fee has been paid, no more action needed.
            if (feeValue.rawValue == 0) {
                return;
            }
        }
    }
}
