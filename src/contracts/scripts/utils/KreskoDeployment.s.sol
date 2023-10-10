// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.21;

import {FeedConfiguration, Asset, OracleType} from "common/Types.sol";
import {Role} from "common/Constants.sol";
import {PairSetter} from "scdp/Types.sol";
import {MockOracle} from "mocks/MockOracle.sol";
import {MockERC20} from "mocks/MockERC20.sol";

import {KreskoAsset} from "kresko-asset/KreskoAsset.sol";
import {KreskoAssetAnchor} from "kresko-asset/KreskoAssetAnchor.sol";
import {IKreskoAsset} from "kresko-asset/IKreskoAsset.sol";
import {KreskoForgeBase} from "scripts/utils/KreskoForgeBase.s.sol";

abstract contract KreskoDeployment is KreskoForgeBase {
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
        bytes12 redstoneId,
        address admin,
        uint256 price,
        bool asCollateral,
        bool asSCDPKrAsset,
        bool asSCDPDepositAsset
    ) internal returns (KreskoAsset krAsset, KreskoAssetAnchor anchor, MockOracle oracle) {
        krAsset = new KreskoAsset();
        krAsset.initialize(_symbol, _symbol, 18, admin, address(kresko), address(0), TREASURY, 0, 0);
        anchor = new KreskoAssetAnchor(IKreskoAsset(krAsset));
        anchor.initialize(IKreskoAsset(krAsset), string.concat("a", _symbol), string.concat("a", _symbol), admin);

        krAsset.grantRole(Role.OPERATOR, address(anchor));
        krAsset.setAnchorToken(address(anchor));
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
        bytes12 redstoneId,
        uint8 decimals,
        uint256 price,
        bool asSCDPDepositAsset
    ) internal returns (MockERC20 collateral, MockOracle oracle) {
        collateral = new MockERC20(id, id, decimals, 0);
        oracle = new MockOracle(id, price, 8);
        addExternalAsset(address(collateral), address(oracle), redstoneId, asSCDPDepositAsset);
        return (collateral, oracle);
    }

    function addExternalAsset(address asset, address oracle, bytes12 redstoneId, bool isSCDPDepositAsset) internal {
        OracleType[2] memory oracleTypes = [OracleType.Redstone, OracleType.Chainlink];
        FeedConfiguration memory feeds = FeedConfiguration(oracleTypes, [address(0), oracle]);
        Asset memory config = kresko.getAsset(asset);
        config.underlyingId = bytes12(redstoneId);
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
        bytes12 underlyingId,
        bool isCollateral,
        bool isSCDPKrAsset,
        bool isSCDPDepositAsset
    ) internal {
        OracleType[2] memory oracleTypes = [OracleType.Redstone, OracleType.Chainlink];
        FeedConfiguration memory feeds = FeedConfiguration(oracleTypes, [address(0), oracle]);
        Asset memory config;
        config.underlyingId = bytes12(underlyingId);
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
            config.swapInFeeSCDP = 0.02e4;
            config.swapOutFeeSCDP = 0.02e4;
            config.protocolFeeShareSCDP = 0.25e4;
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
        require(config.underlyingId != bytes12(0), "Asset does not exist");

        config.liqIncentive = 1.1e4;
        config.isCollateral = true;
        config.factor = 1e4;
        config.oracles = [OracleType.Redstone, OracleType.Chainlink];
        kresko.updateAsset(asset, config);
    }
}
