// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ITransparentUpgradeableProxy} from "@oz/proxy/transparent/TransparentUpgradeableProxy.sol";
import {ProxyAdmin} from "@oz/proxy/transparent/ProxyAdmin.sol";
import {TransparentUpgradeableProxy} from "./TransparentUpgradeableProxy.sol";
import {LibCreate} from "periphery/LibCreate.sol";

/**
 * @notice Proxy tracking data
 * @param implementation Current implementation address
 * @param updatedAt Timestamp of latest upgrade
 * @param proxy Address of the proxy itself
 * @param index Array index of the proxy in the internal tracking list
 * @param createdAt Creation timestamp of the proxy
 * @param version Current version of the proxy (count of upgrade calls)
 */
struct Proxy {
    address implementation;
    uint96 updatedAt;
    ITransparentUpgradeableProxy proxy;
    uint48 index;
    uint48 createdAt;
    uint256 version;
    bytes32 salt;
}

interface IProxyFactory {
    error BatchRevertSilentOrCustomError(bytes innerError);
    error InvalidDeterministicProxy(Proxy);
    error ArrayLengthMismatch(uint256 proxies, uint256 implementations, uint256 datas);
    error UsingNonDeterministicFunctionForDeterministicProxy(Proxy);
    error DeployerAlreadySet(address, bool);
    error OwnerOnly(bytes4);

    event DeployerSet(address, bool);
    event ProxyCreated(Proxy);
    event ProxyUpgraded(Proxy);

    /**
     * @notice Get available information of `proxy`.
     * @param proxy Address of the proxy.
     * @return Proxy Information about the proxy.
     */
    function getProxy(address proxy) external view returns (Proxy memory);

    /**
     * @notice Get available information of `proxy`.
     * @param index Index of the proxy.
     * @return Proxy Information about the proxy.
     */
    function getProxyByIndex(uint256 index) external view returns (Proxy memory);

    /**
     * @notice Get all proxies.
     * @return Proxy[] Array of proxies.
     */
    function getProxies() external view returns (Proxy[] memory);

    /**
     * @notice Get number of proxies.
     * @return uint256 Number of proxies.
     */
    function getProxyCount() external view returns (uint256);

    /**
     * @notice Inspect if an address is a proxy created by this contract.
     * @param proxy Address to inspect
     * @return bool True if `proxy` was created by this contract.
     */
    function isProxy(address proxy) external view returns (bool);

    /**
     * @notice Inspect the current implementation address of a proxy.
     * @param proxy Address of the proxy.
     * @return address Implementation address of the proxy
     */
    function getImplementation(address proxy) external view returns (address);

    /**
     * @notice Get the init code hash for a proxy.
     * @param implementation Address of the implementation.
     * @param data Initializer calldata.
     * @return bytes32 Hash of the init code.
     */
    function getProxyInitCodeHash(address implementation, bytes memory data) external view returns (bytes32);

    /**
     * @notice Preview address from CREATE2 with given salt and creation code.
     */
    function getCreate2Address(bytes32 _salt, bytes memory _creationCode) external view returns (address);

    /**
     * @notice Preview address from CREATE3 with given salt.
     */
    function getCreate3Address(bytes32 salt) external view returns (address);

    /**
     * @notice Preview resulting proxy address from {create2AndCall} with given salt.
     * @param implementation Address of the implementation.
     * @param _calldata Initializer calldata.
     * @param salt Salt for the deterministic deployment.
     * @return proxyPreview Address of the proxy that would be created.
     */
    function previewCreate2AndCall(
        address implementation,
        bytes memory _calldata,
        bytes32 salt
    ) external view returns (address proxyPreview);

    /**
     * @notice Preview resulting proxy address from {create3AndCall} or {deployCreate3AndCall} with given salt.
     * @param salt Salt for the deterministic deployment.
     * @return proxyPreview Address of the proxy that would be created.
     */
    function previewCreate3AndCall(bytes32 salt) external view returns (address proxyPreview);

    /**
     * @notice Preview resulting proxy and implementation address from {deployCreate2AndCall} with given salt.
     * @param implementation Bytecode of the implementation.
     * @param _calldata Initializer calldata.
     * @param salt Salt for the deterministic deployment.
     * @return proxyPreview Address of the proxy that would be created.
     * @return implementationPreview Address of the deployed implementation.
     */
    function previewDeployCreate2(
        bytes memory implementation,
        bytes memory _calldata,
        bytes32 salt
    ) external view returns (address proxyPreview, address implementationPreview);

