// SPDX-License-Identifier: MIT
pragma solidity <=0.8.19;
import {BytesLib} from "../libs/BytesLib.sol";
import {Meta} from "../../../../libs/Meta.sol";
import {ERC721} from "../state/ERC721Storage.sol";
import {lz, LZStorage, StoredCredit, AirdropParams, CallParams} from "../state/LZStorage.sol";

library LibLZ {
    using BytesLib for bytes;
    ///@dev Emitted when `_payload` was received from lz, but not enough gas to deliver all tokenIds
    event CreditStored(bytes32 _hashedPayload, bytes _payload);

    /// @dev Emitted when `_hashedPayload` has been completely delivered
    event CreditCleared(bytes32 _hashedPayload);
    event MessageFailed(uint16 _srcChainId, bytes _srcAddress, uint64 _nonce, bytes _payload, bytes _reason);
    event RetryMessageSuccess(uint16 _srcChainId, bytes _srcAddress, uint64 _nonce, bytes32 _payloadHash);

    /// @dev Emitted when `_tokenIds[]` are moved from the `_sender` to (`_dstChainId`, `_toAddress`)
    /// `_nonce` is the outbound nonce from
    event SendToChain(uint16 indexed _dstChainId, address indexed _from, bytes indexed _toAddress, uint[] _tokenIds);
    event ReceiveFromChain(
        uint16 indexed _srcChainId,
        bytes indexed _srcAddress,
        address indexed _toAddress,
        uint[] _tokenIds
    );

    event SetPrecrime(address precrime);
    event SetTrustedRemote(uint16 _remoteChainId, bytes _path);
    event SetTrustedRemoteAddress(uint16 _remoteChainId, bytes _remoteAddress);
    event SetMinDstGas(uint16 _dstChainId, uint16 _type, uint _minDstGas);

    uint16 internal constant FUNCTION_TYPE_SEND = 1;
    // ua can not send payload larger than this by default, but it can be changed by the ua owner
    uint256 internal constant DEFAULT_PAYLOAD_SIZE_LIMIT = 10000;

    string internal constant MINGASZERO = "2"; // ONFT721: minGasToTransferAndStore must be > 0"
    string internal constant TOKENIDS_EMPTY = "1"; // LzApp: tokenIds[] is empty
    string internal constant BATCH_LIMIT_EXCEEDED = "3"; // "ONFT721: batch size exceeds dst batch limit"
    string internal constant NO_CREDITS_STORED = "4"; // "ONFT721: no credits stored"
    string internal constant NO_GAS_REMAINING = "5"; // "ONFT721: not enough gas to process credit transfer"
    string internal constant MIN_GAS_NOT_ZERO = "6"; // "ONFT721: minGasToTransferAndStore must be > 0"
    string internal constant INVALID_CALLER = "7"; // "ONFT721: send caller is not owner nor approved"
    string internal constant INVALID_TOKEN_OWNER = "8"; // "ONFT721: send from incorrect owner"
    string internal constant INVALID_ENDPOINT = "9"; // Endpoint cannot be 0

    function estimateFees(
        LZStorage storage self,
        uint16 _dstChainId,
        bytes memory _toAddress,
        uint[] memory _tokenIds,
        bool _useZro,
        bytes memory _adapterParams
    ) internal view returns (uint256, uint256) {
        bytes memory payload = abi.encode(_toAddress, _tokenIds);
        return self.lzEndpoint.estimateFees(_dstChainId, address(this), payload, _useZro, _adapterParams);
    }

    function send(
        LZStorage storage self,
        address _from,
        uint16 _dstChainId,
        bytes memory _toAddress,
        uint[] memory _tokenIds,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes memory _adapterParams
    ) internal {
        // allow 1 by default
        require(_tokenIds.length > 0, "tokenIds[] is empty");
        require(
            _tokenIds.length == 1 || _tokenIds.length <= self.dstChainIdToBatchLimit[_dstChainId],
            "batch size exceeds dst batch limit"
        );

        for (uint i = 0; i < _tokenIds.length; i++) {
            ERC721().debitFrom(_from, _dstChainId, _toAddress, _tokenIds[i]);
        }

        bytes memory payload = abi.encode(_toAddress, _tokenIds);

        checkGasLimit(
            self,
            _dstChainId,
            FUNCTION_TYPE_SEND,
            _adapterParams,
            self.dstChainIdToTransferGas[_dstChainId] * _tokenIds.length
        );
        _lzSend(self, _dstChainId, payload, _refundAddress, _zroPaymentAddress, _adapterParams, msg.value);
        emit SendToChain(_dstChainId, _from, _toAddress, _tokenIds);
    }

    function _lzSend(
        LZStorage storage self,
        uint16 _dstChainId,
        bytes memory _payload,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes memory _adapterParams,
        uint _nativeFee
    ) internal {
        bytes memory trustedRemote = self.trustedRemoteLookup[_dstChainId];
        require(trustedRemote.length != 0, "LzApp: destination chain is not a trusted source");
        self.checkPayloadSize(_dstChainId, _payload.length);
        self.lzEndpoint.send{value: _nativeFee}(
            _dstChainId,
            trustedRemote,
            _payload,
            _refundAddress,
            _zroPaymentAddress,
            _adapterParams
        );
    }

    function nonblockingLzReceive(
        LZStorage storage self,
        uint16 _srcChainId,
        bytes memory _srcAddress,
        uint64 /*_nonce*/,
        bytes memory _payload
    ) internal {
        // decode and load the toAddress
        (bytes memory toAddressBytes, uint[] memory tokenIds) = abi.decode(_payload, (bytes, uint[]));

        address toAddress;
        assembly {
            toAddress := mload(add(toAddressBytes, 20))
        }

        uint nextIndex = self.creditTill(_srcChainId, toAddress, 0, tokenIds);
        if (nextIndex < tokenIds.length) {
            // not enough gas to complete transfers, store to be cleared in another tx
            bytes32 hashedPayload = keccak256(_payload);
            self.storedCredits[hashedPayload] = StoredCredit(_srcChainId, toAddress, nextIndex, true);
            emit CreditStored(hashedPayload, _payload);
        }

        emit ReceiveFromChain(_srcChainId, _srcAddress, toAddress, tokenIds);
    }

    // When a srcChain has the ability to transfer more chainIds in a single tx than the dst can do.
    // Needs the ability to iterate and stop if the minGasToTransferAndStore is not met
    function creditTill(
        LZStorage storage self,
        uint16 _srcChainId,
        address _toAddress,
        uint _startIndex,
        uint[] memory _tokenIds
    ) internal returns (uint256) {
        uint i = _startIndex;
        while (i < _tokenIds.length) {
            // if not enough gas to process, store this index for next loop
            if (gasleft() < self.minGasToTransferAndStore) break;

            ERC721().creditTo(_srcChainId, _toAddress, _tokenIds[i]);
            i++;
        }

        // indicates the next index to send of tokenIds,
        // if i == tokenIds.length, we are finished
        return i;
    }

    function checkGasLimit(
        LZStorage storage self,
        uint16 _dstChainId,
        uint16 _type,
        bytes memory _adapterParams,
        uint _extraGas
    ) internal view {
        uint providedGasLimit = getGasLimit(_adapterParams);
        uint minGasLimit = self.minDstGasLookup[_dstChainId][_type] + _extraGas;
        require(minGasLimit > 0, "LzApp: minGasLimit not set");
        require(providedGasLimit >= minGasLimit, "LzApp: gas limit is too low");
    }

    function getGasLimit(bytes memory _adapterParams) internal pure returns (uint gasLimit) {
        require(_adapterParams.length >= 34, "LzApp: invalid adapterParams");
        assembly {
            gasLimit := mload(add(_adapterParams, 34))
        }
    }

    function checkPayloadSize(LZStorage storage self, uint16 _dstChainId, uint _payloadSize) internal view {
        uint payloadSizeLimit = self.payloadSizeLimitLookup[_dstChainId];
        if (payloadSizeLimit == 0) {
            // use default if not set
            payloadSizeLimit = DEFAULT_PAYLOAD_SIZE_LIMIT;
        }
        require(_payloadSize <= payloadSizeLimit, "LzApp: payload size is too large");
    }

    function buildAdapterParams(
        AirdropParams memory _airdropParams,
        uint _uaGasLimit
    ) internal pure returns (bytes memory adapterParams) {
        if (_airdropParams.airdropAmount == 0 && _airdropParams.airdropAddress == bytes32(0x0)) {
            adapterParams = buildDefaultAdapterParams(_uaGasLimit);
        } else {
            adapterParams = buildAirdropAdapterParams(_uaGasLimit, _airdropParams);
        }
    }

    // Build Adapter Params
    function buildDefaultAdapterParams(uint _uaGas) internal pure returns (bytes memory) {
        // txType 1
        // bytes  [2       32      ]
        // fields [txType  extraGas]
        return abi.encodePacked(uint16(1), _uaGas);
    }

    function buildAirdropAdapterParams(uint _uaGas, AirdropParams memory _params) internal pure returns (bytes memory) {
        require(_params.airdropAmount > 0, "Airdrop amount must be greater than 0");
        require(_params.airdropAddress != bytes32(0x0), "Airdrop address must be set");

        // txType 2
        // bytes  [2       32        32            bytes[]         ]
        // fields [txType  extraGas  dstNativeAmt  dstNativeAddress]
        return abi.encodePacked(uint16(2), _uaGas, _params.airdropAmount, _params.airdropAddress);
    }

    // Decode Adapter Params
    function decodeAdapterParams(
        bytes memory _adapterParams
    ) internal pure returns (uint16 txType, uint uaGas, uint airdropAmount, address payable airdropAddress) {
        require(_adapterParams.length == 34 || _adapterParams.length > 66, "Invalid adapterParams");
        assembly {
            txType := mload(add(_adapterParams, 2))
            uaGas := mload(add(_adapterParams, 34))
        }
        require(txType == 1 || txType == 2, "Unsupported txType");
        require(uaGas > 0, "Gas too low");

        if (txType == 2) {
            assembly {
                airdropAmount := mload(add(_adapterParams, 66))
                airdropAddress := mload(add(_adapterParams, 86))
            }
        }
    }

    //---------------------------------------------------------------------------
    // Address type handling
    function bytes32ToAddress(bytes32 _bytes32Address) internal pure returns (address _address) {
        return address(uint160(uint(_bytes32Address)));
    }

    function addressToBytes32(address _address) internal pure returns (bytes32 _bytes32Address) {
        return bytes32(uint(uint160(_address)));
    }
}
