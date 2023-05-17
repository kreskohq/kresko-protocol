// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.14;
import {Action, SafetyState, Pause} from "../MinterTypes.sol";

interface ISafetyCouncilFacet {
    function toggleAssetsPaused(
        address[] memory _assets,
        Action _action,
        bool _withDuration,
        uint256 _duration
    ) external;

    function safetyStateSet() external view returns (bool);

    function safetyStateFor(address _asset, Action _action) external view returns (SafetyState memory);
}
