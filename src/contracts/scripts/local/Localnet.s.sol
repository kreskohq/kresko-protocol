// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;
// solhint-disable var-name-mixedcase
// solhint-disable max-states-count
// solhint-disable no-global-import

import {ScriptBase} from "kresko-helpers/utils/ScriptBase.sol";
import {KreskoDeployment} from "../utils/KreskoDeployment.s.sol";
import {WETH9} from "vendor/WETH9.sol";
import {Vault} from "vault/Vault.sol";
import {KISS} from "kiss/KISS.sol";
import {VaultAsset} from "vault/Types.sol";
import {MockOracle} from "mocks/MockOracle.sol";
import {MockERC20} from "mocks/MockERC20.sol";
import {KreskoAsset} from "kresko-asset/KreskoAsset.sol";
import {AggregatorV3Interface} from "vendor/AggregatorV3Interface.sol";
import {ERC20} from "vendor/ERC20.sol";

abstract contract LocalnetConfig is ScriptBase("MNEMONIC_LOCALNET"), KreskoDeployment {
    UserConfig[] internal users;
    MockOracle internal usdcOracle;
    MockOracle internal usdtOracle;
    MockOracle internal daiOracle;
    MockOracle internal ethOracle;
    MockOracle internal btcOracle;
    MockOracle internal jpyOracle;
    MockOracle internal kissOracle;

    WETH9 internal weth9;
    MockERC20 internal dai;
    MockERC20 internal usdt;
    MockERC20 internal usdc;
    KreskoAsset internal krETH;
    KreskoAsset internal krBTC;
    KreskoAsset internal krJPY;

    // symbol:price:decimals
    string internal daiPrice = "DAI:1:8";
    string internal usdcPrice = "USDC:1:8";
    string internal ethPrice = "ETH:2000:8";
    string internal jpyPrice = "JPY:1:8";
    string internal kissPrice = "KISS:1:8";
    // symbol:price:decimals,symbol:price:decimals (...)
    string internal initialPrices = "USDC:1:8,ETH:2000:8,JPY:1:8,KISS:1:8,DAI:1:8,BTC:20000:8";

    address internal admin;

    VaultAsset internal vaultUsdc;
    VaultAsset internal vaultUsdt;
    VaultAsset internal vaultDai;
    struct UserConfig {
        address addr;
        uint256 idx;
        uint256 daiBalance;
        uint256 usdtBalance;
        uint256 usdcBalance;
        uint256 wethBalance;
    }

    function createUsers() internal {
        require(address(kresko) != address(0), "deploy the diamond before user setup");
        users[0] = UserConfig({
            addr: getAddr(0),
            idx: 0,
            daiBalance: 100000e18,
            usdcBalance: 100000e18,
            usdtBalance: 100000e6,
            wethBalance: 100000e18
        });
        users[1] = UserConfig({addr: getAddr(1), idx: 1, daiBalance: 0, usdcBalance: 0, usdtBalance: 0, wethBalance: 0});
        users[2] = UserConfig({
            addr: getAddr(2),
            idx: 1,
            daiBalance: 1e24,
            usdcBalance: 1e24,
            usdtBalance: 1e12,
            wethBalance: 100e18
        });
        for (uint256 i = 3; i <= 8; i++) {
            users[i] = UserConfig({
                addr: getAddr(uint32(i)),
                idx: i,
                daiBalance: 10000e18,
                usdcBalance: 1000e18,
                usdtBalance: 800e6,
                wethBalance: 2.5e18
            });
        }
    }
}

contract Localnet is LocalnetConfig {
    DeployParams internal params;

    function run() external broadcastWithMnemonic(0) {
        admin = getAddr(0);
        params = DeployParams({
            admin: admin,
            seqFeed: getMockSeqFeed(),
            minterMcr: 150e2,
            minterLt: 140e2,
            scdpMcr: 200e2,
            scdpLt: 150e2,
            sdiPrecision: 8
        });
        kresko = deployDiamond(params);
        mockSeqFeed.setAnswers(0, 0, 0);

        createSpecialTokens();
        configureProtocol();
        configureVaultAssets();
    }

    function createSpecialTokens() internal {
        require(admin != address(0), "some admin address should be set");
        require(address(mockSeqFeed) != address(0), "deploy the sequencer uptime feed before special tokens");
        require(address(kresko) != address(0), "deploy the diamond before special tokens");
        require(TREASURY != address(0), "some treasury address is required");

        weth9 = new WETH9();
        vkiss = new Vault("vKISS", "vKISS", 18, 8, TREASURY, address(mockSeqFeed));
        kiss = new KISS();
        kiss.initialize("Kresko Integrated Stable System", "KISS", 18, address(mockSafe), address(kresko), address(vkiss));
    }

    function configureVaultAssets() internal {
        require(address(dai) != address(0), "dai");
        require(address(usdc) != address(0), "usdc");
        require(address(usdt) != address(0), "usdt");
        vaultDai = VaultAsset(
            ERC20(address(dai)),
            AggregatorV3Interface(address(daiOracle)),
            3600,
            0,
            0,
            0,
            type(uint248).max,
            true
        );
        vaultUsdc = VaultAsset(
            ERC20(address(usdc)),
            AggregatorV3Interface(address(usdcOracle)),
            3600,
            0,
            0,
            0,
            type(uint248).max,
            true
        );
        vaultUsdt = VaultAsset(
            ERC20(address(usdt)),
            AggregatorV3Interface(address(usdtOracle)),
            3600,
            0,
            0,
            0,
            type(uint248).max,
            true
        );

        vkiss.addAsset(vaultUsdc);
        vkiss.addAsset(vaultUsdt);
        vkiss.addAsset(vaultDai);
    }

    function configureProtocol() internal {
        addKISS(address(kiss), address(vkiss), true, true, true);

        (dai, daiOracle) = deployAndAddCollateral("DAI", bytes12("DAI"), 18, 1e8, false);
        (usdc, usdcOracle) = deployAndAddCollateral("USDC", bytes12("USDC"), 18, 1e8, false);
        (usdt, usdtOracle) = deployAndAddCollateral("USDC", bytes12("USDT"), 6, 1e8, false);

        (krBTC, , btcOracle) = deployAndWhitelistKrAsset("krBTC", bytes12("BTC"), params.admin, 20000e8, false, true, false);
        (krETH, , ethOracle) = deployAndWhitelistKrAsset("krETH", bytes12("ETH"), params.admin, 2000e8, true, true, false);
        addExternalAsset(address(weth9), address(ethOracle), bytes12("ETH"), false);
        (krJPY, , jpyOracle) = deployAndWhitelistKrAsset("krJPY", bytes12("JPY"), params.admin, 1e8, true, false, false);

        krETH.setUnderlying(address(weth9));

        enableSwapBothWays(address(kiss), address(krETH), true);
        enableSwapBothWays(address(kiss), address(krJPY), true);
        enableSwapSingleWay(address(krJPY), address(krETH), true);
        kresko.setFeeAssetSCDP(address(kiss));
    }
}
