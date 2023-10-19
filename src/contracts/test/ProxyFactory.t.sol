// solhint-disable no-console
// solhint-disable state-visibility
// solhint-disable no-unused-import
// solhint-disable var-name-mixedcase

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;
import {Ownable} from "@oz/access/Ownable.sol";
import {TestBase} from "kresko-lib/utils/TestBase.sol";
import {LibTest} from "kresko-lib/utils/LibTest.sol";
import {stdStorage, StdStorage} from "forge-std/StdStorage.sol";
import {console2} from "forge-std/console2.sol";
import {Conversions, Deploys, Proxies} from "libs/Utils.sol";
import {LogicA, LogicB} from "mocks-misc/MockLogic.sol";
import {ProxyFactory, IProxyFactory, Proxy, TransparentUpgradeableProxy} from "proxy/ProxyFactory.sol";
import {KreskoAsset} from "kresko-asset/KreskoAsset.sol";
import {KreskoAssetAnchor} from "kresko-asset/KreskoAssetAnchor.sol";

bytes32 constant EIP1967_ADMIN_SLOT = 0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103;
bytes32 constant EIP1967_IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

contract ProxyFactoryTest is TestBase("MNEMONIC_DEVNET") {
    using stdStorage for StdStorage;
    using LibTest for *;
    using Proxies for *;
    using Conversions for *;

    ProxyFactory factory;
    address initialOwner;

    bytes32 salt = keccak256("test");
    bytes32 salt2 = keccak256("test2");

    bytes PROXY_CREATION_CODE = type(TransparentUpgradeableProxy).creationCode;

    bytes LOGIC_A_CREATION_CODE = type(LogicA).creationCode;
    bytes LOGIC_B_CREATION_CODE = type(LogicB).creationCode;

    bytes CALLDATA_LOGIC_A;
    bytes CALLDATA_LOGIC_B;

    function setUp() public prankMnemonic(0) {
        initialOwner = getAddr(0);
        factory = new ProxyFactory(initialOwner);

        CALLDATA_LOGIC_A = abi.encodeWithSelector(LogicA.initialize.selector);
        CALLDATA_LOGIC_B = abi.encodeWithSelector(LogicB.initialize.selector, getAddr(1), 100);
    }

    function testSetup() public {
        factory.owner().equals(initialOwner);
    }

    function testCreateProxy() public prankMnemonic(0) {
        LogicA logicA = new LogicA();
        Proxy memory proxy = factory.createProxy(address(logicA), CALLDATA_LOGIC_A);
        address proxyAddr = address(proxy.proxy);

        address admin = address(uint160(uint256(vm.load(proxyAddr, EIP1967_ADMIN_SLOT))));
        admin.equals(address(factory));

        proxyAddr.notEqual(address(0));
        proxy.implementation.equals(address(logicA));
        proxy.createdAt.notEqual(0);
        proxy.updatedAt.equals(proxy.createdAt);
        proxy.salt.equals(bytes32(0));
        proxy.version.equals(1);

        logicA.valueUint().equals(0);
        logicA.owner().equals(address(0));

        LogicA proxyLogicA = LogicA(proxyAddr);
        proxyLogicA.valueUint().equals(42);
        proxyLogicA.owner().equals(address(factory));

        factory.isProxy(address(logicA)).equals(false);
        factory.isProxy(proxyAddr).equals(true);
        factory.getImplementation(proxyAddr).equals(address(logicA));
        factory.getProxyCount().equals(1);
        factory.getProxies().length.equals(1);
        assertTrue(factory.getProxies()[0].proxy == proxy.proxy);
    }

    function testCreate2Proxy() public prankMnemonic(0) {
        LogicA logicA = new LogicA();

        address expectedProxyAddress = factory.previewCreate2Proxy(address(logicA), CALLDATA_LOGIC_A, salt);
        expectedProxyAddress.notEqual(address(0));

        Proxy memory proxy = factory.create2Proxy(address(logicA), CALLDATA_LOGIC_A, salt);
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

        logicA.valueUint().equals(0);
        logicA.owner().equals(address(0));

        LogicA proxyLogicA = LogicA(proxyAddr);
        proxyLogicA.valueUint().equals(42);
        proxyLogicA.owner().equals(address(factory));

        // Bookeeping
        factory.isProxy(address(logicA)).equals(false);
        factory.isProxy(proxyAddr).equals(true);
        factory.getImplementation(proxyAddr).equals(address(logicA));
        factory.getProxyCount().equals(1);
        factory.getProxies().length.equals(1);
        assertTrue(factory.getProxies()[0].proxy == proxy.proxy);
    }

    function testCreate3Proxy() public prankMnemonic(0) {
        LogicA logicA = new LogicA();

        address expectedSaltAddress = factory.getCreate3Address(salt);
        address expectedProxyAddress = factory.previewCreate3Proxy(salt);

        expectedSaltAddress.notEqual(address(0));
        expectedProxyAddress.equals(expectedSaltAddress);

        Proxy memory proxy = factory.create3Proxy(address(logicA), CALLDATA_LOGIC_A, salt);
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

        logicA.valueUint().equals(0);
        logicA.owner().equals(address(0));

        LogicA proxyLogicA = LogicA(proxyAddr);
        proxyLogicA.valueUint().equals(42);
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

    function testCreateProxyAndLogic() public prankMnemonic(0) {
        Proxy memory proxy = factory.createProxyAndLogic(LOGIC_A_CREATION_CODE, CALLDATA_LOGIC_A);
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
        logicA.valueUint().equals(0);
        logicA.owner().equals(address(0));

        LogicA proxyLogicA = LogicA(proxyAddr);
        proxyLogicA.valueUint().equals(42);
        proxyLogicA.owner().equals(address(factory));

        factory.isProxy(address(logicA)).equals(false);
        factory.isProxy(proxyAddr).equals(true);
        factory.getImplementation(proxyAddr).equals(address(logicA));
        factory.getProxyCount().equals(1);
        factory.getProxies().length.equals(1);
        assertTrue(factory.getProxies()[0].proxy == proxy.proxy);
    }

    function testCreateProxy2AndLogic() public prankMnemonic(0) {
        bytes32 implementationSalt = salt.add(1);

        (address expectedProxy, address expectedImplementation) = factory.previewCreate2ProxyAndLogic(
            LOGIC_A_CREATION_CODE,
            CALLDATA_LOGIC_A,
            salt
        );
        expectedProxy.notEqual(address(0));
        expectedImplementation.notEqual(address(0));
        expectedProxy.notEqual(expectedImplementation);

        Proxy memory proxy = factory.create2ProxyAndLogic(LOGIC_A_CREATION_CODE, CALLDATA_LOGIC_A, salt);
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
        logicA.valueUint().equals(0);
        logicA.owner().equals(address(0));

        LogicA proxyLogicA = LogicA(proxyAddr);
        proxyLogicA.valueUint().equals(42);
        proxyLogicA.owner().equals(address(factory));

        // Bookeeping
        factory.isProxy(address(logicA)).equals(false);
        factory.isProxy(proxyAddr).equals(true);
        factory.getImplementation(proxyAddr).equals(address(logicA));
        factory.getProxyCount().equals(1);
        factory.getProxies().length.equals(1);
        assertTrue(factory.getProxies()[0].proxy == proxy.proxy);
    }

    function testCreate3ProxyAndLogic() public prankMnemonic(0) {
        bytes32 implementationSalt = bytes32(uint256(salt) + 1);

        (address expectedProxy, address expectedImplementation) = factory.previewCreate3ProxyAndLogic(salt);
        expectedProxy.notEqual(address(0));
        expectedImplementation.notEqual(address(0));
        expectedProxy.notEqual(expectedImplementation);

        Proxy memory proxy = factory.create3ProxyAndLogic(LOGIC_A_CREATION_CODE, CALLDATA_LOGIC_A, salt);
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
        logicA.valueUint().equals(0);
        logicA.owner().equals(address(0));

        LogicA proxyLogicA = LogicA(proxyAddr);
        proxyLogicA.valueUint().equals(42);
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
        Proxy memory proxy = factory.createProxy(address(new LogicA()), abi.encodeWithSelector(LogicA.initialize.selector));

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
        logicB.valueUint().equals(0);

        proxyLogicB.owner().equals(newOwner);
        proxyLogicB.valueUint().equals(newValue);

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

    function testCreate2UpgradeAndCall() public prankMnemonic(0) {
        Proxy memory proxy = factory.create2ProxyAndLogic(LOGIC_A_CREATION_CODE, CALLDATA_LOGIC_A, salt);
        address newOwner = getAddr(1);
        uint256 newValue = 100;
        bytes memory _calldata = abi.encodeWithSelector(LogicB.initialize.selector, newOwner, newValue);

        (address expectedImplementation, uint256 version) = factory.previewCreate2Upgrade(proxy.proxy, LOGIC_B_CREATION_CODE);
        proxy.implementation.notEqual(expectedImplementation);
        LogicB proxyLogicB = LogicB(address(proxy.proxy));

        vm.warp(100);
        Proxy memory upgraded = factory.create2UpgradeAndCall(proxy.proxy, LOGIC_B_CREATION_CODE, _calldata);
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
        logicB.valueUint().equals(0);

        proxyLogicB.owner().equals(newOwner);
        proxyLogicB.valueUint().equals(newValue);

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

    function testCreate3UpgradeAndCall() public prankMnemonic(0) {
        Proxy memory proxy = factory.create3ProxyAndLogic(LOGIC_A_CREATION_CODE, CALLDATA_LOGIC_A, salt);

        (address expectedImplementation, uint256 version) = factory.previewCreate3Upgrade(proxy.proxy);
        proxy.implementation.notEqual(expectedImplementation);

        vm.warp(100);
        Proxy memory upgraded = factory.create3UpgradeAndCall(proxy.proxy, LOGIC_B_CREATION_CODE, CALLDATA_LOGIC_B);

        LogicB logicB = LogicB(expectedImplementation);
        LogicB proxyLogicB = LogicB(address(proxy.proxy));

        address proxyAddr = address(upgraded.proxy);

        logicB.owner().equals(address(0));
        logicB.valueUint().equals(0);

        proxyLogicB.owner().equals(getAddr(1));
        proxyLogicB.valueUint().equals(100);

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
        bytes[] memory initCalls = new bytes[](3);
        initCalls[0] = abi.encodeCall(factory.createProxy, (address(new LogicA()), CALLDATA_LOGIC_A));
        initCalls[1] = abi.encodeCall(factory.create2ProxyAndLogic, (LOGIC_A_CREATION_CODE, CALLDATA_LOGIC_A, salt));
        initCalls[2] = abi.encodeCall(factory.create3ProxyAndLogic, (LOGIC_A_CREATION_CODE, CALLDATA_LOGIC_A, salt));
        Proxy[] memory proxies = factory.batch(initCalls).map(Conversions.toProxy);

        for (uint256 i; i < proxies.length; i++) {
            Proxy memory proxy = proxies[i];
            address proxyAddr = address(proxy.proxy);

            LogicA logicA = LogicA(proxy.implementation);
            LogicA proxyLogicA = LogicA(proxyAddr);

            proxyAddr.notEqual(address(0));
            proxy.implementation.notEqual(address(0));

            logicA.owner().equals(address(0));
            logicA.valueUint().equals(0);

            proxyLogicA.valueUint().equals(42);
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
            factory.upgradeAndCallReturn,
            (proxies[0].proxy, address(new LogicB()), upgradeCalldata)
        );
        upgradeCalls[1] = abi.encodeCall(
            factory.create2UpgradeAndCall,
            (proxies[1].proxy, LOGIC_B_CREATION_CODE, upgradeCalldata)
        );
        upgradeCalls[2] = abi.encodeCall(
            factory.create3UpgradeAndCall,
            (proxies[2].proxy, LOGIC_B_CREATION_CODE, upgradeCalldata3)
        );

        vm.warp(100);
        Proxy[] memory upgradedProxies = factory.batch(upgradeCalls).map(Conversions.toProxy);

        for (uint256 i; i < upgradedProxies.length; i++) {
            Proxy memory proxy = upgradedProxies[i];
            address proxyAddr = address(proxy.proxy);

            LogicB logicB = LogicB(proxy.implementation);
            LogicB proxyLogicB = LogicB(proxyAddr);

            proxyAddr.equals(address(proxies[i].proxy));
            proxy.implementation.notEqual(proxies[i].implementation);

            logicB.owner().equals(address(0));
            logicB.valueUint().equals(0);

            if (i == 2) {
                proxyLogicB.owner().equals(getAddr(2));
                proxyLogicB.valueUint().equals(5000);
            } else {
                proxyLogicB.valueUint().equals(newValue);
                proxyLogicB.owner().equals(newOwner);
            }

            proxy.index.equals(i);
            proxy.createdAt.equals(proxies[i].createdAt);
            proxy.updatedAt.isGt(proxies[i].updatedAt);
            assertTrue(factory.getProxies()[i].proxy == proxy.proxy);
        }
        factory.getProxyCount().equals(initCalls.length);

        address newLogicA = address(new LogicA());
        vm.expectRevert();
        factory.batch(abi.encodeCall(factory.createProxy, (newLogicA, CALLDATA_LOGIC_B)).toArray());
    }

    function testDeployerPermission() public {
        address owner = getAddr(0);
        address whitelisted = getAddr(1);
        bytes memory notOwner = abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, (whitelisted));

        // cant unauthorized
        vm.prank(whitelisted);
        vm.expectRevert(notOwner);
        factory.setDeployer(whitelisted, true);

        bytes[] memory deployCalls = new bytes[](3);
        deployCalls[0] = abi.encodeCall(factory.createProxy, (address(new LogicA()), CALLDATA_LOGIC_A));
        deployCalls[1] = abi.encodeCall(factory.create2ProxyAndLogic, (LOGIC_A_CREATION_CODE, CALLDATA_LOGIC_A, salt));
        deployCalls[2] = abi.encodeCall(factory.create3ProxyAndLogic, (LOGIC_A_CREATION_CODE, CALLDATA_LOGIC_A, salt));

        // cant deploy yet
        vm.prank(whitelisted);
        vm.expectRevert(notOwner);
        factory.batch(deployCalls);

        // whitelist
        vm.prank(owner);
        factory.setDeployer(whitelisted, true);

        // run deploys
        vm.prank(whitelisted);
        Proxy[] memory proxies = factory.batch(deployCalls).map(Conversions.toProxy);
        proxies.length.equals(deployCalls.length);

        // cannot upgrade
        vm.startPrank(whitelisted);
        address upgradedLogic = address(new LogicB());
        vm.expectRevert(notOwner);
        factory.upgradeAndCall(proxies[0].proxy, upgradedLogic, CALLDATA_LOGIC_B);
        vm.expectRevert(notOwner);
        factory.create2UpgradeAndCall(proxies[1].proxy, LOGIC_B_CREATION_CODE, CALLDATA_LOGIC_B);
        vm.expectRevert(notOwner);
        factory.create3UpgradeAndCall(proxies[2].proxy, LOGIC_B_CREATION_CODE, CALLDATA_LOGIC_B);

        bytes[] memory mixedCalls = new bytes[](2);
        address newLogicA = address(new LogicA());
        mixedCalls[0] = abi.encodeCall(factory.createProxy, (newLogicA, CALLDATA_LOGIC_A));
        mixedCalls[1] = abi.encodeCall(
            factory.create2UpgradeAndCall,
            (proxies[1].proxy, LOGIC_B_CREATION_CODE, CALLDATA_LOGIC_B)
        );

        vm.expectRevert(notOwner);
        factory.batch(mixedCalls);
        vm.stopPrank();

        vm.prank(owner);
        factory.setDeployer(whitelisted, false);

        vm.prank(whitelisted);
        vm.expectRevert(notOwner);
        factory.createProxy(newLogicA, CALLDATA_LOGIC_A);

        (address implementationAddr, uint256 version) = factory.previewCreate2Upgrade(proxies[1].proxy, LOGIC_B_CREATION_CODE);
        version.notEqual(0);
        implementationAddr.notEqual(address(0));

        vm.startPrank(owner);
        Proxy[] memory upgraded = factory.batch(mixedCalls).map(Conversions.toProxy);
        upgraded.length.equals(mixedCalls.length);
        upgraded[0].implementation.equals(newLogicA);
        upgraded[0].version.equals(1);
        upgraded[0].index.equals(3);

        address(upgraded[1].proxy).equals(address(proxies[1].proxy));
        upgraded[1].implementation.equals(implementationAddr);
        upgraded[1].implementation.notEqual(proxies[1].implementation);
        upgraded[1].version.notEqual(proxies[1].version);
        upgraded[1].version.equals(version);
        upgraded[1].index.equals(1);
        vm.stopPrank();
    }

    function testStaticBatch() public {
        address logic = address(new LogicA());

        address owner = getAddr(0);
        address expectedAddr = factory.getCreate3Address(salt);

        bytes memory createProxy = abi.encodeCall(factory.create3Proxy, (logic, CALLDATA_LOGIC_A, salt));
        bytes memory getOwner = abi.encodeCall(factory.owner, ());
        bytes memory create3Preview = abi.encodeCall(factory.getCreate3Address, (salt));

        vm.prank(getAddr(0));
        factory.createProxy(logic, CALLDATA_LOGIC_A);

        bytes[] memory validCalls = new bytes[](3);
        validCalls[0] = getOwner;
        validCalls[1] = create3Preview;
        validCalls[2] = getOwner;

        address[] memory results = factory.batchStatic(validCalls).map(Conversions.toAddr);

        results[0].equals(owner);
        results[1].equals(expectedAddr);
        results[2].equals(owner);

        bytes[] memory invalidCalls = new bytes[](3);
        validCalls[0] = getOwner;
        validCalls[1] = create3Preview;
        validCalls[2] = createProxy;

        vm.prank(owner);
        vm.expectRevert();
        factory.batchStatic(invalidCalls);
    }

    function testAccessControl() public {
        vm.startPrank(getAddr(0));
        address logicA = address(new LogicA());
        address logicB = address(new LogicB());

        Proxy memory proxy1 = factory.createProxy(logicA, CALLDATA_LOGIC_A);
        Proxy memory proxy2 = factory.create2Proxy(logicA, CALLDATA_LOGIC_A, salt2);
        Proxy memory proxy3 = factory.create3Proxy(logicA, CALLDATA_LOGIC_A, salt2);
        vm.stopPrank();

        address invalid = getAddr(2);
        bytes memory notOwner = abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, (invalid));

        vm.startPrank(invalid);

        vm.expectRevert(notOwner);
        factory.createProxy(logicA, CALLDATA_LOGIC_A);
        vm.expectRevert(notOwner);
        factory.create2Proxy(logicA, CALLDATA_LOGIC_A, salt);
        vm.expectRevert(notOwner);
        factory.create3Proxy(logicA, CALLDATA_LOGIC_A, salt);

        vm.expectRevert(notOwner);
        factory.createProxyAndLogic(LOGIC_A_CREATION_CODE, CALLDATA_LOGIC_A);
        vm.expectRevert(notOwner);
        factory.create2ProxyAndLogic(LOGIC_A_CREATION_CODE, CALLDATA_LOGIC_A, bytes32("salty"));
        vm.expectRevert(notOwner);
        factory.create3ProxyAndLogic(LOGIC_A_CREATION_CODE, CALLDATA_LOGIC_A, bytes32("saltier"));

        vm.expectRevert(notOwner);
        factory.upgradeAndCall(proxy1.proxy, logicB, CALLDATA_LOGIC_B);
        vm.expectRevert(notOwner);
        factory.upgradeAndCallReturn(proxy1.proxy, logicB, CALLDATA_LOGIC_B);
        vm.expectRevert(notOwner);
        factory.create2UpgradeAndCall(proxy2.proxy, LOGIC_B_CREATION_CODE, CALLDATA_LOGIC_B);
        vm.expectRevert(notOwner);
        factory.create3UpgradeAndCall(proxy3.proxy, LOGIC_B_CREATION_CODE, CALLDATA_LOGIC_B);

        vm.stopPrank();
        vm.startPrank(getAddr(0));

        factory.createProxy(logicA, CALLDATA_LOGIC_A);
        factory.create2Proxy(logicA, CALLDATA_LOGIC_A, salt);
        factory.create3Proxy(logicA, CALLDATA_LOGIC_A, salt);

        factory.createProxyAndLogic(LOGIC_A_CREATION_CODE, CALLDATA_LOGIC_A);
        factory.create2ProxyAndLogic(LOGIC_A_CREATION_CODE, CALLDATA_LOGIC_A, bytes32("salty"));
        factory.create3ProxyAndLogic(LOGIC_A_CREATION_CODE, CALLDATA_LOGIC_A, bytes32("saltier"));

        factory.upgradeAndCall(proxy1.proxy, logicB, CALLDATA_LOGIC_B);
        factory.upgradeAndCallReturn(proxy1.proxy, logicB, CALLDATA_LOGIC_B);
        factory.create2UpgradeAndCall(proxy2.proxy, LOGIC_B_CREATION_CODE, CALLDATA_LOGIC_B);
        factory.create3UpgradeAndCall(proxy3.proxy, LOGIC_B_CREATION_CODE, CALLDATA_LOGIC_B);

        vm.stopPrank();
    }

    function testDeployKrAssetAndAnchor() public prankMnemonic(0) {
        address kresko = 0x7366d18831e535f3Ab0b804C01d454DaD72B4c36;
        address feeRecipient = 0xC4489F3A82079C5a7b0b610Fc85952B6E585E697;
        address admin = 0xFcbB93547B7C1936fEbfe56b4cEeD9Ab66dA1857;

        bytes memory krAssetImpl = type(KreskoAsset).creationCode;
        bytes memory krAssetInitializer = abi.encodeWithSelector(
            KreskoAsset.initialize.selector,
            "Ether",
            "krETH",
            18,
            admin,
            kresko,
            address(0),
            feeRecipient,
            0,
            0
        );

        bytes32 krAssetSalt = 0x6b72455448616b72455448000000000000000000000000000000000000000000;
        bytes32 anchorSalt = 0x616b724554486b72455448000000000000000000000000000000000000000000;

        (address predictedAddress, address predictedImpl) = factory.previewCreate2ProxyAndLogic(
            krAssetImpl,
            krAssetInitializer,
            krAssetSalt
        );

        bytes memory anchorImpl = abi.encodePacked(type(KreskoAssetAnchor).creationCode, abi.encode(predictedAddress));
        bytes memory anchorInitializer = abi.encodeWithSelector(
            KreskoAssetAnchor.initialize.selector,
            predictedAddress,
            "Kresko Asset Anchor: Ether",
            "akrETH",
            admin
        );

        (address predictedAnchorAddress, address predictedAnchorImpl) = factory.previewCreate2ProxyAndLogic(
            anchorImpl,
            anchorInitializer,
            anchorSalt
        );

        bytes[] memory assets = new bytes[](2);
        assets[0] = abi.encodeCall(factory.create2ProxyAndLogic, (krAssetImpl, krAssetInitializer, krAssetSalt));
        assets[1] = abi.encodeCall(factory.create2ProxyAndLogic, (anchorImpl, anchorInitializer, anchorSalt));

        Proxy[] memory proxies = factory.batch(assets).map(Conversions.toProxy);
        Proxy memory krAsset = proxies[0];
        Proxy memory anchor = proxies[1];

        address(krAsset.proxy).equals(predictedAddress);
        address(anchor.proxy).equals(predictedAnchorAddress);
        krAsset.implementation.equals(predictedImpl);
        anchor.implementation.equals(predictedAnchorImpl);
    }

    function _toArray(bytes memory call) internal pure returns (bytes[] memory calls) {
        calls = new bytes[](1);
        calls[0] = call;
    }
}
