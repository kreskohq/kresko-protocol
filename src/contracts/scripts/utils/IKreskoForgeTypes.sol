// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import {MockERC20} from "mocks/MockERC20.sol";
import {KreskoAsset} from "kresko-asset/KreskoAsset.sol";
import {KreskoAssetAnchor} from "kresko-asset/KreskoAssetAnchor.sol";
import {MockOracle} from "mocks/MockOracle.sol";
import {Asset} from "common/Types.sol";

interface IKreskoForgeTypes {
    struct AssetIdentity {
        bool krAsset;
        bool collateral;
        bool scdpKrAsset;
        bool scdpDepositable;
    }
    struct DeployArgs {
        uint32 minterMcr;
        uint32 minterLt;
        uint32 scdpMcr;
        uint32 scdpLt;
        uint32 oracleTimeout;
        uint8 sdiPrecision;
        uint8 oraclePrecision; // @note deprecated, removed soon
        address admin;
        address seqFeed;
        address council; // needs to be a contraaact
        address treasury;
    }

    struct KrDeploy {
        address addr;
        KreskoAsset krAsset;
        KreskoAssetAnchor anchor;
        address underlyingAddr;
    }

    struct KrDeployExtended {
        address addr;
        address oracleAddr;
        KreskoAsset krAsset;
        KreskoAssetAnchor anchor;
        address underlyingAddr;
        MockOracle oracle;
        Asset config;
    }

    struct MockCollDeploy {
        address addr;
        address oracleAddr;
        MockERC20 asset;
        MockOracle oracle;
        Asset config;
    }
    struct KISSConfig {
        Asset config;
        address addr;
        address vaultAddr;
    }

    struct TestUserConfig {
        address addr;
        uint256 idx;
        uint256 daiBalance;
        uint256 usdcBalance;
        uint256 usdtBalance;
        uint256 wethBalance;
    }
}
