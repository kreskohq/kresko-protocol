// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
// solhint-disable var-name-mixedcase
// solhint-disable max-states-count
// solhint-disable no-global-import
// solhint-disable const-name-snakecase
// solhint-disable state-visibility

import {KreskoForgeUtils} from "../utils/KreskoForgeUtils.s.sol";
import {ScriptBase} from "kresko-lib/utils/ScriptBase.sol";
import {WETH9} from "kresko-lib/token/WETH9.sol";
import {VaultAsset} from "vault/Types.sol";
import {ERC20} from "kresko-lib/token/ERC20.sol";
import {addr, tokens, cl} from "kresko-lib/info/Arbitrum.sol";

abstract contract DevnetBase is ScriptBase, KreskoForgeUtils {
    TestUserConfig[] internal users;
    WETH9 internal weth9;
    KISSConfig internal kissConfig;

    function setupUsers() internal {
        users.push(
            TestUserConfig({
                addr: getAddr(0),
                idx: 0,
                daiBalance: 100000e18,
                usdcBalance: 100000e18,
                usdtBalance: 100000e6,
                wethBalance: 100000e18
            })
        );
        users.push(TestUserConfig({addr: getAddr(1), idx: 1, daiBalance: 0, usdcBalance: 0, usdtBalance: 0, wethBalance: 0}));
        users.push(
            TestUserConfig({
                addr: getAddr(2),
                idx: 1,
                daiBalance: 1e24,
                usdcBalance: 1e24,
                usdtBalance: 1e12,
                wethBalance: 100e18
            })
        );
        users.push(defaultTestUser(getAddr(3), 3));
        users.push(defaultTestUser(getAddr(4), 4));
        users.push(defaultTestUser(getAddr(5), 5));
    }

    function defaultTestUser(address who, uint32 i) internal returns (TestUserConfig memory) {
        return
            TestUserConfig({
                addr: who,
                idx: i,
                daiBalance: 10000e18,
                usdcBalance: 1000e18,
                usdtBalance: 800e6,
                wethBalance: 2.5e18
            });
    }

    constructor(string memory _mnemonicId) ScriptBase(_mnemonicId) {}
}

/* -------------------------------------------------------------------------- */
/*                                   Forking                                  */
/* -------------------------------------------------------------------------- */

abstract contract ArbitrumDevnet is DevnetBase {
    KrDeployExtended internal krETH;
    KrDeployExtended internal krBTC;
    KrDeployExtended internal krJPY;

    address[2] internal BTC_FEEDS = [addr.ZERO, addr.CL_BTC];
    address[2] internal DAI_FEEDS = [addr.ZERO, addr.CL_DAI];
    address[2] internal ETH_FEEDS = [addr.ZERO, addr.CL_ETH];
    address[2] internal JPY_FEEDS = [addr.ZERO, addr.CL_JPY];
    address[2] internal USDC_FEEDS = [addr.ZERO, addr.CL_USDC];
    address[2] internal USDT_FEEDS = [addr.ZERO, addr.CL_USDT];

    VaultAsset internal USDC_VAULT_CONFIG =
        VaultAsset({
            token: tokens.USDC,
            oracle: cl.USDC,
            oracleTimeout: 86401,
            decimals: 0,
            depositFee: 0,
            withdrawFee: 0,
            maxDeposits: type(uint248).max,
            enabled: true
        });

    VaultAsset internal USDT_VAULT_CONFIG =
        VaultAsset({
            token: ERC20(addr.USDT),
            oracle: cl.USDT,
            oracleTimeout: 86401,
            decimals: 0,
            depositFee: 0,
            withdrawFee: 0,
            maxDeposits: type(uint248).max,
            enabled: true
        });

    VaultAsset internal DAI_VAULT_CONFIG =
        VaultAsset({
            token: ERC20(addr.DAI),
            oracle: cl.DAI,
            oracleTimeout: 86401,
            decimals: 0,
            depositFee: 0,
            withdrawFee: 0,
            maxDeposits: type(uint248).max,
            enabled: true
        });

    string constant btcPrice = "BTC:27662:8";
    string constant daiPrice = "DAI:1:8";
    string constant ethPrice = "ETH:1590:8";
    string constant jpyPrice = "JPY:0.0067:8";
    string constant usdcPrice = "USDC:1:8";
    string constant usdtPrice = "USDT:1:8";

    string constant initialPrices = "USDC:1:8,ETH:1590:8,JPY:0.0067:8,USDT:1:8,DAI:1:8,BTC:27662:8";

    function config() public returns (address admin_) {
        admin_ = getAddr(0);
        address treasury = getAddr(10);
        deployArgs = DeployArgs({
            admin: admin_,
            seqFeed: addr.CL_SEQ_UPTIME,
            oracleTimeout: 86401,
            minterMcr: 150e2,
            minterLt: 140e2,
            scdpMcr: 200e2,
            scdpLt: 150e2,
            sdiPrecision: 8,
            oraclePrecision: 8,
            council: getMockSafe(admin_),
            treasury: treasury
        });
    }

    constructor(string memory _mnemonicId) DevnetBase(_mnemonicId) {}
}

/* -------------------------------------------------------------------------- */
/*                                    Local                                   */
/* -------------------------------------------------------------------------- */

abstract contract Devnet is DevnetBase {
    // symbol:price:decimals
    string internal daiPrice = "DAI:1:8";
    string internal usdcPrice = "USDC:1:8";
    string internal ethPrice = "ETH:2000:8";
    string internal jpyPrice = "JPY:1:8";
    string internal kissPrice = "KISS:1:8";
    // symbol:price:decimals,symbol:price:decimals (...)
    string internal initialPrices = "USDC:1:8,ETH:2000:8,JPY:1:8,KISS:1:8,DAI:1:8,BTC:20000:8";

    function config() public returns (address admin_) {
        admin_ = getAddr(0);
        deployArgs = DeployArgs({
            admin: admin_,
            seqFeed: getMockSeqFeed(),
            minterMcr: 150e2,
            minterLt: 140e2,
            scdpMcr: 200e2,
            scdpLt: 150e2,
            oracleTimeout: 86401,
            council: getMockSafe(admin_),
            sdiPrecision: 8,
            oraclePrecision: 8,
            treasury: TEST_TREASURY
        });
        setupUsers();
    }

    MockCollDeploy internal dai;
    MockCollDeploy internal usdt;
    MockCollDeploy internal usdc;

    KrDeployExtended internal krETH;
    KrDeployExtended internal krBTC;
    KrDeployExtended internal krJPY;

    constructor(string memory _mnemonicId) DevnetBase(_mnemonicId) {}
}
