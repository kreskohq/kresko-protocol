// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.21;

import {WadRay} from "libs/WadRay.sol";
import {Asset} from "common/Types.sol";
import {Errors} from "common/Errors.sol";
import {SCDPState} from "scdp/SState.sol";
import {IERC20} from "kresko-lib/token/IERC20.sol";
import {SCDPSeizeData} from "scdp/STypes.sol";
import {SEvent} from "scdp/SEvent.sol";

library SDeposits {
    using WadRay for uint256;
    using WadRay for uint128;

    /**
     * @notice Records a deposit of collateral asset.
     * @notice It will withdraw any pending fees first.
     * @notice Saves global deposit amount and principal for user.
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
        uint256 fees = handleFeeClaim(self, _asset, _account, _assetAddr);

        unchecked {
            // Save global deposits using normalized amount.
            uint128 normalizedAmount = uint128(_asset.toNonRebasingAmount(_amount));
            self.assetData[_assetAddr].totalDeposits += normalizedAmount;

            // Save account deposit amounts using liquidity index adjusted value.
            self.depositsPrincipal[_account][_assetAddr] += self.mulByLiqIndex(_assetAddr, normalizedAmount);

            // Save account last indexes.
            if (fees == 0) updateAccountIndexes(self, _account, _assetAddr);

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
     * @notice It will withdraw any pending fees first.
     * @notice Saves global deposit amount and principal for user.
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
        uint256 fees = handleFeeClaim(self, _asset, _account, _assetAddr);

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
            self.depositsPrincipal[_account][_assetAddr] -= self.mulByLiqIndex(_assetAddr, normalizedAmount);

            // Save account last indexes.
            if (fees == 0) updateAccountIndexes(self, _account, _assetAddr);
        }
    }

    /**
     * @notice This function seizes collateral from the shared pool.
     * @notice It will reduce all deposits in the case where swap deposits do not cover the amount.
     * @notice Each event touching user deposits will save a checkpoint of the indexes.
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

            uint256 prevLiqIndex = self.assetIndexes[_assetAddr].currLiqIndex;

            self.assetIndexes[_assetAddr].currLiqIndex += uint128(
                amountToCover.wadToRay().rayDiv(self.userDepositAmount(_assetAddr, _sAsset).wadToRay()).rayMul(prevLiqIndex)
            );

            self.seizeEvents[_assetAddr][self.assetIndexes[_assetAddr].currLiqIndex] = SCDPSeizeData({
                prevLiqIndex: prevLiqIndex,
                feeIndex: self.assetIndexes[_assetAddr].currFeeIndex,
                liqIndex: self.assetIndexes[_assetAddr].currLiqIndex
            });
        }
    }

    /**
     * @notice Fully handles fee claim.
     * @notice Checks whether some fees exists, withdrawis them and updates account indexes.
     * @param _asset The asset struct.
     * @param _account The account to withdraw fees for.
     * @param _assetAddr The asset address.
     * @return feeAmount Amount of fees withdrawn.
     * @dev This function is used by deposit and withdraw functions.
     */
    function handleFeeClaim(
        SCDPState storage self,
        Asset storage _asset,
        address _account,
        address _assetAddr
    ) internal returns (uint256 feeAmount) {
        uint256 fees = self.accountFees(_account, _assetAddr, _asset);

        if (fees > 0) {
            IERC20(_assetAddr).transfer(_account, fees);
            (uint256 prevIndex, uint256 newIndex) = updateAccountIndexes(self, _account, _assetAddr);
            emit SEvent.SCDPFeeClaim(_account, _assetAddr, fees, newIndex, prevIndex, block.timestamp);
        }

        return fees;
    }

    /**
     * @notice Updates account indexes to checkpoint the fee index and liquidation index at the time of action.
     * @param _account The account to update indexes for.
     * @param _assetAddr The asset being withdrawn/deposited.
     * @dev This function is used by deposit and withdraw functions.
     */
    function updateAccountIndexes(
        SCDPState storage self,
        address _account,
        address _assetAddr
    ) private returns (uint128 newIndex, uint128 prevIndex) {
        prevIndex = self.accountIndexes[_account][_assetAddr].lastFeeIndex;
        newIndex = self.assetIndexes[_assetAddr].currFeeIndex;
        self.accountIndexes[_account][_assetAddr].lastFeeIndex = self.assetIndexes[_assetAddr].currFeeIndex;
        self.accountIndexes[_account][_assetAddr].lastLiqIndex = self.assetIndexes[_assetAddr].currLiqIndex;
    }

    function mulByLiqIndex(SCDPState storage self, address _assetAddr, uint256 _amount) internal view returns (uint128) {
        return uint128(_amount.wadToRay().rayMul(self.assetIndexes[_assetAddr].currLiqIndex).rayToWad());
    }

    function divByLiqIndex(SCDPState storage self, address _assetAddr, uint256 _depositAmount) internal view returns (uint128) {
        return uint128(_depositAmount.wadToRay().rayDiv(self.assetIndexes[_assetAddr].currLiqIndex).rayToWad());
    }
}