    /**
     * @notice Preview implementation and proxy address from {deployCreate3AndCall} with given salt.
     * @param salt Salt for the deterministic deployment.
     * @return proxyPreview Address of the new proxy.
     * @return implementationPreview Address of the deployed implementation.
     */
    function previewDeployCreate3(bytes32 salt) external view returns (address proxyPreview, address implementationPreview);

    /**
     * @notice Preview resulting implementation address from {upgrade2AndCall} with given salt.
     * @param proxy Existing ITransparentUpgradeableProxy address.
     * @param implementation Bytecode of the new implementation.
     * @return implementationPreview Address for the next implementation.
     * @return version New version number of the proxy.
     */
    function previewUpgrade2(
        ITransparentUpgradeableProxy proxy,
        bytes memory implementation
    ) external view returns (address implementationPreview, uint256 version);

    /**
     * @notice Preview resulting implementation address from {upgrade3AndCall} with given salt.
     * @param proxy Existing ITransparentUpgradeableProxy address.
     * @return implementationPreview Address for the next implementation.
     * @return version New version number of the proxy.
     */
    function previewUpgrade3(
        ITransparentUpgradeableProxy proxy
    ) external view returns (address implementationPreview, uint256 version);

    /**
     * @notice Creates a new proxy for the `implementation` and initializes it with `data`.
     * @param implementation Address of the implementation.
     * @param _calldata Initializer calldata.
     * @return Proxy Information about the new proxy.
     * See {TransparentUpgradeableProxy-constructor}.
     * @custom:signature createAndCall(address,bytes)
     * @custom:selector 0xfb506844
     */
    function createAndCall(address implementation, bytes memory _calldata) external payable returns (Proxy memory);

    /**
     * @notice Creates a new proxy with deterministic address derived from arguments given.
     * @param implementation Address of the implementation.
     * @param _calldata Initializer calldata.
     * @param salt Salt for the deterministic deployment.
     * @return Proxy Information about the new proxy.
     * @custom:signature create2AndCall(address,bytes,bytes32)
     * @custom:selector 0xe852e6d5
     */
    function create2AndCall(
        address implementation,
        bytes memory _calldata,
        bytes32 salt
    ) external payable returns (Proxy memory);

    /**
     * @notice Creates a new proxy with deterministic address derived only from the salt given.
     * @param implementation Address of the implementation.
     * @param _calldata Initializer calldata.
     * @param salt Salt for the deterministic deployment.
     * @return Proxy Information about the new proxy.
     * @custom:signature create3AndCall(address,bytes,bytes32)
     * @custom:selector 0xbd233f6c
     */
    function create3AndCall(
        address implementation,
        bytes memory _calldata,
        bytes32 salt
    ) external payable returns (Proxy memory);

    /**
     * @notice Deploys an implementation and creates a proxy initialized with `data` for it.
     * @param implementation Bytecode of the implementation.
     * @param _calldata Initializer calldata.
     * @return Proxy Created proxy information.
     * @custom:signature deployCreateAndCall(bytes,bytes)
     * @custom:selector 0xfcdf055e
     */
    function deployCreateAndCall(bytes memory implementation, bytes memory _calldata) external payable returns (Proxy memory);

    /**
     * @notice Deterministic version of {deployCreateAndCall} where arguments are used to derive the salt.
     * @dev Implementation salt is salt + 1. Use {previewDeployCreate3} to preview.
     * @param implementation Bytecode of the implementation.
     * @param _calldata Initializer calldata.
     * @param salt Salt to derive both addresses from.
     * @return Proxy Created proxy information.
     * @custom:signature deployCreate2AndCall(bytes,bytes,bytes32)
     * @custom:selector 0xeb4495f3
     */
    function deployCreate2AndCall(
        bytes memory implementation,
        bytes memory _calldata,
        bytes32 salt
    ) external payable returns (Proxy memory);

