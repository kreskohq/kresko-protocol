// solhint-disable var-name-mixedcase
// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.19;
import {Deployment, DeploymentFactory} from "factory/DeploymentFactory.sol";
import {LibDeployConfig} from "scripts/deploy/libs/LibDeployConfig.s.sol";
import "scripts/deploy/libs/JSON.s.sol" as JSON;
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
import {LibVm, Log, VM} from "kresko-lib/utils/Libs.s.sol";
import {GatingManager} from "periphery/GatingManager.sol";
import {Deployed} from "scripts/deploy/libs/Deployed.s.sol";

library LibDeploy {
    function initJSON(string memory configId) internal {
        string memory outputDir = string.concat("./out/foundry/deploy/", VM.toString(block.chainid), "/");
        if (!VM.exists(outputDir)) VM.createDir(outputDir, true);
        state().id = configId;
        state().outputLocation = outputDir;
        state().outputJson = configId;
    }

    function writeJSON() internal {
        string memory runsDir = string.concat(state().outputLocation, "runs/");
        if (!VM.exists(runsDir)) VM.createDir(runsDir, true);
        VM.writeFile(string.concat(runsDir, state().id, "-", VM.toString(VM.unixTime()), ".json"), state().outputJson);
        VM.writeFile(string.concat(state().outputLocation, state().id, "-", "latest", ".json"), state().outputJson);
    }

    function state() internal pure returns (DeployState storage ds) {
        bytes32 slot = DEPLOY_STATE_SLOT;
        assembly {
            ds.slot := slot
        }
    }

    modifier json(string memory id) {
        JSONKey(id);
        _;
        saveJSONKey();
    }

    function createFactory(address _admin) internal json("Factory") returns (DeploymentFactory result) {
        result = new DeploymentFactory(_admin);
        setJsonAddr("address", address(result));
        state().factory = result;
    }

    function createGatingManager(JSON.ChainConfig memory cfg) internal json("GatingManager") returns (GatingManager) {
        bytes memory implementation = type(GatingManager).creationCode.ctor(
            abi.encode(LibVm.sender(), cfg.periphery.okNFT, cfg.periphery.qfkNFT, 0)
        );
        return GatingManager(implementation.d3("", bytes32("GatingManager")).implementation);
    }

    function createKISS(
        address kresko,
        address vault,
        JSON.ChainConfig memory chainCfg,
        JSON.KISSConfig memory cfg
    ) internal json("KISS") returns (KISS) {
        require(kresko != address(0), "deployKISS: !Kresko");
        require(vault != address(0), "deployKISS: !Vault");
        bytes memory initializer = abi.encodeCall(
            KISS.initialize,
            (cfg.name, cfg.symbol, 18, chainCfg.common.admin, kresko, vault)
        );
        return KISS(address(type(KISS).creationCode.p3(initializer, LibDeployConfig.KISS_SALT).proxy));
    }

    function createVault(JSON.ChainConfig memory cfg, JSON.KISSConfig memory kissCfg) internal json("Vault") returns (Vault) {
        string memory name = string.concat(LibDeployConfig.VAULT_NAME_PREFIX, kissCfg.name);
        bytes memory implementation = type(Vault).creationCode.ctor(
            abi.encode(name, "vKISS", 18, 8, cfg.common.admin, cfg.common.treasury, cfg.common.sequencerUptimeFeed)
        );
        return Vault(implementation.d3("", LibDeployConfig.VAULT_SALT).implementation);
    }

    function createDataV1(
        address _kresko,
        address _vault,
        address _kiss,
        JSON.ChainConfig memory cfg
    ) internal json("DataV1") returns (DataV1) {
        bytes memory implementation = type(DataV1).creationCode.ctor(
            abi.encode(_kresko, _vault, _kiss, cfg.periphery.okNFT, cfg.periphery.qfkNFT)
        );
        return DataV1(implementation.d3("", bytes32("DataV1")).implementation);
    }

    function createMulticall(
        address _kresko,
        address _kiss,
        JSON.ChainConfig memory cfg
    ) internal json("Multicall") returns (KrMulticall) {
        bytes memory implementation = type(KrMulticall).creationCode.ctor(
            abi.encode(_kresko, _kiss, cfg.periphery.v3Router, cfg.periphery.wrappedNative)
        );
        address multicall = implementation.d3("", bytes32("KrMulticall")).implementation;
        IKresko(_kresko).grantRole(Role.MANAGER, multicall);
        return KrMulticall(payable(multicall));
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
    ) internal returns (JSON.Assets memory, DeployedKrAsset[] memory) {
        DeployedKrAsset[] memory result = new DeployedKrAsset[](_assetCfg.kreskoAssets.length);
        for (uint256 i; i < _assetCfg.kreskoAssets.length; i++) {
            result[i] = deployKrAsset(kresko, cfg, _assetCfg.kreskoAssets[i]);
            _assetCfg.kreskoAssets[i].config.anchor = result[i].anchorAddr;
        }

        return (_assetCfg, result);
    }

    function deployKrAsset(
        address kresko,
        JSON.ChainConfig memory chainCfg,
        JSON.KrAssetConfig memory cfg
    ) internal returns (DeployedKrAsset memory result) {
        JSONKey(cfg.symbol);
        LibDeployConfig.KrAssetMetadata memory meta = cfg.metadata();
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
        setJsonAddr("address", proxyAddr);
        setJsonBytes("initializer", KR_ASSET_INITIALIZER);
        setJsonAddr("implementation", implAddr);
        saveJSONKey();

        JSONKey(meta.anchorSymbol);
        bytes memory ANCHOR_IMPL = type(KreskoAssetAnchor).creationCode.ctor(abi.encode(proxyAddr));
        bytes memory ANCHOR_INITIALIZER = abi.encodeCall(
            KreskoAssetAnchor.initialize,
            (IKreskoAsset(proxyAddr), meta.anchorName, meta.anchorSymbol, chainCfg.common.admin)
        );

        // deploy krasset + anchor in batch
        bytes[] memory batch = new bytes[](2);
        batch[0] = abi.encodeCall(
            factory().create3ProxyAndLogic,
            (type(KreskoAsset).creationCode, KR_ASSET_INITIALIZER, meta.krAssetSalt)
        );
        batch[1] = abi.encodeCall(factory().create3ProxyAndLogic, (ANCHOR_IMPL, ANCHOR_INITIALIZER, meta.anchorSalt));
        Deployment[] memory proxies = factory().batch(batch).map(Conversions.toDeployment);

        result.addr = address(proxies[0].proxy);
        result.anchorAddr = address(proxies[1].proxy);

        setJsonAddr("address", result.anchorAddr);
        setJsonBytes("initializer", ANCHOR_INITIALIZER);
        setJsonAddr("implementation", proxies[1].implementation);
        saveJSONKey();
        result.json = cfg;
    }

    function pd3(bytes32 salt) internal returns (address) {
        return factory().getCreate3Address(salt);
    }

    function pp3(bytes32 salt) internal returns (address, address) {
        return factory().previewCreate3ProxyAndLogic(salt);
    }

    function ctor(bytes memory bcode, bytes memory args) internal returns (bytes memory ccode) {
        setJsonBytes("ctor", args);
        return abi.encodePacked(bcode, args);
    }

    function d3(bytes memory ccode, bytes memory _init, bytes32 _salt) internal returns (Deployment memory result) {
        result = factory().deployCreate3(ccode, _init, _salt);
        setJsonAddr("address", result.implementation);
    }

    function p3(bytes memory ccode, bytes memory _init, bytes32 _salt) internal returns (Deployment memory result) {
        result = factory().create3ProxyAndLogic(ccode, _init, _salt);
        setJsonAddr("address", address(result.proxy));
        setJsonBytes("initializer", _init);
        setJsonAddr("implementation", result.implementation);
    }

    function JSONKey(string memory id) internal {
        state().currentKey = id;
        state().currentJson = "";
    }

    function setJsonAddr(string memory key, address val) internal {
        state().currentJson = VM.serializeAddress(state().currentKey, key, val);
    }

    function setJsonBytes(string memory key, bytes memory val) internal {
        state().currentJson = VM.serializeBytes(state().currentKey, key, val);
    }

    function saveJSONKey() internal {
        state().outputJson = VM.serializeString("out", state().currentKey, state().currentJson);
    }

    function saveChainInputJSON(JSON.Assets memory assets, JSON.ChainConfig memory cfg) internal {
        for (uint256 i; i < assets.extAssets.length; i++) {
            JSON.ExtAssetConfig memory ext = assets.extAssets[i];
            JSONKey(ext.symbol);
            setJsonAddr("address", ext.addr);
            saveJSONKey();
        }
        JSONKey("NativeWrapper");
        setJsonAddr("address", cfg.periphery.wrappedNative);
        saveJSONKey();
    }

    function disableLog() internal {
        state().disableLog = true;
    }

    function factory() internal returns (DeploymentFactory) {
        if (address(state().factory) == address(0)) {
            state().factory = DeploymentFactory(Deployed.addr("Factory"));
        }
        return state().factory;
    }

    bytes32 internal constant DEPLOY_STATE_SLOT = keccak256("DeployState");

    struct DeployedKrAsset {
        address addr;
        address anchorAddr;
        JSON.KrAssetConfig json;
    }

    struct DeployState {
        DeploymentFactory factory;
        string id;
        string outputLocation;
        string currentKey;
        string currentJson;
        string outputJson;
        bool disableLog;
    }

    using Conversions for bytes[];
    using Log for *;
    using LibDeploy for bytes;
    using LibDeploy for bytes32;
}
