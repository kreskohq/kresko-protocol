// // SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Scripted} from "kresko-lib/utils/Scripted.s.sol";
import {IWETH9} from "kresko-lib/token/IWETH9.sol";
import {IKresko} from "periphery/IKresko.sol";
import {Help, Log} from "kresko-lib/utils/Libs.s.sol";

import {IGatingManager} from "periphery/IGatingManager.sol";
import {IERC1155} from "common/interfaces/IERC1155.sol";
import {IDataV1} from "periphery/interfaces/IDataV1.sol";
import {IKrMulticall, ISwapRouter} from "periphery/IKrMulticall.sol";
import {IVault} from "vault/interfaces/IVault.sol";
import {IKISS} from "kiss/interfaces/IKISS.sol";
import {IDeploymentFactory} from "factory/IDeploymentFactory.sol";
import {getPythData, PythView} from "vendor/pyth/PythScript.sol";
import {IPyth} from "vendor/pyth/IPyth.sol";
import {IKreskoAsset} from "kresko-asset/IKreskoAsset.sol";
import {IKreskoAssetAnchor} from "kresko-asset/IKreskoAssetAnchor.sol";
import {IERC20} from "kresko-lib/token/IERC20.sol";
import {Asset, Enums, Oracle, RawPrice} from "common/Types.sol";
import {ArbDeployAddr} from "kresko-lib/info/ArbDeployAddr.sol";
import {Anvil} from "./Anvil.s.sol";
import {IAggregatorV3} from "kresko-lib/vendor/IAggregatorV3.sol";

// solhint-disable state-visibility, max-states-count, var-name-mixedcase, no-global-import, const-name-snakecase, no-empty-blocks, no-console

