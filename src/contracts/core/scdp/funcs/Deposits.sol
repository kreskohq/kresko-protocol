// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

import {WadRay} from "libs/WadRay.sol";
import {Asset} from "common/Types.sol";
import {cs} from "common/State.sol";
import {CError} from "common/Errors.sol";
import {SCDPState} from "scdp/State.sol";

library SDeposits {
    using WadRay for uint256;
    using WadRay for uint128;

    /**
     * @notice Records a deposit of collateral asset.
     * @dev Saves principal, scaled and global deposit amounts.
     * @param _account depositor
     * @param _assetAddr the deposit asset
     * @param _amount amount of collateral asset to deposit
     */
    function handleDepositSCDP(SCDPState storage self, address _account, address _assetAddr, uint256 _amount) internal {
        Asset memory asset = cs().assets[_assetAddr];
        if (!asset.isSCDPDepositAsset) {
            revert CError.INVALID_DEPOSIT_ASSET(_assetAddr);
        }

        uint128 depositAmount = uint128(asset.toNonRebasingAmount(_amount));

        unchecked {
            // Save global deposits.
            self.assetData[_assetAddr].totalDeposits += depositAmount;
            // Save principal deposits.
            self.depositsPrincipal[_account][_assetAddr] += depositAmount;
            // Save scaled deposits.
            self.deposits[_account][_assetAddr] += depositAmount.wadToRay().rayDiv(asset.liquidityIndexSCDP);
        }
        if (self.userDepositAmount(_assetAddr, asset) > asset.depositLimitSCDP) {
            revert CError.DEPOSIT_LIMIT(_assetAddr, self.userDepositAmount(_assetAddr, asset), asset.depositLimitSCDP);
        }
    }

    /**
     * @notice Records a withdrawal of collateral asset from the SCDP.
     * @param _account The withdrawing account
     * @param _assetAddr the deposit asset
     * @param _amount The amount of collateral withdrawn
     * @return amountOut The actual amount of collateral withdrawn
     * @return feesOut The fees paid for during the withdrawal
     */
    function handleWithdrawSCDP(
        SCDPState storage self,
        address _account,
        address _assetAddr,
        uint256 _amount
    ) internal returns (uint256 amountOut, uint256 feesOut) {
        // Do not check for isEnabled, always allow withdrawals.
        Asset memory asset = cs().assets[_assetAddr];

        // Get accounts principal deposits.
        uint256 depositsPrincipal = self.accountPrincipalDeposits(_account, _assetAddr, asset);

        if (depositsPrincipal >= _amount) {
            // == Principal can cover possibly rebased `_amount` requested.
            // 1. We send out the requested amount.
            amountOut = _amount;
            // 2. No fees.
            // 3. Possibly un-rebased amount for internal bookeeping.
            uint128 amountWrite = uint128(asset.toNonRebasingAmount(_amount));
            unchecked {
                // 4. Reduce global deposits.
                self.assetData[_assetAddr].totalDeposits -= amountWrite;
                // 5. Reduce principal deposits.
                self.depositsPrincipal[_account][_assetAddr] -= amountWrite;
                // 6. Reduce scaled deposits.
                self.deposits[_account][_assetAddr] -= amountWrite.wadToRay().rayDiv(asset.liquidityIndexSCDP);
            }
        } else {
            // == Principal can't cover possibly rebased `_amount` requested, send full collateral available.
            // 1. We send all collateral.
            amountOut = depositsPrincipal;
            // 2. With fees.
            feesOut = self.accountScaledDeposits(_account, _assetAddr, asset) - depositsPrincipal;
            // 3. Ensure this is actually the case.
            if (feesOut == 0) {
                revert CError.WITHDRAWAL_VIOLATION(_assetAddr);
            }

            // 4. Wipe account collateral deposits.
            self.depositsPrincipal[_account][_assetAddr] = 0;
            self.deposits[_account][_assetAddr] = 0;
            // 5. Reduce global by ONLY by the principal, fees are NOT collateral.
            self.assetData[_assetAddr].totalDeposits -= uint128(asset.toNonRebasingAmount(depositsPrincipal));
        }
    }

    /**
     * @notice This function seizes collateral from the shared pool
     * @notice Adjusts all deposits in the case where swap deposits do not cover the amount.
     * @param _sAssetAddr The seized asset address.
     * @param _sAsset The asset struct (Asset).
     * @param _seizeAmount The seize amount (uint256).
     */
    function handleSeizeSCDP(SCDPState storage self, address _sAssetAddr, Asset memory _sAsset, uint256 _seizeAmount) internal {
        uint128 swapDeposits = self.swapDepositAmount(_sAssetAddr, _sAsset);

        if (swapDeposits >= _seizeAmount) {
            uint128 amountOut = uint128(_sAsset.toNonRebasingAmount(_seizeAmount));
            // swap deposits cover the amount
            unchecked {
                self.assetData[_sAssetAddr].swapDeposits -= amountOut;
                self.assetData[_sAssetAddr].totalDeposits -= amountOut;
            }
        } else {
            // swap deposits do not cover the amount
            uint256 amountToCover = uint128(_seizeAmount - swapDeposits);
            // reduce everyones deposits by the same ratio
            cs().assets[_sAssetAddr].liquidityIndexSCDP -= uint128(
                amountToCover.wadToRay().rayDiv(self.userDepositAmount(_sAssetAddr, _sAsset).wadToRay())
            );
            self.assetData[_sAssetAddr].swapDeposits = 0;
            self.assetData[_sAssetAddr].totalDeposits -= uint128(_sAsset.toNonRebasingAmount(amountToCover));
        }
    }

    /**
     * @notice This function seizes collateral from the shared pool
     * @notice Adjusts all deposits in the case where swap deposits do not cover the amount.
     * @param _sAssetAddr The seized asset address.
     * @param _sAsset The asset struct (Asset).
     * @param _seizeAmount The seize amount (uint256).
     */
    function handleSeizeSCDPStorage(
        SCDPState storage self,
        address _sAssetAddr,
        Asset storage _sAsset,
        uint256 _seizeAmount
    ) internal {
        uint128 swapDeposits = self.swapDepositAmountStorage(_sAssetAddr, _sAsset);

        if (swapDeposits >= _seizeAmount) {
            uint128 amountOut = uint128(_sAsset.toNonRebasingAmountStorage(_seizeAmount));
            // swap deposits cover the amount
            unchecked {
                self.assetData[_sAssetAddr].swapDeposits -= amountOut;
                self.assetData[_sAssetAddr].totalDeposits -= amountOut;
            }
        } else {
            // swap deposits do not cover the amount
            uint256 amountToCover = uint128(_seizeAmount - swapDeposits);
            // reduce everyones deposits by the same ratio
            cs().assets[_sAssetAddr].liquidityIndexSCDP -= uint128(
                amountToCover.wadToRay().rayDiv(self.userDepositAmountStorage(_sAssetAddr, _sAsset).wadToRay())
            );
            self.assetData[_sAssetAddr].swapDeposits = 0;
            self.assetData[_sAssetAddr].totalDeposits -= uint128(_sAsset.toNonRebasingAmountStorage(amountToCover));
        }
    }
}
