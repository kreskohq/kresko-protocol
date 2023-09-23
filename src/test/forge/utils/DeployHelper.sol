// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;
import {AggregatorV3Interface} from "vendor/AggregatorV3Interface.sol";

import {IKresko} from "periphery/IKresko.sol";

import {DiamondHelper} from "./DiamondHelper.sol";

import {Diamond} from "diamond/Diamond.sol";
import {DiamondCutFacet} from "diamond/facets/DiamondCutFacet.sol";
import {DiamondOwnershipFacet} from "diamond/facets/DiamondOwnershipFacet.sol";
import {DiamondLoupeFacet} from "diamond/facets/DiamondLoupeFacet.sol";
import {AuthorizationFacet} from "diamond/facets/AuthorizationFacet.sol";
import {ERC165Facet} from "diamond/facets/ERC165Facet.sol";
import {FacetCut, Initialization, FacetCutAction} from "diamond/Types.sol";

import {MintFacet} from "minter/facets/MintFacet.sol";
import {BurnFacet} from "minter/facets/BurnFacet.sol";
import {DepositWithdrawFacet} from "minter/facets/DepositWithdrawFacet.sol";
import {AccountStateFacet} from "minter/facets/AccountStateFacet.sol";
import {StateFacet} from "minter/facets/StateFacet.sol";
import {LiquidationFacet} from "minter/facets/LiquidationFacet.sol";
import {ConfigurationFacet} from "minter/facets/ConfigurationFacet.sol";
import {SafetyCouncilFacet} from "minter/facets/SafetyCouncilFacet.sol";
import {MinterInitArgs, KrAsset, CollateralAsset} from "minter/Types.sol";

import {SCDPStateFacet} from "scdp/facets/SCDPStateFacet.sol";
import {SCDPFacet} from "scdp/facets/SCDPFacet.sol";
import {SCDPSwapFacet} from "scdp/facets/SCDPSwapFacet.sol";
import {SCDPConfigFacet} from "scdp/facets/SCDPConfigFacet.sol";
import {SDIFacet} from "scdp/facets/SDIFacet.sol";
import {SCDPInitArgs, SCDPCollateral, SCDPKrAsset, PairSetter} from "scdp/Types.sol";
import {OracleConfiguration, OracleType} from "oracle/Types.sol";
import {OracleConfigFacet} from "oracle/facets/OracleConfigFacet.sol";
import {OracleViewFacet} from "oracle/facets/OracleViewFacet.sol";
import {MockOracle} from "mocks/MockOracle.sol";
import {MockERC20} from "mocks/MockERC20.sol";

