// // SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Based} from "kresko-lib/utils/Based.s.sol";
import {IKresko} from "periphery/IKresko.sol";
import {Log} from "kresko-lib/utils/s/LibVm.s.sol";

import {IKrMulticall} from "periphery/IKrMulticall.sol";
import {IERC20} from "kresko-lib/token/IERC20.sol";
import {Asset, Oracle} from "common/Types.sol";
import {ArbDeploy} from "kresko-lib/info/ArbDeploy.sol";
import {View} from "periphery/ViewTypes.sol";
import {Deployed} from "scripts/deploy/libs/Deployed.s.sol";
import {Enums} from "common/Constants.sol";

// solhint-disable state-visibility, max-states-count, var-name-mixedcase, no-global-import, const-name-snakecase, no-empty-blocks, no-console

contract ArbScript is Based, ArbDeploy {
    using Log for *;

    IKrMulticall multicall = IKrMulticall(multicallAddr);
    IKresko kresko = IKresko(kreskoAddr);
    constructor() {
        Deployed.factory(factoryAddr);
    }

    function initialize(string memory mnemonic) internal {
        base(mnemonic, "arbitrum");
    }

    function initialize(uint256 blockNr) internal {
        base("arbitrum", blockNr);
        states_looseOracles();
    }

    function approvals(address spender) internal {
        uint256 allowance = type(uint256).max;
        USDC.approve(spender, allowance);
        USDCe.approve(spender, allowance);
        WBTC.approve(spender, allowance);
        weth.approve(spender, allowance);
        krETH.approve(spender, allowance);
        krBTC.approve(spender, allowance);
        krJPY.approve(spender, allowance);
        krEUR.approve(spender, allowance);
        krSOL.approve(spender, allowance);
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
        return getBal(usdcAddr, to, amount);
    }

    function getUSDCe(address to, uint256 amount) internal returns (uint256) {
        return getBal(usdceAddr, to, amount);
    }

    function getBal(address token, address to, uint256 amount) internal repranked(binanceAddr) returns (uint256) {
        IERC20(token).transfer(to, amount);
        return amount;
    }

    function getKISSD(address to, uint256 amount) internal returns (uint256 shares, uint256 assets, uint256 fees) {
        approvals(kissAddr);
        (assets, fees) = vault.previewMint(usdceAddr, amount);
        kiss.vaultDeposit(usdceAddr, getUSDCe(to, assets), to);
        return (amount, assets, fees);
    }

    function getKISSM(address to, uint256 amount) internal returns (uint256 shares, uint256 assets, uint256 fees) {
        approvals(kissAddr);
        (assets, fees) = vault.previewMint(usdceAddr, amount);
        getUSDCe(to, assets);
        kiss.vaultMint(usdceAddr, amount, to);
        return (amount, assets, fees);
    }

    function states_noVaultFees() internal repranked(safe) {
        if (vault.getConfig().pendingGovernance != address(0)) vault.acceptGovernance();
        vault.setDepositFee(usdceAddr, 0);
        vault.setWithdrawFee(usdceAddr, 0);
        vault.setDepositFee(usdcAddr, 0);
        vault.setWithdrawFee(usdcAddr, 0);
    }

    function states_looseOracles() public rebroadcasted(safe) {
        vault.setAssetFeed(usdcAddr, 0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3, type(uint24).max);
        vault.setAssetFeed(usdceAddr, 0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3, type(uint24).max);
        kresko.setMaxPriceDeviationPct(25e2);

        View.AssetView[] memory assets = kresko.viewProtocolData(pyth.viewData).assets;

        for (uint256 i; i < assets.length; i++) {
            Asset memory asset = assets[i].config;

            if (asset.oracles[0] == Enums.OracleType.Pyth) {
                Oracle memory primaryOracle = kresko.getOracleOfTicker(asset.ticker, asset.oracles[0]);
                kresko.setPythFeed(
                    asset.ticker,
                    primaryOracle.pythId,
                    primaryOracle.invertPyth,
                    1000000,
                    primaryOracle.isClosable
                );
            }
            if (asset.oracles[1] == Enums.OracleType.Chainlink) {
                Oracle memory secondaryOracle = kresko.getOracleOfTicker(asset.ticker, asset.oracles[1]);
                kresko.setChainLinkFeed(asset.ticker, secondaryOracle.feed, 1000000, secondaryOracle.isClosable);
            }
        }
    }

    function states_noFactorsNoFees() internal repranked(safe) {
        View.AssetView[] memory assets = kresko.viewProtocolData(pyth.viewData).assets;
        for (uint256 i; i < assets.length; i++) {
            View.AssetView memory asset = assets[i];
            if (asset.config.factor > 0) {
                asset.config.factor = 1e4;
            }
            if (asset.config.kFactor > 0) {
                asset.config.kFactor = 1e4;
                asset.config.swapInFeeSCDP = 0;
                asset.config.swapOutFeeSCDP = 0;
                asset.config.protocolFeeShareSCDP = 0;
                asset.config.closeFee = 0;
                asset.config.openFee = 0;
                if (asset.config.ticker != bytes32("KISS")) {
                    (bool success, ) = asset.addr.call(abi.encodeWithSelector(0x15360fb9, 0));
                    (success, ) = asset.addr.call(abi.encodeWithSelector(0xe8e5c3f3, 0));
                    success;
                }
            }

            kresko.updateAsset(asset.addr, asset.config);
        }

        states_noVaultFees();
    }
}
