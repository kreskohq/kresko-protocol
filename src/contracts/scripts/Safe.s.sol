// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import {mvm} from "kresko-lib/utils/MinVm.s.sol";
import {Help, Log} from "kresko-lib/utils/Libs.s.sol";
import {__revert} from "kresko-lib/utils/Base.s.sol";

// solhint-disable no-empty-blocks, reason-string, state-visibility

contract SafeScript {
    using Help for *;
    using Log for *;

    enum Operation {
        CALL,
        DELEGATECALL
    }

    struct Payload {
        address to;
        uint256 value;
        bytes data;
    }

    struct Batch {
        address to;
        uint256 value;
        bytes data;
        Operation operation;
        uint256 safeTxGas;
        uint256 baseGas;
        uint256 gasPrice;
        address gasToken;
        address refundReceiver;
        uint256 nonce;
        bytes32 txHash;
        bytes signature;
    }

    string constant NETWORK = "arbitrum";
    uint256 constant CHAIN_ID = 42161;

    address constant SAFE_ADDRESS = 0x266489Bde85ff0dfe1ebF9f0a7e6Fed3a973cEc3;
    address constant MULTI_SEND_ADDRESS = 0x40A2aCCbd92BCA938b02010E17A5b8929b49130D;

    bytes32 constant DOMAIN_SEPARATOR_TYPEHASH = 0x47e79534a245952e8b16893a336b85a3d9ea9fa8c573f3d803afb92a79469218;
    bytes32 constant SAFE_TX_TYPEHASH = 0xbb8310d486368db6bd6f849402fdd73ad53d316b5a4b2644ad6efe0f941286d8;

    bytes[] transactions;
    string[] argsFFI;

    function simulateAndPropose(string memory broadcastId) public {
        mvm.createSelectFork("arbitrum");
        signBatch(simulate(broadcastId));
    }

    function simulate(string memory broadcastId) public returns (Batch memory batch) {
        Payloads memory data = getPayloads(broadcastId);
        printPayloads(data);
        for (uint256 i; i < data.payloads.length; ++i) {
            require(!data.extras[i].transactionType.equals("CREATE"), "Only CALL transactions are supported");
        }

        batch = _simulate(data);
        writeOutput(broadcastId, batch, data.payloads);
    }

    // Encodes the stored encoded transactions into a single Multisend transaction
    function createBatch(Payloads memory data) internal pure returns (Batch memory batch) {
        batch.to = MULTI_SEND_ADDRESS;
        batch.value = 0;
        batch.operation = Operation.DELEGATECALL;

        bytes memory calls;
        for (uint256 i; i < data.payloads.length; ++i) {
            calls = bytes.concat(
                calls,
                abi.encodePacked(
                    Operation.CALL,
                    data.payloads[i].to,
                    data.payloads[i].value,
                    data.payloads[i].data.length,
                    data.payloads[i].data
                )
            );
        }

        batch.data = abi.encodeWithSignature("multiSend(bytes)", calls);
        batch.nonce = data.safeNonce;
        batch.txHash = getSafeTxHash(batch);
    }

    function _simulate(Payloads memory payloads) private returns (Batch memory batch) {
        mvm.writeFile("temp/ctor.json", mvm.serializeBytes("", "ctor", abi.encode(SAFE_ADDRESS, payloads.payloads)));
        batch = createBatch(payloads);
        bytes32 fromSafe = getSafeTxHash(batch);
        string
            .concat(
                "Simulating in network: ",
                NETWORK,
                "\n  chainId: ",
                block.chainid.str(),
                "\n  safeTxHash: ",
                fromSafe.str(),
                "\n  batch.txHash: ",
                batch.txHash.str()
            )
            .clg();
        mvm.prank(SAFE_ADDRESS);
        (bool success, bytes memory returnData) = SAFE_ADDRESS.call(
            abi.encodeWithSignature("simulateAndRevert(address,bytes)", batch.to, batch.data)
        );
        if (!success) {
            (bool successRevert, bytes memory successReturnData) = abi.decode(returnData, (bool, bytes));
            if (!successRevert) {
                Log.clg("Batch simulation failed: ", successReturnData.str());
                __revert(successReturnData);
            }
            if (successReturnData.length == 0) {
                Log.clg("Batch simulation successful with no return data.");
            } else {
                Log.clg(successReturnData.str(), "Batch simulation successful with return data: ");
            }
        }
    }

    // Computes the EIP712 hash of a Safe transaction.
    // Look at https://github.com/safe-global/safe-eth-py/blob/174053920e0717cc9924405e524012c5f953cd8f/gnosis/safe/safe_tx.py#L186
    // and https://github.com/safe-global/safe-eth-py/blob/master/gnosis/eth/eip712/__init__.py
    function getSafeTxHash(Batch memory batch) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    hex"1901",
                    keccak256(abi.encode(DOMAIN_SEPARATOR_TYPEHASH, CHAIN_ID, SAFE_ADDRESS)),
                    keccak256(
                        abi.encode(
                            SAFE_TX_TYPEHASH,
                            batch.to,
                            batch.value,
                            keccak256(batch.data),
                            batch.operation,
                            batch.safeTxGas,
                            batch.baseGas,
                            batch.gasPrice,
                            batch.gasToken,
                            batch.refundReceiver,
                            batch.nonce
                        )
                    )
                )
            );
    }

    function getSafeTxFromSafe(Batch memory batch) internal view returns (bytes32) {
        (bool success, bytes memory returnData) = SAFE_ADDRESS.staticcall(
            abi.encodeWithSignature(
                "getTransactionHash(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,uint256)",
                batch.to,
                batch.value,
                batch.data,
                uint8(batch.operation),
                batch.safeTxGas,
                batch.baseGas,
                batch.gasPrice,
                batch.gasToken,
                batch.refundReceiver,
                batch.nonce
            )
        );
        if (!success) {
            __revert(returnData);
        }
        return abi.decode(returnData, (bytes32));
    }

    function getPayloads(string memory broadcastId) internal returns (Payloads memory) {
        argsFFI = [
            "bun",
            "--no-warnings",
            "utils/ffi.ts",
            "getSafePayloads",
            broadcastId,
            mvm.toString(CHAIN_ID),
            mvm.toString(SAFE_ADDRESS)
        ];
        return abi.decode(mvm.ffi(argsFFI), (Payloads));
    }

    function signBatch(Batch memory batch) internal returns (string memory fileName, bytes memory signature, address signer) {
        argsFFI = [
            "bun",
            "--no-warnings",
            "utils/ffi.ts",
            "signBatch",
            mvm.toString(SAFE_ADDRESS),
            mvm.toString(CHAIN_ID),
            abi.encode(batch).str()
        ];

        (fileName, signature, signer) = abi.decode(mvm.ffi(argsFFI), (string, bytes, address));
    }

    function writeOutput(string memory broadcastId, Batch memory data, Payload[] memory payloads) internal {
        string memory path = "temp/batch/";
        string memory fileName = string.concat(path, broadcastId, "-", SAFE_ADDRESS.str(), "-", CHAIN_ID.str(), ".json");
        if (!mvm.exists(path)) {
            mvm.createDir(path, true);
        }
        string memory out = "values";
        mvm.serializeBytes(out, "batch", abi.encode(data));
        mvm.serializeAddress(out, "multisendAddr", MULTI_SEND_ADDRESS);
        mvm.writeFile(fileName, mvm.serializeBytes(out, "payloads", abi.encode(payloads)));
    }

    function printPayloads(Payloads memory payloads) public pure {
        for (uint256 i; i < payloads.payloads.length; ++i) {
            Payload memory payload = payloads.payloads[i];
            // string memory data = string(payload.data);
            string memory txStr = string.concat("to: ", payload.to.str(), " value: ", payload.value.str());
            txStr.clg();
            string memory funcStr = string.concat(
                "new contracts -> ",
                payloads.extras[i].creations.length.str(),
                "\n  function -> ",
                payloads.extras[i].func,
                "\n  args -> ",
                join(payloads.extras[i].args)
            );
            funcStr.clg();
            Log.n();
        }
    }

    function join(string[] memory arr) public pure returns (string memory result) {
        for (uint256 i; i < arr.length; ++i) {
            uint256 len = bytes(arr[i]).length;
            string memory suffix = i == arr.length - 1 ? "" : ",";

            if (len > 500) {
                string memory lengthStr = string.concat("bytes(", mvm.toString(len), ")");
                result = string.concat(result, lengthStr, suffix);
            } else {
                result = string.concat(result, arr[i], suffix);
            }
        }
    }

    struct PayloadExtra {
        string name;
        address contractAddr;
        string transactionType;
        string func;
        string funcSig;
        string[] args;
        address[] creations;
        uint256 gas;
    }

    struct Payloads {
        Payload[] payloads;
        PayloadExtra[] extras;
        uint256 txCount;
        uint256 creationCount;
        uint256 totalGas;
        uint256 safeNonce;
        string safeVersion;
        uint256 timestamp;
        uint256 chainId;
    }

    struct Load {
        SavedBatch batch;
    }

    struct SavedBatch {
        Payload[] payloads;
        Batch batch;
    }
}
