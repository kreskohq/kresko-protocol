// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;
// solhint-disable var-name-mixedcase
// solhint-disable max-states-count
// solhint-disable no-global-import

import {ScriptBase} from "kresko-helpers/utils/ScriptBase.sol";
import {DeployHelper} from "./utils/DeployHelper.sol";
import {WETH9} from "vendor/WETH9.sol";
import {Vault} from "vault/Vault.sol";
import {KISS} from "kiss/KISS.sol";
import {VaultAsset} from "vault/Types.sol";
import {MockOracle} from "mocks/MockOracle.sol";
import {MockERC20} from "mocks/MockERC20.sol";
import {KreskoAsset} from "kresko-asset/KreskoAsset.sol";
import {MockSequencerUptimeFeed} from "mocks/MockSequencerUptimeFeed.sol";
import {AggregatorV3Interface} from "vendor/AggregatorV3Interface.sol";
import {ERC20} from "vendor/ERC20.sol";

struct UserConfig {
    address addr;
    uint256 idx;
    uint256 daiBalance;
    uint256 usdtBalance;
    uint256 usdcBalance;
    uint256 wethBalance;
}

contract Localnet is ScriptBase("LOCALNET_MNEMONIC"), KreskoDeployment {
    MockERC20 internal usdc;
    MockERC20 internal usdt;
    MockERC20 internal dai;
    WETH9 internal weth9;
    UserConfig[] internal users;

    KreskoAsset internal krETH;
    KreskoAsset internal krBTC;
    KreskoAsset internal krJPY;

    MockOracle internal daiOracle;
    MockOracle internal usdtOracle;
    MockOracle internal usdcOracle;
    MockOracle internal ethOracle;
    MockOracle internal btcOracle;
    MockOracle internal jpyOracle;
    MockOracle internal kissOracle;
    MockSequencerUptimeFeed internal seqFeed;

    // symbol:price:decimals
    string internal daiPrice = "DAI:1:8";
    string internal usdcPrice = "USDC:1:8";
    string internal ethPrice = "ETH:2000:8";
    string internal jpyPrice = "JPY:1:8";
    string internal kissPrice = "KISS:1:8";
    // symbol:price:decimals,symbol:price:decimals (...)
    string internal initialPrices = "USDC:1:8,ETH:2000:8,JPY:1:8,KISS:1:8,DAI:1:8,BTC:20000:8";

    function run() external broadcastWithMnemonic(0) {
        admin = getAddr(0);
        seqFeed = new MockSequencerUptimeFeed();
        DeployParams memory params = DeployParams({
            admin: admin,
            seqFeed: address(seqFeed),
            minterMcr: 150e2,
            minterLt: 140e2,
            scdpMcr: 200e2,
            scdpLt: 150e2,
            sdiPrecision: 8
        });
        kresko = deployDiamond(params);

        createSpecialTokens();
        configureProtocol();

        vkiss.addAsset(
            VaultAsset(ERC20(address(usdc)), AggregatorV3Interface(address(usdcOracle)), type(uint256).max, 0, 0, true)
        );
        vkiss.addAsset(
            VaultAsset(ERC20(address(usdc)), AggregatorV3Interface(address(usdcOracle)), type(uint256).max, 0, 0, true)
        );
        vkiss.addAsset(
            VaultAsset(ERC20(address(dai)), AggregatorV3Interface(address(daiOracle)), type(uint256).max, 0, 0, true)
        );
    }

    function createSpecialTokens() internal {
        require(admin != address(0), "some admin address should be set");
        require(address(seqFeed) != address(0), "deploy the sequencer uptime feed before special tokens");
        require(address(kresko) != address(0), "deploy the diamond before special tokens");
        require(TREASURY != address(0), "some treasury address is required");

        weth9 = new WETH9();
        vkiss = new Vault("vKISS", "vKISS", 18, 8, TREASURY, address(seqFeed));
        kiss = new KISS();
        kiss.initialize("Kresko Integrated Stable System", "KISS", 18, getAddr(0), address(kresko), address(vkiss));
    }

    function createUsers() internal {
        require(address(kresko) != address(0), "deploy the diamond before user setup");
        users[0] = UserConfig({addr: getAddr(0), idx: 0, daiBalance: 100000e18, usdcBalance: 100000e6, wethBalance: 100000e18});
        users[1] = UserConfig({addr: getAddr(1), idx: 1, daiBalance: 0, usdcBalance: 0, wethBalance: 0});
        users[2] = UserConfig({addr: getAddr(2), idx: 1, daiBalance: 1e24, usdcBalance: 1e24, wethBalance: 100e18});
        for (uint256 i = 3; i <= 8; i++) {
            users[i] = UserConfig({addr: getAddr(i), idx: i, daiBalance: 10000e18, usdcBalance: 1000e18, wethBalance: 2.5e18});
        }
    }

    function configureProtocol() internal {
        (dai, daiOracle) = deployAndAddCollateral("DAI", bytes12("DAI"), 18, 1e8, false);
        (usdc, usdcOracle) = deployAndAddCollateral("USDC", bytes12("USDC"), 18, 1e8, false);
        (krBTC, , btcOracle) = deployAndWhitelistKrAsset("krBTC", bytes12("BTC"), params.admin, 20000e8, false, true, false);
        (krETH, , ethOracle) = deployAndWhitelistKrAsset("krETH", bytes12("ETH"), params.admin, 2000e8, true, true, false);
        addExternalAsset(address(weth9), address(ethOracle), bytes12("ETH"), false);
        addInternalAsset(address(kiss), address(kiss), address(kissOracle), bytes12("KISS"), true, true, true);
        (krJPY, , jpyOracle) = deployAndWhitelistKrAsset("krJPY", bytes12("JPY"), params.admin, 1e8, true, false, false);

        krETH.setUnderlying(address(weth9));
        enableSwapBothWays(address(kiss), address(krETH), true);
        enableSwapBothWays(address(kiss), address(krJPY), true);
        enableSwapSingleWay(address(krJPY), address(krETH), true);
        kresko.setFeeAssetSCDP(address(kiss));
    }
}
