// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {IKresko} from "periphery/IKresko.sol";

import {DiamondHelper} from "./DiamondHelper.sol";

import {Diamond} from "diamond/Diamond.sol";
import {DiamondCutFacet} from "diamond/facets/DiamondCutFacet.sol";
import {DiamondOwnershipFacet} from "diamond/facets/DiamondOwnershipFacet.sol";
import {DiamondLoupeFacet} from "diamond/facets/DiamondLoupeFacet.sol";
import {ERC165Facet} from "diamond/facets/ERC165Facet.sol";
import {FacetCut, Initialization, FacetCutAction} from "diamond/Types.sol";

import {FeedConfiguration, Asset, OracleType, CommonInitArgs} from "common/Types.sol";
import {MintFacet} from "minter/facets/MintFacet.sol";
import {BurnFacet} from "minter/facets/BurnFacet.sol";
import {DepositWithdrawFacet} from "minter/facets/DepositWithdrawFacet.sol";
import {AccountStateFacet} from "minter/facets/AccountStateFacet.sol";
import {AuthorizationFacet} from "common/facets/AuthorizationFacet.sol";
import {CommonConfigurationFacet} from "common/facets/CommonConfigurationFacet.sol";
import {AssetConfigurationFacet} from "common/facets/AssetConfigurationFacet.sol";
import {CommonStateFacet} from "common/facets/CommonStateFacet.sol";
import {SafetyCouncilFacet} from "common/facets/SafetyCouncilFacet.sol";
import {AssetStateFacet} from "common/facets/AssetStateFacet.sol";
import {StateFacet} from "minter/facets/StateFacet.sol";
import {LiquidationFacet} from "minter/facets/LiquidationFacet.sol";
import {ConfigurationFacet} from "minter/facets/ConfigurationFacet.sol";
import {MinterInitArgs} from "minter/Types.sol";

import {SCDPStateFacet} from "scdp/facets/SCDPStateFacet.sol";
import {SCDPFacet} from "scdp/facets/SCDPFacet.sol";
import {SCDPSwapFacet} from "scdp/facets/SCDPSwapFacet.sol";
import {SCDPConfigFacet} from "scdp/facets/SCDPConfigFacet.sol";
import {SDIFacet} from "scdp/facets/SDIFacet.sol";
import {SCDPInitArgs, PairSetter} from "scdp/Types.sol";
import {MockOracle} from "mocks/MockOracle.sol";
import {MockERC20} from "mocks/MockERC20.sol";

import {KreskoAsset} from "kresko-asset/KreskoAsset.sol";
import {KreskoAssetAnchor} from "kresko-asset/KreskoAssetAnchor.sol";
import {IKreskoAsset} from "kresko-asset/IKreskoAsset.sol";
import {RedstoneHelper} from "./RedstoneHelper.sol";
import "forge-std/Test.sol";

