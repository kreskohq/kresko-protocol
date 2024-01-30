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
import {Help, Log, VM} from "kresko-lib/utils/Libs.s.sol";
import {GatingManager} from "periphery/GatingManager.sol";
import {Deployed} from "scripts/deploy/libs/Deployed.s.sol";
import {CONST} from "scripts/deploy/libs/CONST.s.sol";
import {IDeploymentFactory} from "factory/IDeploymentFactory.sol";
import {MockPyth} from "mocks/MockPyth.sol";

library LibDeploy {
    using Conversions for bytes[];
    using Log for *;
    using Help for *;
    using Deployed for *;
    using LibDeployConfig for string;
    using LibDeploy for bytes;
    using LibDeploy for bytes32;

    function createFactory(address _owner) internal saveOutput("Factory") returns (DeploymentFactory result) {
        result = new DeploymentFactory(_owner);
        setJsonAddr("address", address(result));
        setJsonBytes("ctor", abi.encode(_owner));
        state().factory = result;
    }

    function createGatingManager(
        JSON.Config memory json,
        address _owner
    ) internal saveOutput("GatingManager") returns (GatingManager) {
        bytes memory implementation = type(GatingManager).creationCode.ctor(
            abi.encode(_owner, json.params.periphery.okNFT, json.params.periphery.qfkNFT, 0)
        );
        return GatingManager(implementation.d3("", CONST.GM_SALT).implementation);
    }

    function createMockPythEP(JSON.Config memory json, address _owner) internal saveOutput("MockPythEP") returns (MockPyth) {
        bytes[] memory updateData = new bytes[](0);
        bytes memory implementation = type(MockPyth).creationCode.ctor(abi.encode(updateData));
        return MockPyth(implementation.d3("", CONST.PYTH_MOCK_SALT).implementation);
    }

    function createKISS(
        JSON.Config memory json,
        address kresko,
        address vault
    ) internal saveOutput("KISS") returns (KISS result) {
        require(kresko != address(0), "deployKISS: !Kresko");
        require(vault != address(0), "deployKISS: !Vault");
        bytes memory initializer = abi.encodeCall(
            KISS.initialize,
            (CONST.KISS_PREFIX.and(json.assets.kiss.name), json.assets.kiss.symbol, 18, json.params.common.admin, kresko, vault)
        );
        result = KISS(address(type(KISS).creationCode.p3(initializer, CONST.KISS_SALT).proxy));
        json.assets.kiss.symbol.cache(address(result));
    }

    function createVault(JSON.Config memory json, address _owner) internal saveOutput("Vault") returns (Vault) {
        string memory name = CONST.VAULT_NAME_PREFIX.and(json.assets.kiss.name);
        string memory symbol = CONST.VAULT_SYMBOL_PREFIX.and(json.assets.kiss.symbol);
        bytes memory implementation = type(Vault).creationCode.ctor(
            abi.encode(name, symbol, 18, 8, _owner, json.params.common.treasury, json.params.common.sequencerUptimeFeed)
        );
        return Vault(implementation.d3("", CONST.VAULT_SALT).implementation);
    }

    function createDataV1(
        JSON.Config memory json,
        address _kresko,
        address _vault,
        address _kiss
    ) internal saveOutput("DataV1") returns (DataV1) {
        bytes memory implementation = type(DataV1).creationCode.ctor(
            abi.encode(_kresko, _vault, _kiss, json.params.periphery.okNFT, json.params.periphery.qfkNFT)
        );
        return DataV1(implementation.d3("", CONST.D1_SALT).implementation);
    }

    function createMulticall(
        JSON.Config memory json,
        address _kresko,
        address _kiss
    ) internal saveOutput("Multicall") returns (KrMulticall) {
        bytes memory implementation = type(KrMulticall).creationCode.ctor(
            abi.encode(_kresko, _kiss, json.params.periphery.v3Router, json.assets.wNative.token)
        );
        address multicall = implementation.d3("", CONST.MC_SALT).implementation;
        IKresko(_kresko).grantRole(Role.MANAGER, multicall);
        return KrMulticall(payable(multicall));
    }

    function createPeriphery(
        JSON.Config memory json,
        address _kresko,
        address _vault,
        address _kiss
    ) internal returns (DataV1, KrMulticall) {
        return (createDataV1(json, _kresko, _vault, _kiss), createMulticall(json, _kresko, _kiss));
    }

    function createKrAssets(JSON.Config memory json, address kresko) internal returns (JSON.Config memory) {
        for (uint256 i; i < json.assets.kreskoAssets.length; i++) {
            DeployedKrAsset memory deployed = deployKrAsset(json, json.assets.kreskoAssets[i], kresko);
            json.assets.kreskoAssets[i].config.anchor = deployed.anchorAddr;

            json.assets.kreskoAssets[i].symbol.cache(deployed.addr);
            deployed.anchorSymbol.cache(deployed.anchorAddr);
        }

        return json;
    }

    function deployKrAsset(
        JSON.Config memory json,
        JSON.KrAssetConfig memory asset,
        address kresko
    ) internal returns (DeployedKrAsset memory result) {
        JSONKey(asset.symbol);
        LibDeployConfig.KrAssetMetadata memory meta = asset.metadata();
        address underlying = !asset.underlyingSymbol.isEmpty() ? asset.underlyingSymbol.cached() : address(0);
        bytes memory KR_ASSET_INITIALIZER = abi.encodeCall(
            KreskoAsset.initialize,
            (
                asset.name,
                asset.symbol,
                18,
                json.params.common.admin,
                kresko,
                underlying,
                json.params.common.treasury,
                asset.wrapFee,
                asset.unwrapFee
            )
        );
        (address proxyAddr, address implAddr) = meta.krAssetSalt.pp3();
        setJsonAddr("address", proxyAddr);
        setJsonBytes("initializer", abi.encode(implAddr, address(factory()), KR_ASSET_INITIALIZER));
        setJsonAddr("implementation", implAddr);
        saveJSONKey();

        JSONKey(meta.anchorSymbol);
        bytes memory ANCHOR_IMPL = type(KreskoAssetAnchor).creationCode.ctor(abi.encode(proxyAddr));
        bytes memory ANCHOR_INITIALIZER = abi.encodeCall(
            KreskoAssetAnchor.initialize,
            (IKreskoAsset(proxyAddr), meta.anchorName, meta.anchorSymbol, json.params.common.admin)
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
        result.anchorSymbol = meta.anchorSymbol;
        setJsonAddr("address", result.anchorAddr);
        setJsonBytes("initializer", abi.encode(proxies[1].implementation, address(factory()), ANCHOR_INITIALIZER));
        setJsonAddr("implementation", proxies[1].implementation);
        saveJSONKey();
        result.json = asset;
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
        setJsonBytes("initializer", abi.encode(result.implementation, address(factory()), _init));
        setJsonAddr("implementation", result.implementation);
    }

    function pkr3(JSON.KrAssetConfig memory asset) internal returns (address) {
        return asset.metadata().krAssetSalt.pd3();
    }

    function previewTokenAddr(JSON.Config memory json, string memory symbol) internal returns (address) {
        for (uint256 i; i < json.assets.extAssets.length; i++) {
            if (json.assets.extAssets[i].symbol.equals(symbol)) {
                if (json.assets.extAssets[i].mocked) {
                    return json.assets.extAssets[i].symbol.mockTokenSalt().pd3();
                }
                return json.assets.extAssets[i].addr;
            }
        }

        for (uint256 i; i < json.assets.kreskoAssets.length; i++) {
            if (json.assets.kreskoAssets[i].symbol.equals(symbol)) {
                return pkr3(json.assets.kreskoAssets[i]);
            }
        }
        revert(string.concat("!assetAddr: ", symbol));
    }

    bytes32 internal constant DEPLOY_STATE_SLOT = keccak256("DeployState");

    struct DeployedKrAsset {
        address addr;
        address anchorAddr;
        string symbol;
        string anchorSymbol;
        JSON.KrAssetConfig json;
    }

    struct DeployState {
        IDeploymentFactory factory;
        string id;
        string outputLocation;
        string currentKey;
        string currentJson;
        string outputJson;
        bool disableLog;
    }

    function initOutputJSON(string memory configId) internal {
        string memory outputDir = string.concat("./out/foundry/deploy/", VM.toString(block.chainid), "/");
        if (!VM.exists(outputDir)) VM.createDir(outputDir, true);
        state().id = configId;
        state().outputLocation = outputDir;
        state().outputJson = configId;
    }

    function writeOutputJSON() internal {
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

    modifier saveOutput(string memory id) {
        JSONKey(id);
        _;
        saveJSONKey();
    }

    function JSONKey(string memory id) internal {
        state().currentKey = id;
        state().currentJson = "";
    }

    function setJsonAddr(string memory key, address val) internal {
        state().currentJson = VM.serializeAddress(state().currentKey, key, val);
    }

    function setJsonBool(string memory key, bool val) internal {
        state().currentJson = VM.serializeBool(state().currentKey, key, val);
    }

    function setJsonNumber(string memory key, uint256 val) internal {
        state().currentJson = VM.serializeUint(state().currentKey, key, val);
    }

    function setJsonBytes(string memory key, bytes memory val) internal {
        state().currentJson = VM.serializeBytes(state().currentKey, key, val);
    }

    function saveJSONKey() internal {
        state().outputJson = VM.serializeString("out", state().currentKey, state().currentJson);
    }

    function disableLog() internal {
        state().disableLog = true;
    }

    function factory() internal returns (IDeploymentFactory) {
        if (address(state().factory) == address(0)) {
            state().factory = IDeploymentFactory(Deployed.addr("Factory"));
        }
        return state().factory;
    }

    function cacheExtTokens(JSON.Config memory input) internal {
        for (uint256 i; i < input.assets.extAssets.length; i++) {
            JSON.ExtAsset memory ext = input.assets.extAssets[i];
            ext.symbol.cache(ext.addr);
            if (ext.mocked) continue;
            JSONKey(ext.symbol);
            setJsonAddr("address", ext.addr);
            saveJSONKey();
        }

        if (input.assets.wNative.mocked) {
            input.assets.wNative.symbol.cache(address(input.assets.wNative.token));
            return;
        }
        JSONKey("wNative");
        setJsonAddr("address", address(input.assets.wNative.token));
        saveJSONKey();
    }
}