contract ArbScript is Anvil, Scripted, ArbDeployAddr {
    using Log for *;
    using Help for *;

    IKresko kresko = IKresko(kreskoAddr);
    IKrMulticall multicall = IKrMulticall(multicallAddr);
    IVault vault = IVault(vaultAddr);
    IKISS kiss = IKISS(kissAddr);

    IKreskoAsset krETH = IKreskoAsset(krETHAddr);
    IKreskoAssetAnchor akrETH = IKreskoAssetAnchor(akrETHAddr);

    IDeploymentFactory factory = IDeploymentFactory(factoryAddr);
    IDataV1 dataV1 = IDataV1(0x0D7412df8E363EA76bd29625Fb8c481bcD28611B);
    IGatingManager manager = IGatingManager(0x13f14aB44B434F16D88645301515C899d69A30Bd);
    IERC1155 kreskian = IERC1155(0xAbDb949a18d27367118573A217E5353EDe5A0f1E);
    IERC1155 questForKresk = IERC1155(0x1C04925779805f2dF7BbD0433ABE92Ea74829bF6);
    IPyth pythEP = IPyth(0xff1a0f4744e8582DF1aE09D5611b887B6a12925C);
    ISwapRouter swap = ISwapRouter(0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45);
    ISwapRouter quoter = ISwapRouter(0x61fFE014bA17989E743c5F6cB21bF9697530B21e);

    bytes[] pythUpdate;
    PythView pythView;
    address[] clAssets = [USDCAddr, WBTCAddr, wethAddr];
    string pythAssets = "ETH,USDC,BTC,ARB";

    function initialize(string memory mnemonic) public {
        useMnemonic(mnemonic);
        vm.createSelectFork("arbitrum");
    }

    function initialize() public {
        useMnemonic("MNEMONIC_DEPLOY");
        vm.createSelectFork("arbitrum");
    }

    function initFork(address sender) internal returns (uint256 forkId) {
        forkId = vm.createSelectFork("localhost");
        Anvil.syncTime(0);
        vm.makePersistent(address(pythEP));
        broadcastWith(sender);
        fetchPythAndUpdate();
        vm.stopBroadcast();
        syncForkPrices();
    }

    function syncForkPrices() internal {
        uint256[] memory prices = new uint256[](clAssets.length);
        for (uint256 i; i < clAssets.length; i++) {
            prices[i] = kresko.getPythPrice(kresko.getAsset(clAssets[i]).ticker);
        }

        for (uint256 i; i < clAssets.length; i++) {
            address feed = kresko.getFeedForAddress(clAssets[i], Enums.OracleType.Chainlink);
            IAggregatorV3(feed).latestAnswer().clg("Chainlink Price");
            setCLPrice(feed, prices[i]);
        }
    }

    function initLocal(uint256 blockNr, bool sync) public {
        useMnemonic("MNEMONIC_DEPLOY");
        vm.createSelectFork("arbitrum", blockNr);
        if (sync) syncTimeLocal();
    }

    function fetchPyth(string memory assets) internal {
        (bytes[] memory update, PythView memory values) = getPythData(assets);
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

    function fetchPythAndUpdate() internal {
        fetchPyth();
        pythEP.updatePriceFeeds{value: pythEP.getUpdateFee(pythUpdate)}(pythUpdate);
    }

    function syncTimeLocal() internal {
        vm.warp((vm.unixTime() / 1000) - 5);
    }

    function getValue(address asset, uint256 amount) internal returns (uint256) {
        ValQuery[] memory queries = new ValQuery[](1);
        queries[0] = ValQuery(asset, amount);
        return getValues(queries)[0].value;
    }

    function getPrice(address asset) internal returns (uint256) {
        ValQuery[] memory queries = new ValQuery[](1);
        queries[0] = ValQuery(asset, 1e18);
        return getValues(queries)[0].price;
    }

    function getValuePrice(address asset, uint256 amount) internal returns (ValQueryRes memory) {
        ValQuery[] memory queries = new ValQuery[](1);
        queries[0] = ValQuery(asset, amount);
        return getValues(queries)[0];
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
        akrETH.approve(spender, allowance);
        ARB.approve(spender, allowance);
        kiss.approve(spender, allowance);
        IERC20(vaultAddr).approve(spender, allowance);
    }

    function approvals() internal {
        approvals(multicallAddr);
        approvals(address(swap));
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

    function getBal(address token, address to, uint256 amount) internal repranked(stash) returns (uint256) {
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

    function peekAccount(address account, bool fetch) internal {
        if (fetch) fetchPyth();
        IDataV1.DAccount memory acc = dataV1.getAccount(pythView, account);
        Log.sr();
        account.clg("Account");
        uint256 totalValInternal = acc.protocol.minter.totals.valColl;
        uint256 totalValWallet = 0;
        Log.hr();
        acc.protocol.minter.totals.cr.dlg("Minter CR", 2);
        acc.protocol.minter.totals.valColl.dlg("Minter Collateral", 8);
        acc.protocol.minter.totals.valDebt.dlg("Minter Debt", 8);
        Log.hr();
        for (uint256 i; i < acc.protocol.minter.deposits.length; i++) {
            acc.protocol.minter.deposits[i].symbol.clg("Deposits");
            acc.protocol.minter.deposits[i].amount.dlg("Amount", acc.protocol.minter.deposits[i].config.decimals);
            acc.protocol.minter.deposits[i].val.dlg("Value", 8);
            Log.hr();
        }
        for (uint256 i; i < acc.protocol.minter.debts.length; i++) {
            acc.protocol.minter.debts[i].symbol.clg("Debt");
            acc.protocol.minter.debts[i].amount.dlg("Amount");
            acc.protocol.minter.debts[i].val.dlg("Value", 8);
            Log.hr();
        }
        Log.sr();
        for (uint256 i; i < acc.protocol.scdp.deposits.length; i++) {
            acc.protocol.scdp.deposits[i].symbol.clg("SCDP Deposits");
            acc.protocol.scdp.deposits[i].amount.dlg("Amount", acc.protocol.scdp.deposits[i].config.decimals);
            acc.protocol.scdp.deposits[i].val.dlg("Value", 8);
            totalValInternal += acc.protocol.scdp.deposits[i].val;
            Log.hr();
        }

        for (uint256 i; i < acc.protocol.bals.length; i++) {
            acc.protocol.bals[i].symbol.clg("Wallet Balance");
            acc.protocol.bals[i].amount.dlg("Amount", acc.protocol.bals[i].decimals);
            acc.protocol.bals[i].val.dlg("Value", 8);
            totalValWallet += acc.protocol.bals[i].val;
            Log.hr();
        }
        Log.sr();
        for (uint256 i; i < acc.collections.length; i++) {
            acc.collections[i].name.clg("Collection");
            for (uint256 j; j < acc.collections[i].items.length; j++) {
                uint256 bal = acc.collections[i].items[j].balance;
                if (bal == 0) continue;
                string memory info = ("nft id: ").and(j.str()).and(" balance: ").and(bal.str());
                info.clg();
            }
        }
        Log.hr();
        totalValInternal.dlg("Total Protocol Value", 8);
        totalValWallet.dlg("Total Wallet Value", 8);
        account.balance.dlg("ETH Balance");
        vm.getNonce(account).clg("Nonce");
        Log.sr();
    }

    function peekAsset(address asset, bool fetch) internal {
        if (fetch) fetchPythAndUpdate();

        Asset memory config = kresko.getAsset(asset);
        IERC20 token = IERC20(asset);

        ("/* ------------------------------ Protocol Asset ------------------------------ */").clg();
        token.symbol().clg("Symbol");
        asset.clg("Address");
        config.decimals.clg("Decimals");
        uint256 tSupply = token.totalSupply();
        tSupply.dlg("Total Supply", config.decimals);
        getValue(asset, tSupply).dlg("Market Cap", 8);
        if (config.anchor != address(0)) {
            address(config.anchor).clg("Anchor");
            IERC20(config.anchor).symbol().clg("Anchor Symbol");
            IERC20(config.anchor).totalSupply().dlg("Anchor Total Supply");
        } else {
            ("No Anchor").clg();
        }

        ("-------  Oracle --------").clg();
        config.ticker.blg2txt("Ticker");
        uint8(config.oracles[0]).clg("Primary Oracle: ");
        uint8(config.oracles[1]).clg("Secondary Oracle: ");

        Log.hr();
        Oracle memory primaryOracle = kresko.getOracleOfTicker(config.ticker, config.oracles[0]);
        uint256 price1 = getPrice(asset);
        price1.dlg("Primary Price", 8);
        primaryOracle.staleTime.clg("Staletime (s)");
        primaryOracle.invertPyth.clg("Inverted Price: ");
        primaryOracle.pythId.blg();
        Log.hr();

        Oracle memory secondaryOracle = kresko.getOracleOfTicker(config.ticker, config.oracles[1]);
        RawPrice memory secondaryPrice = kresko.getPushPrice(asset);
        uint256 price2 = uint256(secondaryPrice.answer);
        price2.dlg("Secondary Price", 8);
        secondaryPrice.staleTime.clg("Staletime (s): ");
        secondaryOracle.feed.clg("Feed: ");
        (block.timestamp - secondaryPrice.timestamp).clg("Seconds since update: ");
        Log.hr();
        uint256 deviation = kresko.getOracleDeviationPct();
        (price2.pctMul(1e4 - deviation)).dlg("Min Dev", 8);
        (price2.pctMul(1e4 + deviation)).dlg("Max Dev", 8);
        ((price1 * 1e8) / price2).dlg("Ratio", 8);
        ("-------  Types --------").clg();
        config.isMinterMintable.clg("Minter Mintable");
        config.isMinterCollateral.clg("Minter Collateral");
        config.isSwapMintable.clg("SCDP Swappable");
        config.isSharedCollateral.clg("SCDP Depositable");
        config.isCoverAsset.clg("SCDP Cover");

        peekSCDPAsset(asset, false);
        config.kFactor.pct("kFactor");
        config.factor.pct("cFactor");
        Log.hr();
        config.depositLimitSCDP.dlg("SCDP Deposit Limit", config.decimals);
        getValue(asset, config.depositLimitSCDP).dlg("Value", 8);
        config.maxDebtMinter.dlg("Minter Debt Limit", config.decimals);
        getValue(asset, config.maxDebtMinter).dlg("Value", 8);
        config.maxDebtSCDP.dlg("SCDP Debt Limit", config.decimals);
        getValue(asset, config.maxDebtSCDP).dlg("Value", 8);

        ("-------  Config --------").clg();
        config.liqIncentiveSCDP.pct("SCDP Liquidation Incentive");
        config.liqIncentive.pct("Minter Liquidation Incentive");
        config.openFee.pct("Minter Open Fee");
        config.closeFee.pct("Minter Close Fee");
        config.swapInFeeSCDP.pct("SCDP Swap In Fee");
        config.swapOutFeeSCDP.pct("SCDP Swap Out Fee");
        config.protocolFeeShareSCDP.pct("SCDP Protocol Fee");
    }

    function peekSCDPAsset(address asset, bool fetch) internal {
        if (fetch) fetchPyth();
        Asset memory config = kresko.getAsset(asset);
        Log.hr();
        uint256 totalColl = kresko.getTotalCollateralValueSCDP(false);
        uint256 totalDebt = kresko.getEffectiveSDIDebtUSD();

        uint256 debt = kresko.getDebtSCDP(asset);
        uint256 debtVal = getValue(asset, debt);

        debt.dlg("SCDP Debt", config.decimals);
        debtVal.dlg("Value", 8);
        debtVal.pctDiv(totalDebt).dlg("% of total debt", 2);

        uint256 deposits = kresko.getDepositsSCDP(asset);
        uint256 depositVal = getValue(asset, deposits);

        deposits.dlg("SCDP Deposits", config.decimals);
        depositVal.dlg("Value", 8);
        depositVal.pctDiv(totalColl).dlg("% of total collateral", 2);
        Log.hr();
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
