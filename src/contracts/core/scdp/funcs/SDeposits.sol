// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.21;

import {WadRay} from "libs/WadRay.sol";
import {Asset} from "common/Types.sol";
import {Errors} from "common/Errors.sol";
import {SCDPState} from "scdp/SState.sol";
import {IERC20} from "kresko-lib/token/IERC20.sol";
import {SCDPSeizeEvent} from "scdp/STypes.sol";
import {console2} from "forge-std/console2.sol";

library SDeposits {
    using WadRay for uint256;
    using WadRay for uint128;

    function mulByLiquidationIndex(
        SCDPState storage self,
        address _assetAddr,
        uint256 _amount
    ) internal view returns (uint128) {
        return uint128(_amount.wadToRay().rayMul(self.assetIndexes[_assetAddr].currentLiquidation).rayToWad());
    }

    function divByLiquidationIndex(
        SCDPState storage self,
        address _assetAddr,
        uint256 _depositAmount
    ) internal view returns (uint128) {
        return uint128(_depositAmount.wadToRay().rayDiv(self.assetIndexes[_assetAddr].currentLiquidation).rayToWad());
    }

    /**
     * @notice Records a deposit of collateral asset.
     * @dev Saves principal, scaled and global deposit amounts.
     * @param _asset Asset struct for the deposit asset
     * @param _account depositor
     * @param _assetAddr the deposit asset
     * @param _amount amount of collateral asset to deposit
     */
    function handleDepositSCDP(
        SCDPState storage self,
        Asset storage _asset,
        address _account,
        address _assetAddr,
        uint256 _amount
    ) internal {
        // Withdraw any fees first.
        bool didUpdateIndexes = handleFees(self, _asset, _account, _assetAddr);

        unchecked {
            // Save global deposits using normalized amount.
            uint128 normalizedAmount = uint128(_asset.toNonRebasingAmount(_amount));
            self.assetData[_assetAddr].totalDeposits += normalizedAmount;

            // Save account deposit amounts using liquidity index adjusted value.
            self.depositsPrincipal[_account][_assetAddr] += self.mulByLiquidationIndex(_assetAddr, normalizedAmount);

            // Save account last indexes.
            if (!didUpdateIndexes) self.updateAccountLastIndexes(_account, _assetAddr);

            // Check if the deposit limit is exceeded.
            if (self.userDepositAmount(_assetAddr, _asset) > _asset.depositLimitSCDP) {
                revert Errors.EXCEEDS_ASSET_DEPOSIT_LIMIT(
                    Errors.id(_assetAddr),
                    self.userDepositAmount(_assetAddr, _asset),
                    _asset.depositLimitSCDP
                );
            }
        }
    }

    /**
     * @notice Records a withdrawal of collateral asset from the SCDP.
     * @param _asset Asset struct for the deposit asset
     * @param _account The withdrawing account
     * @param _assetAddr the deposit asset
     * @param _amount The amount of collateral to withdraw
     */
    function handleWithdrawSCDP(
        SCDPState storage self,
        Asset storage _asset,
        address _account,
        address _assetAddr,
        uint256 _amount
    ) internal {
        // Withdraw any fees first.
        bool didUpdateIndexes = handleFees(self, _asset, _account, _assetAddr);

        // Allow just withdrawing fees.
        if (_amount == 0) return;

        // Get accounts principal deposits.
        uint256 depositsPrincipal = self.accountDeposits(_account, _assetAddr, _asset);

        // Check we can perform the withdrawal.
        if (depositsPrincipal < _amount) {
            revert Errors.NOTHING_TO_WITHDRAW(_account, Errors.id(_assetAddr), _amount, depositsPrincipal, 0);
        }

        unchecked {
            // Save global deposits using normalized amount.
            uint128 normalizedAmount = uint128(_asset.toNonRebasingAmount(_amount));
            self.assetData[_assetAddr].totalDeposits -= normalizedAmount;

            // Save account deposit amounts using liquidity index adjusted value.
            self.depositsPrincipal[_account][_assetAddr] -= self.mulByLiquidationIndex(_assetAddr, normalizedAmount);

            // Save account last indexes.
            if (!didUpdateIndexes) self.updateAccountLastIndexes(_account, _assetAddr);
        }
    }

    /**
     * @notice This function seizes collateral from the shared pool
     * @notice Adjusts all deposits in the case where swap deposits do not cover the amount.
     * @param _sAsset The asset struct (Asset).
     * @param _assetAddr The seized asset address.
     * @param _seizeAmount The seize amount (uint256).
     */
    function handleSeizeSCDP(SCDPState storage self, Asset storage _sAsset, address _assetAddr, uint256 _seizeAmount) internal {
        uint128 swapDeposits = self.swapDepositAmount(_assetAddr, _sAsset);

        if (swapDeposits >= _seizeAmount) {
            uint128 amountOut = uint128(_sAsset.toNonRebasingAmount(_seizeAmount));
            // swap deposits cover the amount
            unchecked {
                self.assetData[_assetAddr].swapDeposits -= amountOut;
                self.assetData[_assetAddr].totalDeposits -= amountOut;
            }
        } else {
            // swap deposits do not cover the amount
            uint128 amountToCover = uint128(_seizeAmount - swapDeposits);
            self.assetData[_assetAddr].swapDeposits = 0;
            self.assetData[_assetAddr].totalDeposits -= uint128(_sAsset.toNonRebasingAmount(_seizeAmount));

            uint256 previousLiquidationIndex = self.assetIndexes[_assetAddr].currentLiquidation;

            self.assetIndexes[_assetAddr].currentLiquidation += uint128(
                amountToCover.wadToRay().rayDiv(self.userDepositAmount(_assetAddr, _sAsset).wadToRay()).rayMul(
                    self.assetIndexes[_assetAddr].currentLiquidation
                )
            );
            self.assetIndexes[_assetAddr].lastFeeAtSeize = self.assetIndexes[_assetAddr].currentFee;

            self.seizeEvents[_assetAddr][self.assetIndexes[_assetAddr].currentLiquidation] = SCDPSeizeEvent({
                previousLiquidationIndex: previousLiquidationIndex,
                feeIndex: self.assetIndexes[_assetAddr].currentFee,
                liquidationIndex: self.assetIndexes[_assetAddr].currentLiquidation,
                blocknumber: uint256(block.number)
            });
        }
    }

    /**
     * @notice Handles fees by checking if they do exist, withdrawing them and updating indexes.
     * @param _asset The asset struct.
     * @param _account The account to withdraw fees for.
     * @param _assetAddr The asset address.
     * @return didUpdateIndexes Whether indexes were updated.
     * @dev This function is used by deposit and withdraw functions.
     */
    function handleFees(
        SCDPState storage self,
        Asset storage _asset,
        address _account,
        address _assetAddr
    ) private returns (bool didUpdateIndexes) {
        uint256 fees = self.accountFees(_account, _assetAddr, _asset);
        if (fees > 0) {
            IERC20(_assetAddr).transfer(_account, fees);
            self.updateAccountLastIndexes(_account, _assetAddr);
        }

        return fees > 0;
    }

    function updateAccountLastIndexes(SCDPState storage self, address _account, address _assetAddr) internal {
        self.accountIndexes[_account][_assetAddr].lastFee = self.assetIndexes[_assetAddr].currentFee;
        self.accountIndexes[_account][_assetAddr].lastLiquidation = self.assetIndexes[_assetAddr].currentLiquidation;
    }
}
