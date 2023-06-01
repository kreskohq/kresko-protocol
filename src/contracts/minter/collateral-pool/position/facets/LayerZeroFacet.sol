// SPDX-License-Identifier: BUSL-1.1
pragma solidity <=0.8.19;

import {ERC721} from "../state/ERC721Storage.sol";
import {IONFT721CoreUpgradeable} from "../interfaces/IONFT721CoreUpgradeable.sol";
import {IONFT721Upgradeable} from "../interfaces/IONFT721Upgradeable.sol";
import {IERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import {IERC721MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/IERC721MetadataUpgradeable.sol";
import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/IERC165Upgradeable.sol";
import {ILayerZeroEndpointUpgradeable} from "../interfaces/ILayerZeroEndpointUpgradeable.sol";
import {ILayerZeroReceiverUpgradeable} from "../interfaces/ILayerZeroReceiverUpgradeable.sol";
import {ILayerZeroUserApplicationConfigUpgradeable} from "../interfaces/ILayerZeroUserApplicationConfigUpgradeable.sol";
import {lz, LibLZ, StoredCredit} from "../state/LZStorage.sol";
import {Meta} from "../../../../libs/Meta.sol";
import {ds} from "../../../../diamond/DiamondStorage.sol";
import {IERC165Facet} from "../../../../diamond/interfaces/IERC165Facet.sol";
import {BytesLib} from "../libs/BytesLib.sol";
import {ExcessivelySafeCall} from "../libs/ExcessivelySafeCall.sol";
import {DiamondModifiers} from "../../../../diamond/DiamondModifiers.sol";

contract LayerZeroFacet is
    IERC165Facet,
    IONFT721CoreUpgradeable,
    ILayerZeroReceiverUpgradeable,
    ILayerZeroUserApplicationConfigUpgradeable,
    DiamondModifiers
{
    using BytesLib for bytes;
    using ExcessivelySafeCall for address;

    function setupLayerZero(uint256 _minGasToTransfer, ILayerZeroEndpointUpgradeable _lzEndpoint) external onlyOwner {
        require(_minGasToTransfer != 0, LibLZ.MINGASZERO);
        lz().minGasToTransferAndStore = _minGasToTransfer;

        require(address(_lzEndpoint) != address(0), LibLZ.INVALID_ENDPOINT);
        lz().lzEndpoint = _lzEndpoint;
    }

    function getConfig(
        uint16 _version,
        uint16 _chainId,
        address,
        uint _configType
    ) external view returns (bytes memory) {
        return lz().lzEndpoint.getConfig(_version, _chainId, address(this), _configType);
    }

    // generic config for LayerZero user Application
    function setConfig(
        uint16 _version,
        uint16 _chainId,
        uint _configType,
        bytes calldata _config
    ) external override onlyOwner {
        lz().lzEndpoint.setConfig(_version, _chainId, _configType, _config);
    }

    /// @inheritdoc IERC165Facet
    function supportsInterface(
        bytes4 interfaceId
    ) external view override(IERC165Facet, IERC165Upgradeable) returns (bool) {
        return
            (interfaceId != 0xffffffff && interfaceId == type(IERC721Upgradeable).interfaceId) ||
            interfaceId == type(IERC721MetadataUpgradeable).interfaceId ||
            interfaceId == type(IONFT721Upgradeable).interfaceId ||
            interfaceId == type(IONFT721CoreUpgradeable).interfaceId ||
            ds().supportedInterfaces[interfaceId];
    }

    /// @inheritdoc IERC165Facet
    function setERC165(bytes4[] calldata interfaceIds, bytes4[] calldata interfaceIdsToRemove) external onlyOwner {
        for (uint256 i = 0; i < interfaceIds.length; i++) {
            ds().supportedInterfaces[interfaceIds[i]] = true;
        }

        for (uint256 i = 0; i < interfaceIdsToRemove.length; i++) {
            ds().supportedInterfaces[interfaceIdsToRemove[i]] = false;
        }
    }

    function forceResumeReceive(uint16 _srcChainId, bytes calldata _srcAddress) external override onlyOwner {
        lz().lzEndpoint.forceResumeReceive(_srcChainId, _srcAddress);
    }

    function setSendVersion(uint16 _version) external override onlyOwner {
        lz().lzEndpoint.setSendVersion(_version);
    }

    function setReceiveVersion(uint16 _version) external override onlyOwner {
        lz().lzEndpoint.setReceiveVersion(_version);
    }

    // _path = abi.encodePacked(remoteAddress, localAddress)
    // this function set the trusted path for the cross-chain communication
    function setTrustedRemote(uint16 _srcChainId, bytes calldata _path) external onlyOwner {
        lz().trustedRemoteLookup[_srcChainId] = _path;
        emit LibLZ.SetTrustedRemote(_srcChainId, _path);
    }

    function setTrustedRemoteAddress(uint16 _remoteChainId, bytes calldata _remoteAddress) external onlyOwner {
        lz().trustedRemoteLookup[_remoteChainId] = abi.encodePacked(_remoteAddress, address(this));
        emit LibLZ.SetTrustedRemoteAddress(_remoteChainId, _remoteAddress);
    }

    function getTrustedRemoteAddress(uint16 _remoteChainId) external view returns (bytes memory) {
        bytes memory path = lz().trustedRemoteLookup[_remoteChainId];
        require(path.length != 0, "LzApp: no trusted path record");
        return path.slice(0, path.length - 20); // the last 20 bytes should be address(this)
    }

    function setPrecrime(address _precrime) external onlyOwner {
        lz().precrime = _precrime;
        emit LibLZ.SetPrecrime(_precrime);
    }

    function setMinDstGas(uint16 _dstChainId, uint16 _packetType, uint _minGas) external onlyOwner {
        require(_minGas > 0, "LzApp: invalid minGas");
        lz().minDstGasLookup[_dstChainId][_packetType] = _minGas;
        emit LibLZ.SetMinDstGas(_dstChainId, _packetType, _minGas);
    }

    // if the size is 0, it means default size limit
    function setPayloadSizeLimit(uint16 _dstChainId, uint _size) external onlyOwner {
        lz().payloadSizeLimitLookup[_dstChainId] = _size;
    }

    //--------------------------- VIEW FUNCTION ----------------------------------------
    function isTrustedRemote(uint16 _srcChainId, bytes calldata _srcAddress) external view returns (bool) {
        bytes memory trustedSource = lz().trustedRemoteLookup[_srcChainId];
        return keccak256(trustedSource) == keccak256(_srcAddress);
    }

    function setMinGasToTransferAndStore(uint256 _minGasToTransferAndStore) external onlyOwner {
        require(_minGasToTransferAndStore > 0, LibLZ.MIN_GAS_NOT_ZERO);
        lz().minGasToTransferAndStore = _minGasToTransferAndStore;
    }

    // ensures enough gas in adapter params to handle batch transfer gas amounts on the dst
    function setDstChainIdToTransferGas(uint16 _dstChainId, uint256 _dstChainIdToTransferGas) external onlyOwner {
        require(_dstChainIdToTransferGas > 0, LibLZ.MIN_GAS_NOT_ZERO);
        lz().dstChainIdToTransferGas[_dstChainId] = _dstChainIdToTransferGas;
    }

    // limit on src the amount of tokens to batch send
    function setDstChainIdToBatchLimit(uint16 _dstChainId, uint256 _dstChainIdToBatchLimit) external onlyOwner {
        require(_dstChainIdToBatchLimit > 0, LibLZ.MIN_GAS_NOT_ZERO);
        lz().dstChainIdToBatchLimit[_dstChainId] = _dstChainIdToBatchLimit;
    }

    function sendFrom(
        address _from,
        uint16 _dstChainId,
        bytes memory _toAddress,
        uint _tokenId,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes memory _adapterParams
    ) external payable virtual override {
        require(_from == ds().contractOwner, "not supported yet");
        lz().send(
            _from,
            _dstChainId,
            _toAddress,
            _toSingletonArray(_tokenId),
            _refundAddress,
            _zroPaymentAddress,
            _adapterParams
        );
    }

    function sendBatchFrom(
        address _from,
        uint16 _dstChainId,
        bytes memory _toAddress,
        uint[] memory _tokenIds,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes memory _adapterParams
    ) external payable virtual override {
        require(_from == ds().contractOwner, "not supported yet");
        lz().send(_from, _dstChainId, _toAddress, _tokenIds, _refundAddress, _zroPaymentAddress, _adapterParams);
    }

    // Public function for anyone to clear and deliver the remaining batch sent tokenIds
    function clearCredits(bytes memory _payload) external {
        require(msg.sender == ds().contractOwner, "not supported yet");
        bytes32 hashedPayload = keccak256(_payload);
        require(lz().storedCredits[hashedPayload].creditsRemain, LibLZ.NO_CREDITS_STORED);

        (, uint[] memory tokenIds) = abi.decode(_payload, (bytes, uint[]));

        uint nextIndex = lz().creditTill(
            lz().storedCredits[hashedPayload].srcChainId,
            lz().storedCredits[hashedPayload].toAddress,
            lz().storedCredits[hashedPayload].index,
            tokenIds
        );
        require(nextIndex > lz().storedCredits[hashedPayload].index, LibLZ.NO_GAS_REMAINING);

        if (nextIndex == tokenIds.length) {
            // cleared the credits, delete the element
            delete lz().storedCredits[hashedPayload];
            emit CreditCleared(hashedPayload);
        } else {
            // store the next index to mint
            lz().storedCredits[hashedPayload] = StoredCredit(
                lz().storedCredits[hashedPayload].srcChainId,
                lz().storedCredits[hashedPayload].toAddress,
                nextIndex,
                true
            );
        }
    }

    function estimateSendFee(
        uint16 _dstChainId,
        bytes memory _toAddress,
        uint _tokenId,
        bool _useZro,
        bytes memory _adapterParams
    ) public view virtual override returns (uint nativeFee, uint zroFee) {
        return lz().estimateFees(_dstChainId, _toAddress, _toSingletonArray(_tokenId), _useZro, _adapterParams);
    }

    function estimateSendBatchFee(
        uint16 _dstChainId,
        bytes memory _toAddress,
        uint[] memory _tokenIds,
        bool _useZro,
        bytes memory _adapterParams
    ) public view virtual override returns (uint nativeFee, uint zroFee) {
        return lz().estimateFees(_dstChainId, _toAddress, _tokenIds, _useZro, _adapterParams);
    }

    function _toSingletonArray(uint element) internal pure returns (uint[] memory) {
        uint[] memory array = new uint[](1);
        array[0] = element;
        return array;
    }

    function lzReceive(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        uint64 _nonce,
        bytes calldata _payload
    ) public virtual override {
        // lzReceive must be called by the endpoint for security
        require(Meta.msgSender() == address(lz().lzEndpoint), "LzApp: invalid endpoint caller");

        bytes memory trustedRemote = lz().trustedRemoteLookup[_srcChainId];
        // if will still block the message pathway from (srcChainId, srcAddress). should not receive message from untrusted remote.
        require(
            _srcAddress.length == trustedRemote.length &&
                trustedRemote.length > 0 &&
                keccak256(_srcAddress) == keccak256(trustedRemote),
            "LzApp: invalid source sending contract"
        );

        _blockingLzReceive(_srcChainId, _srcAddress, _nonce, _payload);
    }

    // overriding the virtual function in LzReceiver
    function _blockingLzReceive(
        uint16 _srcChainId,
        bytes memory _srcAddress,
        uint64 _nonce,
        bytes memory _payload
    ) internal {
        (bool success, bytes memory reason) = address(this).excessivelySafeCall(
            gasleft(),
            150,
            abi.encodeWithSelector(this.nonblockingLzReceive.selector, _srcChainId, _srcAddress, _nonce, _payload)
        );
        // try-catch all errors/exceptions
        if (!success) {
            lz().failedMessages[_srcChainId][_srcAddress][_nonce] = keccak256(_payload);
            emit LibLZ.MessageFailed(_srcChainId, _srcAddress, _nonce, _payload, reason);
        }
    }

    function nonblockingLzReceive(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        uint64 _nonce,
        bytes calldata _payload
    ) external {
        // only internal transaction
        require(Meta.msgSender() == address(this), "NonblockingLzApp: caller must be LzApp");
        lz().nonblockingLzReceive(_srcChainId, _srcAddress, _nonce, _payload);
    }

    function retryMessage(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        uint64 _nonce,
        bytes calldata _payload
    ) external payable virtual {
        // assert there is message to retry
        bytes32 payloadHash = lz().failedMessages[_srcChainId][_srcAddress][_nonce];
        require(payloadHash != bytes32(0), "NonblockingLzApp: no stored message");
        require(keccak256(_payload) == payloadHash, "NonblockingLzApp: invalid payload");
        // clear the stored message
        lz().failedMessages[_srcChainId][_srcAddress][_nonce] = bytes32(0);
        // execute the message. revert if it fails again
        lz().nonblockingLzReceive(_srcChainId, _srcAddress, _nonce, _payload);
        emit LibLZ.RetryMessageSuccess(_srcChainId, _srcAddress, _nonce, payloadHash);
    }
}
