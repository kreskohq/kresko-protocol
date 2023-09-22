// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

import {SafeERC20Permit} from "vendor/SafeERC20Permit.sol";
import {IERC20Permit} from "vendor/IERC20Permit.sol";
import {WadRay} from "libs/WadRay.sol";

import {collateralAmountWrite} from "minter/funcs/Conversions.sol";

import {SCDPState} from "scdp/State.sol";

library SDeposits {
    using WadRay for uint256;
    using WadRay for uint128;
    using SafeERC20Permit for IERC20Permit;

    /**
     * @notice Records a deposit of collateral asset.
     * @dev Saves principal, scaled and global deposit amounts.
     * @param _account depositor
     * @param _depositAsset the deposit asset
     * @param _depositAmount amount of collateral asset to deposit
     */
    function handleDepositSCDP(
        SCDPState storage self,
        address _account,
        address _depositAsset,
        uint256 _depositAmount
    ) internal {
        require(self.isDepositEnabled[_depositAsset], "deposit-not-enabled");
        uint256 depositAmount = collateralAmountWrite(_depositAsset, _depositAmount);

        unchecked {
            // Save global deposits.
            self.totalDeposits[_depositAsset] += depositAmount;
            // Save principal deposits.
            self.depositsPrincipal[_account][_depositAsset] += depositAmount;
            // Save scaled deposits.
            self.deposits[_account][_depositAsset] += depositAmount.wadToRay().rayDiv(
                self.collateral[_depositAsset].liquidityIndex
            );
        }

        require(self.userDepositAmount(_depositAsset) <= self.collateral[_depositAsset].depositLimit, "deposit-limit");
    }

    /**
     * @notice Records a withdrawal of collateral asset.
     * @param self Collateral Pool State
     * @param _account the withdrawing account
     * @param _depositAsset the deposit asset
     * @param amountOut The actual amount of collateral withdrawn
     */
    function handleWithdrawSCDP(
        SCDPState storage self,
        address _account,
        address _depositAsset,
        uint256 _amount
    ) internal returns (uint256 amountOut, uint256 feesOut) {
        // Do not check for isEnabled, always allow withdrawals.

        // Get accounts principal deposits.
        uint256 depositsPrincipal = self.accountPrincipalDeposits(_account, _depositAsset);

        if (depositsPrincipal >= _amount) {
            // == Principal can cover possibly rebased `_amount` requested.
            // 1. We send out the requested amount.
            amountOut = _amount;
            // 2. No fees.
            // 3. Possibly un-rebased amount for internal bookeeping.
            uint256 amountWrite = collateralAmountWrite(_depositAsset, _amount);
            unchecked {
                // 4. Reduce global deposits.
                self.totalDeposits[_depositAsset] -= amountWrite;
                // 5. Reduce principal deposits.
                self.depositsPrincipal[_account][_depositAsset] -= amountWrite;
                // 6. Reduce scaled deposits.
                self.deposits[_account][_depositAsset] -= amountWrite.wadToRay().rayDiv(
                    self.collateral[_depositAsset].liquidityIndex
                );
            }
        } else {
            // == Principal can't cover possibly rebased `_amount` requested, send full collateral available.
            // 1. We send all collateral.
            amountOut = depositsPrincipal;
            // 2. With fees.
            feesOut = self.accountDepositsWithFees(_account, _depositAsset) - depositsPrincipal;
            // 3. Ensure this is actually the case.
            require(feesOut != 0, "withdrawal-violation");
            // 4. Wipe account collateral deposits.
            self.depositsPrincipal[_account][_depositAsset] = 0;
            self.deposits[_account][_depositAsset] = 0;
            // 5. Reduce global by ONLY by the principal, fees are NOT collateral.
            self.totalDeposits[_depositAsset] -= collateralAmountWrite(_depositAsset, depositsPrincipal);
        }
    }

    /// @notice This function seizes collateral from the shared pool
    /// @notice Adjusts all deposits in the case where swap deposits do not cover the amount.
    function handleSeizeSCDP(SCDPState storage self, address _seizeAsset, uint256 _seizeAmount) internal {
        uint256 swapDeposits = self.swapDepositAmount(_seizeAsset);

        if (swapDeposits >= _seizeAmount) {
            uint256 amountOut = collateralAmountWrite(_seizeAsset, _seizeAmount);
            // swap deposits cover the amount
            self.swapDeposits[_seizeAsset] -= amountOut;
            self.totalDeposits[_seizeAsset] -= amountOut;
        } else {
            // swap deposits do not cover the amount
            uint256 amountToCover = _seizeAmount - swapDeposits;
            // reduce everyones deposits by the same ratio
            self.collateral[_seizeAsset].liquidityIndex -= uint128(
                amountToCover.wadToRay().rayDiv(self.userDepositAmount(_seizeAsset).wadToRay())
            );
            self.swapDeposits[_seizeAsset] = 0;
            self.totalDeposits[_seizeAsset] -= collateralAmountWrite(_seizeAsset, amountToCover);
        }
    }
}
