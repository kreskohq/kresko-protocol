// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

// solhint-disable not-rely-on-time
// solhint-disable-next-line
import {SafeERC20, IERC20Permit} from "common/SafeERC20.sol";
import {Arrays} from "common/libs/Arrays.sol";
import {WadRay} from "common/libs/WadRay.sol";
import {MinterEvent} from "common/Events.sol";
import {Error} from "common/Errors.sol";
import {IKreskoAssetIssuer} from "kresko-asset/IKreskoAssetIssuer.sol";

import {LibRedstone} from "./LibRedstone.sol";
import {LibDecimals} from "./LibDecimals.sol";
import {LibCalculation} from "./LibCalculation.sol";
import {KrAsset} from "../MinterTypes.sol";
import {MinterState} from "../MinterState.sol";
import {scdp} from "scdp/SCDPStorage.sol";
import {sdi} from "scdp/SDIStorage.sol";

library LibMint {
    using Arrays for address[];

    using LibDecimals for uint8;
    using LibDecimals for uint256;
    using WadRay for uint256;

    using SafeERC20 for IERC20Permit;
    using LibCalculation for MinterState;

    /// @notice Mint kresko assets.
    /// @dev Updates the principal in MinterState
    /// @param _kreskoAsset the asset being issued
    /// @param _anchor the anchor token of the asset being issued
    /// @param _amount the asset amount being minted
    /// @param _account the account to mint the assets to
    function mint(
        MinterState storage self,
        address _kreskoAsset,
        address _anchor,
        uint256 _amount,
        address _account
    ) internal {
        // Get possibly rebalanced amount of kresko asset
        uint256 issued = IKreskoAssetIssuer(_anchor).issue(_amount, _account);
        // Increase principal debt
        self.kreskoAssetDebt[_account][_kreskoAsset] += issued;
    }

    /// @notice Mint kresko assets for shared debt pool.
    /// @dev Updates general markets stability rates and debt index.
    /// @param _kreskoAsset the asset requested
    /// @param _amount the asset amount requested
    /// @param _to the account to mint the assets to
    function mintSwap(
        MinterState storage self,
        address _kreskoAsset,
        uint256 _amount,
        address _to
    ) internal returns (uint256 issued) {
        issued = IKreskoAssetIssuer(self.kreskoAssets[_kreskoAsset].anchor).issue(_amount, _to);
        require(issued != 0, "invalid-shared-pool-mint");

        sdi().totalDebt += sdi().previewMint(_kreskoAsset, issued, false);
    }

    /**
     * @notice Charges the protocol open fee based off the value of the minted asset.
     * @dev Takes the fee from the account's collateral assets. Attempts collateral assets
     *   in reverse order of the account's deposited collateral assets array.
     * @param _account The account to charge the open fee from.
     * @param _kreskoAsset The address of the kresko asset being minted.
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
        uint256 feeValue = krAsset.uintUSD(_kreskoAssetAmountMinted, self.oracleDeviationPct).wadMul(krAsset.openFee);

        // Do nothing if the fee value is 0.
        if (feeValue == 0) {
            return;
        }

        address[] memory accountCollateralAssets = self.depositedCollateralAssets[_account];
        // Iterate backward through the account's deposited collateral assets to safely
        // traverse the array while still being able to remove elements if necessary.
        // This is because removing the last element of the array does not shift around
        // other elements in the array.
        for (uint256 i = accountCollateralAssets.length - 1; i >= 0; i--) {
            address collateralAssetAddress = accountCollateralAssets[i];

            (uint256 transferAmount, uint256 feeValuePaid) = self.calcFee(
                collateralAssetAddress,
                _account,
                feeValue,
                i
            );

            // Remove the transferAmount from the stored deposit for the account.
            self.collateralDeposits[_account][collateralAssetAddress] -= self
                .collateralAssets[collateralAssetAddress]
                .toNonRebasingAmount(transferAmount);

            // Transfer the fee to the feeRecipient.
            IERC20Permit(collateralAssetAddress).safeTransfer(self.feeRecipient, transferAmount);
            emit MinterEvent.OpenFeePaid(_account, collateralAssetAddress, transferAmount, feeValuePaid);

            feeValue = feeValue - feeValuePaid;
            // If the entire fee has been paid, no more action needed.
            if (feeValue == 0) {
                return;
            }
        }
    }
}
