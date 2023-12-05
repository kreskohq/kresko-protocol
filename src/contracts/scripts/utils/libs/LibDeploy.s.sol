// solhint-disable var-name-mixedcase
// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.19;
import {Deployment, DeploymentFactory} from "factory/DeploymentFactory.sol";
import {JSON, LibDeployConfig} from "scripts/utils/libs/LibDeployConfig.s.sol";
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
import {LibVm, Log, VM} from "kresko-lib/utils/Libs.sol";
import {GatingManager} from "periphery/GatingManager.sol";

library LibDeploy {
    function initOutputJSON(string memory configId) internal {
        string memory outputDir = string.concat("./deploy/", VM.toString(block.chainid));
        if (!VM.exists(outputDir)) VM.createDir(outputDir, true);
        state().outputName = string.concat(outputDir, "/", configId);
        state().outputJson = configId;
    }

    function saveOutputJSON() internal {
        VM.writeFile(string.concat(state().outputName, "-", VM.toString(VM.unixTime()), ".json"), state().outputJson);
        VM.writeFile(string.concat(state().outputName, "-", "latest", ".json"), state().outputJson);
    }

    function state() internal pure returns (DeployState storage ds) {
        bytes32 slot = DEPLOY_STATE_SLOT;
        assembly {
            ds.slot := slot
        }
    }

    modifier json(string memory id) {
        init(id);
        _;
        save();
    }

    function createFactory(address _admin) internal json("Factory") returns (DeploymentFactory result) {
        result = new DeploymentFactory(_admin);
        setAddr("address", address(result));
        state().factory = result;
    }

    function createGatingManager(JSON.ChainConfig memory cfg) internal json("GatingManager") returns (GatingManager) {
        bytes memory implementation = type(GatingManager).creationCode.ctor(
            abi.encode(LibVm.sender(), cfg.periphery.officallyKreskianNFT, cfg.periphery.questForKreskNFT, 0)
        );
        Deployment memory deployment = implementation.d3("", bytes32("GatingManager"));
        state().deployments[bytes32("GatingManager")] = deployment;
        return GatingManager(deployment.implementation);
    }

    function createKISS(
        address kresko,
        address vault,
        JSON.ChainConfig memory chainCfg,
        JSON.KISSConfig memory cfg
    ) internal json("KISS") returns (KISS) {
        require(kresko != address(0), "deployKISS: !Kresko");
        require(vault != address(0), "deployKISS: !Vault");

        Deployment memory deployment = type(KISS).creationCode.p3(
            abi.encodeCall(KISS.initialize, (cfg.name, cfg.symbol, 18, chainCfg.common.admin, kresko, vault)),
            LibDeployConfig.KISS_SALT
        );
        state().deployments[LibDeployConfig.KISS_SALT] = deployment;
        state().kiss = DeployedKISS({addr: address(deployment.proxy), config: cfg});
        return KISS(address(deployment.proxy));
    }

    function createVault(JSON.ChainConfig memory cfg, JSON.KISSConfig memory kissCfg) internal json("Vault") returns (Vault) {
        string memory name = string.concat(LibDeployConfig.VAULT_NAME_PREFIX, kissCfg.name);
        bytes memory impl = type(Vault).creationCode.ctor(
            abi.encode(name, "vKISS", 18, 8, cfg.common.admin, cfg.common.treasury, cfg.common.sequencerUptimeFeed)
        );
        Deployment memory deployment = impl.d3("", LibDeployConfig.VAULT_SALT);
        state().deployments[LibDeployConfig.VAULT_SALT] = deployment;
        state().vault = deployment.implementation;
        return Vault(deployment.implementation);
    }

    function createDataV1(
        address _kresko,
        address _vault,
        address _kiss,
        JSON.ChainConfig memory cfg
    ) internal json("DataV1") returns (DataV1) {
        bytes memory dataV1Impl = abi.encodePacked(
            type(DataV1).creationCode,
            abi.encode(_kresko, _vault, _kiss, cfg.periphery.officallyKreskianNFT, cfg.periphery.questForKreskNFT)
        );
        Deployment memory deployment = dataV1Impl.d3("", bytes32("DataV1"));
        state().deployments[bytes32("DataV1")] = deployment;
        return DataV1(deployment.implementation);
    }

    function createMulticall(
        address _kresko,
        address _kiss,
        JSON.ChainConfig memory cfg
    ) internal json("Multicall") returns (KrMulticall) {
        bytes memory multicallImpl = type(KrMulticall).creationCode.ctor(
            abi.encode(_kresko, _kiss, cfg.periphery.v3SwapRouter02, cfg.periphery.wrappedNative)
        );
        Deployment memory deployment = multicallImpl.d3("", bytes32("KrMulticall"));
        IKresko(_kresko).grantRole(Role.MANAGER, address(deployment.implementation));

        state().deployments[bytes32("KrMulticall")] = deployment;

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
        init(cfg.symbol);
        LibDeployConfig.KrAssetMetadata memory meta = LibDeployConfig.getKrAssetMetadata(cfg);
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
        (address proxyAddr, address implAddr) = meta.krAssetSalt.pp3();
        setAddr("address", proxyAddr);
        setAddr("implementation", implAddr);
        save();

        init(meta.anchorSymbol);
        bytes memory ANCHOR_IMPL = type(KreskoAssetAnchor).creationCode.ctor(abi.encode(proxyAddr));
        bytes memory ANCHOR_INITIALIZER = abi.encodeCall(
            KreskoAssetAnchor.initialize,
            (IKreskoAsset(proxyAddr), meta.anchorName, meta.anchorSymbol, chainCfg.common.admin)
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
        setAddr("address", result.anchorAddr);
        setAddr("implementation", proxies[1].implementation);
        save();
    }

    function pd3(bytes32 salt) internal view returns (address) {
        return state().factory.getCreate3Address(salt);
    }

    function pp3(bytes32 salt) internal view returns (address, address) {
        return state().factory.previewCreate3ProxyAndLogic(salt);
    }

    function ctor(bytes memory bc, bytes memory args) internal returns (bytes memory) {
        state().currentJson = VM.serializeBytes(state().currentKey, "ctor", args);
        return abi.encodePacked(bc, args);
    }

    function d3(bytes memory bc, bytes memory d, bytes32 s) internal returns (Deployment memory result) {
        result = state().factory.deployCreate3(bc, d, s);
        setAddr("address", result.implementation);
    }

    function p3(bytes memory bc, bytes memory d, bytes32 s) internal returns (Deployment memory result) {
        result = state().factory.create3ProxyAndLogic(bc, d, s);
        setAddr("address", address(result.proxy));
        setAddr("implementation", result.implementation);
    }

    function init(string memory id) internal {
        state().currentKey = id;
        state().currentJson = "";
    }

    function setAddr(string memory key, address val) internal {
        state().currentJson = VM.serializeAddress(state().currentKey, key, val);
    }

    function save() internal {
        state().outputJson = VM.serializeString("testing", state().currentKey, state().currentJson);
    }

    function saveChainConfig(JSON.Assets memory assets, JSON.ChainConfig memory cfg) internal {
        for (uint256 i; i < assets.extAssets.length; i++) {
            JSON.ExtAssetConfig memory ext = assets.extAssets[i];
            init(ext.symbol);
            setAddr("address", ext.addr);
            save();
        }
        init("NativeWrapper");
        setAddr("address", cfg.periphery.wrappedNative);
        save();
    }

    function disableLog() internal {
        state().disableLog = true;
    }

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
        string outputName;
        string currentKey;
        string currentJson;
        string outputJson;
        DeploymentFactory factory;
        address vault;
        DeployedKISS kiss;
        mapping(string => DeployedKrAsset) krAssets;
        mapping(bytes32 => Deployment) deployments;
        bool disableLog;
    }

    using Conversions for bytes[];
    using Log for *;
    using LibDeploy for bytes;
    using LibDeploy for bytes32;
}
