// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.21;
// solhint-disable var-name-mixedcase
// solhint-disable no-empty-blocks
import {Asset} from "common/Types.sol";
import {Enums} from "common/Constants.sol";
import {SwapRouteSetter} from "scdp/STypes.sol";
import {IAggregatorV3} from "kresko-lib/vendor/IAggregatorV3.sol";
import {MockOracle} from "mocks/MockOracle.sol";
import {MockERC20, MockERC20Restricted} from "mocks/MockERC20.sol";
import {IERC20} from "kresko-lib/token/IERC20.sol";
import {KreskoAsset} from "kresko-asset/KreskoAsset.sol";
import {KreskoAssetAnchor} from "kresko-asset/KreskoAssetAnchor.sol";
import {IKreskoAsset} from "kresko-asset/IKreskoAsset.sol";
import {KreskoForgeBase} from "scripts/utils/KreskoForgeBase.s.sol";
import {MockSequencerUptimeFeed} from "mocks/MockSequencerUptimeFeed.sol";
import {LibSafe, GnosisSafeL2Mock} from "kresko-lib/mocks/MockSafe.sol";
import {Proxy, ProxyFactory} from "proxy/ProxyFactory.sol";
import {Conversions} from "libs/Utils.sol";
import {Vault} from "vault/Vault.sol";
import {KISS} from "kiss/KISS.sol";

using Conversions for bytes;
using Conversions for bytes[];

