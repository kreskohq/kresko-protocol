// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;
// solhint-disable var-name-mixedcase
// solhint-disable max-states-count
// solhint-disable no-global-import

import {WETH9} from "kresko-lib/token/WETH9.sol";
import {Vault} from "vault/Vault.sol";
import {KISS} from "kiss/KISS.sol";
import {VaultAsset} from "vault/VTypes.sol";
import {MockOracle} from "mocks/MockOracle.sol";
import {ERC20} from "kresko-lib/token/ERC20.sol";
import {Devnet, ArbitrumDevnet} from "./DevnetConfigs.s.sol";
import {addr} from "kresko-lib/info/Arbitrum.sol";

contract WithArbitrum is ArbitrumDevnet("MNEMONIC_DEVNET") {
    function run() external broadcastWithMnemonic(0) {
        config();
        kresko = deployDiamondOneTx(deployArgs);
        setupVault();
        setupProtocol();
        setupVaultAssets();
    }

    function setupVault() internal {
        require(address(kresko) != addr.ZERO, "deploy diamond before vault");
        require(deployArgs.seqFeed != addr.ZERO, "deploy sequencer uptime feed before vault");
        require(deployArgs.admin != addr.ZERO, "some admin address should be set");
        require(deployArgs.treasury != addr.ZERO, "some treasury address should be set");

        vkiss = new Vault("vKISS", "vKISS", 18, 8, deployArgs.treasury, address(deployArgs.seqFeed));
        kiss = new KISS();
        kiss.initialize("Kresko Integrated Stable System", "KISS", 18, deployArgs.council, address(kresko), address(vkiss));
    }

    function setupVaultAssets() internal {
        require(address(vkiss) != addr.ZERO, "setup vault+diamond before these vault assets");
        vkiss.addAsset(USDC_VAULT_CONFIG);
        vkiss.addAsset(USDT_VAULT_CONFIG);
        vkiss.addAsset(DAI_VAULT_CONFIG);
    }

    function setupProtocol() internal {
        require(address(vkiss) != addr.ZERO, "setup vault+kiss first before protocol");

        /* -------------------------------------------------------------------------- */
        /*                                  Externals                                 */
        /* -------------------------------------------------------------------------- */
        addCollateral(bytes32("ETH"), addr.WETH, true, ORACLES_RS_CL, ETH_FEEDS, defaultCollateral);
        addCollateral(bytes32("BTC"), addr.WBTC, true, ORACLES_RS_CL, BTC_FEEDS, defaultCollateral);
        addCollateral(bytes32("DAI"), addr.DAI, true, ORACLES_RS_CL, DAI_FEEDS, defaultCollateral);
        addCollateral(bytes32("USDC"), addr.USDC, true, ORACLES_RS_CL, USDC_FEEDS, defaultCollateral);
        addCollateral(bytes32("USDT"), addr.USDT, true, ORACLES_RS_CL, USDT_FEEDS, defaultCollateral);

        /* -------------------------------------------------------------------------- */
        /*                                    KISS                                    */
        /* -------------------------------------------------------------------------- */

        kissConfig = addKISS(address(kiss), address(vkiss), defaultKISS);

        /* -------------------------------------------------------------------------- */
        /*                                  KRASSETS                                  */
        /* -------------------------------------------------------------------------- */

        krETH = addKrAsset(
            bytes32("ETH"),
            false,
            ORACLES_RS_CL,
            ETH_FEEDS,
            deployKrAsset("Kresko Asset: Ether", "krETH", addr.WETH, deployArgs.admin, deployArgs.treasury),
            defaultKrAsset
        );

        krBTC = addKrAsset(
            bytes32("BTC"),
            false,
            ORACLES_RS_CL,
            BTC_FEEDS,
            deployKrAsset("Kresko Asset: Bitcoin", "krBTC", addr.WBTC, deployArgs.admin, deployArgs.treasury),
            defaultKrAsset
        );

        krJPY = addKrAsset(
            bytes32("JPY"),
            true,
            ORACLES_RS_CL,
            JPY_FEEDS,
            deployKrAsset("Kresko Asset: Japanese Yen", "krJPY", addr.ZERO, deployArgs.admin, deployArgs.treasury),
            defaultKrAsset
        );

        /* -------------------------------------------------------------------------- */
        /*                               CONFIGURATIONS                               */
        /* -------------------------------------------------------------------------- */
        enableSwapBothWays(address(kiss), krETH.addr, true);
        enableSwapBothWays(address(kiss), krJPY.addr, true);
        enableSwapSingleWay(krJPY.addr, krETH.addr, true);
        kresko.setFeeAssetSCDP(address(kiss));
    }
}