abstract contract DeployHelper is RedstoneHelper {
    address[] internal councilUsers;
    address public constant TREASURY = address(0xFEE);
    IKresko internal kresko;

    struct DeployParams {
        uint16 minterMcr;
        uint16 minterLt;
        uint16 scdpMcr;
        uint16 scdpLt;
        address admin;
        address seqFeed;
    }

    function getInitializer(address admin, address sequencerUptimeFeed) internal returns (CommonInitArgs memory init) {
        init.admin = admin;
        init.treasury = TREASURY;
        init.council = address(LibSafe.createSafe(admin));
        init.oracleDecimals = 8;
        init.minDebtValue = 10e8;
        init.oracleDeviationPct = 0.01e4;
        init.sequencerUptimeFeed = sequencerUptimeFeed;
        init.sequencerGracePeriodTime = 3600;
        init.oracleTimeout = type(uint32).max;
        init.phase = 3;
    }

    function getMinterInitializer(uint16 mcr, uint16 lt) internal pure returns (MinterInitArgs memory init) {
        init.minCollateralRatio = mcr;
        init.liquidationThreshold = lt;
    }

    function deployDiamond(DeployParams memory params) internal returns (IKresko) {
        FacetCut[] memory facets = new FacetCut[](22);
        Initialization[] memory initializers = new Initialization[](3);
        /* --------------------------------- Diamond -------------------------------- */
        diamondFacets(facets);
        /* --------------------------------- Common --------------------------------- */
        initializers[0] = commonFacets(params, facets);
        /* --------------------------------- Minter --------------------------------- */
        initializers[1] = minterFacets(params, facets);
        /* ---------------------------------- SCDP ---------------------------------- */
        initializers[2] = scdpFacets(params, facets);
        return (kresko = IKresko(address(new Diamond(params.admin, facets, initializers))));
    }

    function diamondFacets(FacetCut[] memory facets) internal returns (Initialization memory) {
        facets[0] = FacetCut({
            facetAddress: address(new DiamondCutFacet()),
            action: FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("DiamondCutFacet")
        });
        facets[1] = FacetCut({
            facetAddress: address(new DiamondOwnershipFacet()),
            action: FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("DiamondOwnershipFacet")
        });
        facets[2] = FacetCut({
            facetAddress: address(new DiamondLoupeFacet()),
            action: FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("DiamondLoupeFacet")
        });
        facets[3] = FacetCut({
            facetAddress: address(new ERC165Facet()),
            action: FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("ERC165Facet")
        });

        return Initialization({initContract: address(0), initData: ""});
    }

    function commonFacets(DeployParams memory params, FacetCut[] memory facets) internal returns (Initialization memory) {
        address configurationFacetAddress = address(new CommonConfigurationFacet());
        facets[4] = FacetCut({
            facetAddress: configurationFacetAddress,
            action: FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("CommonConfigurationFacet")
        });
        facets[5] = FacetCut({
            facetAddress: address(new AuthorizationFacet()),
            action: FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("AuthorizationFacet")
        });
        facets[6] = FacetCut({
            facetAddress: address(new CommonStateFacet()),
            action: FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("CommonStateFacet")
        });
        facets[7] = FacetCut({
            facetAddress: address(new AssetConfigurationFacet()),
            action: FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("AssetConfigurationFacet")
        });
        facets[8] = FacetCut({
            facetAddress: address(new AssetStateFacet()),
            action: FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("AssetStateFacet")
        });
        facets[9] = FacetCut({
            facetAddress: address(new SafetyCouncilFacet()),
            action: FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("SafetyCouncilFacet")
        });
        bytes memory initData = abi.encodeWithSelector(
            CommonConfigurationFacet.initializeCommon.selector,
            getInitializer(params.admin, params.seqFeed)
        );
        return Initialization({initContract: configurationFacetAddress, initData: initData});
    }

    function minterFacets(DeployParams memory params, FacetCut[] memory facets) internal returns (Initialization memory) {
        address configurationFacetAddress = address(new ConfigurationFacet());
        facets[10] = FacetCut({
            facetAddress: configurationFacetAddress,
            action: FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("ConfigurationFacet")
        });
        facets[11] = FacetCut({
            facetAddress: address(new MintFacet()),
            action: FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("MintFacet")
        });
        facets[12] = FacetCut({
            facetAddress: address(new BurnFacet()),
            action: FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("BurnFacet")
        });
        facets[13] = FacetCut({
            facetAddress: address(new StateFacet()),
            action: FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("StateFacet")
        });
        facets[14] = FacetCut({
            facetAddress: address(new DepositWithdrawFacet()),
            action: FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("DepositWithdrawFacet")
        });
        facets[15] = FacetCut({
            facetAddress: address(new AccountStateFacet()),
            action: FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("AccountStateFacet")
        });
        facets[16] = FacetCut({
            facetAddress: address(new LiquidationFacet()),
            action: FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("LiquidationFacet")
        });

        bytes memory initData = abi.encodeWithSelector(
            ConfigurationFacet.initializeMinter.selector,
            getMinterInitializer(params.minterMcr, params.minterLt)
        );
        return Initialization(configurationFacetAddress, initData);
    }

    function scdpFacets(DeployParams memory params, FacetCut[] memory facets) internal returns (Initialization memory) {
        address configurationFacetAddress = address(new SCDPConfigFacet());

        facets[17] = FacetCut({
            facetAddress: address(new SCDPFacet()),
            action: FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("SCDPFacet")
        });
        facets[18] = FacetCut({
            facetAddress: address(new SCDPStateFacet()),
            action: FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("SCDPStateFacet")
        });
        facets[19] = FacetCut({
            facetAddress: configurationFacetAddress,
            action: FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("SCDPConfigFacet")
        });
        facets[20] = FacetCut({
            facetAddress: address(new SCDPSwapFacet()),
            action: FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("SCDPSwapFacet")
        });
        facets[21] = FacetCut({
            facetAddress: address(new SDIFacet()),
            action: FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("SDIFacet")
        });
        bytes memory initData = abi.encodeWithSelector(
            SCDPConfigFacet.initializeSCDP.selector,
            SCDPInitArgs({swapFeeRecipient: TREASURY, minCollateralRatio: params.scdpMcr, liquidationThreshold: params.scdpLt})
        );
        return Initialization(configurationFacetAddress, initData);
    }

    function enableSwapBothWays(address asset0, address asset1, bool enabled) internal {
        PairSetter[] memory swapPairsEnabled = new PairSetter[](2);
        swapPairsEnabled[0] = PairSetter({assetIn: asset0, assetOut: asset1, enabled: enabled});
        kresko.setSwapPairs(swapPairsEnabled);
    }

    function enableSwapSingleWay(address asset0, address asset1, bool enabled) internal {
        kresko.setSwapPairsSingle(PairSetter({assetIn: asset0, assetOut: asset1, enabled: enabled}));
    }

    function deployAndWhitelistKrAsset(
        string memory _symbol,
        bytes32 redstoneId,
        address admin,
        uint256 price,
        bool asCollateral,
        bool asSCDPKrAsset,
        bool asSCDPDepositAsset
    ) internal returns (KreskoAsset krAsset, KreskoAssetAnchor anchor, MockOracle oracle) {
        krAsset = new KreskoAsset();
        krAsset.initialize(_symbol, _symbol, 18, admin, address(kresko));
        anchor = new KreskoAssetAnchor(IKreskoAsset(krAsset));
        anchor.initialize(IKreskoAsset(krAsset), string.concat("a", _symbol), string.concat("a", _symbol), admin);

        krAsset.grantRole(keccak256("kresko.roles.minter.operator"), address(anchor));
        oracle = new MockOracle(_symbol, price, 8);
        addInternalAsset(
            address(krAsset),
            address(anchor),
            address(oracle),
            redstoneId,
            asCollateral,
            asSCDPKrAsset,
            asSCDPDepositAsset
        );
        return (krAsset, anchor, oracle);
    }

    function deployAndAddCollateral(
        string memory id,
        bytes32 redstoneId,
        uint8 decimals,
        uint256 price,
        bool asSCDPDepositAsset
    ) internal returns (MockERC20 collateral, MockOracle oracle) {
        collateral = new MockERC20(id, id, decimals, 0);
        oracle = new MockOracle(id, price, 8);
        addExternalAsset(address(collateral), address(oracle), redstoneId, asSCDPDepositAsset);
        return (collateral, oracle);
    }

    function addExternalAsset(address asset, address oracle, bytes32 redstoneId, bool isSCDPDepositAsset) internal {
        OracleType[2] memory oracleTypes = [OracleType.Redstone, OracleType.Chainlink];
        FeedConfiguration memory feeds = FeedConfiguration(oracleTypes, [address(0), oracle]);
        Asset memory config = kresko.getAsset(asset);
        config.id = bytes12(redstoneId);
        config.factor = 1e4;
        config.liqIncentive = 1.1e4;
        config.isCollateral = true;
        config.oracles = oracleTypes;

        if (isSCDPDepositAsset) {
            config.isSCDPDepositAsset = true;
            config.isSCDPCollateral = true;
            config.liqIncentiveSCDP = 1.1e4;
            config.depositLimitSCDP = type(uint128).max;
        }
        kresko.addAsset(asset, config, feeds, true);
    }

    function addInternalAsset(
        address asset,
        address anchor,
        address oracle,
        bytes32 redstoneId,
        bool isCollateral,
        bool isSCDPKrAsset,
        bool isSCDPDepositAsset
    ) internal {
        OracleType[2] memory oracleTypes = [OracleType.Redstone, OracleType.Chainlink];
        FeedConfiguration memory feeds = FeedConfiguration(oracleTypes, [address(0), oracle]);
        Asset memory config;
        config.id = bytes12(redstoneId);
        config.kFactor = 1.2e4;
        config.liqIncentive = 1.1e4;
        config.isKrAsset = true;
        config.openFee = 0.02e4;
        config.closeFee = 0.02e4;
        config.anchor = anchor;
        config.oracles = oracleTypes;
        config.supplyLimit = type(uint128).max;

        if (isCollateral) {
            config.isCollateral = true;
            config.factor = 1e4;
            config.liqIncentive = 1.1e4;
        }

        if (isSCDPKrAsset) {
            config.isSCDPKrAsset = true;
            config.isSCDPCollateral = true;
            config.openFeeSCDP = 0.02e4;
            config.closeFeeSCDP = 0.02e4;
            config.protocolFeeSCDP = 0.25e4;
            config.liqIncentiveSCDP = 1.1e4;
        }

        if (isSCDPDepositAsset) {
            config.isSCDPDepositAsset = true;
            config.depositLimitSCDP = type(uint128).max;
        }

        kresko.addAsset(asset, config, feeds, true);
    }

    function whitelistCollateral(address asset) internal {
        Asset memory config = kresko.getAsset(asset);
        require(config.id != bytes32(0), "Asset does not exist");

        config.liqIncentive = 1.1e4;
        config.isCollateral = true;
        config.factor = 1e4;
        config.oracles = [OracleType.Redstone, OracleType.Chainlink];
        kresko.updateAsset(asset, config);
    }

    function staticCall(address target, bytes4 selector, string memory prices) public returns (uint256) {
        bytes memory redstonePayload = getRedstonePayload(prices);

        bytes memory encodedFunction = abi.encodeWithSelector(selector);
        (bool success, bytes memory data) = address(target).staticcall(abi.encodePacked(encodedFunction, redstonePayload));
        require(success, _getRevertMsg(data));
        return abi.decode(data, (uint256));
    }

    function staticCall(bytes4 selector, string memory prices) public returns (uint256) {
        bytes memory redstonePayload = getRedstonePayload(prices);

        bytes memory encodedFunction = abi.encodeWithSelector(selector);
        (bool success, bytes memory data) = address(kresko).staticcall(abi.encodePacked(encodedFunction, redstonePayload));
        require(success, _getRevertMsg(data));
        return abi.decode(data, (uint256));
    }

    function staticCall(bytes4 selector, address param1, address param2, string memory prices) public returns (uint256) {
        bytes memory redstonePayload = getRedstonePayload(prices);

        bytes memory encodedFunction = abi.encodeWithSelector(selector, param1, param2);
        (bool success, bytes memory data) = address(kresko).staticcall(abi.encodePacked(encodedFunction, redstonePayload));
        require(success, _getRevertMsg(data));
        return abi.decode(data, (uint256));
    }

    function staticCall(bytes4 selector, bool param1, string memory prices) public returns (uint256) {
        bytes memory redstonePayload = getRedstonePayload(prices);

        bytes memory encodedFunction = abi.encodeWithSelector(selector, param1);
        (bool success, bytes memory data) = address(kresko).staticcall(abi.encodePacked(encodedFunction, redstonePayload));
        require(success, _getRevertMsg(data));
        return abi.decode(data, (uint256));
    }

    function staticCall(bytes4 selector, address param1, bool param2, string memory prices) public returns (uint256) {
        bytes memory redstonePayload = getRedstonePayload(prices);

        bytes memory encodedFunction = abi.encodeWithSelector(selector, param1, param2);
        (bool success, bytes memory data) = address(kresko).staticcall(abi.encodePacked(encodedFunction, redstonePayload));
        require(success, _getRevertMsg(data));
        return abi.decode(data, (uint256));
    }

    function staticCall(bytes4 selector, address param1, string memory prices) public returns (uint256) {
        bytes memory redstonePayload = getRedstonePayload(prices);

        bytes memory encodedFunction = abi.encodeWithSelector(selector, param1);
        (bool success, bytes memory data) = address(kresko).staticcall(abi.encodePacked(encodedFunction, redstonePayload));
        require(success, _getRevertMsg(data));
        return abi.decode(data, (uint256));
    }

    function call(bytes4 selector, address param1, uint256 param2, string memory prices) public {
        bytes memory redstonePayload = getRedstonePayload(prices);
        bytes memory encodedFunction = abi.encodeWithSelector(selector, param1, param2);
        (bool success, bytes memory data) = address(kresko).call(abi.encodePacked(encodedFunction, redstonePayload));
        require(success, _getRevertMsg(data));
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

contract GnosisSafeL2Mock {
    function setup(
        address[] memory _owners,
        uint256 _threshold,
        address _to,
        bytes memory _data,
        address _fallbackHandler,
        address _paymentToken,
        uint256 _payment
    ) public {}

    function isOwner(address) external pure returns (bool) {
        return true;
    }

    function getOwners() external pure returns (address[] memory) {
        address[] memory owners = new address[](6);
        owners[0] = address(0x0);
        owners[1] = address(0x011);
        owners[2] = address(0x022);
        owners[3] = address(0x033);
        owners[4] = address(0x044);
        owners[5] = address(0x055);
        return owners;
    }
}

library LibSafe {
    address public constant USER1 = address(0x011);
    address public constant USER2 = address(0x022);
    address public constant USER3 = address(0x033);
    address public constant USER4 = address(0x044);

    function createSafe(address admin) internal returns (GnosisSafeL2Mock) {
        return new GnosisSafeL2Mock();
    }
    //     GnosisSafeL2 masterCopy = new GnosisSafeL2();
    //     GnosisSafeProxyFactory proxyFactory = new GnosisSafeProxy();
    //     address[] memory councilUsers = new address[](5);
    //     councilUsers[0] = (admin);
    //     councilUsers[1] = (USER1);
    //     councilUsers[2] = (USER2);
    //     councilUsers[3] = (USER3);
    //     councilUsers[4] = (USER4);

    //     return
    //         proxyFactory.createProxy(
    //             address(masterCopy),
    //             abi.encodeWithSelector(
    //                 masterCopy.setup.selector,
    //                 councilUsers,
    //                 3,
    //                 address(0),
    //                 "0x",
    //                 address(0),
    //                 address(0),
    //                 0,
    //                 admin
    //             )
    //         );
    // }
}
