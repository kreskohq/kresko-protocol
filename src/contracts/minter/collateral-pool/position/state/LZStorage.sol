// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;
import {ILayerZeroEndpointUpgradeable} from "../interfaces/ILayerZeroEndpointUpgradeable.sol";
import {ILayerZeroUserApplicationConfigUpgradeable} from "../interfaces/ILayerZeroUserApplicationConfigUpgradeable.sol";
import {LibLZ} from "../libs/LibLZ.sol";

using LibLZ for LZStorage global;

struct StoredCredit {
    uint16 srcChainId;
    address toAddress;
    uint256 index; // which index of the tokenIds remain
    bool creditsRemain;
}

struct CallParams {
    address payable refundAddress;
    address zroPaymentAddress;
}

struct AirdropParams {
    uint airdropAmount;
    bytes32 airdropAddress;
}

struct LZStorage {
    uint256 minGasToTransferAndStore; // min amount of gas required to transfer, and also store the payload
    mapping(uint16 => uint256) dstChainIdToBatchLimit;
    mapping(uint16 => uint256) dstChainIdToTransferGas; // per transfer amount of gas required to mint/transfer on the dst
    mapping(bytes32 => StoredCredit) storedCredits;
    mapping(uint16 => mapping(bytes => mapping(uint64 => bytes32))) failedMessages;
    ILayerZeroEndpointUpgradeable lzEndpoint;
    mapping(uint16 => bytes) trustedRemoteLookup;
    mapping(uint16 => mapping(uint16 => uint)) minDstGasLookup;
    mapping(uint16 => uint) payloadSizeLimitLookup;
    address precrime;
}

bytes32 constant LZ_STORAGE_POSITION = keccak256("kresko.positions.lz.storage");

function lz() pure returns (LZStorage storage state) {
    bytes32 position = LZ_STORAGE_POSITION;
    assembly {
        state.slot := position
    }
}
