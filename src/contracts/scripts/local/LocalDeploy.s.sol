// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;
// solhint-disable var-name-mixedcase
// solhint-disable max-states-count
// solhint-disable no-global-import

import {KreskoForgeUtils} from "../utils/KreskoForgeUtils.s.sol";
import {WETH9} from "vendor/WETH9.sol";
import {Vault} from "vault/Vault.sol";
import {KISS} from "kiss/KISS.sol";
import {VaultAsset} from "vault/Types.sol";
import {MockOracle} from "mocks/MockOracle.sol";
import {AggregatorV3Interface} from "vendor/AggregatorV3Interface.sol";
import {Arbitrum} from "kresko-helpers/info/Addresses.sol";
import {ERC20} from "vendor/ERC20.sol";
import {LocalNetworkConfig, ArbitrumForkConfig} from "scripts/local/LocalDeployConfig.s.sol";
import {ScriptBase} from "kresko-helpers/utils/ScriptBase.sol";

contract WithLocalNetwork is ScriptBase("MNEMONIC_LOCALNET"), LocalNetworkConfig {
    function run() external broadcastWithMnemonic(0) {
        kresko = deployDiamond(deployArgs);
        mockSeqFeed.setAnswers(0, 0, 0);

        setupSpecialTokens();
        setupProtocol();
        setupVault();
    }

    function setupSpecialTokens() internal {
        require(address(kresko) != address(0), "deploy the diamond before special tokens");
        require(deployArgs.admin != address(0), "some admin address should be set");
        require(deployArgs.seqFeed != address(0), "deploy the sequencer uptime feed before special tokens");
        require(deployArgs.treasury != address(0), "some treasury address is required");

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
        require(address(dai.asset) != address(0), "dai");
        require(address(usdc.asset) != address(0), "usdc");
        require(address(usdt.asset) != address(0), "usdt");
        vkiss.addAsset(
            VaultAsset({
                token: ERC20(address(usdc.asset)),
                oracle: AggregatorV3Interface(address(usdcOracle)),
                oracleTimeout: 86401,
                decimals: 0,
                depositFee: 0,
                withdrawFee: 0,
                maxDeposits: type(uint248).max,
                enabled: true
            })
        );
        vkiss.addAsset(
            VaultAsset({
                token: ERC20(address(usdt.asset)),
                oracle: AggregatorV3Interface(address(usdtOracle)),
                oracleTimeout: 86401,
                decimals: 0,
                depositFee: 0,
                withdrawFee: 0,
                maxDeposits: type(uint248).max,
                enabled: true
            })
        );
        vkiss.addAsset(
            VaultAsset({
                token: ERC20(address(dai.asset)),
                oracle: AggregatorV3Interface(address(daiOracle)),
                oracleTimeout: 86401,
                decimals: 0,
                depositFee: 0,
                withdrawFee: 0,
                maxDeposits: type(uint248).max,
                enabled: true
            })
        );
    }

    function setupProtocol() internal {
        kissConfig = whitelistKISS(address(kiss), address(vkiss), defaultKISS);

        dai = deployAddCollateralMocked(
            bytes12("DAI"),
            MockConfig({symbol: "DAI", price: 1e8, updateFeeds: true, tknDecimals: 18, oracleDecimals: 8}),
            minterCollateral
        );
        daiOracle = dai.oracle;

        usdc = deployAddCollateralMocked(
            bytes12("USDC"),
            MockConfig({symbol: "USDC", price: 1e8, updateFeeds: true, tknDecimals: 18, oracleDecimals: 8}),
            minterCollateral
        );
        usdcOracle = usdc.oracle;

        usdt = deployAddCollateralMocked(
            bytes12("USDT"),
            MockConfig({symbol: "USDT", price: 1e8, updateFeeds: true, tknDecimals: 6, oracleDecimals: 8}),
            minterCollateral
        );
        usdtOracle = usdt.oracle;

        addExternalAsset(
            bytes12("ETH"),
            address((weth9 = new WETH9())),
            address((ethOracle = new MockOracle("ETH", 2000e8, 8))),
            true,
            minterCollateral
        );

        krETH = whitelistKrAsset(
            bytes12("ETH"),
            address(ethOracle),
            false,
            deployKrAsset("krETH", "krETH", address(weth9), deployArgs),
            nonScdpDepositableKrAsset
        );

        krBTC = whitelistKrAsset(
            bytes12("BTC"),
            true,
            deployKrAssetMockFeed("krBTC", "krBTC", 20000e8, address(0), deployArgs),
            nonScdpDepositableKrAsset
        );
        btcOracle = krBTC.oracle;

        krJPY = whitelistKrAsset(
            bytes12("JPY"),
            true,
            deployKrAssetMockFeed("krJPY", "krJPY", 1e8, address(0), deployArgs),
            nonScdpDepositableKrAsset
        );
        jpyOracle = krJPY.oracle;

        krETH.krAsset.setUnderlying(address(weth9));

        enableSwapBothWays(address(kiss), address(krETH.krAsset), true);
        enableSwapBothWays(address(kiss), address(krJPY.krAsset), true);
        enableSwapSingleWay(address(krJPY.krAsset), address(krETH.krAsset), true);
        kresko.setFeeAssetSCDP(address(kiss));
    }
}

