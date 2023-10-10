// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.21;

import {FeedConfiguration, Asset, OracleType} from "common/Types.sol";
import {Role} from "common/Constants.sol";
import {PairSetter} from "scdp/Types.sol";
import {MockOracle} from "mocks/MockOracle.sol";
import {MockERC20, MockERC20Restricted} from "mocks/MockERC20.sol";
import {KreskoAsset} from "kresko-asset/KreskoAsset.sol";
import {KreskoAssetAnchor} from "kresko-asset/KreskoAssetAnchor.sol";
import {IKreskoAsset} from "kresko-asset/IKreskoAsset.sol";
import {KreskoForgeBase} from "scripts/utils/KreskoForgeBase.s.sol";
import {MockSequencerUptimeFeed} from "mocks/MockSequencerUptimeFeed.sol";
import {LibSafe, GnosisSafeL2Mock} from "kresko-helpers/mocks/MockSafe.sol";

interface IKreskoForgeUtilStructs {
    struct KreskoAssetDeploy {
        address addr;
        KreskoAsset krAsset;
        KreskoAssetAnchor anchor;
        address underlyingAddr;
    }

    struct KreskoAssetDeployResult {
        address addr;
        address oracleAddr;
        KreskoAsset krAsset;
        KreskoAssetAnchor anchor;
        address underlyingAddr;
        MockOracle oracle;
        Asset config;
    }

    struct MockCollateralDeployResult {
        address addr;
        address oracleAddr;
        MockERC20 asset;
        MockOracle oracle;
        Asset config;
    }
    struct KISSWhitelistResult {
        Asset config;
        address addr;
        address vaultAddr;
    }
    struct AssetIdentity {
        bool krAsset;
        bool collateral;
        bool scdpKrAsset;
        bool scdpDepositable;
    }
}