import {KreskoAsset} from "kresko-asset/KreskoAsset.sol";
import {KreskoAssetAnchor} from "kresko-asset/KreskoAssetAnchor.sol";
import {IKreskoAsset} from "kresko-asset/IKreskoAsset.sol";
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
        init.minCollateralRatio = 1.5e18;
        init.minDebtValue = 10e8;
        init.liquidationThreshold = 1.4e18;
        init.oracleDeviationPct = 0.01e18;
        init.sequencerUptimeFeed = sequencerUptimeFeed;
        init.sequencerGracePeriodTime = 3600;
        init.oracleTimeout = type(uint256).max;
    }

    function deployDiamond(address admin, address seqFeed) internal returns (IKresko) {
        /* ------------------------------ DiamondFacets ----------------------------- */
        (FacetCut[] memory _dFacets, Initialization[] memory dInit) = diamondFacets();

        kresko = IKresko(address(new Diamond(admin, _dFacets, dInit)));

        // /* ------------------------------ MinterFacets ------------------------------ */
        (FacetCut[] memory _mFacets, Initialization memory mInit) = minterFacets(admin, seqFeed);
        kresko.diamondCut(_mFacets, mInit.initContract, mInit.initData);

        // /* ------------------------------- SCDPFacets ------------------------------- */

        (FacetCut[] memory _sFacets, Initialization memory sInit) = scdpFacets();
        kresko.diamondCut(_sFacets, sInit.initContract, sInit.initData);
        //0x5038b245
        return (kresko);
    }

    function diamondFacets() internal returns (FacetCut[] memory, Initialization[] memory) {
        FacetCut[] memory _diamondCut = new FacetCut[](5);
        _diamondCut[0] = FacetCut({
            facetAddress: address(new DiamondCutFacet()),
            action: FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("DiamondCutFacet")
        });
        _diamondCut[1] = FacetCut({
            facetAddress: address(new DiamondOwnershipFacet()),
            action: FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("DiamondOwnershipFacet")
        });
        _diamondCut[2] = FacetCut({
            facetAddress: address(new DiamondLoupeFacet()),
            action: FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("DiamondLoupeFacet")
        });
        _diamondCut[3] = FacetCut({
            facetAddress: address(new AuthorizationFacet()),
            action: FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("AuthorizationFacet")
        });
        _diamondCut[4] = FacetCut({
            facetAddress: address(new ERC165Facet()),
            action: FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("ERC165Facet")
        });

        Initialization[] memory diamondInit = new Initialization[](1);
        diamondInit[0] = Initialization({initContract: address(0), initData: ""});
        return (_diamondCut, diamondInit);
    }

    function minterFacets(
        address admin,
        address sequencerUptimeFeed
    ) internal returns (FacetCut[] memory, Initialization memory) {
        address configurationFacetAddress = address(new ConfigurationFacet());
        FacetCut[] memory _diamondCut = new FacetCut[](10);
        _diamondCut[0] = FacetCut({
            facetAddress: address(new MintFacet()),
            action: FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("MintFacet")
        });
        _diamondCut[1] = FacetCut({
            facetAddress: address(new BurnFacet()),
            action: FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("BurnFacet")
        });
        _diamondCut[2] = FacetCut({
            facetAddress: address(new StateFacet()),
            action: FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("StateFacet")
        });
        _diamondCut[3] = FacetCut({
            facetAddress: configurationFacetAddress,
            action: FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("ConfigurationFacet")
        });
        _diamondCut[4] = FacetCut({
            facetAddress: address(new DepositWithdrawFacet()),
            action: FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("DepositWithdrawFacet")
        });

        _diamondCut[5] = FacetCut({
            facetAddress: address(new AccountStateFacet()),
            action: FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("AccountStateFacet")
        });
        _diamondCut[6] = FacetCut({
            facetAddress: address(new LiquidationFacet()),
            action: FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("LiquidationFacet")
        });
        _diamondCut[7] = FacetCut({
            facetAddress: address(new SafetyCouncilFacet()),
            action: FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("SafetyCouncilFacet")
        });
        _diamondCut[8] = FacetCut({
            facetAddress: address(new OracleConfigFacet()),
            action: FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("OracleConfigFacet")
        });
        _diamondCut[9] = FacetCut({
            facetAddress: address(new OracleViewFacet()),
            action: FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("OracleViewFacet")
        });
        // _diamondCut[10] = FacetCut({
        //     facetAddress: address(new BurnHelperFacet()),
        //     action: FacetCutAction.Add,
        //     functionSelectors: DiamondHelper.getSelectorsFromArtifact("BurnHelperFacet")
        // });

        bytes memory initData = abi.encodeWithSelector(
            ConfigurationFacet.initializeMinter.selector,
            getInitializer(admin, sequencerUptimeFeed)
        );
        return (_diamondCut, Initialization(configurationFacetAddress, initData));
    }

    function scdpFacets() internal returns (FacetCut[] memory, Initialization memory) {
        address configurationFacetAddress = address(new SCDPConfigFacet());
        FacetCut[] memory _diamondCut = new FacetCut[](5);
        _diamondCut[0] = FacetCut({
            facetAddress: address(new SCDPFacet()),
            action: FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("SCDPFacet")
        });
        _diamondCut[1] = FacetCut({
            facetAddress: address(new SCDPStateFacet()),
            action: FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("SCDPStateFacet")
        });
        _diamondCut[2] = FacetCut({
            facetAddress: configurationFacetAddress,
            action: FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("SCDPConfigFacet")
        });
        _diamondCut[3] = FacetCut({
            facetAddress: address(new SCDPSwapFacet()),
            action: FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("SCDPSwapFacet")
        });
        _diamondCut[4] = FacetCut({
            facetAddress: address(new SDIFacet()),
            action: FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("SDIFacet")
        });
        bytes memory initData = abi.encodeWithSelector(
            SCDPConfigFacet.initializeSCDP.selector,
            SCDPInitArgs({swapFeeRecipient: TREASURY, mcr: 2e18, lt: 1.5e18})
        );
        return (_diamondCut, Initialization(configurationFacetAddress, initData));
    }

    function enableSCDPCollateral(address asset, string memory prices) internal {
        SCDPCollateral[] memory configurations = new SCDPCollateral[](1);
        configurations[0] = SCDPCollateral({
            decimals: MockERC20(asset).decimals(),
            depositLimit: type(uint256).max,
            liquidityIndex: 1e27
        });
        address[] memory assets = new address[](1);
        assets[0] = asset;

        bytes memory redstonePayload = getRedstonePayload(prices);
        (bool success, bytes memory data) = address(kresko).call(
            abi.encodePacked(
                abi.encodeWithSelector(kresko.addDepositAssetsSCDP.selector, assets, configurations),
                redstonePayload
            )
        );
        require(success, _getRevertMsg(data));
    }

    function enableSCDPKrAsset(address asset, string memory prices) internal {
        SCDPKrAsset[] memory configurations = new SCDPKrAsset[](1);
        configurations[0] = SCDPKrAsset({
            protocolFee: 0.25e18,
            liquidationIncentive: 1.1e18,
            openFee: 0.005e18,
            closeFee: 0.005e18,
            supplyLimit: type(uint256).max
        });
        address[] memory assets = new address[](1);
        assets[0] = asset;

        bytes memory redstonePayload = getRedstonePayload(prices);
        (bool success, bytes memory data) = address(kresko).call(
            abi.encodePacked(abi.encodeWithSelector(kresko.addKrAssetsSCDP.selector, assets, configurations), redstonePayload)
        );
        require(success, _getRevertMsg(data));
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
        uint256 price
    ) internal returns (KreskoAsset krAsset, KreskoAssetAnchor anchor, MockOracle oracle) {
        krAsset = new KreskoAsset();
        krAsset.initialize(_symbol, _symbol, 18, admin, address(kresko));
        anchor = new KreskoAssetAnchor(IKreskoAsset(krAsset));
        anchor.initialize(IKreskoAsset(krAsset), string.concat("a", _symbol), string.concat("a", _symbol), admin);

        krAsset.grantRole(keccak256("kresko.roles.minter.operator"), address(anchor));
        oracle = new MockOracle(_symbol, price, 8);
        OracleType[2] memory oracleTypes = [OracleType.Redstone, OracleType.Chainlink];

        kresko.addKreskoAsset(
            address(krAsset),
            OracleConfiguration(oracleTypes, [address(0), address(oracle)]),
            KrAsset({
                supplyLimit: type(uint256).max,
                closeFee: 0.02e18,
                openFee: 0,
                exists: true,
                id: redstoneId,
                anchor: address(anchor),
                oracles: oracleTypes,
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
        oracle = new MockOracle(id, price, 8);
        OracleType[2] memory oracleTypes = [OracleType.Redstone, OracleType.Chainlink];

        kresko.addCollateralAsset(
            address(collateral),
            OracleConfiguration(oracleTypes, [address(0), address(oracle)]),
            CollateralAsset({
                factor: 1e18,
                exists: true,
                id: redstoneId,
                anchor: address(0),
                oracles: oracleTypes,
                decimals: decimals,
                liquidationIncentive: 1.1e18
            })
        );
        return (collateral, oracle);
    }

    function whitelistCollateral(address collateral, address anchor, address oracle, bytes32 redstoneId) internal {
        OracleType[2] memory oracleTypes = [OracleType.Redstone, OracleType.Chainlink];

        kresko.addCollateralAsset(
            collateral,
            OracleConfiguration(oracleTypes, [address(0), oracle]),
            CollateralAsset({
                exists: true,
                id: redstoneId,
                anchor: anchor,
                oracles: oracleTypes,
                factor: 1e18,
                decimals: MockERC20(collateral).decimals(),
                liquidationIncentive: 1.1e18
            })
        );
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

    function isOwner(address owner) external view returns (bool) {
        return true;
    }

    function getOwners() external view returns (address[] memory) {
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