contract WithArbitrumFork is ScriptBase("MNEMONIC_LOCALNET"), ArbitrumForkConfig {
    function setUp() public {
        vm.createSelectFork("arbitrum", 139363921);
    }

    function run() external broadcastWithMnemonic(0) {
        kresko = deployDiamond(deployArgs);
        setupSpecialTokens();
        setupProtocol();
        configureVaultAssets();
    }

    function setupSpecialTokens() internal {
        require(address(kresko) != address(0), "deploy the diamond before special tokens");
        require(deployArgs.seqFeed != address(0), "deploy the sequencer uptime feed before special tokens");
        require(deployArgs.admin != address(0), "some admin address should be set");
        require(deployArgs.treasury != address(0), "some treasury address is required");

        vkiss = new Vault("vKISS", "vKISS", 18, 8, deployArgs.treasury, address(deployArgs.seqFeed));
        kiss = new KISS();
        kiss.initialize("Kresko Integrated Stable System", "KISS", 18, deployArgs.council, address(kresko), address(vkiss));
    }

    function configureVaultAssets() internal {
        require(address(Arbitrum.dai) != address(0), "dai");
        require(address(Arbitrum.usdc) != address(0), "usdc");
        require(address(Arbitrum.usdt) != address(0), "usdt");
        vkiss.addAsset(
            VaultAsset({
                token: ERC20(address(Arbitrum.usdc)),
                oracle: usdcOracle,
                oracleTimeout: 86401,
                decimals: 0,
                depositFee: 0,
                withdrawFee: 0,
                maxDeposits: type(uint248).max,
                enabled: true
            })
        );
        vkiss.addAsset(
            VaultAsset({
                token: ERC20(address(Arbitrum.usdt)),
                oracle: usdtOracle,
                oracleTimeout: 86401,
                decimals: 0,
                depositFee: 0,
                withdrawFee: 0,
                maxDeposits: type(uint248).max,
                enabled: true
            })
        );
        vkiss.addAsset(
            VaultAsset({
                token: ERC20(address(Arbitrum.dai)),
                oracle: daiOracle,
                oracleTimeout: 86401,
                decimals: 0,
                depositFee: 0,
                withdrawFee: 0,
                maxDeposits: type(uint248).max,
                enabled: true
            })
        );
    }

    function setupProtocol() internal {
        kissConfig = whitelistKISS(address(kiss), address(vkiss), defaultKISS);

        addExternalAsset(bytes12("ETH"), address(Arbitrum.weth), address(ethOracle), true, minterCollateral);
        addExternalAsset(bytes12("BTC"), address(Arbitrum.wbtc), address(btcOracle), true, minterCollateral);
        addExternalAsset(bytes12("DAI"), address(Arbitrum.dai), address(daiOracle), true, minterCollateral);
        addExternalAsset(bytes12("USDC"), address(Arbitrum.usdc), address(usdcOracle), true, minterCollateral);
        addExternalAsset(bytes12("USDT"), address(Arbitrum.usdt), address(usdtOracle), true, minterCollateral);

        krETH = addDeployedKrAsset(
            bytes12("ETH"),
            address(ethOracle),
            false,
            deployKrAsset("Kresko Asset: Ether", "krETH", address(Arbitrum.weth), deployArgs),
            nonScdpDepositableKrAsset
        );
        krBTC = addDeployedKrAsset(
            bytes12("BTC"),
            address(btcOracle),
            false,
            deployKrAsset("Kresko Asset: Bitcoin", "krBTC", address(Arbitrum.wbtc), deployArgs),
            nonScdpDepositableKrAsset
        );
        krJPY = addDeployedKrAsset(
            bytes12("JPY"),
            address(jpyOracle),
            true,
            deployKrAsset("Kresko Asset: Bitcoin", "krBTC", address(0), deployArgs),
            nonScdpDepositableKrAsset
        );

        enableSwapBothWays(address(kiss), address(krETH.krAsset), true);
        enableSwapBothWays(address(kiss), address(krJPY.krAsset), true);
        enableSwapSingleWay(address(krJPY.krAsset), address(krETH.krAsset), true);
        kresko.setFeeAssetSCDP(address(kiss));
    }
}
