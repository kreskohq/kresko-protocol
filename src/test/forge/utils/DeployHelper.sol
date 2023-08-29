// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {Diamond} from "diamond/Diamond.sol";
import {IDiamondCutFacet} from "diamond/interfaces/IDiamondCutFacet.sol";
import {DiamondCutFacet} from "diamond/facets/DiamondCutFacet.sol";
import {DiamondOwnershipFacet} from "diamond/facets/DiamondOwnershipFacet.sol";
import {DiamondLoupeFacet} from "diamond/facets/DiamondLoupeFacet.sol";
import {AuthorizationFacet} from "diamond/facets/AuthorizationFacet.sol";
import {ERC165Facet} from "diamond/facets/ERC165Facet.sol";

import {MintFacet} from "minter/facets/MintFacet.sol";
import {BurnFacet} from "minter/facets/BurnFacet.sol";
import {DepositWithdrawFacet} from "minter/facets/DepositWithdrawFacet.sol";
import {AccountStateFacet} from "minter/facets/AccountStateFacet.sol";
import {StateFacet} from "minter/facets/StateFacet.sol";
import {LiquidationFacet} from "minter/facets/LiquidationFacet.sol";
import {ConfigurationFacet} from "minter/facets/ConfigurationFacet.sol";
import {SafetyCouncilFacet} from "minter/facets/SafetyCouncilFacet.sol";
import {BurnHelperFacet} from "minter/facets/BurnHelperFacet.sol";

import {SCDPStateFacet} from "scdp/facets/SCDPStateFacet.sol";
import {SCDPFacet} from "scdp/facets/SCDPFacet.sol";
import {SCDPSwapFacet} from "scdp/facets/SCDPSwapFacet.sol";
import {SCDPConfigFacet} from "scdp/facets/SCDPConfigFacet.sol";
import {ISCDPConfigFacet} from "scdp/interfaces/ISCDPConfigFacet.sol";
import {PoolCollateral, PoolKrAsset} from "scdp/SCDPStorage.sol";

import {DiamondHelper} from "./DiamondHelper.sol";
import {IKresko} from "common/IKresko.sol";
import {MockOracle} from "test/MockOracle.sol";
import {MockERC20} from "test/MockERC20.sol";
import {AggregatorV3Interface} from "common/AggregatorV3Interface.sol";
import {MinterInitArgs, KrAsset, CollateralAsset} from "minter/MinterTypes.sol";

import {GnosisSafeL2} from "vendor/gnosis/GnosisSafeL2.sol";
import {GnosisSafeProxyFactory, GnosisSafeProxy} from "vendor/gnosis/GnosisSafeProxyFactory.sol";

import {KreskoAsset} from "kresko-asset/KreskoAsset.sol";
import {KreskoAssetAnchor} from "kresko-asset/KreskoAssetAnchor.sol";
import {IKreskoAsset} from "kresko-asset/IKreskoAsset.sol";
import {Test} from "forge-std/Test.sol";

import {SDI, Asset} from "scdp/SDI/SDI.sol";

import {RedstoneHelper} from "./RedstoneHelper.sol";