abstract contract ConfigurationUtils is KreskoForgeBase {
    Enums.OracleType[2] internal OT_RS_CL = [Enums.OracleType.Redstone, Enums.OracleType.Chainlink];
    Enums.OracleType[2] internal OT_KISS = [Enums.OracleType.Vault, Enums.OracleType.Empty];
    address[2] internal SKIP_FEEDS = [address(0), address(0)];

    AssetIdentity internal ext_default =
        AssetIdentity({collateral: true, krAsset: false, scdpDepositable: false, scdpKrAsset: false});

    AssetIdentity internal kr_default =
        AssetIdentity({collateral: true, krAsset: true, scdpDepositable: false, scdpKrAsset: true});

    AssetIdentity internal kiss_default =
        AssetIdentity({collateral: true, krAsset: false, scdpDepositable: true, scdpKrAsset: true});

    AssetIdentity internal kr_swap_only =
        AssetIdentity({collateral: false, krAsset: false, scdpDepositable: false, scdpKrAsset: true});

    AssetIdentity internal asset_void =
        AssetIdentity({collateral: false, krAsset: false, scdpDepositable: false, scdpKrAsset: false});

    AssetIdentity internal kr_full = AssetIdentity({collateral: true, krAsset: true, scdpDepositable: true, scdpKrAsset: true});

    AssetIdentity internal ext_full =
        AssetIdentity({collateral: true, krAsset: false, scdpDepositable: true, scdpKrAsset: false});

    function addKrAsset(
        bytes32 ticker,
        bool setTickerFeeds,
        Enums.OracleType[2] memory oracles,
        address[2] memory feeds,
        KrAssetInfo memory deployed,
        AssetIdentity memory identity
    ) internal returns (KrAssetInfo memory) {
        deployed.config = _createKrAssetConfig(ticker, address(deployed.anchor), oracles, identity);

        deployed.feedAddr = feeds[0] == address(0) ? feeds[1] : feeds[0];
        deployed.feed = IAggregatorV3(deployed.feedAddr);
        deployed.mockFeed = MockOracle(deployed.feedAddr);

        kresko.addAsset(address(deployed.krAsset), deployed.config, setTickerFeeds ? feeds : SKIP_FEEDS);
        return deployed;
    }

    function _addKrAsset(
        bytes32 ticker,
        address assetAddr,
        address anchorAddr,
        bool setTickerFeeds,
        Enums.OracleType[2] memory oracles,
        address[2] memory feeds,
        AssetIdentity memory identity
    ) internal requiresKresko returns (Asset memory config_) {
        config_ = _createKrAssetConfig(ticker, anchorAddr, oracles, identity);
        kresko.addAsset(assetAddr, config_, setTickerFeeds ? feeds : SKIP_FEEDS);
        return config_;
    }

    function addKrAsset(
        bytes32 ticker,
        bool setTickerFeeds,
        Enums.OracleType[2] memory oracles,
        address[2] memory feeds,
        KrAssetDeployInfo memory deployed,
        AssetIdentity memory identity
    ) internal returns (KrAssetInfo memory assetInfo_) {
        assetInfo_.addr = address(deployed.krAsset);
        assetInfo_.krAsset = deployed.krAsset;
        assetInfo_.anchor = deployed.anchor;
        assetInfo_.asToken = IERC20(assetInfo_.addr);

        assetInfo_.feedAddr = feeds[0] == address(0) ? feeds[1] : feeds[0];
        assetInfo_.feed = IAggregatorV3(assetInfo_.feedAddr);
        assetInfo_.mockFeed = MockOracle(assetInfo_.feedAddr);

        assetInfo_.config = _addKrAsset(
            ticker,
            assetInfo_.addr,
            address(deployed.anchor),
            setTickerFeeds,
            oracles,
            feeds,
            identity
        );
        assetInfo_.underlyingAddr = deployed.underlyingAddr;

        return assetInfo_;
    }

    function addCollateral(
        bytes32 ticker,
        address assetAddr,
        bool setTickerFeeds,
        Enums.OracleType[2] memory oracles,
        address[2] memory feeds,
        AssetIdentity memory identity
    ) internal requiresKresko returns (Asset memory config_) {
        config_ = kresko.getAsset(assetAddr);
        config_.ticker = ticker;
        config_.oracles = oracles;
        config_.factor = 1e4;

        if (identity.collateral) {
            config_.isMinterCollateral = true;
            config_.liqIncentive = 1.1e4;
        }

        if (identity.scdpDepositable) {
            config_.isSharedCollateral = true;
            config_.isSharedOrSwappedCollateral = true;
            config_.depositLimitSCDP = type(uint128).max;
        }
        kresko.addAsset(assetAddr, config_, setTickerFeeds ? feeds : SKIP_FEEDS);
        return config_;
    }

    function addKISS(KISSDeployInfo memory _kissContracts) internal returns (KISSDeployInfo memory) {
        _kissContracts.config = addKISS(_kissContracts.addr, _kissContracts.vaultAddr, kiss_default).config;
        return _kissContracts;
    }

    function addKISS(
        address kissAddr,
        address vaultAddr,
        AssetIdentity memory identity
    ) internal requiresKresko returns (KISSDeployInfo memory kissContracts_) {
        kissContracts_.config.ticker = bytes32("KISS");
        kissContracts_.config.anchor = kissAddr;
        kissContracts_.config.oracles = OT_KISS;
        kissContracts_.config.maxDebtMinter = type(uint128).max;

        kissContracts_.config.factor = 1e4;
        kissContracts_.config.kFactor = 1e4;

        if (identity.collateral) {
            kissContracts_.config.isMinterCollateral = true;
            kissContracts_.config.liqIncentive = 1.1e4;
        }

        if (identity.krAsset) {
            kissContracts_.config.isMinterMintable = true;
            kissContracts_.config.openFee = 0.02e4;
            kissContracts_.config.closeFee = 0.02e4;
        }

        if (identity.scdpDepositable) {
            kissContracts_.config.isSharedCollateral = true;
            kissContracts_.config.depositLimitSCDP = type(uint128).max;
        }

        if (identity.scdpKrAsset) {
            kissContracts_.config.isSwapMintable = true;
            kissContracts_.config.swapInFeeSCDP = 0.02e4;
            kissContracts_.config.swapOutFeeSCDP = 0.02e4;
            kissContracts_.config.protocolFeeShareSCDP = 0.25e4;
            kissContracts_.config.liqIncentiveSCDP = 1.1e4;
            kissContracts_.config.maxDebtSCDP = type(uint256).max;
        }

        kresko.addAsset(kissAddr, kissContracts_.config, [vaultAddr, address(0)]);
        kissContracts_.addr = kissAddr;
        kissContracts_.vaultAddr = vaultAddr;
        kissContracts_.kiss = KISS(kissAddr);
        kissContracts_.vault = Vault(vaultAddr);

        kissContracts_.asToken = IERC20(kissAddr);
        return kissContracts_;
    }

    function _createKrAssetConfig(
        bytes32 ticker,
        address anchor,
        Enums.OracleType[2] memory oracles,
        AssetIdentity memory identity
    ) internal pure returns (Asset memory config_) {
        config_.ticker = ticker;
        config_.anchor = anchor;
        config_.oracles = oracles;

        config_.kFactor = 1.2e4;
        config_.factor = 1e4;
        config_.maxDebtMinter = type(uint128).max;

        if (identity.krAsset) {
            config_.isMinterMintable = true;

            config_.openFee = 0.02e4;
            config_.closeFee = 0.02e4;
        }

        if (identity.collateral) {
            config_.isMinterCollateral = true;
            config_.liqIncentive = 1.1e4;
        }

        if (identity.scdpKrAsset) {
            config_.isSwapMintable = true;
            config_.swapInFeeSCDP = 0.02e4;
            config_.swapOutFeeSCDP = 0.02e4;
            config_.protocolFeeShareSCDP = 0.25e4;
            config_.liqIncentiveSCDP = 1.1e4;
            config_.maxDebtSCDP = type(uint256).max;
        }

        if (identity.scdpDepositable) {
            config_.isSharedCollateral = true;
            config_.depositLimitSCDP = type(uint128).max;
        }
        return config_;
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

    function deployKISS(
        address kreskoAddr,
        address vaultAddr,
        address admin
    ) internal needsProxyFactory returns (KISSDeployInfo memory kissInfo_) {
        require(kreskoAddr != address(0), "deployKISS: Kresko address is zero");
        require(vaultAddr != address(0), "deployKISS: Vault address is zero");
        Proxy memory proxy = proxyFactory.create3ProxyAndLogic(
            type(KISS).creationCode,
            abi.encodeCall(KISS.initialize, ("Kresko: KISS", "KISS", 18, admin, kreskoAddr, vaultAddr)),
            getKISSSalt()
        );
        kissInfo_.addr = address(proxy.proxy);
        kissInfo_.kiss = KISS(kissInfo_.addr);

        kissInfo_.vaultAddr = vaultAddr;
        kissInfo_.vault = Vault(vaultAddr);
        kissInfo_.asToken = IERC20(kissInfo_.addr);
        return kissInfo_;
    }

    function deployKrAsset(
        string memory name,
        string memory symbol,
        address underlyingAddr,
        address admin,
        address treasury
    ) internal needsProxyFactory returns (KrAssetDeployInfo memory) {
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
            KrAssetDeployInfo({
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
        CoreConfig memory args
    ) internal needsProxyFactory returns (KrAssetInfo memory result) {
        KrAssetDeployInfo memory deployment = deployKrAsset(name, symbol, underlyingAddr, args.admin, args.treasury);

        result.addr = deployment.addr;
        result.krAsset = deployment.krAsset;
        result.anchor = deployment.anchor;

        result.asToken = IERC20(result.addr);
        result.underlyingAddr = deployment.underlyingAddr;

        result.mockFeed = deployMockOracle(symbol, price, 8);
        result.feedAddr = address(result.mockFeed);
        result.feed = IAggregatorV3(result.feedAddr);

        return result;
    }

    function mockKrAsset(
        bytes32 ticker,
        address underlyingAddr,
        MockConfig memory config,
        AssetIdentity memory identity,
        CoreConfig memory args
    ) internal returns (KrAssetInfo memory result) {
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
        AssetIdentity memory identity
    ) internal returns (MockTokenDeployInfo memory result) {
        result.mock = deployMockToken(config.symbol, config.symbol, config.tknDecimals, 0);
        result.addr = address(result.mock);
        result.asToken = IERC20(result.addr);

        result.mockFeed = deployMockOracle(config.symbol, config.price, config.oracleDecimals);
        result.feedAddr = address(result.mockFeed);
        result.feed = IAggregatorV3(result.feedAddr);

        result.config = addCollateral(ticker, result.addr, config.setFeeds, OT_RS_CL, [address(0), result.feedAddr], identity);
    }

    function deployMockTokenAndOracle(MockConfig memory config) internal returns (MockTokenDeployInfo memory result) {
        result.mock = deployMockToken(config.symbol, config.symbol, config.tknDecimals, 0);
        result.addr = address(result.mock);
        result.asToken = IERC20(result.addr);

        result.mockFeed = deployMockOracle(config.symbol, config.price, config.oracleDecimals);
        result.feedAddr = address(result.mockFeed);
        result.feed = IAggregatorV3(result.feedAddr);
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

abstract contract KreskoForgeUtils is NonDiamondDeployUtils {}
