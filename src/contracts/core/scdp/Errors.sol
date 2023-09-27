// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

library SError {
    error CUMULATE_AMOUNT_ZERO();
    error CUMULATE_NO_DEPOSITS();
    error SWAP_DEPOSITS_OVERFLOW(uint256, uint256);
    error SWAP_NOT_ENABLED(address, address);
    error SWAP_SLIPPAGE(uint256, uint256);
    error SWAP_ZERO_AMOUNT();
    error INVALID_INCOME_ASSET(address);
    error ASSET_NOT_ENABLED(address);
    error INVALID_ASSET_SDI();
    error ASSET_ALREADY_ENABLED_SDI();
    error ASSET_ALREADY_DISABLED_SDI();
}
