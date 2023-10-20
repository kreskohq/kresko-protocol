// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.21;
// solhint-disable var-name-mixedcase
// solhint-disable no-empty-blocks
import {Asset} from "common/Types.sol";
import {Enums} from "common/Constants.sol";
import {SwapRouteSetter} from "scdp/STypes.sol";
import {MockOracle} from "mocks/MockOracle.sol";
import {MockERC20, MockERC20Restricted} from "mocks/MockERC20.sol";
import {KreskoAsset} from "kresko-asset/KreskoAsset.sol";
import {KreskoAssetAnchor} from "kresko-asset/KreskoAssetAnchor.sol";
import {IKreskoAsset} from "kresko-asset/IKreskoAsset.sol";
import {KreskoForgeBase} from "scripts/utils/KreskoForgeBase.s.sol";
import {MockSequencerUptimeFeed} from "mocks/MockSequencerUptimeFeed.sol";
import {LibSafe, GnosisSafeL2Mock} from "kresko-lib/mocks/MockSafe.sol";
import {Proxy, ProxyFactory} from "proxy/ProxyFactory.sol";
import {Conversions} from "libs/Utils.sol";

using Conversions for bytes;
using Conversions for bytes[];

abstract contract ConfigurationUtils is KreskoForgeBase {
    Enums.OracleType[2] internal OT_RS_CL = [Enums.OracleType.Redstone, Enums.OracleType.Chainlink];
    Enums.OracleType[2] internal OT_KISS = [Enums.OracleType.Vault, Enums.OracleType.Empty];
    address[2] internal SKIP_FEEDS = [address(0), address(0)];

    AssetIdentity internal defaultCollateral =
        AssetIdentity({collateral: true, krAsset: false, scdpDepositable: false, scdpKrAsset: false});

    AssetIdentity internal defaultKrAsset =
        AssetIdentity({collateral: true, krAsset: true, scdpDepositable: false, scdpKrAsset: true});

    AssetIdentity internal onlySwapMintable =
        AssetIdentity({collateral: false, krAsset: false, scdpDepositable: false, scdpKrAsset: true});

    AssetIdentity internal voidAsset =
        AssetIdentity({collateral: false, krAsset: false, scdpDepositable: false, scdpKrAsset: false});

    AssetIdentity internal fullKrAsset =
        AssetIdentity({collateral: true, krAsset: true, scdpDepositable: true, scdpKrAsset: true});

    AssetIdentity internal fullCollateral =
        AssetIdentity({collateral: true, krAsset: false, scdpDepositable: true, scdpKrAsset: false});

    AssetIdentity internal defaultKISS =
        AssetIdentity({collateral: true, krAsset: false, scdpDepositable: true, scdpKrAsset: true});

    function addKrAsset(
        bytes32 ticker,
        bool setTickerFeeds,
        Enums.OracleType[2] memory oracles,
        address[2] memory feeds,
        KrDeployExtended memory deploy,
        AssetIdentity memory identity
    ) internal returns (KrDeployExtended memory) {
        deploy.config = _createKrAssetConfig(ticker, address(deploy.anchor), oracles, identity);
        deploy.oracle = MockOracle(feeds[0] == address(0) ? feeds[1] : feeds[0]);
        deploy.oracleAddr = address(deploy.oracle);
        kresko.addAsset(address(deploy.krAsset), deploy.config, setTickerFeeds ? feeds : SKIP_FEEDS);
        return deploy;
    }

    function _addKrAsset(
        bytes32 ticker,
        address assetAddr,
        address anchorAddr,
        bool setTickerFeeds,
        Enums.OracleType[2] memory oracles,
        address[2] memory feeds,
        AssetIdentity memory identity
    ) internal requiresKresko returns (Asset memory result) {
        result = _createKrAssetConfig(ticker, anchorAddr, oracles, identity);
        kresko.addAsset(assetAddr, result, setTickerFeeds ? feeds : SKIP_FEEDS);
    }

    function addKrAsset(
        bytes32 ticker,
        bool setTickerFeeds,
        Enums.OracleType[2] memory oracles,
        address[2] memory feeds,
        KrDeploy memory deploy,
        AssetIdentity memory identity
    ) internal returns (KrDeployExtended memory result) {
        result.krAsset = deploy.krAsset;
        result.addr = address(deploy.krAsset);
        result.anchor = deploy.anchor;
        result.oracle = MockOracle(feeds[0] == address(0) ? feeds[1] : feeds[0]);
        result.oracleAddr = address(result.oracle);
        result.underlyingAddr = deploy.underlyingAddr;

        result.config = _addKrAsset(ticker, result.addr, address(deploy.anchor), setTickerFeeds, oracles, feeds, identity);

        return result;
    }

    function addCollateral(
        bytes32 ticker,
        address assetAddr,
        bool setTickerFeeds,
        Enums.OracleType[2] memory oracles,
        address[2] memory feeds,
        AssetIdentity memory identity
    ) internal requiresKresko returns (Asset memory config) {
        config = kresko.getAsset(assetAddr);
        config.ticker = ticker;
        config.oracles = oracles;
        config.factor = 1e4;

        if (identity.collateral) {
            config.isMinterCollateral = true;
            config.liqIncentive = 1.1e4;
        }

        if (identity.scdpDepositable) {
            config.isSharedCollateral = true;
            config.isSharedOrSwappedCollateral = true;
            config.depositLimitSCDP = type(uint128).max;
        }
        kresko.addAsset(assetAddr, config, setTickerFeeds ? feeds : SKIP_FEEDS);
    }

    function addKISS(
        address kissAddr,
        address vaultAddr,
        AssetIdentity memory identity
    ) internal requiresKresko returns (KISSConfig memory result) {
        result.config.ticker = bytes32("KISS");
        result.config.anchor = kissAddr;
        result.config.oracles = OT_KISS;
        result.config.maxDebtMinter = type(uint128).max;

        result.config.factor = 1e4;
        result.config.kFactor = 1e4;

        if (identity.collateral) {
            result.config.isMinterCollateral = true;
            result.config.liqIncentive = 1.1e4;
        }

        if (identity.krAsset) {
            result.config.isMinterMintable = true;
            result.config.openFee = 0.02e4;
            result.config.closeFee = 0.02e4;
        }

        if (identity.scdpDepositable) {
            result.config.isSharedCollateral = true;
            result.config.depositLimitSCDP = type(uint128).max;
        }

        if (identity.scdpKrAsset) {
            result.config.isSwapMintable = true;
            result.config.swapInFeeSCDP = 0.02e4;
            result.config.swapOutFeeSCDP = 0.02e4;
            result.config.protocolFeeShareSCDP = 0.25e4;
            result.config.liqIncentiveSCDP = 1.1e4;
            result.config.maxDebtSCDP = type(uint256).max;
        }

        kresko.addAsset(kissAddr, result.config, [vaultAddr, address(0)]);
        result.addr = kissAddr;
        result.vaultAddr = vaultAddr;
    }

    function _createKrAssetConfig(
        bytes32 ticker,
        address anchor,
        Enums.OracleType[2] memory oracles,
        AssetIdentity memory identity
    ) internal pure returns (Asset memory config) {
        config.ticker = ticker;
        config.anchor = anchor;
        config.oracles = oracles;

        config.kFactor = 1.2e4;
        config.factor = 1e4;
        config.maxDebtMinter = type(uint128).max;

        if (identity.krAsset) {
            config.isMinterMintable = true;

            config.openFee = 0.02e4;
            config.closeFee = 0.02e4;
        }

        if (identity.collateral) {
            config.isMinterCollateral = true;
            config.liqIncentive = 1.1e4;
        }

        if (identity.scdpKrAsset) {
            config.isSwapMintable = true;
            config.swapInFeeSCDP = 0.02e4;
            config.swapOutFeeSCDP = 0.02e4;
            config.protocolFeeShareSCDP = 0.25e4;
            config.liqIncentiveSCDP = 1.1e4;
            config.maxDebtSCDP = type(uint256).max;
        }

        if (identity.scdpDepositable) {
            config.isSharedCollateral = true;
            config.depositLimitSCDP = type(uint128).max;
        }
    }

    function enableSwapBothWays(address asset0, address asset1, bool enabled) internal requiresKresko {
        SwapRouteSetter[] memory swapPairsEnabled = new SwapRouteSetter[](1);
        swapPairsEnabled[0] = SwapRouteSetter({assetIn: asset0, assetOut: asset1, enabled: enabled});
        kresko.setSwapRoutesSCDP(swapPairsEnabled);
    }

    function enableSwapSingleWay(address asset0, address asset1, bool enabled) internal requiresKresko {
        kresko.setSingleSwapRouteSCDP(SwapRouteSetter({assetIn: asset0, assetOut: asset1, enabled: enabled}));
    }

    function updateCollateralToDefaults(address assetAddr) internal {
        Asset memory config = kresko.getAsset(assetAddr);
        require(config.ticker != bytes32(0), "Asset does not exist");

        config.liqIncentive = 1.1e4;
        config.isMinterCollateral = true;
        config.factor = 1e4;
        config.oracles = OT_RS_CL;
        kresko.updateAsset(assetAddr, config);
    }
}

