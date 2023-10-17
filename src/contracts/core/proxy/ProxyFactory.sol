// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ProxyAdmin} from "@oz/proxy/transparent/ProxyAdmin.sol";
import {TransparentUpgradeableProxy} from "./TransparentUpgradeableProxy.sol";
import {IProxyFactory, Proxy, CreationKind, ITransparentUpgradeableProxy} from "proxy/IProxyFactory.sol";
import {Conversions, Deploys, Proxies} from "libs/Utils.sol";
import {Solady} from "libs/Solady.sol";

/**
 * @author Kresko
 * @title ProxyFactory
 * @notice Creates instances of {TransparentUpgradeableProxy} and is the (immutable) admin of them.
 * @notice Upgrades are only available for the owner of the ProxyFactory.
 * @notice Deployments are available for the owner and a whitelist.
 */
contract ProxyFactory is ProxyAdmin, IProxyFactory {
    using Proxies for address;
    using Conversions for bytes32;
    using Deploys for bytes32;
    using Deploys for bytes;

    /* -------------------------------------------------------------------------- */
    /*                                    State                                   */
    /* -------------------------------------------------------------------------- */
    mapping(address account => bool) private _deployer;
    mapping(address proxy => Proxy) private _info;
    Proxy[] private _proxies;

    /**
     * @dev Sets the initial owner who can perform upgrades.
     */
    constructor(address initialOwner) ProxyAdmin(initialOwner) {}

    /* -------------------------------------------------------------------------- */
    /*                                    Auth                                    */
    /* -------------------------------------------------------------------------- */

    function setDeployer(address who, bool value) external onlyOwner {
        if (_deployer[who] == value) revert DeployerAlreadySet(who, value);

        _deployer[who] = value;
        emit DeployerSet(who, value);
    }

    function isDeployer(address who) external view returns (bool) {
        return _deployer[who];
    }

    modifier onlyDeployerOrOwner() {
        if (!_deployer[_msgSender()]) {
            _checkOwner();
        }
        _;
    }

    /* -------------------------------------------------------------------------- */
    /*                                    Views                                   */
    /* -------------------------------------------------------------------------- */

    /// @inheritdoc IProxyFactory
    function getProxy(address proxy) external view returns (Proxy memory) {
        return _info[proxy];
    }

    /// @inheritdoc IProxyFactory
    function getLatestProxies(uint256 count) external view returns (Proxy[] memory result) {
        uint256 length = _proxies.length;
        if (count > length) count = length;

        result = new Proxy[](count);
        for (uint256 i = length - count; i < length; i++) {
            result[i - (length - count)] = _proxies[i];
        }
    }

    /// @inheritdoc IProxyFactory
    function getProxyByIndex(uint256 index) external view returns (Proxy memory) {
        return _proxies[index];
    }

    /// @inheritdoc IProxyFactory
    function getProxies() external view returns (Proxy[] memory) {
        return _proxies;
    }

    /// @inheritdoc IProxyFactory
    function getProxyCount() external view returns (uint256) {
        return _proxies.length;
    }

    /// @inheritdoc IProxyFactory
    function isProxy(address proxy) external view returns (bool) {
        return _info[proxy].version != 0;
    }

    /// @inheritdoc IProxyFactory
    function isDeterministic(address proxy) public view returns (bool) {
        return _info[proxy].salt != bytes32(0);
    }

    /// @inheritdoc IProxyFactory
    function getImplementation(address proxy) external view override returns (address) {
        return _info[proxy].implementation;
    }

    /// @inheritdoc IProxyFactory
    function getProxyInitCodeHash(address implementation, bytes memory _calldata) public view returns (bytes32) {
        return implementation.proxyInitCodeHash(_calldata);
    }

    /// @inheritdoc IProxyFactory
    function getCreate2Address(bytes32 salt, bytes memory creationCode) public view returns (address) {
        return salt.peek2(address(this), creationCode);
    }

    /// @inheritdoc IProxyFactory
    function getCreate3Address(bytes32 salt) public view returns (address) {
        return salt.peek3();
    }

    function previewCreateProxy(address implementation, bytes memory _calldata) external returns (address proxyPreview) {
        proxyPreview = address(new TransparentUpgradeableProxy(implementation, address(this), _calldata));
        revert CreateProxyPreview(proxyPreview);
    }

    /// @inheritdoc IProxyFactory
    function previewCreate2Proxy(
        address implementation,
        bytes memory _calldata,
        bytes32 salt
    ) public view returns (address proxyPreview) {
        return getCreate2Address(salt, implementation.proxyInitCode(_calldata));
    }

    /// @inheritdoc IProxyFactory
    function previewCreate3Proxy(bytes32 salt) external view returns (address proxyPreview) {
        return getCreate3Address(salt);
    }

    function previewCreateProxyAndLogic(
        bytes memory implementation,
        bytes memory _calldata
    ) external returns (address proxyPreview, address implementationPreview) {
        implementationPreview = address(implementation.create());
        proxyPreview = address(new TransparentUpgradeableProxy(implementationPreview, address(this), _calldata));
        revert CreateProxyAndLogicPreview(proxyPreview, implementationPreview);
    }

    /// @inheritdoc IProxyFactory
    function previewCreate2ProxyAndLogic(
        bytes memory implementation,
        bytes memory _calldata,
        bytes32 salt
    ) external view returns (address proxyPreview, address implementationPreview) {
        proxyPreview = previewCreate2Proxy(
            (implementationPreview = getCreate2Address(salt.add(1), implementation)),
            _calldata,
            salt
        );
    }

    /// @inheritdoc IProxyFactory
    function previewCreate3ProxyAndLogic(
        bytes32 salt
    ) external view returns (address proxyPreview, address implementationPreview) {
        return (salt.peek3(), salt.add(1).peek3());
    }

    /// @inheritdoc IProxyFactory
    function previewCreate2Upgrade(
        ITransparentUpgradeableProxy proxy,
        bytes memory implementation
    ) external view returns (address implementationPreview, uint256 version) {
        Proxy memory info = _info[address(proxy)];

        version = info.version + 1;
        if (info.salt == bytes32(0) || version == 1) revert InvalidKind(info);

        return (getCreate2Address(info.salt.add(version), implementation), version);
    }

    /// @inheritdoc IProxyFactory
    function previewCreate3Upgrade(
        ITransparentUpgradeableProxy proxy
    ) external view returns (address implementationPreview, uint256 version) {
        Proxy memory info = _info[address(proxy)];

        version = info.version + 1;
        if (info.salt == bytes32(0) || version == 1) revert InvalidKind(info);

        return (getCreate3Address(info.salt.add(version)), version);
    }

    /* -------------------------------------------------------------------------- */
    /*                                  Creation                                  */
    /* -------------------------------------------------------------------------- */

    /// @inheritdoc IProxyFactory
    function createProxy(
        address implementation,
        bytes memory _calldata
    ) public payable onlyDeployerOrOwner returns (Proxy memory newProxy) {
        newProxy.proxy = address(new TransparentUpgradeableProxy(implementation, address(this), _calldata)).asInterface();
        newProxy.implementation = implementation;
        newProxy.kind = CreationKind.CREATE;
        return _save(newProxy);
    }

    /// @inheritdoc IProxyFactory
    function create2Proxy(
        address implementation,
        bytes memory _calldata,
        bytes32 salt
    ) public payable onlyDeployerOrOwner returns (Proxy memory newProxy) {
        newProxy.proxy = salt.create2(implementation.proxyInitCode(_calldata)).asInterface();
        newProxy.implementation = implementation;
        newProxy.kind = CreationKind.CREATE2;
        newProxy.salt = salt;
        return _save(newProxy);
    }

    /// @inheritdoc IProxyFactory
    function create3Proxy(
        address implementation,
        bytes memory _calldata,
        bytes32 salt
    ) public payable onlyDeployerOrOwner returns (Proxy memory newProxy) {
        newProxy.proxy = salt.create3(implementation.proxyInitCode(_calldata)).asInterface();
        newProxy.implementation = implementation;
        newProxy.kind = CreationKind.CREATE3;
        newProxy.salt = salt;
        return _save(newProxy);
    }

    /* ---------------------------- With implentation --------------------------- */

    /// @inheritdoc IProxyFactory
    function createProxyAndLogic(
        bytes memory implementation,
        bytes memory _calldata
    ) external payable onlyDeployerOrOwner returns (Proxy memory) {
        return createProxy(implementation.create(), _calldata);
    }

    /// @inheritdoc IProxyFactory
    function create2ProxyAndLogic(
        bytes memory implementation,
        bytes memory _calldata,
        bytes32 salt
    ) external payable onlyDeployerOrOwner returns (Proxy memory) {
        return create2Proxy(salt.add(1).create2(implementation), _calldata, salt);
    }

    /// @inheritdoc IProxyFactory
    function create3ProxyAndLogic(
        bytes memory implementation,
        bytes memory _calldata,
        bytes32 salt
    ) external payable onlyDeployerOrOwner returns (Proxy memory) {
        return create3Proxy(salt.add(1).create3(implementation), _calldata, salt);
    }

    /* -------------------------------------------------------------------------- */
    /*                                   Upgrade                                  */
    /* -------------------------------------------------------------------------- */

    /// @inheritdoc ProxyAdmin
    function upgradeAndCall(
        ITransparentUpgradeableProxy proxy,
        address implementation,
        bytes memory _calldata
    ) public payable override(ProxyAdmin) {
        Proxy memory info = _info[address(proxy)];

        info.implementation = implementation;
        ProxyAdmin.upgradeAndCall(proxy, implementation, _calldata);

        _save(info);
    }

    /// @inheritdoc IProxyFactory
    function upgradeAndCall(
        ITransparentUpgradeableProxy proxy,
        bytes memory implementation,
        bytes memory _calldata
    ) external payable returns (Proxy memory) {
        return upgradeAndCallReturn(proxy, implementation.create(), _calldata);
    }

    /// @inheritdoc IProxyFactory
    function upgradeAndCallReturn(
        ITransparentUpgradeableProxy proxy,
        address implementation,
        bytes memory _calldata
    ) public payable returns (Proxy memory) {
        Proxy memory info = _info[address(proxy)];

        info.implementation = implementation;
        ProxyAdmin.upgradeAndCall(proxy, implementation, _calldata);

        return _save(info);
    }

    /// @inheritdoc IProxyFactory
    function create2UpgradeAndCall(
        ITransparentUpgradeableProxy proxy,
        bytes memory implementation,
        bytes memory _calldata
    ) external payable returns (Proxy memory) {
        Proxy memory info = _info[address(proxy)];
        if (info.salt == bytes32(0)) revert InvalidKind(info);
        return upgradeAndCallReturn(proxy, info.salt.add(info.version + 1).create2(implementation), _calldata);
    }

    /// @inheritdoc IProxyFactory
    function create3UpgradeAndCall(
        ITransparentUpgradeableProxy proxy,
        bytes memory implementation,
        bytes memory _calldata
    ) public payable returns (Proxy memory) {
        Proxy memory info = _info[address(proxy)];
        if (info.salt == bytes32(0)) revert InvalidKind(info);
        return upgradeAndCallReturn(proxy, info.salt.add(info.version + 1).create3(implementation), _calldata);
    }

    /// @inheritdoc IProxyFactory
    function batchStatic(bytes[] calldata calls) external view returns (bytes[] memory results) {
        results = new bytes[](calls.length);
        unchecked {
            for (uint256 i; i < calls.length; i++) {
                // solhint-disable-next-line avoid-low-level-calls
                (bool success, bytes memory result) = address(this).staticcall(calls[i]);

                if (!success) _tryParseRevert(result);
                results[i] = result;
            }
        }
    }

    /// @inheritdoc IProxyFactory
    function batch(bytes[] calldata calls) external payable onlyDeployerOrOwner returns (bytes[] memory) {
        return Solady.multicall(calls);
    }

    /* -------------------------------------------------------------------------- */
    /*                                  Internals                                 */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Updates common fields and saves to mapping + array.
     */
    function _save(Proxy memory update) internal returns (Proxy memory) {
        if (address(update.proxy) == address(0) || update.implementation == address(0)) revert InvalidKind(update);

        uint48 blockTimestamp = uint48(block.timestamp);
        update.version++;
        update.updatedAt = blockTimestamp;

        if (update.createdAt == 0) {
            update.index = uint48(_proxies.length);
            update.createdAt = blockTimestamp;
            _proxies.push(update);
            emit ProxyCreated(update);
        } else {
            _proxies[update.index] = update;
            emit ProxyUpgraded(update);
        }

        _info[address(update.proxy)] = update;
        return update;
    }

    /**
     * @notice Function that tries to extract some useful information about a failed call.
     * @dev If returned data is malformed or has incorrect encoding this can fail itself.
     */
    function _tryParseRevert(bytes memory _returnData) internal pure {
        // If the _res length is less than 68, then
        // the transaction failed with custom error or silently (without a revert message)
        if (_returnData.length < 68) {
            revert BatchRevertSilentOrCustomError(_returnData);
        }

        assembly {
            // Slice the sighash.
            _returnData := add(_returnData, 0x04)
        }
        revert(abi.decode(_returnData, (string))); // All that remains is the revert string
    }
}
