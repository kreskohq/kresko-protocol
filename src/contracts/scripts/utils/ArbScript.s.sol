// // SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Scripted} from "kresko-lib/utils/Scripted.s.sol";
import {IKresko} from "periphery/IKresko.sol";
import {Help, Log} from "kresko-lib/utils/Libs.s.sol";

import {IGatingManager} from "periphery/IGatingManager.sol";
import {IDataV1} from "periphery/interfaces/IDataV1.sol";
import {IKrMulticall, ISwapRouter} from "periphery/IKrMulticall.sol";
import {IDeploymentFactory} from "factory/IDeploymentFactory.sol";
import {getPythData, PythView} from "vendor/pyth/PythScript.sol";
import {IERC20} from "kresko-lib/token/IERC20.sol";
import {Asset, Oracle} from "common/Types.sol";
import {ArbDeploy} from "kresko-lib/info/ArbDeploy.sol";
import {View} from "periphery/ViewTypes.sol";
import {Deployed} from "scripts/deploy/libs/Deployed.s.sol";

// solhint-disable state-visibility, max-states-count, var-name-mixedcase, no-global-import, const-name-snakecase, no-empty-blocks, no-console

contract ArbScript is Scripted, ArbDeploy {
    using Log for *;
    using Help for *;

    IKrMulticall multicall = IKrMulticall(multicallAddr);
    IDataV1 dataV1 = IDataV1(dataV1Addr);
    IKresko kresko = IKresko(kreskoAddr);
    IGatingManager manager = IGatingManager(0x13f14aB44B434F16D88645301515C899d69A30Bd);

    bytes[] pythUpdate;
    PythView pythView;
    address[] clAssets = [USDCAddr, WBTCAddr, wethAddr];
    string pythAssets = "ETH,USDC,BTC,ARB,SOL,JPY,EUR,GBP";

    function initialize(string memory mnemonic) internal {
        useMnemonic(mnemonic);
        vm.createSelectFork("arbitrum");
        Deployed.factory(factoryAddr);
    }

    function initialize() internal {
        initialize("MNEMONIC_DEPLOY");
    }

    function fetchPyth(string memory _assets) internal {
        (bytes[] memory update, PythView memory values) = getPythData(_assets);
        pythUpdate = update;
        pythView.ids = values.ids;
        delete pythView.prices;
        for (uint256 i; i < values.prices.length; i++) {
            pythView.prices.push(values.prices[i]);
        }
    }

    function fetchPyth() internal {
        fetchPyth(pythAssets);
    }

    function fetchPythAndUpdate(string memory _assets) internal {
        fetchPyth(_assets);
        pythEP.updatePriceFeeds{value: pythEP.getUpdateFee(pythUpdate)}(pythUpdate);
    }

    function fetchPythAndUpdate() internal {
        fetchPyth();
        pythEP.updatePriceFeeds{value: pythEP.getUpdateFee(pythUpdate)}(pythUpdate);
    }

    function fetchPythSync() internal {
        fetchPyth();
        pythEP.updatePriceFeeds{value: pythEP.getUpdateFee(pythUpdate)}(pythUpdate);
        syncTimeLocal();
    }

    function syncTimeLocal() internal {
        vm.warp((vm.unixTime() / 1000));
    }

    function getValues(ValQuery[] memory queries) internal returns (ValQueryRes[] memory res) {
        (bytes[] memory valCalls, bytes[] memory priceCalls) = (new bytes[](queries.length), new bytes[](queries.length));
        for (uint256 i; i < queries.length; i++) {
            (valCalls[i], priceCalls[i]) = (
                abi.encodeWithSelector(0xc7bf8cf5, queries[i].asset, queries[i].amount),
                abi.encodeWithSelector(0x41976e09, queries[i].asset)
            );
        }

        (, bytes[] memory vals) = kresko.batchStaticCall(valCalls, pythUpdate);
        (, bytes[] memory prices) = kresko.batchStaticCall(priceCalls, pythUpdate);

        res = new ValQueryRes[](queries.length);
        for (uint256 i; i < queries.length; i++) {
            (uint256 value, uint256 price) = (abi.decode(vals[i], (uint256)), abi.decode(prices[i], (uint256)));
            res[i] = ValQueryRes(queries[i].asset, queries[i].amount, value, price);
        }
    }

    function approvals(address spender) internal {
        uint256 allowance = type(uint256).max;
        USDC.approve(spender, allowance);
        USDCe.approve(spender, allowance);
        WBTC.approve(spender, allowance);
        weth.approve(spender, allowance);
        krETH.approve(spender, allowance);
        krBTC.approve(spender, allowance);
        akrETH.approve(spender, allowance);
        ARB.approve(spender, allowance);
        kiss.approve(spender, allowance);
        IERC20(vaultAddr).approve(spender, allowance);
    }

    function approvals() internal {
        approvals(multicallAddr);
        approvals(routerv3Addr);
        approvals(kreskoAddr);
        approvals(kissAddr);
        approvals(vaultAddr);
    }

    function getUSDC(address to, uint256 amount) internal returns (uint256) {
        return getBal(USDCAddr, to, amount);
    }

    function getUSDCe(address to, uint256 amount) internal returns (uint256) {
        return getBal(USDCeAddr, to, amount);
    }

    function getBal(address token, address to, uint256 amount) internal repranked(binanceAddr) returns (uint256) {
        IERC20(token).transfer(to, amount);
        return amount;
    }

    function getKISSD(address to, uint256 amount) internal returns (uint256 shares, uint256 assets, uint256 fees) {
        approvals(kissAddr);
        (assets, fees) = vault.previewMint(USDCeAddr, amount);
        kiss.vaultDeposit(USDCeAddr, getUSDCe(to, assets), to);
        return (amount, assets, fees);
    }

    function getKISSM(address to, uint256 amount) internal returns (uint256 shares, uint256 assets, uint256 fees) {
        approvals(kissAddr);
        (assets, fees) = vault.previewMint(USDCeAddr, amount);
        getUSDCe(to, assets);
        kiss.vaultMint(USDCeAddr, amount, to);
        return (amount, assets, fees);
    }

    function states_noVaultFees() internal {
        if (vault.getConfig().pendingGovernance != address(0)) vault.acceptGovernance();
        vault.setDepositFee(USDCeAddr, 0);
        vault.setWithdrawFee(USDCeAddr, 0);
        vault.setDepositFee(USDCAddr, 0);
        vault.setWithdrawFee(USDCAddr, 0);
    }

    function states_looseOracles() internal {
        vault.setAssetFeed(USDCAddr, 0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3, type(uint24).max);
        vault.setAssetFeed(USDCeAddr, 0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3, type(uint24).max);
        kresko.setMaxPriceDeviationPct(25e2);

        View.AssetView[] memory assets = kresko.viewProtocolData(pythView).assets;

        for (uint256 i; i < assets.length; i++) {
            Asset memory asset = assets[i].config;
            Oracle memory primaryOracle = kresko.getOracleOfTicker(asset.ticker, asset.oracles[0]);

            if (primaryOracle.pythId != bytes32(0)) {
                kresko.setPythFeed(
                    asset.ticker,
                    primaryOracle.pythId,
                    primaryOracle.invertPyth,
                    1000000,
                    primaryOracle.isClosable
                );
            }
        }
    }

    function states_noFactorsNoFees() internal {
        kresko.setAssetCFactor(wethAddr, 1e4);
        kresko.setAssetCFactor(WBTCAddr, 1e4);
        kresko.setAssetCFactor(USDCAddr, 1e4);
        kresko.setAssetCFactor(USDCeAddr, 1e4);

        kresko.setAssetCFactor(krETHAddr, 1e4);
        kresko.setAssetCFactor(kissAddr, 1e4);
        kresko.setAssetKFactor(krETHAddr, 1e4);
        kresko.setAssetKFactor(kissAddr, 1e4);

        kresko.setAssetSwapFeesSCDP(krETHAddr, 0, 0, 0);
        kresko.setAssetSwapFeesSCDP(kissAddr, 0, 0, 0);

        krETH.setCloseFee(0);
        krETH.setOpenFee(0);

        Asset memory cfgETH = kresko.getAsset(krETHAddr);
        cfgETH.closeFee = 0;
        cfgETH.openFee = 0;
        kresko.updateAsset(krETHAddr, cfgETH);

        states_noVaultFees();
    }

    string jsonk;

    function save(string memory key, string memory val) internal {
        if (!key.equals("end")) {
            jsonk = vm.serializeString("out", key, val);
            return;
        }
        string memory outputDir = string.concat("./temp/");
        if (!vm.exists(outputDir)) vm.createDir(outputDir, true);
        string memory file = string.concat(
            outputDir,
            vm.toString(block.chainid),
            "-task-run-",
            string.concat(vm.toString(vm.unixTime()), ".json")
        );

        vm.writeJson(val, file);
    }

    function getTime() internal returns (uint256) {
        return uint256((vm.unixTime() / 1000));
    }

    struct ValQuery {
        address asset;
        uint256 amount;
    }

    struct ValQueryRes {
        address asset;
        uint256 amount;
        uint256 value;
        uint256 price;
    }
}
