// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IMarketStatus {
    function allowed(address) external view returns (bool);

    function exchanges(bytes32) external view returns (bytes32);

    function status(bytes32) external view returns (uint256);

    function setStatus(bytes32[] calldata, bool[] calldata) external;

    function setTickers(bytes32[] calldata, bytes32[] calldata) external;

    function setAllowed(address, bool) external;

    function getExchangeStatus(bytes32) external view returns (bool);

    function getExchangeStatuses(bytes32[] calldata) external view returns (bool[] memory);

    function getExchange(bytes32) external view returns (bytes32);

    function getTickerStatus(bytes32) external view returns (bool);

    function getTickerExchange(bytes32) external view returns (bytes32);

    function getTickerStatuses(bytes32[] calldata) external view returns (bool[] memory);

    function owner() external view returns (address);
}
