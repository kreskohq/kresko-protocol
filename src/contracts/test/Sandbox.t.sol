// solhint-disable no-console
// solhint-disable state-visibility
// solhint-disable no-unused-import
// solhint-disable var-name-mixedcase

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {TestBase} from "kresko-lib/utils/TestBase.sol";
import {LibTest} from "kresko-lib/utils/LibTest.sol";
import {stdStorage, StdStorage} from "forge-std/stdStorage.sol";
import {console2} from "forge-std/console2.sol";
import {CREATE3} from "libs/CREATE3.sol";
import {LogicA, LogicB} from "mocks-misc/MockLogic.sol";
import {ProxyFactory, IProxyFactory, Proxy, LibProxy, TransparentUpgradeableProxy} from "scripts/utils/ProxyFactory.sol";

bytes32 constant EIP1967_ADMIN_SLOT = 0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103;
bytes32 constant EIP1967_IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

contract ProxyFactoryTest is TestBase("MNEMONIC_DEVNET") {
    using stdStorage for StdStorage;
    using LibTest for *;

    using LibProxy for *;
    ProxyFactory factory;
    address initialOwner;

    bytes32 salt = keccak256("test");
    bytes32 salt2 = keccak256("test2");

    bytes PROXY_CREATION_CODE = type(TransparentUpgradeableProxy).creationCode;

    bytes LOGIC_A_CREATION_CODE = type(LogicA).creationCode;
    bytes LOGIC_B_CREATION_CODE = type(LogicB).creationCode;
    bytes CALLDATA_LOGIC_A = abi.encodeWithSelector(LogicA.initialize.selector);

    function setUp() public prankMnemonic(0) {
        initialOwner = getAddr(0);
        factory = new ProxyFactory(initialOwner);
    }

    function testSetup() public {
        factory.owner().equals(initialOwner);
    }

    function testCreateAndCall() public prankMnemonic(0) {
        LogicA logicA = new LogicA();
        Proxy memory proxy = factory.createAndCall(address(logicA), CALLDATA_LOGIC_A);
        address proxyAddr = address(proxy.proxy);

        address admin = address(uint160(uint256(vm.load(proxyAddr, EIP1967_ADMIN_SLOT))));
        admin.equals(address(factory));

        proxyAddr.notEqual(address(0));
        proxy.implementation.equals(address(logicA));
        proxy.createdAt.notEqual(0);
        proxy.updatedAt.equals(proxy.createdAt);
        proxy.salt.equals(bytes32(0));
        proxy.version.equals(1);

        logicA.meaningOfLife().equals(0);
        logicA.owner().equals(address(0));

        LogicA proxyLogicA = LogicA(proxyAddr);
        proxyLogicA.meaningOfLife().equals(42);
        proxyLogicA.owner().equals(address(factory));

        factory.isProxy(address(logicA)).equals(false);
        factory.isProxy(proxyAddr).equals(true);
        factory.getImplementation(proxyAddr).equals(address(logicA));
        factory.getProxyCount().equals(1);
        factory.getProxies().length.equals(1);
        assertTrue(factory.getProxies()[0].proxy == proxy.proxy);
    }

    function testCreate2AndCall() public prankMnemonic(0) {
        LogicA logicA = new LogicA();

        address expectedProxyAddress = factory.previewCreate2AndCall(address(logicA), CALLDATA_LOGIC_A, salt);
        expectedProxyAddress.notEqual(address(0));

        Proxy memory proxy = factory.create2AndCall(address(logicA), CALLDATA_LOGIC_A, salt);
        address proxyAddr = address(proxy.proxy);

        address admin = address(uint160(uint256(vm.load(proxyAddr, EIP1967_ADMIN_SLOT))));
        admin.equals(address(factory));

        proxyAddr.notEqual(address(0));
        proxyAddr.equals(expectedProxyAddress);
        proxy.implementation.equals(address(logicA));
        proxy.createdAt.notEqual(0);
        proxy.updatedAt.equals(proxy.createdAt);
        proxy.salt.equals(salt);
        proxy.version.equals(1);

        logicA.meaningOfLife().equals(0);
        logicA.owner().equals(address(0));

        LogicA proxyLogicA = LogicA(proxyAddr);
        proxyLogicA.meaningOfLife().equals(42);
        proxyLogicA.owner().equals(address(factory));

        // Bookeeping
        factory.isProxy(address(logicA)).equals(false);
        factory.isProxy(proxyAddr).equals(true);
        factory.getImplementation(proxyAddr).equals(address(logicA));
        factory.getProxyCount().equals(1);
        factory.getProxies().length.equals(1);
        assertTrue(factory.getProxies()[0].proxy == proxy.proxy);
    }

    function testCreate3AndCall() public prankMnemonic(0) {
        LogicA logicA = new LogicA();

        address expectedSaltAddress = factory.getCreate3Address(salt);
        address expectedProxyAddress = factory.previewCreate3AndCall(salt);

        expectedSaltAddress.notEqual(address(0));
        expectedProxyAddress.equals(expectedSaltAddress);

        Proxy memory proxy = factory.create3AndCall(address(logicA), CALLDATA_LOGIC_A, salt);
        address proxyAddr = address(proxy.proxy);

        address admin = address(uint160(uint256(vm.load(proxyAddr, EIP1967_ADMIN_SLOT))));
        admin.equals(address(factory));

        proxyAddr.notEqual(address(0));
        proxyAddr.equals(expectedProxyAddress);
        proxy.implementation.equals(address(logicA));
        proxy.createdAt.notEqual(0);
        proxy.updatedAt.equals(proxy.createdAt);
        proxy.salt.equals(salt);
        proxy.version.equals(1);

        logicA.meaningOfLife().equals(0);
        logicA.owner().equals(address(0));

        LogicA proxyLogicA = LogicA(proxyAddr);
        proxyLogicA.meaningOfLife().equals(42);
        /// @notice Kresko: CREATE3 msg.sender is its temporary utility contract.
        proxyLogicA.owner().notEqual(address(factory));

        // Bookeeping
        factory.isProxy(address(logicA)).equals(false);
        factory.isProxy(proxyAddr).equals(true);
        factory.getImplementation(proxyAddr).equals(address(logicA));
        factory.getProxyCount().equals(1);
        factory.getProxies().length.equals(1);
        assertTrue(factory.getProxies()[0].proxy == proxy.proxy);
    }

    function testDeployCreateAndCall() public prankMnemonic(0) {
        Proxy memory proxy = factory.deployCreateAndCall(LOGIC_A_CREATION_CODE, CALLDATA_LOGIC_A);
        address proxyAddr = address(proxy.proxy);

        address admin = address(uint160(uint256(vm.load(proxyAddr, EIP1967_ADMIN_SLOT))));

        admin.equals(address(factory));

        proxyAddr.notEqual(address(0));

        proxy.implementation.notEqual(address(0));
        proxy.createdAt.notEqual(0);
        proxy.updatedAt.equals(proxy.createdAt);
        proxy.salt.equals(bytes32(0));
        proxy.version.equals(1);

        LogicA logicA = LogicA(proxy.implementation);
        logicA.meaningOfLife().equals(0);
        logicA.owner().equals(address(0));

        LogicA proxyLogicA = LogicA(proxyAddr);
        proxyLogicA.meaningOfLife().equals(42);
        proxyLogicA.owner().equals(address(factory));

        factory.isProxy(address(logicA)).equals(false);
        factory.isProxy(proxyAddr).equals(true);
        factory.getImplementation(proxyAddr).equals(address(logicA));
        factory.getProxyCount().equals(1);
        factory.getProxies().length.equals(1);
        assertTrue(factory.getProxies()[0].proxy == proxy.proxy);
    }

    function testDeployCreate2AndCall() public prankMnemonic(0) {
        bytes32 implementationSalt = salt.add(1);

        (address expectedProxy, address expectedImplementation) = factory.previewDeployCreate2(
            LOGIC_A_CREATION_CODE,
            CALLDATA_LOGIC_A,
            salt
        );
        expectedProxy.notEqual(address(0));
        expectedImplementation.notEqual(address(0));
        expectedProxy.notEqual(expectedImplementation);

        Proxy memory proxy = factory.deployCreate2AndCall(LOGIC_A_CREATION_CODE, CALLDATA_LOGIC_A, salt);
        address proxyAddr = address(proxy.proxy);

        address admin = address(uint160(uint256(vm.load(proxyAddr, EIP1967_ADMIN_SLOT))));
        admin.equals(address(factory));

        proxyAddr.equals(expectedProxy);
        proxyAddr.equals(
            factory.getCreate2Address(
                implementationSalt.sub(1),
                abi.encodePacked(PROXY_CREATION_CODE, abi.encode(expectedImplementation, address(factory), CALLDATA_LOGIC_A))
            ),
            "proxySaltReversed"
        );

        proxy.implementation.equals(expectedImplementation);
        proxy.implementation.equals(factory.getCreate2Address(implementationSalt, LOGIC_A_CREATION_CODE), "implementationSalt");
        proxy.createdAt.notEqual(0);
        proxy.updatedAt.equals(proxy.createdAt);
        proxy.salt.equals(salt);
        proxy.version.equals(1);

        LogicA logicA = LogicA(proxy.implementation);
        logicA.meaningOfLife().equals(0);
        logicA.owner().equals(address(0));

        LogicA proxyLogicA = LogicA(proxyAddr);
        proxyLogicA.meaningOfLife().equals(42);
        proxyLogicA.owner().equals(address(factory));

        // Bookeeping
        factory.isProxy(address(logicA)).equals(false);
        factory.isProxy(proxyAddr).equals(true);
        factory.getImplementation(proxyAddr).equals(address(logicA));
        factory.getProxyCount().equals(1);
        factory.getProxies().length.equals(1);
        assertTrue(factory.getProxies()[0].proxy == proxy.proxy);
    }

    function testDeployCreate3AndCall() public prankMnemonic(0) {
        bytes32 implementationSalt = bytes32(uint256(salt) + 1);

        (address expectedProxy, address expectedImplementation) = factory.previewDeployCreate3(salt);
        expectedProxy.notEqual(address(0));
        expectedImplementation.notEqual(address(0));
        expectedProxy.notEqual(expectedImplementation);

        Proxy memory proxy = factory.deployCreate3AndCall(LOGIC_A_CREATION_CODE, CALLDATA_LOGIC_A, salt);
        address proxyAddr = address(proxy.proxy);

        address admin = address(uint160(uint256(vm.load(proxyAddr, EIP1967_ADMIN_SLOT))));
        admin.equals(address(factory));

        proxyAddr.equals(expectedProxy);
        proxyAddr.equals(factory.getCreate3Address(bytes32(uint256(implementationSalt) - 1)), "proxySaltReversed");
        proxy.implementation.equals(expectedImplementation);
        proxy.implementation.equals(factory.getCreate3Address(implementationSalt), "implementationSalt");
        proxy.createdAt.notEqual(0);
        proxy.updatedAt.equals(proxy.createdAt);
        proxy.salt.equals(salt);
        proxy.version.equals(1);

        LogicA logicA = LogicA(proxy.implementation);
        logicA.meaningOfLife().equals(0);
        logicA.owner().equals(address(0));

        LogicA proxyLogicA = LogicA(proxyAddr);
        proxyLogicA.meaningOfLife().equals(42);
        /// @notice Kresko: CREATE3 msg.sender is its temporary utility contract.
        proxyLogicA.owner().notEqual(address(factory));

        // Bookeeping
        factory.isProxy(address(logicA)).equals(false);
        factory.isProxy(proxyAddr).equals(true);
        factory.getImplementation(proxyAddr).equals(address(logicA));
        factory.getProxyCount().equals(1);
        factory.getProxies().length.equals(1);
        assertTrue(factory.getProxies()[0].proxy == proxy.proxy);
    }

    function testUpgradeAndCall() public prankMnemonic(0) {
        Proxy memory proxy = factory.createAndCall(address(new LogicA()), abi.encodeWithSelector(LogicA.initialize.selector));

        LogicB logicB = new LogicB();
        LogicB proxyLogicB = LogicB(address(proxy.proxy));

        address newOwner = getAddr(1);
        uint256 newValue = 100;

        vm.warp(100);
        factory.upgradeAndCall(
            proxy.proxy,
            address(logicB),
            abi.encodeWithSelector(LogicB.initialize.selector, newOwner, newValue)
        );
        logicB.owner().equals(address(0));
        logicB.meaningOfLife().equals(0);

        proxyLogicB.owner().equals(newOwner);
        proxyLogicB.meaningOfLife().equals(newValue);

        Proxy memory upgraded = factory.getProxy(address(proxy.proxy));
        address proxyAddr = address(upgraded.proxy);
        upgraded.implementation.notEqual(proxy.implementation);
        upgraded.version.equals(2);
        upgraded.createdAt.equals(proxy.createdAt);
        upgraded.updatedAt.notEqual(proxy.updatedAt);
        upgraded.index.equals(0);
        upgraded.salt.equals(0);
        assertTrue(proxy.proxy == upgraded.proxy);

        // Bookeeping
        factory.isProxy(address(logicB)).equals(false);
        factory.isProxy(proxyAddr).equals(true);
        factory.getImplementation(proxyAddr).equals(address(logicB));
        factory.getProxyCount().equals(1);
        factory.getProxies().length.equals(1);
        assertTrue(factory.getProxies()[0].proxy == proxy.proxy);
    }

    function testUpgrade2AndCall() public prankMnemonic(0) {
        Proxy memory proxy = factory.deployCreate2AndCall(LOGIC_A_CREATION_CODE, CALLDATA_LOGIC_A, salt);
        address newOwner = getAddr(1);
        uint256 newValue = 100;
        bytes memory _calldata = abi.encodeWithSelector(LogicB.initialize.selector, newOwner, newValue);

        (address expectedImplementation, uint256 version) = factory.previewUpgrade2(proxy.proxy, LOGIC_B_CREATION_CODE);
        proxy.implementation.notEqual(expectedImplementation);
        LogicB proxyLogicB = LogicB(address(proxy.proxy));

        vm.warp(100);
        Proxy memory upgraded = factory.upgrade2AndCall(proxy.proxy, LOGIC_B_CREATION_CODE, _calldata);
        LogicB logicB = LogicB(expectedImplementation);

        address proxyAddr = address(upgraded.proxy);
        proxyAddr.equals(
            factory.getCreate2Address(
                upgraded.salt.add(version).sub(version),
                abi.encodePacked(PROXY_CREATION_CODE, abi.encode(proxy.implementation, address(factory), CALLDATA_LOGIC_A))
            ),
            "proxySaltReversed"
        );

        logicB.owner().equals(address(0));
        logicB.meaningOfLife().equals(0);

        proxyLogicB.owner().equals(newOwner);
        proxyLogicB.meaningOfLife().equals(newValue);

        upgraded.implementation.notEqual(proxy.implementation);
        upgraded.implementation.equals(expectedImplementation);
        upgraded.version.equals(2);
        upgraded.createdAt.equals(proxy.createdAt);
        upgraded.updatedAt.notEqual(proxy.updatedAt);
        upgraded.index.equals(0);
        upgraded.salt.equals(salt);
        assertTrue(proxy.proxy == upgraded.proxy);

        // Bookeeping
        factory.isProxy(address(logicB)).equals(false);
        factory.isProxy(proxyAddr).equals(true);
        factory.getImplementation(proxyAddr).equals(address(logicB));
        factory.getProxyCount().equals(1);
        factory.getProxies().length.equals(1);
        assertTrue(factory.getProxies()[0].proxy == proxy.proxy);
    }

    function testUpgrade3AndCall() public prankMnemonic(0) {
        Proxy memory proxy = factory.deployCreate3AndCall(LOGIC_A_CREATION_CODE, CALLDATA_LOGIC_A, salt);
        address newOwner = getAddr(1);
        uint256 newValue = 100;
        bytes memory _calldata = abi.encodeWithSelector(LogicB.initialize.selector, newOwner, newValue);

        (address expectedImplementation, uint256 version) = factory.previewUpgrade3(proxy.proxy);
        proxy.implementation.notEqual(expectedImplementation);

        vm.warp(100);
        Proxy memory upgraded = factory.upgrade3AndCall(proxy.proxy, LOGIC_B_CREATION_CODE, _calldata);

        LogicB logicB = LogicB(expectedImplementation);
        LogicB proxyLogicB = LogicB(address(proxy.proxy));

        address proxyAddr = address(upgraded.proxy);

        logicB.owner().equals(address(0));
        logicB.meaningOfLife().equals(0);

        proxyLogicB.owner().equals(newOwner);
        proxyLogicB.meaningOfLife().equals(newValue);

        upgraded.implementation.notEqual(proxy.implementation);
        upgraded.implementation.equals(factory.getCreate3Address(salt.add(version)));
        upgraded.version.equals(2);
        upgraded.createdAt.equals(proxy.createdAt);
        upgraded.updatedAt.notEqual(proxy.updatedAt);
        upgraded.index.equals(0);
        upgraded.salt.equals(salt);
        assertTrue(proxy.proxy == upgraded.proxy);

        // Bookeeping
        factory.isProxy(address(logicB)).equals(false);
        factory.isProxy(proxyAddr).equals(true);
        factory.getImplementation(proxyAddr).equals(address(logicB));
        factory.getProxyCount().equals(1);
        factory.getProxies().length.equals(1);
        assertTrue(factory.getProxies()[0].proxy == proxy.proxy);
    }

    function testBatching() public prankMnemonic(0) {
        LogicA logicA = new LogicA();

        bytes[] memory initCalls = new bytes[](3);

        initCalls[0] = abi.encodeCall(factory.createAndCall, (address(logicA), CALLDATA_LOGIC_A));
        initCalls[1] = abi.encodeCall(factory.deployCreate2AndCall, (LOGIC_A_CREATION_CODE, CALLDATA_LOGIC_A, salt));
        initCalls[2] = abi.encodeCall(factory.deployCreate3AndCall, (LOGIC_A_CREATION_CODE, CALLDATA_LOGIC_A, salt));
        Proxy[] memory proxies = factory.batched(initCalls);

        for (uint256 i; i < proxies.length; i++) {
            Proxy memory proxy = proxies[i];
            address proxyAddr = address(proxy.proxy);
            proxyAddr.notEqual(address(0));
            proxy.implementation.notEqual(address(0));

            LogicA logicA = LogicA(proxy.implementation);
            LogicA proxyLogicA = LogicA(proxyAddr);

            logicA.owner().equals(address(0));
            logicA.meaningOfLife().equals(0);
            proxyLogicA.meaningOfLife().equals(42);
            proxy.index.equals(i);
            assertTrue(factory.getProxies()[i].proxy == proxy.proxy);
        }
        factory.getProxyCount().equals(initCalls.length);

        address newOwner = getAddr(1);
        uint256 newValue = 101;

        bytes[] memory upgradeCalls = new bytes[](initCalls.length);
        bytes memory upgradeCalldata = abi.encodeWithSelector(LogicB.initialize.selector, newOwner, newValue);
        bytes memory upgradeCalldata3 = abi.encodeWithSelector(LogicB.initialize.selector, getAddr(2), 5000);

        upgradeCalls[0] = abi.encodeCall(
            factory.upgradeAndCallWithReturn,
            (proxies[0].proxy, address(new LogicB()), upgradeCalldata)
        );
        upgradeCalls[1] = abi.encodeCall(factory.upgrade2AndCall, (proxies[1].proxy, LOGIC_B_CREATION_CODE, upgradeCalldata));
        upgradeCalls[2] = abi.encodeCall(factory.upgrade3AndCall, (proxies[2].proxy, LOGIC_B_CREATION_CODE, upgradeCalldata3));

        vm.warp(100);
        Proxy[] memory upgradedProxies = factory.batched(upgradeCalls);

        for (uint256 i; i < upgradedProxies.length; i++) {
            Proxy memory proxy = upgradedProxies[i];
            address proxyAddr = address(proxy.proxy);
            proxyAddr.equals(address(proxies[i].proxy));
            proxy.implementation.notEqual(proxies[i].implementation);

            LogicB logicB = LogicB(proxy.implementation);
            LogicB proxyLogicB = LogicB(proxyAddr);

            logicB.owner().equals(address(0));
            logicB.meaningOfLife().equals(0);

            if (i == 2) {
                proxyLogicB.owner().equals(getAddr(2));
                proxyLogicB.meaningOfLife().equals(5000);
            } else {
                proxyLogicB.meaningOfLife().equals(newValue);
                proxyLogicB.owner().equals(newOwner);
            }

            proxy.index.equals(i);
            proxy.createdAt.equals(proxies[i].createdAt);
            proxy.updatedAt.isGt(proxies[i].updatedAt);
            assertTrue(factory.getProxies()[i].proxy == proxy.proxy);
        }

        factory.getProxyCount().equals(initCalls.length);
    }

    function testDeployerBatching() public prankMnemonic(0) {
        address deployer = getAddr(1);
        factory.setDeployer(deployer, true);
        vm.stopPrank();

        vm.startPrank(deployer);

        bytes[] memory initCalls = new bytes[](2);
        initCalls[0] = abi.encodeCall(factory.deployCreate2AndCall, (LOGIC_A_CREATION_CODE, CALLDATA_LOGIC_A, salt));
        initCalls[1] = abi.encodeCall(factory.deployCreate3AndCall, (LOGIC_A_CREATION_CODE, CALLDATA_LOGIC_A, salt));

        Proxy[] memory proxies = factory.batched(initCalls);

        proxies.length.equals(initCalls.length);

        bytes[] memory callsNext = new bytes[](3);

        LogicA logicA = new LogicA();
        callsNext[0] = abi.encodeCall(factory.createAndCall, (address(logicA), CALLDATA_LOGIC_A));
        callsNext[1] = abi.encodeCall(factory.createAndCall, (address(logicA), CALLDATA_LOGIC_A));
        callsNext[2] = abi.encodeCall(
            factory.upgrade2AndCall,
            (proxies[0].proxy, LOGIC_B_CREATION_CODE, abi.encodeWithSelector(LogicB.initialize.selector, getAddr(1), 101))
        );

        // vm.expectRevert();
        factory.batched(callsNext);
    }

    // function testSetup() public {
    //     address sender1 = getAddr(0);
    //     vm.startPrank(sender1);
    //     deployer1 = new Deployer();
    //     bytes memory code = vm.getDeployedCode("Child.sol:Child");
    //     address expected = deployer1.getCreate2Address(uint256(salt_use), type(Child).creationCode);
    //     console2.log("expecting", expected);
    //     (address deployed3, bytes32 codeHash) = deployer1.deployCreate2(uint256(salt_use), type(Child).creationCode);
    //     console2.log("deployed", deployed3, address(deployer1));
    //     console2.logBytes32(codeHash);
    //     console2.logBytes32(keccak256(type(Child).creationCode));
    //     vm.stopPrank();
    // }
}
