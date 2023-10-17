// SPDX-License-Identifier: MIT
pragma solidity ^0.8.14;
import {ITransparentUpgradeableProxy} from "@oz/proxy/transparent/TransparentUpgradeableProxy.sol";

enum CreationKind {
    NONE,
    CREATE,
    CREATE2,
    CREATE3
}

/**
 * @notice Proxy information
 * @param implementation Current implementation address
 * @param updatedAt Timestamp of latest upgrade
 * @param kind Creation mechanism used for this proxy
 * @param proxy Address of the proxy itself
 * @param index Array index of the proxy in the internal tracking list
 * @param createdAt Creation timestamp of the proxy
 * @param version Current version of the proxy (count of upgrade calls)
 */
struct Proxy {
    address implementation;
    uint88 updatedAt;
    CreationKind kind;
    ITransparentUpgradeableProxy proxy;
    uint48 index;
    uint48 createdAt;
    uint256 version;
    bytes32 salt;
}

interface IProxyFactory {
    error BatchRevertSilentOrCustomError(bytes innerError);
    error CreateProxyPreview(address proxy);
    error CreateProxyAndLogicPreview(address proxy, address implementation);
    error InvalidKind(Proxy);
    error ArrayLengthMismatch(uint256 proxies, uint256 implementations, uint256 datas);
    error InvalidSalt(Proxy);
    error DeployerAlreadySet(address, bool);

    event DeployerSet(address, bool);
    event ProxyCreated(Proxy);
    event ProxyUpgraded(Proxy);

    function setDeployer(address who, bool value) external;

    function isDeployer(address who) external view returns (bool);

    /**
     * @notice Get available information of `proxy`.
     * @param proxy Address of the proxy.
     * @return Proxy Proxy information.
     */
    function getProxy(address proxy) external view returns (Proxy memory);

    /**
     * @notice Get the topmost `count` of proxies.
     * @return Proxy[] List of information about the proxies.
     */
    function getLatestProxies(uint256 count) external view returns (Proxy[] memory);

    /**
     * @notice Get available information of `proxy`.
     * @param index Index of the proxy.
     * @return Proxy Proxy information.
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

    function isDeterministic(address proxy) external view returns (bool);

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
     * @notice Preview proxy address from {createProxy} through {CreateProxyPreview} custom error.
     * @param implementation Bytecode of the implementation.
     * @param _calldata Initializer calldata.
     * @return proxyPreview Address of the proxy that would be created.
     */
    function previewCreateProxy(address implementation, bytes memory _calldata) external returns (address proxyPreview);

    /**
     * @notice Preview resulting proxy address from {create2AndCall} with given salt.
     * @param implementation Address of the implementation.
     * @param _calldata Initializer calldata.
     * @param salt Salt for the deterministic deployment.
     * @return proxyPreview Address of the proxy that would be created.
     */
    function previewCreate2Proxy(
        address implementation,
        bytes memory _calldata,
        bytes32 salt
    ) external view returns (address proxyPreview);

    /**
     * @notice Preview resulting proxy address from {create3AndCall} or {deployCreate3AndCall} with given salt.
     * @param salt Salt for the deterministic deployment.
     * @return proxyPreview Address of the proxy that would be created.
     */
    function previewCreate3Proxy(bytes32 salt) external view returns (address proxyPreview);

    /**
     * @notice Preview resulting proxy and implementation address from {deployCreateAndCall} through the {CreateProxyAndLogic} custom error.
     * @param implementation Bytecode of the implementation.
     * @param _calldata Initializer calldata.
     * @return proxyPreview Address of the proxy that would be created.
     * @return implementationPreview Address of the deployed implementation.
     */
    function previewCreateProxyAndLogic(
        bytes memory implementation,
        bytes memory _calldata
    ) external returns (address proxyPreview, address implementationPreview);

