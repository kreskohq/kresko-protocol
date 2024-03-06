// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.23;

import {WadRay} from "libs/WadRay.sol";
import {Asset} from "common/Types.sol";
import {Errors} from "common/Errors.sol";
import {SCDPState} from "scdp/SState.sol";
import {IERC20} from "kresko-lib/token/IERC20.sol";
import {SCDPSeizeData} from "scdp/STypes.sol";
import {SEvent} from "scdp/SEvent.sol";
import {SafeTransfer} from "kresko-lib/token/SafeTransfer.sol";

library SDeposits {
    using WadRay for uint256;
    using WadRay for uint128;
    using SafeTransfer for IERC20;

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
    ) internal returns (uint256 feeIndex) {
        // Withdraw any fees first.
        uint256 fees = handleFeeClaim(self, _asset, _account, _assetAddr, _account, false);
        // Save account liquidation and fee indexes if they werent saved before.
        if (fees == 0) {
            (, feeIndex) = updateAccountIndexes(self, _account, _assetAddr);
        }

        unchecked {
            // Save global deposits using normalized amount.
            uint128 normalizedAmount = uint128(_asset.toNonRebasingAmount(_amount));
            self.assetData[_assetAddr].totalDeposits += normalizedAmount;

            // Save account deposit amount, its scaled up by the liquidation index.
            self.depositsPrincipal[_account][_assetAddr] += self.mulByLiqIndex(_assetAddr, normalizedAmount);

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
     * @param _receiver The receiver of the withdrawn fees
     * @param _skipClaim Emergency flag to skip claiming fees
     */
    function handleWithdrawSCDP(
        SCDPState storage self,
        Asset storage _asset,
        address _account,
        address _assetAddr,
        uint256 _amount,
        address _receiver,
        bool _skipClaim
    ) internal returns (uint256 feeIndex) {
        // Handle fee claiming.
        uint256 fees = handleFeeClaim(self, _asset, _account, _assetAddr, _receiver, _skipClaim);
        // Save account liquidation and fee indexes if they werent updated on fee claim.
        if (fees == 0) {
            (, feeIndex) = updateAccountIndexes(self, _account, _assetAddr);
        }

        // Get accounts principal deposits.
        uint256 depositsPrincipal = self.accountDeposits(_account, _assetAddr, _asset);

        // Check that we can perform the withdrawal.
        if (depositsPrincipal == 0) {
            revert Errors.ACCOUNT_HAS_NO_DEPOSITS(_account, Errors.id(_assetAddr));
        }
        if (depositsPrincipal < _amount) {
            revert Errors.WITHDRAW_AMOUNT_GREATER_THAN_DEPOSITS(_account, Errors.id(_assetAddr), _amount, depositsPrincipal);
        }

        unchecked {
            // Save global deposits using normalized amount.
            uint128 normalizedAmount = uint128(_asset.toNonRebasingAmount(_amount));
            self.assetData[_assetAddr].totalDeposits -= normalizedAmount;

            // Save account deposit amount, the amount withdrawn is scaled up by the liquidation index.
            self.depositsPrincipal[_account][_assetAddr] -= self.mulByLiqIndex(_assetAddr, normalizedAmount);
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
    function handleSeizeSCDP(
        SCDPState storage self,
        Asset storage _sAsset,
        address _assetAddr,
        uint256 _seizeAmount
    ) internal returns (uint128 prevLiqIndex, uint128 newLiqIndex) {
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
            self.assetData[_assetAddr].swapDeposits = 0;
            // total deposits = user deposits at this point
            self.assetData[_assetAddr].totalDeposits -= uint128(_sAsset.toNonRebasingAmount(_seizeAmount));

            // We need this later for seize data as well.
            prevLiqIndex = self.assetIndexes[_assetAddr].currLiqIndex;
            newLiqIndex = uint128(
                prevLiqIndex +
                    (_seizeAmount - swapDeposits).wadToRay().rayMul(prevLiqIndex).rayDiv(
                        _sAsset.toRebasingAmount(self.assetData[_assetAddr].totalDeposits.wadToRay())
                    )
            );

            // Increase liquidation index, note this uses rebased amounts instead of normalized.
            self.assetIndexes[_assetAddr].currLiqIndex = newLiqIndex;

            // Save the seize data.
            self.seizeEvents[_assetAddr][self.assetIndexes[_assetAddr].currLiqIndex] = SCDPSeizeData({
                prevLiqIndex: prevLiqIndex,
                feeIndex: self.assetIndexes[_assetAddr].currFeeIndex,
                liqIndex: self.assetIndexes[_assetAddr].currLiqIndex
            });
        }

        IERC20(_assetAddr).safeTransfer(msg.sender, _seizeAmount);
        return (prevLiqIndex, self.assetIndexes[_assetAddr].currLiqIndex);
    }

    /**
     * @notice Fully handles fee claim.
     * @notice Checks whether some fees exists, withdrawis them and updates account indexes.
     * @param _asset The asset struct.
     * @param _account The account to withdraw fees for.
     * @param _assetAddr The asset address.
     * @param _receiver Receiver of fees withdrawn, if 0 then the receiver is the account.
     * @param _skip Emergency flag, skips claiming fees due and logs a receipt for off-chain processing
     * @return feeAmount Amount of fees withdrawn.
     * @dev This function is used by deposit and withdraw functions.
     */
    function handleFeeClaim(
        SCDPState storage self,
        Asset storage _asset,
        address _account,
        address _assetAddr,
        address _receiver,
        bool _skip
    ) internal returns (uint256 feeAmount) {
        if (_skip) {
            _logFeeReceipt(self, _account, _assetAddr);
            return 0;
        }
        uint256 fees = self.accountFees(_account, _assetAddr, _asset);
        if (fees > 0) {
            (uint256 prevIndex, uint256 newIndex) = updateAccountIndexes(self, _account, _assetAddr);
            IERC20(_assetAddr).transfer(_receiver, fees);
            emit SEvent.SCDPFeeClaim(_account, _receiver, _assetAddr, fees, newIndex, prevIndex, block.timestamp);
        }

        return fees;
    }

    function _logFeeReceipt(SCDPState storage self, address _account, address _assetAddr) private {
        emit SEvent.SCDPFeeReceipt(
            _account,
            _assetAddr,
            self.depositsPrincipal[_account][_assetAddr],
            self.assetIndexes[_assetAddr].currFeeIndex,
            self.accountIndexes[_account][_assetAddr].lastFeeIndex,
            self.assetIndexes[_assetAddr].currLiqIndex,
            self.accountIndexes[_account][_assetAddr].lastLiqIndex,
            block.number,
            block.timestamp
        );
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
    ) private returns (uint128 prevIndex, uint128 newIndex) {
        prevIndex = self.accountIndexes[_account][_assetAddr].lastFeeIndex;
        newIndex = self.assetIndexes[_assetAddr].currFeeIndex;
        self.accountIndexes[_account][_assetAddr].lastFeeIndex = self.assetIndexes[_assetAddr].currFeeIndex;
        self.accountIndexes[_account][_assetAddr].lastLiqIndex = self.assetIndexes[_assetAddr].currLiqIndex;
        self.accountIndexes[_account][_assetAddr].timestamp = block.timestamp;
    }

    function mulByLiqIndex(SCDPState storage self, address _assetAddr, uint256 _amount) internal view returns (uint128) {
        return uint128(_amount.wadToRay().rayMul(self.assetIndexes[_assetAddr].currLiqIndex).rayToWad());
    }

    function divByLiqIndex(SCDPState storage self, address _assetAddr, uint256 _depositAmount) internal view returns (uint128) {
        return uint128(_depositAmount.wadToRay().rayDiv(self.assetIndexes[_assetAddr].currLiqIndex).rayToWad());
    }
}