abstract contract DeployHelper is RedstoneHelper {
    address[] internal councilUsers;
    address public constant TREASURY = address(0xFEE);
    IKresko internal kresko;

    function getInitializer(address admin, address sequencerUptimeFeed) internal returns (MinterInitArgs memory init) {
        init.admin = admin;
        init.treasury = TREASURY;
        init.council = address(LibSafe.createSafe(admin));
        init.extOracleDecimals = 8;
        init.minimumCollateralizationRatio = 1.5e18;
        init.minimumDebtValue = 10e8;
        init.liquidationThreshold = 1.4e18;
        init.oracleDeviationPct = 0.01e18;
        init.sequencerUptimeFeed = sequencerUptimeFeed;
        init.sequencerGracePeriodTime = 3600;
        init.oracleTimeout = type(uint256).max;
    }

    function deployDiamond(address admin, address sequencerUptimeFeed) internal returns (IKresko, SDI) {
        /* ------------------------------ DiamondFacets ----------------------------- */
        (
            IDiamondCutFacet.FacetCut[] memory _diamondFacets,
            Diamond.Initialization[] memory diamondInit
        ) = diamondFacets();

        kresko = IKresko(address(new Diamond(admin, _diamondFacets, diamondInit)));

        /* ------------------------------ MinterFacets ------------------------------ */
        (IDiamondCutFacet.FacetCut[] memory _minterFacets, Diamond.Initialization memory minterInit) = minterFacets(
            admin,
            sequencerUptimeFeed
        );
        kresko.diamondCut(_minterFacets, minterInit.initContract, minterInit.initData);

        /* ------------------------------- SCDPFacets ------------------------------- */
        SDI sdi = deploySDI();

        (IDiamondCutFacet.FacetCut[] memory _scdpFacets, Diamond.Initialization memory scdpInit) = scdpFacets(
            address(sdi)
        );
        kresko.diamondCut(_scdpFacets, scdpInit.initContract, scdpInit.initData);

        return (kresko, sdi);
    }

    function deploySDI() internal returns (SDI sdi) {
        sdi = new SDI(address(kresko), TREASURY, 8, kresko.owner());
    }

    function addSDIAsset(SDI sdi, Asset memory config) internal {
        sdi.addAsset(config);
    }

    function diamondFacets() internal returns (IDiamondCutFacet.FacetCut[] memory, Diamond.Initialization[] memory) {
        IDiamondCutFacet.FacetCut[] memory _diamondCut = new IDiamondCutFacet.FacetCut[](5);
        _diamondCut[0] = IDiamondCutFacet.FacetCut({
            facetAddress: address(new DiamondCutFacet()),
            action: IDiamondCutFacet.FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("DiamondCutFacet")
        });
        _diamondCut[1] = IDiamondCutFacet.FacetCut({
            facetAddress: address(new DiamondOwnershipFacet()),
            action: IDiamondCutFacet.FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("DiamondOwnershipFacet")
        });
        _diamondCut[2] = IDiamondCutFacet.FacetCut({
            facetAddress: address(new DiamondLoupeFacet()),
            action: IDiamondCutFacet.FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("DiamondLoupeFacet")
        });
        _diamondCut[3] = IDiamondCutFacet.FacetCut({
            facetAddress: address(new AuthorizationFacet()),
            action: IDiamondCutFacet.FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("AuthorizationFacet")
        });
        _diamondCut[4] = IDiamondCutFacet.FacetCut({
            facetAddress: address(new ERC165Facet()),
            action: IDiamondCutFacet.FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("ERC165Facet")
        });

        Diamond.Initialization[] memory diamondInit = new Diamond.Initialization[](1);
        diamondInit[0] = Diamond.Initialization({initContract: address(0), initData: ""});
        return (_diamondCut, diamondInit);
    }

    function minterFacets(
        address admin,
        address sequencerUptimeFeed
    ) internal returns (IDiamondCutFacet.FacetCut[] memory, Diamond.Initialization memory) {
        address configurationFacetAddress = address(new ConfigurationFacet());
        IDiamondCutFacet.FacetCut[] memory _diamondCut = new IDiamondCutFacet.FacetCut[](9);
        _diamondCut[0] = IDiamondCutFacet.FacetCut({
            facetAddress: address(new MintFacet()),
            action: IDiamondCutFacet.FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("MintFacet")
        });
        _diamondCut[1] = IDiamondCutFacet.FacetCut({
            facetAddress: address(new BurnFacet()),
            action: IDiamondCutFacet.FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("BurnFacet")
        });
        _diamondCut[2] = IDiamondCutFacet.FacetCut({
            facetAddress: address(new StateFacet()),
            action: IDiamondCutFacet.FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("StateFacet")
        });
        _diamondCut[3] = IDiamondCutFacet.FacetCut({
            facetAddress: configurationFacetAddress,
            action: IDiamondCutFacet.FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("ConfigurationFacet")
        });
        _diamondCut[4] = IDiamondCutFacet.FacetCut({
            facetAddress: address(new DepositWithdrawFacet()),
            action: IDiamondCutFacet.FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("DepositWithdrawFacet")
        });
        _diamondCut[5] = IDiamondCutFacet.FacetCut({
            facetAddress: address(new BurnHelperFacet()),
            action: IDiamondCutFacet.FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("BurnHelperFacet")
        });
        _diamondCut[6] = IDiamondCutFacet.FacetCut({
            facetAddress: address(new AccountStateFacet()),
            action: IDiamondCutFacet.FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("AccountStateFacet")
        });
        _diamondCut[7] = IDiamondCutFacet.FacetCut({
            facetAddress: address(new LiquidationFacet()),
            action: IDiamondCutFacet.FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("LiquidationFacet")
        });
        _diamondCut[8] = IDiamondCutFacet.FacetCut({
            facetAddress: address(new SafetyCouncilFacet()),
            action: IDiamondCutFacet.FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("SafetyCouncilFacet")
        });

        bytes memory initData = abi.encodeWithSelector(
            ConfigurationFacet.initialize.selector,
            getInitializer(admin, sequencerUptimeFeed)
        );
        return (_diamondCut, Diamond.Initialization(configurationFacetAddress, initData));
    }

    function scdpFacets(
        address sdi
    ) internal returns (IDiamondCutFacet.FacetCut[] memory, Diamond.Initialization memory) {
        address configurationFacetAddress = address(new SCDPConfigFacet());
        IDiamondCutFacet.FacetCut[] memory _diamondCut = new IDiamondCutFacet.FacetCut[](4);
        _diamondCut[0] = IDiamondCutFacet.FacetCut({
            facetAddress: address(new SCDPFacet()),
            action: IDiamondCutFacet.FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("SCDPFacet")
        });
        _diamondCut[1] = IDiamondCutFacet.FacetCut({
            facetAddress: address(new SCDPStateFacet()),
            action: IDiamondCutFacet.FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("SCDPStateFacet")
        });
        _diamondCut[2] = IDiamondCutFacet.FacetCut({
            facetAddress: configurationFacetAddress,
            action: IDiamondCutFacet.FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("SCDPConfigFacet")
        });
        _diamondCut[3] = IDiamondCutFacet.FacetCut({
            facetAddress: address(new SCDPSwapFacet()),
            action: IDiamondCutFacet.FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("SCDPSwapFacet")
        });

        bytes memory initData = abi.encodeWithSelector(
            SCDPConfigFacet.initialize.selector,
            ISCDPConfigFacet.SCDPInitArgs({swapFeeRecipient: TREASURY, mcr: 2e18, lt: 1.5e18, sdi: sdi})
        );
        return (_diamondCut, Diamond.Initialization(configurationFacetAddress, initData));
    }

    function enableSCDPCollateral(address asset, string memory prices) internal {
        PoolCollateral[] memory configurations = new PoolCollateral[](1);
        configurations[0] = PoolCollateral({
            decimals: MockERC20(asset).decimals(),
            liquidationIncentive: 1.1e18,
            depositLimit: type(uint256).max,
            liquidityIndex: 1e27
        });
        address[] memory assets = new address[](1);
        assets[0] = asset;

        bytes memory redstonePayload = getRedstonePayload(prices);
        (bool success, bytes memory data) = address(kresko).call(
            abi.encodePacked(
                abi.encodeWithSelector(kresko.enablePoolCollaterals.selector, assets, configurations),
                redstonePayload
            )
        );
        require(success, _getRevertMsg(data));
    }

    function enableSCDPKrAsset(address asset, string memory prices) internal {
        PoolKrAsset[] memory configurations = new PoolKrAsset[](1);
        configurations[0] = PoolKrAsset({
            protocolFee: 0.5e18,
            openFee: 0.005e18,
            closeFee: 0.005e18,
            supplyLimit: type(uint256).max
        });
        address[] memory assets = new address[](1);
        assets[0] = asset;

        bytes memory redstonePayload = getRedstonePayload(prices);
        (bool success, bytes memory data) = address(kresko).call(
            abi.encodePacked(
                abi.encodeWithSelector(kresko.enablePoolKrAssets.selector, assets, configurations),
                redstonePayload
            )
        );
        require(success, _getRevertMsg(data));
    }

    function enableSwapBothWays(address asset0, address asset1, bool enabled) internal {
        ISCDPConfigFacet.PairSetter[] memory swapPairsEnabled = new ISCDPConfigFacet.PairSetter[](2);
        swapPairsEnabled[0] = ISCDPConfigFacet.PairSetter({assetIn: asset0, assetOut: asset1, enabled: enabled});
        kresko.setSwapPairs(swapPairsEnabled);
    }

    function enableSwapSingleWay(address asset0, address asset1, bool enabled) internal {
        kresko.setSwapPairsSingle(ISCDPConfigFacet.PairSetter({assetIn: asset0, assetOut: asset1, enabled: enabled}));
    }

    function deployAndWhitelistKrAsset(
        string memory _symbol,
        bytes32 redstoneId,
        address admin,
        uint256 price
    ) internal returns (KreskoAsset krAsset, KreskoAssetAnchor anchor, MockOracle oracle) {
        krAsset = new KreskoAsset();
        krAsset.initialize(_symbol, _symbol, 18, admin, address(kresko));
        anchor = new KreskoAssetAnchor(IKreskoAsset(krAsset));
        anchor.initialize(IKreskoAsset(krAsset), string.concat("a", _symbol), string.concat("a", _symbol), admin);

        krAsset.grantRole(keccak256("kresko.roles.minter.operator"), address(anchor));
        kresko.addKreskoAsset(
            address(krAsset),
            KrAsset({
                supplyLimit: type(uint256).max,
                closeFee: 0.02e18,
                openFee: 0,
                exists: true,
                redstoneId: redstoneId,
                anchor: address(anchor),
                oracle: AggregatorV3Interface(address(oracle = new MockOracle(price, 8))),
                kFactor: 1.2e18
            })
        );
        return (krAsset, anchor, oracle);
    }

    function deployAndWhitelistCollateral(
        string memory id,
        bytes32 redstoneId,
        uint8 decimals,
        uint256 price
    ) internal returns (MockERC20 collateral, MockOracle oracle) {
        collateral = new MockERC20(id, id, decimals, 0);

        kresko.addCollateralAsset(
            address(collateral),
            CollateralAsset({
                exists: true,
                redstoneId: redstoneId,
                anchor: address(0),
                oracle: AggregatorV3Interface(address(oracle = new MockOracle(price, 8))),
                factor: 1e18,
                decimals: decimals,
                liquidationIncentive: 1.1e18
            })
        );
        return (collateral, oracle);
    }

    function whitelistCollateral(address collateral, address anchor, address oracle, bytes32 redstoneId) internal {
        kresko.addCollateralAsset(
            collateral,
            CollateralAsset({
                exists: true,
                redstoneId: redstoneId,
                anchor: anchor,
                oracle: AggregatorV3Interface(oracle),
                factor: 1e18,
                decimals: MockERC20(collateral).decimals(),
                liquidationIncentive: 1.1e18
            })
        );
    }

    function staticCall(address target, bytes4 selector, string memory prices) public returns (uint256) {
        bytes memory redstonePayload = getRedstonePayload(prices);

        bytes memory encodedFunction = abi.encodeWithSelector(selector);
        (bool success, bytes memory data) = address(target).staticcall(
            abi.encodePacked(encodedFunction, redstonePayload)
        );
        require(success, _getRevertMsg(data));
        return abi.decode(data, (uint256));
    }

    function staticCall(bytes4 selector, string memory prices) public returns (uint256) {
        bytes memory redstonePayload = getRedstonePayload(prices);

        bytes memory encodedFunction = abi.encodeWithSelector(selector);
        (bool success, bytes memory data) = address(kresko).staticcall(
            abi.encodePacked(encodedFunction, redstonePayload)
        );
        require(success, _getRevertMsg(data));
        return abi.decode(data, (uint256));
    }

    function staticCall(
        bytes4 selector,
        address param1,
        address param2,
        string memory prices
    ) public returns (uint256) {
        bytes memory redstonePayload = getRedstonePayload(prices);

        bytes memory encodedFunction = abi.encodeWithSelector(selector, param1, param2);
        (bool success, bytes memory data) = address(kresko).staticcall(
            abi.encodePacked(encodedFunction, redstonePayload)
        );
        require(success, _getRevertMsg(data));
        return abi.decode(data, (uint256));
    }

    function staticCall(bytes4 selector, bool param1, string memory prices) public returns (uint256) {
        bytes memory redstonePayload = getRedstonePayload(prices);

        bytes memory encodedFunction = abi.encodeWithSelector(selector, param1);
        (bool success, bytes memory data) = address(kresko).staticcall(
            abi.encodePacked(encodedFunction, redstonePayload)
        );
        require(success, _getRevertMsg(data));
        return abi.decode(data, (uint256));
    }

    function staticCall(bytes4 selector, address param1, bool param2, string memory prices) public returns (uint256) {
        bytes memory redstonePayload = getRedstonePayload(prices);

        bytes memory encodedFunction = abi.encodeWithSelector(selector, param1, param2);
        (bool success, bytes memory data) = address(kresko).staticcall(
            abi.encodePacked(encodedFunction, redstonePayload)
        );
        require(success, _getRevertMsg(data));
        return abi.decode(data, (uint256));
    }

    function staticCall(bytes4 selector, address param1, string memory prices) public returns (uint256) {
        bytes memory redstonePayload = getRedstonePayload(prices);

        bytes memory encodedFunction = abi.encodeWithSelector(selector, param1);
        (bool success, bytes memory data) = address(kresko).staticcall(
            abi.encodePacked(encodedFunction, redstonePayload)
        );
        require(success, _getRevertMsg(data));
        return abi.decode(data, (uint256));
    }

    function call(bytes4 selector, address param1, address param2, uint256 param3, string memory prices) public {
        bytes memory redstonePayload = getRedstonePayload(prices);

        bytes memory encodedFunction = abi.encodeWithSelector(selector, param1, param2, param3);
        (bool success, bytes memory data) = address(kresko).call(abi.encodePacked(encodedFunction, redstonePayload));
        require(success, _getRevertMsg(data));
    }

    function call(address target, bytes memory encodedFunction, string memory prices) public {
        bytes memory redstonePayload = getRedstonePayload(prices);

        (bool success, bytes memory data) = address(target).call(abi.encodePacked(encodedFunction, redstonePayload));
        require(success, _getRevertMsg(data));
    }

    function call(
        bytes4 selector,
        address param1,
        address param2,
        address param3,
        uint256 param4,
        uint256 param5,
        string memory prices
    ) public {
        bytes memory redstonePayload = getRedstonePayload(prices);

        bytes memory encodedFunction = abi.encodeWithSelector(selector, param1, param2, param3, param4, param5);
        (bool success, bytes memory data) = address(kresko).call(abi.encodePacked(encodedFunction, redstonePayload));
        require(success, _getRevertMsg(data));
    }

    function call(
        bytes4 selector,
        address param1,
        address param2,
        uint256 param3,
        uint256 param4,
        string memory prices
    ) public {
        bytes memory redstonePayload = getRedstonePayload(prices);

        bytes memory encodedFunction = abi.encodeWithSelector(selector, param1, param2, param3, param4);
        (bool success, bytes memory data) = address(kresko).call(abi.encodePacked(encodedFunction, redstonePayload));
        require(success, _getRevertMsg(data));
    }

    function _getRevertMsg(bytes memory _returnData) internal pure returns (string memory) {
        // If the _res length is less than 68, then the transaction failed silently (without a revert message)
        if (_returnData.length < 68) return "Transaction reverted silently";

        assembly {
            // Slice the sighash.
            _returnData := add(_returnData, 0x04)
        }
        return abi.decode(_returnData, (string)); // All that remains is the revert string
    }
}

library LibSafe {
    address public constant USER1 = address(0x011);
    address public constant USER2 = address(0x022);
    address public constant USER3 = address(0x033);
    address public constant USER4 = address(0x044);

    function createSafe(address admin) internal returns (GnosisSafeProxy) {
        GnosisSafeL2 masterCopy = new GnosisSafeL2();
        GnosisSafeProxyFactory proxyFactory = new GnosisSafeProxyFactory();
        address[] memory councilUsers = new address[](5);
        councilUsers[0] = (admin);
        councilUsers[1] = (USER1);
        councilUsers[2] = (USER2);
        councilUsers[3] = (USER3);
        councilUsers[4] = (USER4);

        return
            proxyFactory.createProxy(
                address(masterCopy),
                abi.encodeWithSelector(
                    masterCopy.setup.selector,
                    councilUsers,
                    3,
                    address(0),
                    "0x",
                    address(0),
                    address(0),
                    0,
                    admin
                )
            );
    }
}
