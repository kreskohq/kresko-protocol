// solhint-disable

// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.23;

import {Asset} from "common/Types.sol";
import {Enums} from "common/Constants.sol";
import {SwapRouteSetter} from "scdp/STypes.sol";
import {IAggregatorV3} from "kresko-lib/vendor/IAggregatorV3.sol";
import {MockOracle} from "mocks/MockOracle.sol";
import {MockERC20} from "mocks/MockERC20.sol";
import {IERC20} from "kresko-lib/token/IERC20.sol";
import {KreskoAsset} from "kresko-asset/KreskoAsset.sol";
import {KreskoAssetAnchor} from "kresko-asset/KreskoAssetAnchor.sol";
import {IKreskoAsset} from "kresko-asset/IKreskoAsset.sol";
import {_DeprecatedTestBase} from "./_DeprecatedTestBase.s.sol";
import {IAssetConfigurationFacet} from "common/interfaces/IAssetConfigurationFacet.sol";
import {MockSequencerUptimeFeed} from "mocks/MockSequencerUptimeFeed.sol";
import {LibSafe, GnosisSafeL2Mock} from "kresko-lib/mocks/MockSafe.sol";
import {Deployment, DeploymentFactory} from "factory/DeploymentFactory.sol";
import {Conversions} from "libs/Utils.sol";
import {IVault} from "vault/interfaces/IVault.sol";
import {KISS} from "kiss/KISS.sol";
import {_IDeployState} from "./_IDeployState.sol";

using Conversions for bytes;
using Conversions for bytes[];

