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

contract Localnet is ScriptBase("LOCALNET_MNEMONIC"), DeployHelper {
    KISS public kiss;
    Vault public vkiss;
    MockERC20 internal usdc;
    MockERC20 internal dai;
    WETH9 internal weth9;
    KreskoAsset internal krETH;
    KreskoAsset internal krBTC;
    KreskoAsset internal krJPY;

    MockOracle internal daiOracle;
    MockOracle internal usdcOracle;
    MockOracle internal ethOracle;
    MockOracle internal btcOracle;
    MockOracle internal jpyOracle;
    MockOracle internal kissOracle;

    string internal daiPrice = "DAI:1:8";
    string internal usdcPrice = "USDC:1:8";
    string internal ethPrice = "ETH:2000:8";
    string internal jpyPrice = "JPY:1:8";
    string internal kissPrice = "KISS:1:8";
    string internal initialPrices = "USDC:1:8,ETH:2000:8,JPY:1:8,KISS:1:8,DAI:1:8,BTC:20000:8";

    function run() external broadcastWithMnemonic(0) {
        createvKISS();
        createProtocol();

        vkiss.addAsset(
            VaultAsset(ERC20(address(usdc)), AggregatorV3Interface(address(usdcOracle)), type(uint256).max, 0, 0, true)
        );
        vkiss.addAsset(
            VaultAsset(ERC20(address(dai)), AggregatorV3Interface(address(daiOracle)), type(uint256).max, 0, 0, true)
        );
    }

    function createProtocol() internal {
        DeployParams memory params = DeployParams({
            admin: getAddr(0),
            seqFeed: address(new MockSequencerUptimeFeed()),
            minterMcr: 150e2,
            minterLt: 140e2,
            scdpMcr: 200e2,
            scdpLt: 150e2,
            sdiPrecision: 8
        });

        deployDiamond(params);
        weth9 = new WETH9();
        kiss = new KISS();
        kissOracle = new MockOracle("KISS/USD", 1e8, 8); // @todo change this to vault price
        kiss.initialize("KISS", "KISS", 18, address(kresko), address(kresko), address(vkiss));

        (dai, daiOracle) = deployAndAddCollateral("DAI", bytes12("DAI"), 18, 1e8, false);
        (usdc, usdcOracle) = deployAndAddCollateral("USDC", bytes12("USDC"), 18, 1e8, false);
        (krBTC, , btcOracle) = deployAndWhitelistKrAsset("krBTC", bytes12("BTC"), params.admin, 20000e8, true, true, false);
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

    function createvKISS() internal {
        // Create a vault
        vkiss = new Vault("vKISS", "vKISS", 18, 8, TREASURY);
    }
}
