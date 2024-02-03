// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.23;

import {Asset} from "common/Types.sol";
import {PercentageMath} from "libs/PercentageMath.sol";
import {WadRay} from "libs/WadRay.sol";
import {toWad} from "common/funcs/Math.sol";
import {IAggregatorV3} from "kresko-lib/vendor/IAggregatorV3.sol";
import {IPyth} from "vendor/pyth/IPyth.sol";
import {cs} from "common/State.sol";
import {Errors} from "common/Errors.sol";

using PercentageMath for uint256;
using WadRay for uint256;

/// @notice Helper function to get unadjusted, adjusted and price values for collateral assets
function collateralAmountToValues(
    Asset storage self,
    uint256 _amount
) view returns (uint256 value, uint256 valueAdjusted, uint256 price) {
    price = self.price();
    value = toWad(_amount, self.decimals).wadMul(price);
    valueAdjusted = value.percentMul(self.factor);
}

/// @notice Helper function to get unadjusted, adjusted and price values for debt assets
function debtAmountToValues(
    Asset storage self,
    uint256 _amount
) view returns (uint256 value, uint256 valueAdjusted, uint256 price) {
    price = self.price();
    value = _amount.wadMul(price);
    valueAdjusted = value.percentMul(self.kFactor);
}

/**
 * @notice Checks if the L2 sequencer is up.
 * 1 means the sequencer is down, 0 means the sequencer is up.
 * @param _uptimeFeed The address of the uptime feed.
 * @param _gracePeriod The grace period in seconds.
 * @return bool returns true/false if the sequencer is up/not.
 */
function isSequencerUp(address _uptimeFeed, uint256 _gracePeriod) view returns (bool) {
    bool up = true;
    if (_uptimeFeed != address(0)) {
        (, int256 answer, uint256 startedAt, , ) = IAggregatorV3(_uptimeFeed).latestRoundData();

        up = answer == 0;
        if (!up) {
            return false;
        }
        // Make sure the grace period has passed after the
        // sequencer is back up.
        if (block.timestamp - startedAt < _gracePeriod) {
            return false;
        }
    }
    return up;
}

/**
 * If update data exists, updates the prices in the pyth endpoint. Does nothing when data is empty.
 * @param _updateData The update data.
 * @dev Reverts if msg.value does not match the update fee required.
 * @dev Sending empty data + non-zero msg.value should be handled by the caller.
 */
function handlePythUpdate(bytes[] calldata _updateData) {
    if (_updateData.length == 0) {
        return;
    }

    IPyth pythEp = IPyth(cs().pythEp);
    uint256 updateFee = pythEp.getUpdateFee(_updateData);

    if (msg.value > updateFee) {
        revert Errors.UPDATE_FEE_OVERFLOW(msg.value, updateFee);
    }

    pythEp.updatePriceFeeds{value: updateFee}(_updateData);
}
