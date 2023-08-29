// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

// solhint-disable not-rely-on-time

import {Arrays} from "common/libs/Arrays.sol";
import {WadRay} from "common/libs/WadRay.sol";
import {MinterEvent} from "common/Events.sol";
import {Error} from "common/Errors.sol";

import {IERC20Permit} from "common/IERC20Permit.sol";
import {SafeERC20} from "common/SafeERC20.sol";
import {IKreskoAssetIssuer} from "kresko-asset/IKreskoAssetIssuer.sol";

import {LibRedstone} from "./LibRedstone.sol";
import {LibDecimals} from "./LibDecimals.sol";
import {LibCalculation} from "./LibCalculation.sol";
import {KrAsset} from "../MinterTypes.sol";
import {MinterState} from "../MinterState.sol";
import {scdp} from "scdp/SCDPStorage.sol";

library LibBurn {
    using Arrays for address[];

    using LibDecimals for uint8;
    using LibDecimals for uint256;
    using WadRay for uint256;

    using SafeERC20 for IERC20Permit;
    using LibCalculation for MinterState;

    /// @notice Repay user kresko asset debt.
    /// @dev Updates the principal in MinterState
    /// @param _kreskoAsset the asset being repaid
    /// @param _anchor the anchor token of the asset being repaid
    /// @param _burnAmount the asset amount being burned
    /// @param _account the account the debt is subtracted from
    function burn(
        MinterState storage self,
        address _kreskoAsset,
        address _anchor,
        uint256 _burnAmount,
        address _account
    ) internal {
        // Get the possibly rebalanced amount of destroyed tokens
        uint256 destroyed = IKreskoAssetIssuer(_anchor).destroy(_burnAmount, msg.sender);
        // Decrease the principal debt
        self.kreskoAssetDebt[_account][_kreskoAsset] -= destroyed;
    }

    /// @notice Repay user global asset debt. Updates rates for regular market.
    /// @param _kreskoAsset the asset being repaid
    /// @param _burnAmount the asset amount being burned
    function repaySwap(
        MinterState storage self,
        address _kreskoAsset,
        uint256 _burnAmount,
        address _from
    ) internal returns (uint256 destroyed) {
        // Burn assets from the protocol, as they are sent in. Get the destroyed shares.
        destroyed = IKreskoAssetIssuer(self.kreskoAssets[_kreskoAsset].anchor).destroy(_burnAmount, _from);
        require(destroyed != 0, "repay-destroyed-amount-invalid");

        // SDI: Update the index
        bytes memory encodedFunction = abi.encodeWithSelector(scdp().sdi.onSCDPBurn.selector, _kreskoAsset, destroyed);
        LibRedstone.proxyCalldata(address(scdp().sdi), encodedFunction, false);
    }

    /**
     * @notice Charges the protocol close fee based off the value of the burned asset.
     * @dev Takes the fee from the account's collateral assets. Attempts collateral assets
     *   in reverse order of the account's deposited collateral assets array.
     * @param _account The account to charge the close fee from.
     * @param _kreskoAsset The address of the kresko asset being burned.
     * @param _burnAmount The amount of the kresko asset being burned.
     */
    function chargeCloseFee(
        MinterState storage self,
        address _account,
        address _kreskoAsset,
        uint256 _burnAmount
    ) internal {
        KrAsset memory krAsset = self.kreskoAssets[_kreskoAsset];
        // Calculate the value of the fee according to the value of the krAssets being burned.
        uint256 feeValue = krAsset.uintUSD(_burnAmount, self.oracleDeviationPct).wadMul(krAsset.closeFee);

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
            emit MinterEvent.CloseFeePaid(_account, collateralAssetAddress, transferAmount, feeValuePaid);

            feeValue = feeValue - feeValuePaid;
            // If the entire fee has been paid, no more action needed.
            if (feeValue == 0) {
                return;
            }
        }
    }

    /**
     * @notice Check that debt repaid does not leave a dust position, if it does:
     * return an amount that pays up to minDebtValue
     * @param _kreskoAsset The address of the kresko asset being burned.
     * @param _burnAmount The amount being burned
     * @param _debtAmount The debt amount of `_account`
     * @return amount == 0 or >= minDebtAmount
     */
    function ensureNotDustPosition(
        MinterState storage self,
        address _kreskoAsset,
        uint256 _burnAmount,
        uint256 _debtAmount
    ) internal view returns (uint256 amount) {
        // If the requested burn would put the user's debt position below the minimum
        // debt value, close up to the minimum debt value instead.
        uint256 krAssetValue = self.getKrAssetValue(_kreskoAsset, _debtAmount - _burnAmount, true);
        if (krAssetValue > 0 && krAssetValue < self.minimumDebtValue) {
            uint256 minDebtValue = self.minimumDebtValue.wadDiv(
                self.kreskoAssets[_kreskoAsset].uintPrice(self.oracleDeviationPct)
            );
            amount = _debtAmount - minDebtValue;
        } else {
            amount = _burnAmount;
        }
    }
}
