// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.21;
// solhint-disable var-name-mixedcase
// solhint-disable no-empty-blocks
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
import {LibSafe, GnosisSafeL2Mock} from "kresko-lib/mocks/MockSafe.sol";

abstract contract ConfigurationUtils is KreskoForgeBase {
    OracleType[2] internal ORACLES_RS_CL = [OracleType.Redstone, OracleType.Chainlink];
    OracleType[2] internal ORACLES_KISS = [OracleType.Vault, OracleType.Empty];
    AssetIdentity internal defaultCollateral =
        AssetIdentity({collateral: true, krAsset: false, scdpDepositable: false, scdpKrAsset: false});

    AssetIdentity internal defaultKrAsset =
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
        KrDeployExtended memory deploy,
        AssetIdentity memory identity
    ) internal returns (KrDeployExtended memory) {
        deploy.config = _createKrAssetConfig(underlyingId, address(deploy.anchor), oracles, identity);
        deploy.oracle = MockOracle(feeds[0] == address(0) ? feeds[1] : feeds[0]);
        deploy.oracleAddr = address(deploy.oracle);
        kresko.addAsset(address(deploy.krAsset), deploy.config, FeedConfiguration(oracles, feeds), updateFeeds);
        return deploy;
    }

    function _addKrAsset(
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

    function addKrAsset(
        bytes12 underlyingId,
        bool updateFeeds,
        OracleType[2] memory oracles,
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

        result.config = _addKrAsset(underlyingId, result.addr, address(deploy.anchor), updateFeeds, oracles, feeds, identity);

        return result;
    }

    function addCollateral(
        bytes12 underlyingId,
        address assetAddr,
        bool updateFeeds,
        OracleType[2] memory oracles,
        address[2] memory feeds,
        AssetIdentity memory identity
    ) internal returns (Asset memory config) {
        config = kresko.getAsset(assetAddr);
        config.underlyingId = underlyingId;
        config.oracles = oracles;
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
        kresko.addAsset(assetAddr, config, FeedConfiguration(oracles, feeds), updateFeeds);
    }

    function addKISS(
        address kissAddr,
        address vaultAddr,
        AssetIdentity memory identity
    ) internal returns (KISSConfig memory result) {
        result.config.underlyingId = bytes12("KISS");
        result.config.anchor = kissAddr;
        result.config.oracles = ORACLES_KISS;
        result.config.supplyLimit = type(uint128).max;

        result.config.factor = 1e4;
        result.config.kFactor = 1e4;

        if (identity.collateral) {
            result.config.isCollateral = true;
            result.config.liqIncentive = 1.1e4;
        }

        if (identity.krAsset) {
            result.config.isKrAsset = true;
            result.config.openFee = 0.02e4;
            result.config.closeFee = 0.02e4;
        }

        if (identity.scdpDepositable) {
            result.config.isSCDPDepositAsset = true;
            result.config.depositLimitSCDP = type(uint128).max;
        }

        if (identity.scdpKrAsset) {
            result.config.isSCDPKrAsset = true;
            result.config.swapInFeeSCDP = 0.02e4;
            result.config.swapOutFeeSCDP = 0.02e4;
            result.config.protocolFeeShareSCDP = 0.25e4;
            result.config.liqIncentiveSCDP = 1.1e4;
        }

        kresko.addAsset(kissAddr, result.config, FeedConfiguration(ORACLES_KISS, [vaultAddr, address(0)]), true);
        result.addr = kissAddr;
        result.vaultAddr = vaultAddr;
    }

    function _createKrAssetConfig(
        bytes12 underlyingId,
        address anchor,
        OracleType[2] memory oracles,
        AssetIdentity memory identity
    ) internal pure returns (Asset memory config) {
        config.underlyingId = underlyingId;
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
        config.oracles = ORACLES_RS_CL;
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
    ) internal returns (KrDeploy memory result) {
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

    function deployKrAssetWithOracle(
        string memory name,
        string memory symbol,
        uint256 price,
        address underlyingAddr,
        DeployArgs memory args
    ) internal returns (KrDeployExtended memory result) {
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
        bytes12 underlyingId,
        address underlyingAddr,
        MockConfig memory config,
        AssetIdentity memory identity,
        DeployArgs memory args
    ) internal returns (KrDeployExtended memory result) {
        result = deployKrAssetWithOracle(config.symbol, config.symbol, config.price, underlyingAddr, args);
        result.config = _addKrAsset(
            underlyingId,
            result.addr,
            address(result.anchor),
            config.updateFeeds,
            ORACLES_RS_CL,
            [address(0), result.oracleAddr],
            identity
        );
    }

    function mockCollateral(
        bytes12 underlyingId,
        MockConfig memory config,
        AssetIdentity memory identity
    ) internal returns (MockCollDeploy memory result) {
        result.asset = deployMockToken(config.symbol, config.symbol, config.tknDecimals, 0);
        result.addr = address(result.asset);
        result.oracle = deployMockOracle(config.symbol, config.price, config.oracleDecimals);
        result.oracleAddr = address(result.oracle);
        result.config = addCollateral(
            underlyingId,
            result.addr,
            config.updateFeeds,
            ORACLES_RS_CL,
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
}

abstract contract KreskoForgeUtils is NonDiamondDeployUtils {}