contract WithLocal is Devnet("MNEMONIC_DEVNET") {
    function run() external {
        vm.startPrank(getAddr(0));
        config();
        kresko = deployDiamond(deployArgs);
        mockSeqFeed.setAnswers(0, 0, 0);
        setupSpecialTokens();
        setupProtocol();
        setupVault();
        vm.stopPrank();
    }

    function setupSpecialTokens() internal {
        require(address(kresko) != addr.ZERO, "deploy the diamond before special tokens");
        require(deployArgs.admin != addr.ZERO, "some admin address should be set");
        require(deployArgs.seqFeed != addr.ZERO, "deploy the sequencer uptime feed before special tokens");
        require(deployArgs.treasury != addr.ZERO, "some treasury address is required");

        weth9 = new WETH9();
        vkiss = new Vault("vKISS", "vKISS", 18, 8, deployArgs.treasury, address(deployArgs.seqFeed));
        kiss = new KISS();
        kiss.initialize(
            "Kresko Integrated Stable System",
            "KISS",
            18,
            address(deployArgs.council),
            address(kresko),
            address(vkiss)
        );
    }

    function setupVault() internal {
        require(dai.addr != address(0), "dai");
        require(usdc.addr != address(0), "usdc");
        require(usdt.addr != address(0), "usdt");
        vkiss.addAsset(
            VaultAsset({
                token: ERC20(usdc.addr),
                feed: usdc.oracle,
                staleTime: 86401,
                decimals: 0,
                depositFee: 0,
                withdrawFee: 0,
                maxDeposits: type(uint248).max,
                enabled: true
            })
        );
        vkiss.addAsset(
            VaultAsset({
                token: ERC20(usdt.addr),
                feed: usdt.oracle,
                staleTime: 86401,
                decimals: 0,
                depositFee: 0,
                withdrawFee: 0,
                maxDeposits: type(uint248).max,
                enabled: true
            })
        );
        vkiss.addAsset(
            VaultAsset({
                token: ERC20(dai.addr),
                feed: dai.oracle,
                staleTime: 86401,
                decimals: 0,
                depositFee: 0,
                withdrawFee: 0,
                maxDeposits: type(uint248).max,
                enabled: true
            })
        );
    }

    function setupProtocol() internal {
        kissConfig = addKISS(address(kiss), address(vkiss), defaultKISS);

        dai = mockCollateral(
            bytes32("DAI"),
            MockConfig({symbol: "DAI", price: 1e8, setFeeds: true, tknDecimals: 18, oracleDecimals: 8}),
            defaultCollateral
        );

        usdc = mockCollateral(
            bytes32("USDC"),
            MockConfig({symbol: "USDC", price: 1e8, setFeeds: true, tknDecimals: 18, oracleDecimals: 8}),
            defaultCollateral
        );

        usdt = mockCollateral(
            bytes32("USDT"),
            MockConfig({symbol: "USDT", price: 1e8, setFeeds: true, tknDecimals: 6, oracleDecimals: 8}),
            defaultCollateral
        );

        weth9 = new WETH9();
        MockOracle ethOracle = new MockOracle("ETH", 2000e8, 8);
        addCollateral(bytes32("ETH"), address(weth9), true, ORACLES_RS_CL, [addr.ZERO, address(ethOracle)], defaultCollateral);

        krETH = addKrAsset(
            bytes32("ETH"),
            false,
            ORACLES_RS_CL,
            [addr.ZERO, address(ethOracle)],
            deployKrAsset("krETH", "krETH", address(weth9), deployArgs.admin, deployArgs.treasury),
            defaultKrAsset
        );
        KrDeployExtended memory krBTCDeploy = deployKrAssetWithOracle("krBTC", "krBTC", 20000e8, addr.ZERO, deployArgs);
        krBTC = addKrAsset(
            bytes32("BTC"),
            true,
            ORACLES_RS_CL,
            [addr.ZERO, krBTCDeploy.oracleAddr],
            krBTCDeploy,
            defaultKrAsset
        );

        KrDeployExtended memory krJPYDeploy = deployKrAssetWithOracle("krJPY", "krJPY", 1e8, addr.ZERO, deployArgs);
        krJPY = addKrAsset(
            bytes32("JPY"),
            true,
            ORACLES_RS_CL,
            [addr.ZERO, krJPYDeploy.oracleAddr],
            krJPYDeploy,
            defaultKrAsset
        );

        krETH.krAsset.setUnderlying(address(weth9));

        enableSwapBothWays(address(kiss), krETH.addr, true);
        enableSwapBothWays(address(kiss), krJPY.addr, true);
        enableSwapSingleWay(krJPY.addr, krETH.addr, true);
        kresko.setFeeAssetSCDP(address(kiss));
    }
}
