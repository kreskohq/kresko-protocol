// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.19;
import {Deployment, DeploymentFactory} from "factory/DeploymentFactory.sol";
import {JSON, LibConfig} from "scripts/utils/libs/LibConfig.s.sol";
import {Vault} from "vault/Vault.sol";
import {KreskoAssetAnchor} from "kresko-asset/KreskoAssetAnchor.sol";
import {Conversions} from "libs/Utils.sol";
import {KreskoAsset} from "kresko-asset/KreskoAsset.sol";
import {IKreskoAsset} from "kresko-asset/IKreskoAsset.sol";
import {KISS} from "kiss/KISS.sol";
import {DataV1} from "periphery/DataV1.sol";
import {KrMulticall} from "periphery/KrMulticall.sol";
import {Role} from "common/Constants.sol";
import {IKresko} from "periphery/IKresko.sol";
import {Log} from "kresko-lib/utils/Libs.sol";
import {GatingManager} from "periphery/GatingManager.sol";

library LibDeploy {
    using Conversions for bytes[];
    using Log for *;
    bytes32 internal constant DEPLOY_STATE_SLOT = keccak256("DeployState");

    struct DeployedKrAsset {
        address addr;
        address anchorAddr;
        JSON.KrAssetConfig config;
    }
    struct DeployedKISS {
        address addr;
        JSON.KISSConfig config;
    }
    struct DeployState {
        DeploymentFactory factory;
        address vault;
        DeployedKISS kiss;
        mapping(string => DeployedKrAsset) krAssets;
        mapping(bytes32 => Deployment) deployments;
    }

    function state() internal pure returns (DeployState storage ds) {
        bytes32 slot = DEPLOY_STATE_SLOT;
        assembly {
            ds.slot := slot
        }
    }

    function createFactory(address _admin) internal returns (DeploymentFactory result) {
        result = new DeploymentFactory(_admin);
        state().factory = result;

        Log.clg("Factory deployed");
        Log.clg("Factory address", address(result));
    }

    function createGatingManager(JSON.ChainConfig memory cfg) internal returns (GatingManager) {
        bytes memory implementation = abi.encodePacked(
            type(GatingManager).creationCode,
            abi.encode(cfg.periphery.officallyKreskianNFT, cfg.periphery.questForKreskNFT, cfg.gatingPhase)
        );
        Deployment memory deployment = state().factory.deployCreate3(implementation, "", bytes32("GatingManager"));
        state().deployments[bytes32("GatingManager")] = deployment;
        return GatingManager(deployment.implementation);
        // bytes memory implementation = new GatingManager(Addr.OFFICIALLY_KRESKIAN, Addr.QUEST_FOR_KRESK, 0);
    }

    function createKISS(
        address kresko,
        address vault,
        JSON.ChainConfig memory chainCfg,
        JSON.KISSConfig memory cfg
    ) internal returns (KISS) {
        require(kresko != address(0), "deployKISS: !Kresko");
        require(vault != address(0), "deployKISS: !Vault ");

        Deployment memory deployment = state().factory.create3ProxyAndLogic(
            type(KISS).creationCode,
            abi.encodeCall(KISS.initialize, (cfg.name, cfg.symbol, 18, chainCfg.common.admin, kresko, vault)),
            LibConfig.KISS_SALT
        );
        state().deployments[LibConfig.KISS_SALT] = deployment;
        state().kiss = DeployedKISS({addr: address(deployment.proxy), config: cfg});
        return KISS(address(deployment.proxy));
    }

    function createVault(JSON.ChainConfig memory cfg, JSON.KISSConfig memory kissCfg) internal returns (Vault) {
        string memory name = string.concat(LibConfig.VAULT_NAME_PREFIX, kissCfg.name);
        string memory symbol = "vKISS";
        bytes memory implementation = abi.encodePacked(
            type(Vault).creationCode,
            abi.encode(name, symbol, 18, 8, cfg.common.admin, cfg.common.treasury, cfg.common.sequencerUptimeFeed)
        );
        Deployment memory deployment = state().factory.deployCreate3(implementation, "", LibConfig.VAULT_SALT);
        state().deployments[LibConfig.VAULT_SALT] = deployment;
        state().vault = deployment.implementation;

        Log.clg("Vault deployed");
        Log.clg("address", address(deployment.implementation));
        return Vault(deployment.implementation);
    }

    function createDataV1(
        address _kresko,
        address _vault,
        address _kiss,
        JSON.ChainConfig memory cfg
    ) internal returns (DataV1) {
        bytes memory dataV1Impl = abi.encodePacked(
            type(DataV1).creationCode,
            abi.encode(_kresko, _vault, _kiss, cfg.periphery.officallyKreskianNFT, cfg.periphery.questForKreskNFT)
        );
        Deployment memory deployment = state().factory.deployCreate3(dataV1Impl, "", bytes32("DataV1"));
        state().deployments[bytes32("DataV1")] = deployment;

        Log.clg("DataV1 deployed");
        Log.clg("address", address(deployment.implementation));
        return DataV1(deployment.implementation);
    }

    function createMulticall(address _kresko, address _kiss, JSON.ChainConfig memory cfg) internal returns (KrMulticall) {
        bytes memory multicallImpl = abi.encodePacked(
            type(KrMulticall).creationCode,
            abi.encode(_kresko, _kiss, cfg.periphery.v3SwapRouter02, cfg.periphery.wrappedNative)
        );
        Deployment memory deployment = state().factory.deployCreate3(multicallImpl, "", bytes32("KrMulticall"));
        IKresko(_kresko).grantRole(Role.MANAGER, address(deployment.implementation));

        state().deployments[bytes32("KrMulticall")] = deployment;

        Log.clg("Multicall deployed");
        Log.clg("address", address(deployment.implementation));

        return KrMulticall(payable(deployment.implementation));
    }

    function createPeriphery(
        address _kresko,
        address _vault,
        address _kiss,
        JSON.ChainConfig memory cfg
    ) internal returns (DataV1, KrMulticall) {
        return (createDataV1(_kresko, _vault, _kiss, cfg), createMulticall(_kresko, _kiss, cfg));
    }

    function createKrAssets(
        address kresko,
        JSON.ChainConfig memory cfg,
        JSON.Assets memory _assetCfg
    ) internal returns (JSON.Assets memory) {
        for (uint256 i; i < _assetCfg.kreskoAssets.length; i++) {
            JSON.KrAssetConfig memory asset = _assetCfg.kreskoAssets[i];
            DeployedKrAsset memory deployment = deployKrAsset(kresko, cfg, asset);

            _assetCfg.kreskoAssets[i].config.anchor = deployment.anchorAddr;
            state().krAssets[asset.symbol] = deployment;
        }

        return _assetCfg;
    }

    function deployKrAsset(
        address kresko,
        JSON.ChainConfig memory chainCfg,
        JSON.KrAssetConfig memory cfg
    ) internal returns (DeployedKrAsset memory result) {
        LibConfig.KrAssetMetadata memory meta = LibConfig.getKrAssetMetadata(cfg);
        bytes memory KR_ASSET_INITIALIZER = abi.encodeCall(
            KreskoAsset.initialize,
            (
                cfg.name,
                cfg.symbol,
                18,
                chainCfg.common.admin,
                kresko,
                cfg.underlyingAddr,
                chainCfg.common.treasury,
                cfg.wrapFee,
                cfg.unwrapFee
            )
        );
        (address predictedAddress, ) = state().factory.previewCreate3ProxyAndLogic(meta.krAssetSalt);
        bytes memory ANCHOR_IMPL = abi.encodePacked(type(KreskoAssetAnchor).creationCode, abi.encode(predictedAddress));
        bytes memory ANCHOR_INITIALIZER = abi.encodeCall(
            KreskoAssetAnchor.initialize,
            (IKreskoAsset(predictedAddress), meta.anchorName, meta.anchorSymbol, chainCfg.common.admin)
        );
        bytes[] memory batch = new bytes[](2);
        batch[0] = abi.encodeCall(
            state().factory.create3ProxyAndLogic,
            (type(KreskoAsset).creationCode, KR_ASSET_INITIALIZER, meta.krAssetSalt)
        );
        batch[1] = abi.encodeCall(state().factory.create3ProxyAndLogic, (ANCHOR_IMPL, ANCHOR_INITIALIZER, meta.anchorSalt));
        Deployment[] memory proxies = state().factory.batch(batch).map(Conversions.toDeployment);
        result.addr = address(proxies[0].proxy);
        result.anchorAddr = address(proxies[1].proxy);
        state().deployments[meta.krAssetSalt] = proxies[0];
        state().deployments[meta.anchorSalt] = proxies[1];

        cfg.symbol.clg("Deployed");
        result.addr.clg("Address");
        result.anchorAddr.clg("Anchor");
    }
}
