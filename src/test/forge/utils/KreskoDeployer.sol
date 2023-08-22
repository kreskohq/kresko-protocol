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
import {MockSequencerUptimeFeed} from "test/MockSequencerUptimeFeed.sol";
import {GnosisSafeL2} from "vendor/gnosis/GnosisSafeL2.sol";
import {GnosisSafeProxyFactory, GnosisSafeProxy} from "vendor/gnosis/GnosisSafeProxyFactory.sol";

import {KreskoAsset} from "kresko-asset/KreskoAsset.sol";
import {KreskoAssetAnchor} from "kresko-asset/KreskoAssetAnchor.sol";
import {IKreskoAsset} from "kresko-asset/IKreskoAsset.sol";
import {Test} from "forge-std/Test.sol";

import {SDI, Asset} from "scdp/SDI/SDI.sol";

abstract contract KreskoDeployer is Test {
    address[] internal councilUsers;
    address public constant TREASURY = address(0xFEE);

    function getInitializer(address admin) internal returns (MinterInitArgs memory init) {
        init.admin = admin;
        init.treasury = TREASURY;
        init.council = address(LibSafe.createSafe(admin));
        init.extOracleDecimals = 8;
        init.minimumCollateralizationRatio = 1.5e18;
        init.minimumDebtValue = 10e8;
        init.liquidationThreshold = 1.4e18;
        init.oracleDeviationPct = 0.01e18;
        init.sequencerUptimeFeed = address(new MockSequencerUptimeFeed());
        init.sequencerGracePeriodTime = 3600;
        init.oracleTimeout = type(uint256).max;
    }

    function deployDiamond(address admin) internal returns (IKresko, SDI) {
        vm.startPrank(admin);
        /* ------------------------------ DiamondFacets ----------------------------- */
        (
            IDiamondCutFacet.FacetCut[] memory _diamondFacets,
            Diamond.Initialization[] memory diamondInit
        ) = diamondFacets();

        IKresko kresko = IKresko(address(new Diamond(admin, _diamondFacets, diamondInit)));

        /* ------------------------------ MinterFacets ------------------------------ */
        (IDiamondCutFacet.FacetCut[] memory _minterFacets, Diamond.Initialization memory minterInit) = minterFacets(
            admin
        );
        kresko.diamondCut(_minterFacets, minterInit.initContract, minterInit.initData);

        /* ------------------------------- SCDPFacets ------------------------------- */
        vm.stopPrank();
        SDI sdi = deploySDI(address(kresko));
        vm.startPrank(admin);
        (IDiamondCutFacet.FacetCut[] memory _scdpFacets, Diamond.Initialization memory scdpInit) = scdpFacets(
            address(sdi)
        );
        kresko.diamondCut(_scdpFacets, scdpInit.initContract, scdpInit.initData);
        vm.stopPrank();

        return (kresko, sdi);
    }

    function deploySDI(address kresko) internal returns (SDI sdi) {
        vm.startPrank(IKresko(kresko).owner());
        sdi = new SDI(kresko, TREASURY, 8, IKresko(kresko).owner());
        vm.stopPrank();
    }

    function addSDIAsset(SDI sdi, address kresko, Asset memory config) internal {
        vm.startPrank(IKresko(kresko).owner());
        sdi.addAsset(config);
        vm.stopPrank();
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
        address admin
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

        bytes memory initData = abi.encodeWithSelector(ConfigurationFacet.initialize.selector, getInitializer(admin));
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

    function enableSCDPCollateral(IKresko kresko, address asset) internal {
        vm.startPrank(kresko.owner());
        PoolCollateral[] memory configurations = new PoolCollateral[](1);
        configurations[0] = PoolCollateral({
            decimals: MockERC20(asset).decimals(),
            liquidationIncentive: 1.1e18,
            depositLimit: type(uint256).max,
            liquidityIndex: 1e27
        });
        address[] memory assets = new address[](1);
        assets[0] = asset;

        kresko.enablePoolCollaterals(assets, configurations);
        vm.stopPrank();
    }

    function enableSCDPKrAsset(IKresko kresko, address asset) internal {
        vm.startPrank(kresko.owner());
        PoolKrAsset[] memory configurations = new PoolKrAsset[](1);
        configurations[0] = PoolKrAsset({
            protocolFee: 0.5e18,
            openFee: 0.005e18,
            closeFee: 0.005e18,
            supplyLimit: type(uint256).max
        });
        address[] memory assets = new address[](1);
        assets[0] = asset;

        kresko.enablePoolKrAssets(assets, configurations);
        vm.stopPrank();
    }

    function enableSwapBothWays(IKresko kresko, address asset0, address asset1, bool enabled) internal {
        vm.startPrank(kresko.owner());
        ISCDPConfigFacet.PairSetter[] memory swapPairsEnabled = new ISCDPConfigFacet.PairSetter[](2);
        swapPairsEnabled[0] = ISCDPConfigFacet.PairSetter({assetIn: asset0, assetOut: asset1, enabled: enabled});
        kresko.setSwapPairs(swapPairsEnabled);
        vm.stopPrank();
    }

    function enableSwapSingleWay(IKresko kresko, address asset0, address asset1, bool enabled) internal {
        vm.startPrank(kresko.owner());
        kresko.setSwapPairsSingle(ISCDPConfigFacet.PairSetter({assetIn: asset0, assetOut: asset1, enabled: enabled}));
        vm.stopPrank();
    }

    function deployAndWhitelistKrAsset(
        string memory _symbol,
        address admin,
        address kresko,
        uint256 price
    ) internal returns (KreskoAsset krAsset, KreskoAssetAnchor anchor, MockOracle oracle) {
        vm.startPrank(IKresko(kresko).owner());
        krAsset = new KreskoAsset();
        krAsset.initialize(_symbol, _symbol, 18, admin, kresko);
        anchor = new KreskoAssetAnchor(IKreskoAsset(krAsset));
        anchor.initialize(IKreskoAsset(krAsset), string.concat("a", _symbol), string.concat("a", _symbol), admin);
        oracle = new MockOracle(price, 8);
        AggregatorV3Interface assetOracle = AggregatorV3Interface(address(oracle));

        IKresko(kresko).addKreskoAsset(
            address(krAsset),
            KrAsset({
                supplyLimit: type(uint256).max,
                closeFee: 0.02e18,
                openFee: 0,
                exists: true,
                redstoneId: bytes32(0),
                anchor: address(anchor),
                oracle: assetOracle,
                kFactor: 1.2e18
            })
        );
        vm.stopPrank();
        return (krAsset, anchor, oracle);
    }

    function deployAndWhitelistCollateral(
        string memory id,
        uint8 decimals,
        address kresko,
        uint256 price
    ) internal returns (MockERC20 collateral, MockOracle oracle) {
        vm.startPrank(IKresko(kresko).owner());
        collateral = new MockERC20(id, id, decimals, 0);
        oracle = new MockOracle(price, 8);

        AggregatorV3Interface assetOracle = AggregatorV3Interface(address(oracle));

        IKresko(kresko).addCollateralAsset(
            address(collateral),
            CollateralAsset({
                exists: true,
                redstoneId: bytes32(0),
                anchor: address(0),
                oracle: assetOracle,
                factor: 1e18,
                decimals: decimals,
                liquidationIncentive: 1.1e18
            })
        );
        vm.stopPrank();
        return (collateral, oracle);
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
