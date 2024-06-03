// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MockMarketStatus {
    bool public alwaysOpen = true;

    mapping(bytes32 => bool) public tickers;

    function setAlwaysOpen(bool _status) external {
        alwaysOpen = _status;
    }

    function setTickerStatus(bytes32 _ticker, bool _status) external {
        tickers[_ticker] = _status;
    }

    function getTickerStatus(bytes32 _ticker) external view returns (bool) {
        return alwaysOpen || tickers[_ticker];
    }
}