abstract contract NonDiamondDeployUtils is ConfigurationUtils {
    MockSequencerUptimeFeed internal mockSeqFeed;
    GnosisSafeL2Mock internal mockSafe;
    ProxyFactory internal proxyFactory;

    bytes private KR_ASSET_IMPL = type(KreskoAsset).creationCode;

    modifier needsProxyFactory() {
        require(address(proxyFactory) != address(0), "KreskoForge: Deploy ProxyFactory first");
        _;
    }

    function getMockSeqFeed() internal returns (address) {
        return address((mockSeqFeed = new MockSequencerUptimeFeed()));
    }

    function getMockSafe(address admin) internal returns (address) {
        return address((mockSafe = LibSafe.createSafe(admin)));
    }

    function deployProxyFactory(address _owner) internal returns (ProxyFactory) {
        return new ProxyFactory(_owner);
    }

    struct MockConfig {
        string symbol;
        uint256 price;
        uint8 tknDecimals;
        uint8 oracleDecimals;
        bool setFeeds;
    }

    function deployKrAsset(
        string memory name,
        string memory symbol,
        address underlyingAddr,
        address admin,
        address treasury
    ) internal needsProxyFactory returns (KrDeploy memory) {
        (string memory anchorName, string memory anchorSymbol) = getAnchorSymbolAndName(name, symbol);
        (bytes32 krAssetSalt, bytes32 anchorSalt) = getKrAssetSalts(symbol, anchorSymbol);

        bytes memory KR_ASSET_INITIALIZER = abi.encodeCall(
            KreskoAsset.initialize,
            (name, symbol, 18, admin, address(kresko), underlyingAddr, treasury, 0, 0)
        );
        (address predictedAddress, ) = proxyFactory.previewCreate2ProxyAndLogic(
            KR_ASSET_IMPL,
            KR_ASSET_INITIALIZER,
            krAssetSalt
        );

        bytes memory ANCHOR_IMPL = abi.encodePacked(type(KreskoAssetAnchor).creationCode, abi.encode(predictedAddress));
        bytes memory ANCHOR_INITIALIZER = abi.encodeCall(
            KreskoAssetAnchor.initialize,
            (IKreskoAsset(predictedAddress), anchorName, anchorSymbol, admin)
        );

        bytes[] memory batch = new bytes[](2);
        batch[0] = abi.encodeCall(proxyFactory.create2ProxyAndLogic, (KR_ASSET_IMPL, KR_ASSET_INITIALIZER, krAssetSalt));
        batch[1] = abi.encodeCall(proxyFactory.create2ProxyAndLogic, (ANCHOR_IMPL, ANCHOR_INITIALIZER, anchorSalt));

        Proxy[] memory results = proxyFactory.batch(batch).map(Conversions.toProxy);

        return
            KrDeploy({
                addr: address(results[0].proxy),
                krAsset: KreskoAsset(payable(address(results[0].proxy))),
                anchor: KreskoAssetAnchor(payable(address(results[1].proxy))),
                underlyingAddr: underlyingAddr
            });
    }

    function deployKrAssetWithOracle(
        string memory name,
        string memory symbol,
        uint256 price,
        address underlyingAddr,
        DeployArgs memory args
    ) internal needsProxyFactory returns (KrDeployExtended memory result) {
        KrDeploy memory deployment = deployKrAsset(name, symbol, underlyingAddr, args.admin, args.treasury);
        result.krAsset = deployment.krAsset;
        result.addr = deployment.addr;
        result.underlyingAddr = deployment.underlyingAddr;
        result.anchor = deployment.anchor;
        result.oracle = deployMockOracle(symbol, price, 8);
        result.oracleAddr = address(result.oracle);
        return result;
    }

    function mockKrAsset(
        bytes32 ticker,
        address underlyingAddr,
        MockConfig memory config,
        AssetIdentity memory identity,
        DeployArgs memory args
    ) internal returns (KrDeployExtended memory result) {
        result = deployKrAssetWithOracle(config.symbol, config.symbol, config.price, underlyingAddr, args);
        result.config = _addKrAsset(
            ticker,
            result.addr,
            address(result.anchor),
            config.setFeeds,
            OT_RS_CL,
            [address(0), result.oracleAddr],
            identity
        );
    }

    function mockCollateral(
        bytes32 ticker,
        MockConfig memory config,
        AssetIdentity memory identity
    ) internal returns (MockCollDeploy memory result) {
        result.asset = deployMockToken(config.symbol, config.symbol, config.tknDecimals, 0);
        result.addr = address(result.asset);
        result.oracle = deployMockOracle(config.symbol, config.price, config.oracleDecimals);
        result.oracleAddr = address(result.oracle);
        result.config = addCollateral(
            ticker,
            result.addr,
            config.setFeeds,
            OT_RS_CL,
            [address(0), result.oracleAddr],
            identity
        );
    }

    function deployMockOracle(string memory symbol, uint256 price, uint8 decimals) internal returns (MockOracle) {
        return new MockOracle(symbol, price, decimals);
    }

    function deployMockToken(
        string memory name,
        string memory symbol,
        uint8 decimals,
        uint256 initialSupply
    ) internal returns (MockERC20) {
        return new MockERC20(name, symbol, decimals, initialSupply);
    }

    function deployToken(
        string memory name,
        string memory symbol,
        uint8 decimals,
        uint256 initialSupply
    ) internal returns (MockERC20Restricted) {
        return new MockERC20Restricted(name, symbol, decimals, initialSupply);
    }

    function getAnchorSymbolAndName(
        string memory krAssetName,
        string memory krAssetSymbol
    ) internal pure returns (string memory name, string memory symbol) {
        name = string.concat("Kresko Asset Anchor: ", krAssetName);
        symbol = string.concat("a", krAssetSymbol);
    }

    function getKrAssetSalts(
        string memory symbol,
        string memory anchorSymbol
    ) internal pure returns (bytes32 krAssetSalt, bytes32 anchorSalt) {
        krAssetSalt = bytes32(bytes.concat(bytes(symbol), bytes(anchorSymbol)));
        anchorSalt = bytes32(bytes.concat(bytes(anchorSymbol), bytes(symbol)));
    }
}

abstract contract KreskoForgeUtils is NonDiamondDeployUtils {}
