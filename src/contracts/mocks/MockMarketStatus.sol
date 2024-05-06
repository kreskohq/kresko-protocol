pragma solidity ^0.8.0;

contract MockMarketStatus {
    mapping(bytes32 => bool) public tickers;

    function initialize() external {
        tickers[bytes32("BTC")] = true;
        tickers[bytes32("ETH")] = true;
        tickers[bytes32("SOL")] = true;
        tickers[bytes32("ARB")] = true;
        tickers[bytes32("USDC")] = true;
        tickers[bytes32("KISS")] = true;
        tickers[bytes32("XAU")] = true;
        tickers[bytes32("JPY")] = true;
    }

    function setTickerStatus(bytes32 _ticker, bool _status) external {
        tickers[_ticker] = _status;
    }

    function getTickerStatus(bytes32 _ticker) external view returns (bool) {
        return tickers[_ticker];
    }
}