abstract contract _DeprecatedConfigUtils is _DeprecatedTestBase {
    address[2] internal SKIP_FEEDS = [address(0), address(0)];
    Enums.OracleType[2] internal OT_RS_CL = [Enums.OracleType.Redstone, Enums.OracleType.Chainlink];
    Enums.OracleType[2] internal OT_KISS = [Enums.OracleType.Vault, Enums.OracleType.Empty];
    AssetType internal ext_default = AssetType({collateral: true, krAsset: false, scdpDepositable: false, scdpKrAsset: false});
    AssetType internal kr_default = AssetType({collateral: true, krAsset: true, scdpDepositable: false, scdpKrAsset: true});
    AssetType internal kiss_default = AssetType({collateral: true, krAsset: false, scdpDepositable: true, scdpKrAsset: true});
    AssetType internal kr_swap_only = AssetType({collateral: false, krAsset: false, scdpDepositable: false, scdpKrAsset: true});
    AssetType internal asset_void = AssetType({collateral: false, krAsset: false, scdpDepositable: false, scdpKrAsset: false});
    AssetType internal kr_full = AssetType({collateral: true, krAsset: true, scdpDepositable: true, scdpKrAsset: true});
    AssetType internal ext_full = AssetType({collateral: true, krAsset: false, scdpDepositable: true, scdpKrAsset: false});

    function addKrAsset(
        _IDeployState.KrAssetDeployInfo memory deployment,
        _IDeployState.KrAssetCfg memory cfg
    ) internal returns (_IDeployState.KrAssetInfo memory result_) {
        result_ = convertToInfo(deployment, cfg.feeds);

        result_.config.ticker = cfg.ticker;
        result_.config.anchor = address(deployment.anchor);
        result_.config.oracles = cfg.oracleType;

        result_.config.factor = cfg.factor;
        result_.config.kFactor = cfg.kFactor;

        if (cfg.identity.krAsset) {
            result_.config.isMinterMintable = true;
            result_.config.openFee = cfg.openFee;
            result_.config.closeFee = cfg.closeFee;
            result_.config.maxDebtMinter = cfg.maxDebtMinter;
        }

        if (cfg.identity.collateral) {
            result_.config.isMinterCollateral = true;
            result_.config.liqIncentive = 1.075e4;
        }

        if (cfg.identity.scdpKrAsset) {
            result_.config.isSwapMintable = true;
            result_.config.liqIncentiveSCDP = 1.05e4;

            result_.config.swapInFeeSCDP = cfg.swapInFeeSCDP;
            result_.config.swapOutFeeSCDP = cfg.swapOutFeeSCDP;
            result_.config.protocolFeeShareSCDP = cfg.protocolFeeShareSCDP;
            result_.config.maxDebtSCDP = cfg.maxDebtSCDP;
        }

        if (cfg.identity.scdpDepositable) {
            result_.config.isSharedCollateral = true;
            result_.config.depositLimitSCDP = type(uint128).max;
        }

        result_.config = kresko.addAsset(deployment.addr, result_.config, cfg.setTickerFeeds ? cfg.feeds : SKIP_FEEDS);

        return result_;
    }

    function _addKrAsset(
        bytes32 ticker,
        address assetAddr,
        address anchorAddr,
        bool setTickerFeeds,
        Enums.OracleType[2] memory oracles,
        address[2] memory feeds,
        AssetType memory identity
    ) internal returns (Asset memory) {
        return
            kresko.addAsset(
                assetAddr,
                _getTestKrAssetConfig(ticker, anchorAddr, oracles, identity),
                setTickerFeeds ? feeds : SKIP_FEEDS
            );
    }

    function addCollateral(address assetAddr, _IDeployState.ExtAssetCfg memory cfg) internal returns (Asset memory result_) {
        result_.ticker = cfg.ticker;
        result_.oracles = cfg.oracleType;

        if (cfg.identity.collateral) {
            result_.factor = cfg.factor;
            result_.isMinterCollateral = true;
            result_.liqIncentive = cfg.liqIncentive;
        }

        if (cfg.identity.scdpDepositable) {
            result_.isSharedCollateral = true;
            result_.isSharedOrSwappedCollateral = true;
            result_.depositLimitSCDP = type(uint128).max;
        }

        return kresko.addAsset(assetAddr, result_, cfg.setTickerFeeds ? cfg.feeds : SKIP_FEEDS);
    }

    function addCollateral(
        bytes32 ticker,
        address assetAddr,
        bool setTickerFeeds,
        Enums.OracleType[2] memory oracles,
        address[2] memory feeds,
        AssetType memory identity
    ) internal returns (Asset memory result_) {
        result_.ticker = ticker;
        result_.oracles = oracles;
        result_.factor = 1e4;

        if (identity.collateral) {
            result_.isMinterCollateral = true;
            result_.liqIncentive = 1.05e4;
        }

        if (identity.scdpDepositable) {
            result_.isSharedCollateral = true;
            result_.isSharedOrSwappedCollateral = true;
            result_.depositLimitSCDP = type(uint128).max;
        }

        return kresko.addAsset(assetAddr, result_, setTickerFeeds ? feeds : SKIP_FEEDS);
    }

    function addKISS(
        address _kreskoAddr,
        _IDeployState.KISSInfo memory _kissInfo
    ) internal returns (_IDeployState.KISSInfo memory) {
        _kissInfo.config = addKISS(_kreskoAddr, _kissInfo.addr, _kissInfo.vaultAddr, kiss_default).config;
        return _kissInfo;
    }

    function addKISS(
        address _kreskoAddr,
        address _kissAddr,
        address _vaultAddr,
        AssetType memory _type
    ) internal returns (_IDeployState.KISSInfo memory kissInfo_) {
        kissInfo_.config.ticker = bytes32("KISS");
        kissInfo_.config.anchor = _kissAddr;
        kissInfo_.config.oracles = OT_KISS;
        kissInfo_.config.maxDebtMinter = type(uint128).max;

        kissInfo_.config.factor = 1e4;
        kissInfo_.config.kFactor = 1e4;

        if (_type.collateral) {
            kissInfo_.config.isMinterCollateral = true;
            kissInfo_.config.liqIncentive = 1.05e4;
        }

        if (_type.krAsset) {
            kissInfo_.config.isMinterMintable = true;
            kissInfo_.config.openFee = 0.02e4;
            kissInfo_.config.closeFee = 0.02e4;
        }

        if (_type.scdpDepositable) {
            kissInfo_.config.isSharedOrSwappedCollateral = true;
            kissInfo_.config.isSharedCollateral = true;
            kissInfo_.config.depositLimitSCDP = type(uint128).max;
        }

        if (_type.scdpKrAsset) {
            kissInfo_.config.isSharedOrSwappedCollateral = true;
            kissInfo_.config.isSwapMintable = true;
            kissInfo_.config.swapInFeeSCDP = 10;
            kissInfo_.config.swapOutFeeSCDP = 10;
            kissInfo_.config.protocolFeeShareSCDP = 0.30e4;
            kissInfo_.config.liqIncentiveSCDP = 1.05e4;
            kissInfo_.config.maxDebtSCDP = type(uint256).max;
        }

        kissInfo_.config = IAssetConfigurationFacet(_kreskoAddr).addAsset(
            _kissAddr,
            kissInfo_.config,
            [_vaultAddr, address(0)]
        );
        kissInfo_.addr = _kissAddr;
        kissInfo_.vaultAddr = _vaultAddr;
        kissInfo_.kiss = KISS(_kissAddr);
        kissInfo_.vault = IVault(_vaultAddr);

        kissInfo_.asToken = IERC20(_kissAddr);
        return kissInfo_;
    }

    function _getTestKrAssetConfig(
        bytes32 _ticker,
        address _anchor,
        Enums.OracleType[2] memory _oracles,
        AssetType memory _identity
    ) internal pure returns (Asset memory config_) {
        config_.ticker = _ticker;
        config_.anchor = _anchor;
        config_.oracles = _oracles;

        config_.kFactor = 1.2e4;
        config_.factor = 1e4;
        config_.maxDebtMinter = type(uint128).max;

        if (_identity.krAsset) {
            config_.isMinterMintable = true;
            config_.openFee = 0.02e4;
            config_.closeFee = 0.02e4;
        }

        if (_identity.collateral) {
            config_.isMinterCollateral = true;
            config_.liqIncentive = 1.075e4;
        }

        if (_identity.scdpKrAsset) {
            config_.isSwapMintable = true;
            config_.swapInFeeSCDP = 25;
            config_.swapOutFeeSCDP = 25;
            config_.protocolFeeShareSCDP = 0.20e4;
            config_.liqIncentiveSCDP = 1.05e4;
            config_.maxDebtSCDP = type(uint256).max;
        }

        if (_identity.scdpDepositable) {
            config_.isSharedCollateral = true;
            config_.depositLimitSCDP = type(uint128).max;
        }
        return config_;
    }

    function enableSwapBothWays(address asset0, address asset1, bool enabled) internal {
        SwapRouteSetter[] memory swapPairsEnabled = new SwapRouteSetter[](1);
        swapPairsEnabled[0] = SwapRouteSetter({assetIn: asset0, assetOut: asset1, enabled: enabled});
        kresko.setSwapRoutesSCDP(swapPairsEnabled);
    }

    function enableSwapSingleWay(address asset0, address asset1, bool enabled) internal {
        kresko.setSingleSwapRouteSCDP(SwapRouteSetter({assetIn: asset0, assetOut: asset1, enabled: enabled}));
    }
}

