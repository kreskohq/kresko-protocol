pragma solidity ^0.8.0;

contract MockMarketStatus {
    mapping(bytes32 => bool) public tickers;

    function setTickerStatus(bytes32 _ticker, bool _status) external {
        tickers[_ticker] = _status;
    }

    function getTickerStatus(bytes32 _ticker) external view returns (bool) {
        return tickers[_ticker];
    }
}