    /**
     * @notice Preview resulting proxy and implementation address from {deployCreate2AndCall} with given salt.
     * @param implementation Bytecode of the implementation.
     * @param _calldata Initializer calldata.
     * @param salt Salt for the deterministic deployment.
     * @return proxyPreview Address of the proxy that would be created.
     * @return implementationPreview Address of the deployed implementation.
     */
    function previewCreate2ProxyAndLogic(
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
    function previewCreate3ProxyAndLogic(
        bytes32 salt
    ) external view returns (address proxyPreview, address implementationPreview);

    /**
     * @notice Preview resulting implementation address from {upgrade2AndCall} with given salt.
     * @param proxy Existing ITransparentUpgradeableProxy address.
     * @param implementation Bytecode of the new implementation.
     * @return implementationPreview Address for the next implementation.
     * @return version New version number of the proxy.
     */
    function previewCreate2Upgrade(
        ITransparentUpgradeableProxy proxy,
        bytes memory implementation
    ) external view returns (address implementationPreview, uint256 version);

    /**
     * @notice Preview resulting implementation address from {upgrade3AndCall} with given salt.
     * @param proxy Existing ITransparentUpgradeableProxy address.
     * @return implementationPreview Address for the next implementation.
     * @return version New version number of the proxy.
     */
    function previewCreate3Upgrade(
        ITransparentUpgradeableProxy proxy
    ) external view returns (address implementationPreview, uint256 version);

    /**
     * @notice Creates a new proxy for the `implementation` and initializes it with `data`.
     * @param implementation Address of the implementation.
     * @param _calldata Initializer calldata.
     * @return newProxy Proxy information.
     * See {TransparentUpgradeableProxy-constructor}.
     * @custom:signature createAndCall(address,bytes)
     * @custom:selector 0xfb506844
     */
    function createProxy(address implementation, bytes memory _calldata) external payable returns (Proxy memory newProxy);

    /**
     * @notice Creates a new proxy with deterministic address derived from arguments given.
     * @param implementation Address of the implementation.
     * @param _calldata Initializer calldata.
     * @param salt Salt for the deterministic deployment.
     * @return newProxy Proxy information.
     * @custom:signature create2AndCall(address,bytes,bytes32)
     * @custom:selector 0xe852e6d5
     */
    function create2Proxy(
        address implementation,
        bytes memory _calldata,
        bytes32 salt
    ) external payable returns (Proxy memory newProxy);

    /**
     * @notice Creates a new proxy with deterministic address derived only from the salt given.
     * @param implementation Address of the implementation.
     * @param _calldata Initializer calldata.
     * @param salt Salt for the deterministic deployment.
     * @return newProxy Proxy information.
     * @custom:signature create3AndCall(address,bytes,bytes32)
     * @custom:selector 0xbd233f6c
     */
    function create3Proxy(
        address implementation,
        bytes memory _calldata,
        bytes32 salt
    ) external payable returns (Proxy memory newProxy);

    /**
     * @notice Deploys an implementation and creates a proxy initialized with `data` for it.
     * @param implementation Bytecode of the implementation.
     * @param _calldata Initializer calldata.
     * @return newProxy Proxy information.
     * @custom:signature deployCreateAndCall(bytes,bytes)
     * @custom:selector 0xfcdf055e
     */
    function createProxyAndLogic(
        bytes memory implementation,
        bytes memory _calldata
    ) external payable returns (Proxy memory newProxy);

    /**
     * @notice Deterministic version of {deployCreateAndCall} where arguments are used to derive the salt.
     * @dev Implementation salt is salt + 1. Use {previewDeployCreate3} to preview.
     * @param implementation Bytecode of the implementation.
     * @param _calldata Initializer calldata.
     * @param salt Salt to derive both addresses from.
     * @return newProxy Proxy information.
     * @custom:signature deployCreate2AndCall(bytes,bytes,bytes32)
     * @custom:selector 0xeb4495f3
     */
    function create2ProxyAndLogic(
        bytes memory implementation,
        bytes memory _calldata,
        bytes32 salt
    ) external payable returns (Proxy memory newProxy);

    /**
     * @notice Deterministic version of {deployCreateAndCall} where only salt matters.
     * @dev Implementation salt is salt + 1. Use {previewDeployCreate3} to preview.
     * @param implementation Bytecode of the implementation to deploy.
     * @param _calldata Initializer calldata.
     * @param salt Salt to derive both addresses from.
     * @return newProxy Proxy information.
     * @custom:signature deployCreate3AndCall(bytes,bytes,bytes32)
     * @custom:selector 0x99480e85
     */
    function create3ProxyAndLogic(
        bytes memory implementation,
        bytes memory _calldata,
        bytes32 salt
    ) external payable returns (Proxy memory newProxy);

    /// @notice Deploys the @param implementation for {upgradeAndCall} and @return Proxy information.
    function upgradeAndCall(
        ITransparentUpgradeableProxy proxy,
        bytes memory implementation,
        bytes memory _calldata
    ) external payable returns (Proxy memory);

    /// @notice Same as {upgradeAndCall} but @return Proxy information.
    function upgradeAndCallReturn(
        ITransparentUpgradeableProxy proxy,
        address implementation,
        bytes memory _calldata
    ) external payable returns (Proxy memory);

    /**
     * @notice Deterministically deploys the upgrade implementation and calls the {ProxyAdmin-upgradeAndCall}.
     * @dev Implementation salt is salt + next version. Use {previewUpgrade2} to preview.
     * @param proxy Existing ITransparentUpgradeableProxy to upgrade.
     * @param implementation Bytecode of the new implementation.
     * @param _calldata Initializer calldata.
     * @return Proxy Proxy information.
     */

    function create2UpgradeAndCall(
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
     * @return Proxy Proxy information.
     */
    function create3UpgradeAndCall(
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
     * @notice Batch view this contract, reverts on write.
     */
    function batchStatic(bytes[] calldata calls) external view returns (bytes[] memory results);
}