    /**
     * @notice Deterministic version of {deployCreateAndCall} where only salt matters.
     * @dev Implementation salt is salt + 1. Use {previewDeployCreate3} to preview.
     * @param implementation Bytecode of the implementation to deploy.
     * @param _calldata Initializer calldata.
     * @param salt Salt to derive both addresses from.
     * @return Proxy Created proxy information.
     * @custom:signature deployCreate3AndCall(bytes,bytes,bytes32)
     * @custom:selector 0x99480e85
     */
    function deployCreate3AndCall(
        bytes memory implementation,
        bytes memory _calldata,
        bytes32 salt
    ) external payable returns (Proxy memory);

    /// @notice {upgradeAndCall} which @return Proxy information.
    function upgradeAndCallWithReturn(
        ITransparentUpgradeableProxy proxy,
        address implementation,
        bytes memory _calldata
    ) external payable returns (Proxy memory);

    /**
     * @notice Deterministically deploys the upgraded implementation and calls the {ProxyAdmin-upgradeAndCall}.
     * @dev Implementation salt is salt + next version. Use {previewUpgrade2} to preview.
     * @param proxy Existing ITransparentUpgradeableProxy to upgrade.
     * @param implementation Bytecode of the new implementation.
     * @param _calldata Initializer calldata.
     * @return Proxy Created proxy information.
     */
    function upgrade2AndCall(
        ITransparentUpgradeableProxy proxy,
        bytes memory implementation,
        bytes memory _calldata
    ) external payable returns (Proxy memory);

    /**
     * @notice Deterministically deploys the upgrade implementatio and calls the {ProxyAdmin-upgradeAndCall}.
     * @dev Implementation salt is salt + next version. Use {previewUpgrade3} to preview.
     * @param proxy Existing ITransparentUpgradeableProxy to upgrade.
     * @param implementation Bytecode of the new implementation.
     * @param _calldata Initializer calldata.
     * @return Proxy Created proxy information.
     */
    function upgrade3AndCall(
        ITransparentUpgradeableProxy proxy,
        bytes memory implementation,
        bytes memory _calldata
    ) external payable returns (Proxy memory);

    /**
     * @notice Batch any action in this contract.
     * @dev Reverts if any of the calls fail.
     * @dev Delegates to self which keeps context, so msg.value is fine.
     */
    function batch(bytes[] calldata calls) external payable returns (bytes[] memory results);

    /**
     * @notice Batched views
     */
    function batchStatic(bytes[] calldata calls) external view returns (bytes[] memory results);
}

library LibProxy {
    using LibProxy for address;
    using LibProxy for bytes32;
    using LibCreate for bytes32;

    function proxyInitCode(
        address implementation,
        address _factory,
        bytes memory _calldata
    ) internal pure returns (bytes memory) {
        return
            abi.encodePacked(type(TransparentUpgradeableProxy).creationCode, abi.encode(implementation, _factory, _calldata));
    }

    function proxyInitCode(address implementation, bytes memory _calldata) internal view returns (bytes memory) {
        return implementation.proxyInitCode(address(this), _calldata);
    }

    function proxyInitCodeHash(
        address implementation,
        address _factory,
        bytes memory _calldata
    ) internal pure returns (bytes32) {
        return keccak256(implementation.proxyInitCode(_factory, _calldata));
    }

    function proxyInitCodeHash(address implementation, bytes memory _calldata) internal view returns (bytes32) {
        return proxyInitCodeHash(implementation, address(this), _calldata);
    }

    function peekProxy2(address implementation, bytes memory _calldata, bytes32 salt) internal view returns (address proxy) {
        return salt.peek2(address(this), implementation.proxyInitCode(_calldata));
    }

    function peekProxy3(bytes32 salt) internal view returns (address proxy) {
        return salt.peek3();
    }

    function asInterface(address proxy) internal pure returns (ITransparentUpgradeableProxy) {
        return ITransparentUpgradeableProxy(proxy);
    }

    function add(bytes32 a, uint256 b) internal pure returns (bytes32) {
        return bytes32(uint256(a) + b);
    }

    function sub(bytes32 a, uint256 b) internal pure returns (bytes32) {
        return bytes32(uint256(a) - b);
    }
}

/**
 * @author Kresko
 * @title ProxyFactory - Creates, controls and tracks proxies.
 * @notice Underlying TransparentUpgradeableProxy is modified to set the msg.sender as the owner.
 */
