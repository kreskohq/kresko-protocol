// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

import {SafeERC20} from "vendor/SafeERC20.sol";
import {IERC20Permit} from "vendor/IERC20Permit.sol";
import {WadRay} from "libs/WadRay.sol";

import {collateralAmountWrite} from "minter/funcs/Conversions.sol";

import {SCDPState} from "scdp/State.sol";

library SDeposits {
    using WadRay for uint256;
    using WadRay for uint128;
    using SafeERC20 for IERC20Permit;

    /**
     * @notice Records a deposit of collateral asset.
     * @dev Saves principal, scaled and global deposit amounts.
     * @param _account depositor
     * @param _collateralAsset the collateral asset
     * @param _depositAmount amount of collateral asset to deposit
     */
    function handleSCDPDeposit(
        SCDPState storage self,
        address _account,
        address _collateralAsset,
        uint256 _depositAmount
    ) internal {
        require(self.isEnabled[_collateralAsset], "asset-disabled");
        uint256 depositAmount = collateralAmountWrite(_collateralAsset, _depositAmount);

        unchecked {
            // Save global deposits.
            self.totalDeposits[_collateralAsset] += depositAmount;
            // Save principal deposits.
            self.depositsPrincipal[_account][_collateralAsset] += depositAmount;
            // Save scaled deposits.
            self.deposits[_account][_collateralAsset] += depositAmount.wadToRay().rayDiv(
                self.poolCollateral[_collateralAsset].liquidityIndex
            );
        }

        require(
            self.totalDeposits[_collateralAsset] <= self.poolCollateral[_collateralAsset].depositLimit,
            "deposit-limit"
        );
    }

    /**
     * @notice Records a withdrawal of collateral asset.
     * @param self Collateral Pool State
     * @param _account withdrawer
     * @param _collateralAsset collateral asset
     * @param collateralOut The actual amount of collateral withdrawn
     */
    function handleSCDPWithdraw(
        SCDPState storage self,
        address _account,
        address _collateralAsset,
        uint256 _amount
    ) internal returns (uint256 collateralOut, uint256 feesOut) {
        // Do not check for isEnabled, always allow withdrawals.

        // Get accounts principal deposits.
        uint256 depositsPrincipal = self.accountPrincipalDeposits(_account, _collateralAsset);

        if (depositsPrincipal >= _amount) {
            // == Principal can cover possibly rebased `_amount` requested.
            // 1. We send out the requested amount.
            collateralOut = _amount;
            // 2. No fees.
            // 3. Possibly un-rebased amount for internal bookeeping.
            uint256 withdrawAmountInternal = collateralAmountWrite(_collateralAsset, _amount);
            unchecked {
                // 4. Reduce global deposits.
                self.totalDeposits[_collateralAsset] -= withdrawAmountInternal;
                // 5. Reduce principal deposits.
                self.depositsPrincipal[_account][_collateralAsset] -= withdrawAmountInternal;
                // 6. Reduce scaled deposits.
                self.deposits[_account][_collateralAsset] -= withdrawAmountInternal.wadToRay().rayDiv(
                    self.poolCollateral[_collateralAsset].liquidityIndex
                );
            }
        } else {
            // == Principal can't cover possibly rebased `_amount` requested, send full collateral available.
            // 1. We send all collateral.
            collateralOut = depositsPrincipal;
            // 2. With fees.
            feesOut = self.accountDepositsWithFees(_account, _collateralAsset) - depositsPrincipal;
            // 3. Ensure this is actually the case.
            require(feesOut > 0, "withdrawal-violation");
            // 4. Wipe account collateral deposits.
            self.depositsPrincipal[_account][_collateralAsset] = 0;
            self.deposits[_account][_collateralAsset] = 0;
            // 5. Reduce global by ONLY by the principal, fees are not collateral.
            self.totalDeposits[_collateralAsset] -= collateralAmountWrite(_collateralAsset, depositsPrincipal);
        }
    }

    /// @notice This function seizes collateral from the shared pool
    /// @notice Adjusts all deposits in the case where swap deposits do not cover the amount.
    function handleSCDPSeizeCollateral(SCDPState storage self, address _seizeAsset, uint256 _seizeAmount) internal {
        uint256 swapDeposits = self.swapDepositAmount(_seizeAsset);

        if (swapDeposits >= _seizeAmount) {
            uint256 amountOutInternal = collateralAmountWrite(_seizeAsset, _seizeAmount);
            // swap deposits cover the amount
            self.swapDeposits[_seizeAsset] -= amountOutInternal;
            self.totalDeposits[_seizeAsset] -= amountOutInternal;
        } else {
            // swap deposits do not cover the amount
            uint256 amountToCover = _seizeAmount - swapDeposits;
            // reduce everyones deposits by the same ratio
            self.poolCollateral[_seizeAsset].liquidityIndex -= uint128(
                amountToCover.wadToRay().rayDiv(self.userDepositAmount(_seizeAsset).wadToRay())
            );
            self.swapDeposits[_seizeAsset] = 0;
            self.totalDeposits[_seizeAsset] -= collateralAmountWrite(_seizeAsset, amountToCover);
        }
    }
}