abstract contract ConfigurationUtils is IKreskoForgeUtilStructs, KreskoForgeBase {
    AssetIdentity internal minterCollateral =
        AssetIdentity({collateral: true, krAsset: false, scdpDepositable: false, scdpKrAsset: false});

    AssetIdentity internal nonScdpDepositableKrAsset =
        AssetIdentity({collateral: true, krAsset: true, scdpDepositable: false, scdpKrAsset: true});

    AssetIdentity internal onlySwappableKrAsset =
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
        bytes12 underlyingId,
        bool updateFeeds,
        OracleType[2] memory oracles,
        address[2] memory feeds,
        KreskoAssetDeployResult memory deploy,
        AssetIdentity memory identity
    ) internal returns (KreskoAssetDeployResult memory result) {
        result.config = _createKrAssetConfig(underlyingId, address(deploy.anchor), oracles, identity);
        result.krAsset = deploy.krAsset;
        result.addr = address(deploy.krAsset);
        result.anchor = deploy.anchor;
        result.oracle = MockOracle(feeds[0] == address(0) ? feeds[1] : feeds[0]);
        result.oracleAddr = address(result.oracle);
        result.underlyingAddr = deploy.underlyingAddr;
        kresko.addAsset(address(deploy.krAsset), result.config, FeedConfiguration(oracles, feeds), updateFeeds);
    }

    function addKrAsset(
        bytes12 underlyingId,
        address assetAddr,
        address anchorAddr,
        bool updateFeeds,
        OracleType[2] memory oracles,
        address[2] memory feeds,
        AssetIdentity memory identity
    ) internal returns (Asset memory result) {
        result = _createKrAssetConfig(underlyingId, anchorAddr, oracles, identity);
        kresko.addAsset(assetAddr, result, FeedConfiguration(oracles, feeds), updateFeeds);
    }

    function addKrAssetDeployed(
        bytes12 underlyingId,
        bool updateFeeds,
        OracleType[2] memory oracles,
        address[2] memory feeds,
        KreskoAssetDeploy memory deploy,
        AssetIdentity memory identity
    ) internal returns (KreskoAssetDeployResult memory result) {
        result.krAsset = deploy.krAsset;
        result.addr = address(deploy.krAsset);
        result.anchor = deploy.anchor;
        result.oracle = MockOracle(feeds[0] == address(0) ? feeds[1] : feeds[0]);
        result.oracleAddr = address(result.oracle);
        result.underlyingAddr = deploy.underlyingAddr;

        result.config = addKrAsset(
            underlyingId,
            address(deploy.krAsset),
            address(deploy.anchor),
            updateFeeds,
            oracles,
            feeds,
            identity
        );

        return result;
    }

    function addDeployedCollateral(
        bytes12 underlyingId,
        address assetAddr,
        address feedAddr,
        bool updateFeeds,
        AssetIdentity memory identity
    ) internal returns (Asset memory config) {
        OracleType[2] memory oracleTypes = [OracleType.Redstone, OracleType.Chainlink];

        config = kresko.getAsset(assetAddr);
        config.underlyingId = underlyingId;
        config.oracles = oracleTypes;
        config.factor = 1e4;

        if (identity.collateral) {
            config.isCollateral = true;
            config.liqIncentive = 1.1e4;
        }

        if (identity.scdpDepositable) {
            config.isSCDPDepositAsset = true;
            config.isSCDPCollateral = true;
            config.depositLimitSCDP = type(uint128).max;
        }
        kresko.addAsset(assetAddr, config, FeedConfiguration(oracleTypes, [address(0), feedAddr]), updateFeeds);
    }

    function addKISS(
        address kissAddr,
        address vaultAddr,
        AssetIdentity memory identity
    ) internal returns (KISSWhitelistResult memory result) {
        OracleType[2] memory oracleTypes = [OracleType.Vault, OracleType.Empty];
        Asset memory config;
        config.underlyingId = bytes12("KISS");
        config.anchor = kissAddr;
        config.oracles = oracleTypes;
        config.supplyLimit = type(uint128).max;

        config.factor = 1e4;
        config.kFactor = 1e4;

        if (identity.collateral) {
            config.isCollateral = true;
            config.liqIncentive = 1.1e4;
        }

        if (identity.krAsset) {
            config.isKrAsset = true;
            config.openFee = 0.02e4;
            config.closeFee = 0.02e4;
        }

        if (identity.scdpDepositable) {
            config.isSCDPDepositAsset = true;
            config.depositLimitSCDP = type(uint128).max;
        }

        if (identity.scdpKrAsset) {
            config.isSCDPKrAsset = true;
            config.swapInFeeSCDP = 0.02e4;
            config.swapOutFeeSCDP = 0.02e4;
            config.protocolFeeShareSCDP = 0.25e4;
            config.liqIncentiveSCDP = 1.1e4;
        }

        kresko.addAsset(kissAddr, config, FeedConfiguration(oracleTypes, [vaultAddr, address(0)]), true);

        result.config = config;
        result.addr = kissAddr;
        result.vaultAddr = vaultAddr;
    }

    function _createKrAssetConfig(
        bytes12 underlyingId,
        address anchor,
        OracleType[2] memory oracles,
        AssetIdentity memory identity
    ) internal pure returns (Asset memory config) {
        config.underlyingId = bytes12(underlyingId);
        config.anchor = anchor;
        config.oracles = oracles;

        config.kFactor = 1.2e4;
        config.factor = 1e4;
        config.supplyLimit = type(uint128).max;

        if (identity.krAsset) {
            config.isKrAsset = true;

            config.openFee = 0.02e4;
            config.closeFee = 0.02e4;
        }

        if (identity.collateral) {
            config.isCollateral = true;
            config.liqIncentive = 1.1e4;
        }

        if (identity.scdpKrAsset) {
            config.isSCDPKrAsset = true;
            config.swapInFeeSCDP = 0.02e4;
            config.swapOutFeeSCDP = 0.02e4;
            config.protocolFeeShareSCDP = 0.25e4;
            config.liqIncentiveSCDP = 1.1e4;
        }

        if (identity.scdpDepositable) {
            config.isSCDPDepositAsset = true;
            config.depositLimitSCDP = type(uint128).max;
        }
    }

    function enableSwapBothWays(address asset0, address asset1, bool enabled) internal {
        PairSetter[] memory swapPairsEnabled = new PairSetter[](2);
        swapPairsEnabled[0] = PairSetter({assetIn: asset0, assetOut: asset1, enabled: enabled});
        kresko.setSwapPairs(swapPairsEnabled);
    }

    function enableSwapSingleWay(address asset0, address asset1, bool enabled) internal {
        kresko.setSwapPairsSingle(PairSetter({assetIn: asset0, assetOut: asset1, enabled: enabled}));
    }

    function updateCollateralToDefaults(address assetAddr) internal {
        Asset memory config = kresko.getAsset(assetAddr);
        require(config.underlyingId != bytes12(0), "Asset does not exist");

        config.liqIncentive = 1.1e4;
        config.isCollateral = true;
        config.factor = 1e4;
        config.oracles = [OracleType.Redstone, OracleType.Chainlink];
        kresko.updateAsset(assetAddr, config);
    }
}

