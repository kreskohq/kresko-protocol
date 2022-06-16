// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

interface ISafetyCouncilFacet {
    function toggleAssetsPaused(
        address[] memory _assets,
        uint8 _action,
        bool _withDuration,
        uint256 _duration
    ) external;
}