contract ProxyFactory is ProxyAdmin, IProxyFactory {
    using LibProxy for address;
    using LibProxy for bytes32;
    using LibCreate for bytes32;

    /* -------------------------------------------------------------------------- */
    /*                                    State                                   */
    /* -------------------------------------------------------------------------- */
    mapping(address account => bool) private _deployer;

    /**
     * @notice Proxy tracking data
     */
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

    modifier onlyDeployerOrOwner() {
        if (!_deployer[_msgSender()]) {
            _checkOwner();
        }
        _;
    }

    /* -------------------------------------------------------------------------- */
    /*                                    Views                                   */
    /* -------------------------------------------------------------------------- */

    function isDeployer(address who) external view returns (bool) {
        return _deployer[who];
    }

    /// @inheritdoc IProxyFactory
    function getProxy(address proxy) external view returns (Proxy memory) {
        return _info[proxy];
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
    function getImplementation(address proxy) external view override returns (address) {
        return _info[proxy].implementation;
    }

    /// @inheritdoc IProxyFactory
    function getProxyInitCodeHash(address implementation, bytes memory data) public view returns (bytes32) {
        return implementation.proxyInitCodeHash(data);
    }

    /// @inheritdoc IProxyFactory
    function getCreate2Address(bytes32 salt, bytes memory creationCode) public view returns (address) {
        return salt.peek2(address(this), creationCode);
    }

    /// @inheritdoc IProxyFactory
    function getCreate3Address(bytes32 salt) public view returns (address) {
        return salt.peek3();
    }

    /// @inheritdoc IProxyFactory
    function previewCreate2AndCall(
        address implementation,
        bytes memory data,
        bytes32 salt
    ) public view returns (address proxyPreview) {
        return implementation.peekProxy2(data, salt);
    }

    /// @inheritdoc IProxyFactory
    function previewCreate3AndCall(bytes32 salt) external view returns (address proxyPreview) {
        return getCreate3Address(salt);
    }

    /// @inheritdoc IProxyFactory
    function previewDeployCreate2(
        bytes memory implementation,
        bytes memory _calldata,
        bytes32 salt
    ) external view returns (address proxyPreview, address implementationPreview) {
        proxyPreview = previewCreate2AndCall(
            (implementationPreview = getCreate2Address(salt.add(1), implementation)),
            _calldata,
            salt
        );
    }

    /// @inheritdoc IProxyFactory
    function previewDeployCreate3(bytes32 salt) external view returns (address proxyPreview, address implementationPreview) {
        return (salt.peek3(), salt.add(1).peek3());
    }

    /// @inheritdoc IProxyFactory
    function previewUpgrade2(
        ITransparentUpgradeableProxy proxy,
        bytes memory implementation
    ) external view returns (address implementationPreview, uint256 version) {
        Proxy memory info = _info[address(proxy)];

        version = info.version + 1;

        if (info.salt == bytes32(0) || version == 1) revert InvalidDeterministicProxy(info);

        return (getCreate2Address(info.salt.add(version), implementation), version);
    }

    /// @inheritdoc IProxyFactory
    function previewUpgrade3(
        ITransparentUpgradeableProxy proxy
    ) external view returns (address implementationPreview, uint256 version) {
        Proxy memory info = _info[address(proxy)];

        version = info.version + 1;

        if (info.salt == bytes32(0) || version == 1) revert InvalidDeterministicProxy(info);

        return (getCreate3Address(info.salt.add(version)), version);
    }

    /* -------------------------------------------------------------------------- */
    /*                                  Creation                                  */
    /* -------------------------------------------------------------------------- */

    /// @inheritdoc IProxyFactory
    function createAndCall(
        address implementation,
        bytes memory _calldata
    ) public payable onlyDeployerOrOwner returns (Proxy memory) {
        return _save(address(new TransparentUpgradeableProxy(implementation, address(this), _calldata)), implementation, 0);
    }

    /// @inheritdoc IProxyFactory
    function create2AndCall(
        address implementation,
        bytes memory _calldata,
        bytes32 salt
    ) public payable onlyDeployerOrOwner returns (Proxy memory) {
        return _save(salt.create2(implementation.proxyInitCode(_calldata)), implementation, salt);
    }

    /// @inheritdoc IProxyFactory
    function create3AndCall(
        address implementation,
        bytes memory _calldata,
        bytes32 salt
    ) public payable onlyDeployerOrOwner returns (Proxy memory) {
        return _save(salt.create3(implementation.proxyInitCode(_calldata)), implementation, salt);
    }

    /* ---------------------------- With implentation --------------------------- */

    /// @inheritdoc IProxyFactory
    function deployCreateAndCall(
        bytes memory implementation,
        bytes memory _calldata
    ) public payable onlyDeployerOrOwner returns (Proxy memory) {
        address implementationAddr;
        assembly {
            implementationAddr := create(0, add(implementation, 0x20), mload(implementation))
            if iszero(extcodesize(implementationAddr)) {
                revert(0, 0)
            }
        }
        return createAndCall(implementationAddr, _calldata);
    }

    /// @inheritdoc IProxyFactory
    function deployCreate2AndCall(
        bytes memory implementation,
        bytes memory _calldata,
        bytes32 salt
    ) public payable onlyDeployerOrOwner returns (Proxy memory) {
        return create2AndCall(salt.add(1).create2(implementation), _calldata, salt);
    }

    /// @inheritdoc IProxyFactory
    function deployCreate3AndCall(
        bytes memory implementation,
        bytes memory _calldata,
        bytes32 salt
    ) public payable onlyDeployerOrOwner returns (Proxy memory) {
        return create3AndCall(salt.add(1).create3(implementation), _calldata, salt);
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
        ProxyAdmin.upgradeAndCall(proxy, implementation, _calldata);
        _save(address(proxy), implementation, 0);
    }

    /// @inheritdoc IProxyFactory
    function upgradeAndCallWithReturn(
        ITransparentUpgradeableProxy proxy,
        address implementation,
        bytes memory _calldata
    ) public payable returns (Proxy memory) {
        ProxyAdmin.upgradeAndCall(proxy, implementation, _calldata);
        return _save(address(proxy), implementation, 0);
    }

    /// @inheritdoc IProxyFactory
    function upgrade2AndCall(
        ITransparentUpgradeableProxy proxy,
        bytes memory implementation,
        bytes memory _calldata
    ) public payable returns (Proxy memory) {
        Proxy memory p = _info[address(proxy)];

        address implementationAddr = p.salt.add(p.version + 1).create2(implementation);
        ProxyAdmin.upgradeAndCall(proxy, implementationAddr, _calldata);

        return _save(address(proxy), implementationAddr, p.salt);
    }

    /// @inheritdoc IProxyFactory
    function upgrade3AndCall(
        ITransparentUpgradeableProxy proxy,
        bytes memory implementation,
        bytes memory _calldata
    ) public payable returns (Proxy memory) {
        Proxy memory p = _info[address(proxy)];

        address implementationAddr = p.salt.add(p.version + 1).create3(implementation);
        ProxyAdmin.upgradeAndCall(proxy, implementationAddr, _calldata);

        return _save(address(proxy), implementationAddr, p.salt);
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
    function batch(bytes[] calldata calls) external payable onlyDeployerOrOwner returns (bytes[] memory results) {
        results = new bytes[](calls.length);
        unchecked {
            for (uint256 i; i < calls.length; i++) {
                // solhint-disable-next-line avoid-low-level-calls
                (bool success, bytes memory result) = address(this).delegatecall(calls[i]);

                if (!success) _tryParseRevert(result);
                results[i] = result;
            }
        }
    }

    /* -------------------------------------------------------------------------- */
    /*                                  Internals                                 */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Do sanity checks, emit events and save the proxy information.
     * @dev Reverts if salt provided differs from existing salt.
     */
    function _save(address proxy, address implementation, bytes32 salt) internal returns (Proxy memory) {
        Proxy storage p = _info[proxy];

        if (implementation != p.implementation) {
            p.implementation = implementation;
        }

        p.version++;
        p.updatedAt = uint32(block.timestamp);

        if (address(p.proxy) != address(0)) {
            if (salt != p.salt) revert UsingNonDeterministicFunctionForDeterministicProxy(p);
            _proxies[p.index] = p;
            emit ProxyUpgraded(p);
        } else {
            p.proxy = ITransparentUpgradeableProxy(proxy);
            p.index = uint48(_proxies.length);
            p.createdAt = uint48(block.timestamp);
            p.salt = salt;

            emit ProxyCreated(p);
            _proxies.push(p);
        }

        return p;
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