abstract contract NonDiamondDeployUtils is ConfigurationUtils {
    MockSequencerUptimeFeed internal mockSeqFeed;
    GnosisSafeL2Mock internal mockSafe;

    function getMockSeqFeed() internal returns (address) {
        return address((mockSeqFeed = new MockSequencerUptimeFeed()));
    }

    function getMockSafe(address admin) internal returns (address) {
        return address((mockSafe = LibSafe.createSafe(admin)));
    }

    struct MockConfig {
        string symbol;
        uint256 price;
        uint8 tknDecimals;
        uint8 oracleDecimals;
        bool updateFeeds;
    }

    function deployKrAsset(
        string memory name,
        string memory symbol,
        address underlyingAddr,
        address admin,
        address treasury
    ) internal returns (KreskoAssetDeploy memory result) {
        result.krAsset = new KreskoAsset();
        result.anchor = new KreskoAssetAnchor(IKreskoAsset(result.krAsset));

        result.krAsset.initialize(name, symbol, 18, admin, address(kresko), underlyingAddr, treasury, 0, 0);
        result.underlyingAddr = underlyingAddr;

        result.krAsset.grantRole(Role.OPERATOR, address(result.anchor));
        result.anchor.initialize(
            IKreskoAsset(result.krAsset),
            string.concat("Kresko Asset Anchor: ", symbol),
            string.concat("a", symbol),
            admin
        );
        result.krAsset.setAnchorToken(address(result.anchor));
        result.addr = address(result.krAsset);

        return result;
    }

    function deployKrAssetWithMocks(
        string memory name,
        string memory symbol,
        uint256 price,
        address underlyingAddr,
        DeployArgs memory args
    ) internal returns (KreskoAssetDeployResult memory result) {
        KreskoAssetDeploy memory deployment = deployKrAsset(name, symbol, underlyingAddr, args.admin, args.treasury);
        result.krAsset = deployment.krAsset;
        result.addr = deployment.addr;
        result.underlyingAddr = deployment.underlyingAddr;
        result.anchor = deployment.anchor;
        result.oracle = deployMockOracle(symbol, price, 8);
        result.oracleAddr = address(result.oracle);
        return result;
    }

    function deployAddKrAssetWithMocks(
        bytes12 underlyingId,
        address underlyingAddr,
        MockConfig memory config,
        AssetIdentity memory identity,
        DeployArgs memory args
    ) internal returns (KreskoAssetDeployResult memory result) {
        result = deployKrAssetWithMocks(config.symbol, config.symbol, config.price, underlyingAddr, args);
        result.config = addKrAsset(
            underlyingId,
            address(result.krAsset),
            address(result.anchor),
            config.updateFeeds,
            [OracleType.Redstone, OracleType.Chainlink],
            [address(result.oracle), address(result.oracle)],
            identity
        );
    }

    function deployAddCollateralWithMocks(
        bytes12 underlyingId,
        MockConfig memory config,
        AssetIdentity memory identity
    ) internal returns (MockCollateralDeployResult memory result) {
        result.asset = deployMockToken(config.symbol, config.symbol, config.tknDecimals, 0);
        result.addr = address(result.asset);
        result.oracle = deployMockOracle(config.symbol, config.price, config.oracleDecimals);
        result.oracleAddr = address(result.oracle);
        result.config = addDeployedCollateral(
            underlyingId,
            address(result.asset),
            address(result.oracle),
            config.updateFeeds,
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
}

abstract contract KreskoForgeUtils is NonDiamondDeployUtils {}
