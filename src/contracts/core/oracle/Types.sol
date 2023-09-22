// SPDX-License-Identifier: BUSL-1.1

pragma solidity >=0.8.19;

struct Oracle {
    address feed;
    function(address) external view returns (uint256) priceGetter;
}

enum OracleType {
    Redstone,
    Chainlink,
    API3
}

struct OracleConfiguration {
    OracleType[2] oracleIds;
    address[2] feeds;
}
