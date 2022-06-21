// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

interface IKreskoAsset {
    function kresko() external view returns (address);

    function updateMetaData(
        string memory _name,
        string memory _symbol,
        uint8 _version
    ) external;

    function setRate(uint256 _rate) external;
}