abstract contract _DeprecatedHelpers is _DeprecatedConfigUtils {
    MockSequencerUptimeFeed internal mockSeqFeed;
    GnosisSafeL2Mock internal mockSafe;
    DeploymentFactory internal factory;

    bytes private KR_ASSET_IMPL = type(KreskoAsset).creationCode;

    modifier needsDeploymentFactory() {
        require(address(factory) != address(0), "KreskoForge: Deploy DeploymentFactory first");
        _;
    }

    function getMockSeqFeed() internal returns (address) {
        return address((mockSeqFeed = new MockSequencerUptimeFeed()));
    }

    function getMockSafe(address admin) internal returns (address) {
        return address((mockSafe = LibSafe.createSafe(admin)));
    }

    function deployDeploymentFactory(address _owner) internal returns (DeploymentFactory) {
        return new DeploymentFactory(_owner);
    }

    function deployKISS(
        address kreskoAddr,
        address vaultAddr,
        address admin
    ) internal needsDeploymentFactory returns (_IDeployState.KISSInfo memory kissInfo_) {
        require(kreskoAddr != address(0), "deployKISS: !Kresko");
        require(vaultAddr != address(0), "deployKISS: !Vault ");
        Deployment memory proxy = factory.create3ProxyAndLogic(
            type(KISS).creationCode,
            abi.encodeCall(KISS.initialize, ("Kresko: KISS", "KISS", 18, admin, kreskoAddr, vaultAddr)),
            getKISSSalt()
        );
        kissInfo_.addr = address(proxy.proxy);
        kissInfo_.kiss = KISS(kissInfo_.addr);
        kissInfo_.proxy = proxy;

        kissInfo_.vaultAddr = vaultAddr;
        kissInfo_.vault = IVault(vaultAddr);
        kissInfo_.asToken = IERC20(kissInfo_.addr);
        return kissInfo_;
    }

    function deployKrAsset(
        string memory name,
        string memory symbol,
        address underlyingAddr,
        address admin,
        address treasury
    ) internal needsDeploymentFactory returns (_IDeployState.KrAssetDeployInfo memory result_) {
        (string memory anchorName, string memory anchorSymbol) = getAnchorSymbolAndName(name, symbol);
        (bytes32 krAssetSalt, bytes32 anchorSalt) = getKrAssetSalts(symbol, anchorSymbol);

        bytes memory KR_ASSET_INITIALIZER = abi.encodeCall(
            KreskoAsset.initialize,
            (name, symbol, 18, admin, address(kresko), underlyingAddr, treasury, SYNTH_WRAP_FEE_IN, SYNTH_WRAP_FEE_OUT)
        );
        (address predictedAddress, ) = factory.previewCreate3ProxyAndLogic(krAssetSalt);

        bytes memory ANCHOR_IMPL = abi.encodePacked(type(KreskoAssetAnchor).creationCode, abi.encode(predictedAddress));
        bytes memory ANCHOR_INITIALIZER = abi.encodeCall(
            KreskoAssetAnchor.initialize,
            (IKreskoAsset(predictedAddress), anchorName, anchorSymbol, admin)
        );

        bytes[] memory batch = new bytes[](2);
        batch[0] = abi.encodeCall(factory.create3ProxyAndLogic, (KR_ASSET_IMPL, KR_ASSET_INITIALIZER, krAssetSalt));
        batch[1] = abi.encodeCall(factory.create3ProxyAndLogic, (ANCHOR_IMPL, ANCHOR_INITIALIZER, anchorSalt));

        Deployment[] memory proxies = factory.batch(batch).map(Conversions.toDeployment);
        result_.addr = address(proxies[0].proxy);
        result_.krAsset = KreskoAsset(payable(address(proxies[0].proxy)));
        result_.anchor = KreskoAssetAnchor(payable(address(proxies[1].proxy)));
        result_.symbol = symbol;
        result_.anchorSymbol = anchorSymbol;
        result_.underlyingAddr = underlyingAddr;
        result_.krAssetProxy = proxies[0];
        result_.anchorProxy = proxies[1];
    }

    function deployKrAssetWithOracle(
        string memory name,
        string memory symbol,
        uint256 price,
        address underlyingAddr,
        CoreConfig memory args
    ) internal needsDeploymentFactory returns (_IDeployState.KrAssetInfo memory result) {
        _IDeployState.KrAssetDeployInfo memory deployment = deployKrAsset(
            name,
            symbol,
            underlyingAddr,
            args.admin,
            args.treasury
        );
        result.addr = deployment.addr;
        result.krAsset = deployment.krAsset;
        result.anchor = deployment.anchor;

        result.krAssetProxy = deployment.krAssetProxy;
        result.anchorProxy = deployment.anchorProxy;

        result.asToken = IERC20(result.addr);
        result.underlyingAddr = deployment.underlyingAddr;

        result.mockFeed = deployMockOracle(symbol, price, 8);
        result.feedAddr = address(result.mockFeed);
        result.feed = IAggregatorV3(result.feedAddr);

        result.symbol = symbol;
        result.anchorSymbol = deployment.anchorSymbol;
        return result;
    }

    function mockKrAsset(
        bytes32 ticker,
        address underlyingAddr,
        MockConfig memory config,
        AssetType memory identity,
        CoreConfig memory args
    ) internal returns (_IDeployState.KrAssetInfo memory result) {
        result = deployKrAssetWithOracle(config.symbol, config.symbol, config.price, underlyingAddr, args);
        result.config = _addKrAsset(
            ticker,
            result.addr,
            address(result.anchor),
            config.setFeeds,
            OT_RS_CL,
            [address(0), result.feedAddr],
            identity
        );
    }

    function mockCollateral(
        bytes32 ticker,
        MockConfig memory config,
        AssetType memory identity
    ) internal returns (MockTokenInfo memory result) {
        result.mock = deployMockToken(config.symbol, config.symbol, config.dec, 0);
        result.addr = address(result.mock);
        result.asToken = IERC20(result.addr);

        result.mockFeed = deployMockOracle(config.symbol, config.price, config.feedDec);
        result.feedAddr = address(result.mockFeed);
        result.feed = IAggregatorV3(result.feedAddr);

        result.config = addCollateral(ticker, result.addr, config.setFeeds, OT_RS_CL, [address(0), result.feedAddr], identity);
        result.symbol = config.symbol;
    }

    function deployMockTokenAndOracle(MockConfig memory config) internal returns (MockTokenInfo memory result) {
        result.mock = deployMockToken(config.symbol, config.symbol, config.dec, 0);
        result.addr = address(result.mock);
        result.asToken = IERC20(result.addr);

        result.mockFeed = deployMockOracle(config.symbol, config.price, config.feedDec);
        result.feedAddr = address(result.mockFeed);
        result.feed = IAggregatorV3(result.feedAddr);
        result.symbol = config.symbol;
    }

    function deployMockOracle(string memory symbol, uint256 price, uint8 decimals) internal returns (MockOracle) {
        bytes memory IMPL = abi.encodePacked(type(MockOracle).creationCode, abi.encode(symbol, price, decimals));
        address oracle = factory.deployCreate3(IMPL, "", bytes32(bytes(string.concat(symbol, "feed")))).implementation;
        return MockOracle(oracle);
    }

    function deployMockToken(
        string memory name,
        string memory symbol,
        uint8 decimals,
        uint256 initialSupply
    ) internal returns (MockERC20) {
        bytes memory IMPL = abi.encodePacked(type(MockERC20).creationCode, abi.encode(name, symbol, decimals, initialSupply));
        address token = factory.deployCreate3(IMPL, "", bytes32(bytes(symbol))).implementation;
        return MockERC20(token);
    }

    function getAnchorSymbolAndName(
        string memory krAssetName,
        string memory krAssetSymbol
    ) internal pure returns (string memory name, string memory symbol) {
        name = string.concat("Kresko Asset Anchor: ", krAssetName);
        symbol = string.concat("a", krAssetSymbol);
    }

    function getKISSSalt() internal pure returns (bytes32) {
        return bytes32("KISS");
    }

    function getKrAssetSalts(
        string memory symbol,
        string memory anchorSymbol
    ) internal pure returns (bytes32 krAssetSalt, bytes32 anchorSalt) {
        krAssetSalt = bytes32(bytes.concat(bytes(symbol), bytes(anchorSymbol)));
        anchorSalt = bytes32(bytes.concat(bytes(anchorSymbol), bytes(symbol)));
    }
}

function convertToInfo(
    _IDeployState.KrAssetDeployInfo memory info,
    address[2] memory feeds
) pure returns (_IDeployState.KrAssetInfo memory result) {
    result.addr = address(info.krAsset);
    result.krAsset = info.krAsset;
    result.anchor = info.anchor;
    result.asToken = IERC20(info.addr);
    result.krAssetProxy = info.krAssetProxy;
    result.anchorProxy = info.anchorProxy;
    result.symbol = info.symbol;
    result.anchorSymbol = info.anchorSymbol;
    result.underlyingAddr = info.underlyingAddr;

    address feed = feeds[0] == address(0) ? feeds[1] : feeds[0];
    result.feedAddr = feed;
    result.feed = IAggregatorV3(feed);
    result.mockFeed = MockOracle(feed);
    return result;
}

abstract contract _DeprecatedTestUtils is _DeprecatedHelpers {}
