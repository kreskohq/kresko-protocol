// SPDX-License-Identifier: BUSL-1.1

pragma solidity >=0.8.19;

struct Oracle {
    address feed;
    function(address) external view returns (uint256) priceGetter;
}

enum OracleType {
    Chainlink,
    Redstone,
    Api3
}

struct OracleState {
    mapping(bytes32 assetId => mapping(uint8 oracleId => Oracle)) oracles;
}
