// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import {PLog} from "kresko-lib/utils/PLog.s.sol";
import {Vm} from "../../../../lib/forge-std/src/Vm.sol";
import {IAggregatorV3} from "kresko-lib/vendor/IAggregatorV3.sol";
import {LibVm, VmSafe} from "kresko-lib/utils/Scripted.s.sol";

// solhint-disable no-empty-blocks, reason-string, state-visibility, quotes

interface IVmParse {
    function toString(address value) external pure returns (string memory stringifiedValue);

    function toString(bytes calldata value) external pure returns (string memory stringifiedValue);

    function toString(bytes32 value) external pure returns (string memory stringifiedValue);

    function toString(bool value) external pure returns (string memory stringifiedValue);

    function toString(uint256 value) external pure returns (string memory stringifiedValue);

    function toString(int256 value) external pure returns (string memory stringifiedValue);

    // Convert values from a string
    function parseBytes(string calldata stringifiedValue) external pure returns (bytes memory parsedValue);

    function parseAddress(string calldata stringifiedValue) external pure returns (address parsedValue);

    function parseUint(string calldata stringifiedValue) external pure returns (uint256 parsedValue);

    function parseInt(string calldata stringifiedValue) external pure returns (int256 parsedValue);

    function parseBytes32(string calldata stringifiedValue) external pure returns (bytes32 parsedValue);

    function parseBool(string calldata stringifiedValue) external pure returns (bool parsedValue);

    function rpc(string calldata method, string calldata params) external;

    function createSelectFork(string calldata network) external returns (uint256);

    function createSelectFork(string calldata network, uint256 blockNr) external returns (uint256);

    function allowCheatcodes(address to) external;

    // Record all account accesses as part of CREATE, CALL or SELFDESTRUCT opcodes in order,
    // along with the context of the calls.
    function startStateDiffRecording() external;

    // Returns an ordered array of all account accesses from a `vm.startStateDiffRecording` session.
    function stopAndReturnStateDiff() external returns (Vm.AccountAccess[] memory accountAccesses);

    function unixTime() external view returns (uint256);

    function activeFork() external view returns (uint256);

    function selectFork(uint256 forkId) external;

    function rollFork(uint256 blockNumber) external;

    function rollFork(uint256 forkId, uint256 blockNumber) external;
}
IVmParse constant vmvmvm = IVmParse(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);

contract Setter {
    function set(address account, bytes32 slot, bytes32 value) external {
        vmvmvm.rpc(
            "anvil_setStorageAt",
            string.concat('["', vmvmvm.toString(account), '","', vmvmvm.toString(slot), '","', vmvmvm.toString(value), '"]')
        );
    }
}

function split(bytes32 val, uint256 bit) pure returns (bytes memory res) {
    assembly {
        mstore(res, 64)
        mstore(add(res, 32), shr(sub(256, bit), val))
        mstore(add(res, 64), shr(bit, shl(bit, val)))
    }
}

library Anvil {
    using PLog for *;

    function setStorage(address account, bytes32 slot, bytes32 value) internal {
        vmvmvm.rpc(
            "anvil_setStorageAt",
            string.concat('["', vmvmvm.toString(account), '","', vmvmvm.toString(slot), '","', vmvmvm.toString(value), '"]')
        );
        mine();
    }

    function mine() internal {
        uint256 blockNr = block.number;
        (VmSafe.CallerMode _m, address _s, address _o) = LibVm.clearCallers();

        vmvmvm.rpc("evm_mine", "[]");
        vmvmvm.createSelectFork("localhost", blockNr + 1);

        LibVm.restore(_m, _s, _o);
    }

    function syncTime(uint256 time) internal {
        uint256 current = time != 0 ? time : uint256((vmvmvm.unixTime() / 1000));
        vmvmvm.rpc("evm_setNextBlockTimestamp", string.concat("[", vmvmvm.toString(current), "]"));
        mine();
    }

    function setCLPrice(address _feed, uint256 _price) internal {
        vmvmvm.startStateDiffRecording();
        int256 price = IAggregatorV3(_feed).latestAnswer();
        Vm.AccountAccess[] memory acc = vmvmvm.stopAndReturnStateDiff();

        for (uint256 i = 0; i < acc.length; i++) {
            for (uint256 j = 0; j < acc[i].storageAccesses.length; j++) {
                bytes32 stored = acc[i].storageAccesses[j].previousValue;
                if (stored == bytes32(0)) {
                    continue;
                }
                (, int256 val) = abi.decode(split(stored, 64), (uint64, int192));

                if (price == val) {
                    _price.clg("setCLPrice.newPrice");
                    Anvil.setStorage(
                        acc[i].storageAccesses[j].account,
                        acc[i].storageAccesses[j].slot,
                        bytes32(abi.encodePacked(uint64(vmvmvm.unixTime() / 1000) - 1, int192(int256(_price))))
                    );
                    IAggregatorV3(_feed).latestAnswer().clg("setCLPrice.latestAnswer");
                }
            }
        }
    }
}
