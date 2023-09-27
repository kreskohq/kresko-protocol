// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

library MError {
    error ZERO_BURN();
    error ZERO_DEBT();
    error ZERO_MINT();
    error BURN_AMOUNT_OVERFLOW(uint256, uint256);
    error BURN_VALUE_OVERFLOW();
}
