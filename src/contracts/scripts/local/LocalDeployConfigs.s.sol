// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {KreskoForgeUtils} from "../utils/KreskoForgeUtils.s.sol";

// solhint-disable var-name-mixedcase
// solhint-disable max-states-count
// solhint-disable no-global-import

abstract contract LocalDeployBase is KreskoForgeUtils {
    TestUserConfig[] internal users;
    KISSWhitelistResult internal kissConfig;

    KreskoAssetDeployResult internal krETH;
    KreskoAssetDeployResult internal krBTC;
    KreskoAssetDeployResult internal krJPY;

    function setUp() internal {
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
        users.push(defaultTestUser(getAddr(3)));
        users.push(defaultTestUser(getAddr(4)));
        users.push(defaultTestUser(getAddr(5)));
    }
}

/* -------------------------------------------------------------------------- */
/*                                    Local                                   */
/* -------------------------------------------------------------------------- */

abstract contract ArbitrumForkConfig is LocalDeployBase {
    address internal admin;

    AggregatorV3Interface internal usdtOracle = AggregatorV3Interface(0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7);
    AggregatorV3Interface internal usdcOracle = AggregatorV3Interface(0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3);
    AggregatorV3Interface internal daiOracle = AggregatorV3Interface(0xc5C8E77B397E531B8EC06BFb0048328B30E9eCfB);
    AggregatorV3Interface internal ethOracle = AggregatorV3Interface(0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612);
    AggregatorV3Interface internal btcOracle = AggregatorV3Interface(0x6ce185860a4963106506C203335A2910413708e9);
    AggregatorV3Interface internal jpyOracle = AggregatorV3Interface(0x3dD6e51CB9caE717d5a8778CF79A04029f9cFDF8);
    AggregatorV3Interface internal seqFeed = AggregatorV3Interface(0xFdB631F5EE196F0ed6FAa767959853A9F217697D);

    string internal daiPrice = "DAI:1:8";
    string internal usdcPrice = "USDC:1:8";
    string internal usdtPrice = "USDT:1:8";
    string internal btcPrice = "BTC:27662:8";
    string internal ethPrice = "ETH:1590:8";
    string internal jpyPrice = "JPY:0.0067:8";
    string internal initialPrices = "USDC:1:8,ETH:1590:8,JPY:0.0067:8,USDT:1:8,DAI:1:8,BTC:27662:8";

    function setupDeploy() public {
        admin = getAddr(0);
        deployArgs = DeployArgs({
            admin: getAddr(0),
            seqFeed: address(seqFeed),
            oracleTimeout: 86401,
            minterMcr: 150e2,
            minterLt: 140e2,
            scdpMcr: 200e2,
            scdpLt: 150e2,
            sdiPrecision: 8,
            oraclePrecision: 8,
            council: getMockSafe(getAddr(0)),
            treasury: getAddr(10)
        });
    }
}

/* -------------------------------------------------------------------------- */
/*                                   Forking                                  */
/* -------------------------------------------------------------------------- */

abstract contract LocalNetworkConfig is LocalDeployBase {
    address internal testAdmin;
    // symbol:price:decimals
    string internal daiPrice = "DAI:1:8";
    string internal usdcPrice = "USDC:1:8";
    string internal ethPrice = "ETH:2000:8";
    string internal jpyPrice = "JPY:1:8";
    string internal kissPrice = "KISS:1:8";
    // symbol:price:decimals,symbol:price:decimals (...)
    string internal initialPrices = "USDC:1:8,ETH:2000:8,JPY:1:8,KISS:1:8,DAI:1:8,BTC:20000:8";

    function setupDeploy() public {
        testAdmin = getAddr(0);
        deployArgs = DeployArgs({
            admin: testAdmin,
            seqFeed: getMockSeqFeed(),
            minterMcr: 150e2,
            minterLt: 140e2,
            scdpMcr: 200e2,
            scdpLt: 150e2,
            oracleTimeout: 86401,
            council: getMockSafe(testAdmin),
            sdiPrecision: 8,
            oraclePrecision: 8,
            treasury: TEST_TREASURY
        });
    }

    MockOracle internal usdcOracle;
    MockOracle internal usdtOracle;
    MockOracle internal daiOracle;
    MockOracle internal ethOracle;
    MockOracle internal btcOracle;
    MockOracle internal jpyOracle;

    WETH9 internal weth9;
    MockCollateralDeployResult internal dai;
    MockCollateralDeployResult internal usdt;
    MockCollateralDeployResult internal usdc;
}

/* -------------------------------------------------------------------------- */
/*                                    util                                    */
/* -------------------------------------------------------------------------- */

struct TestUserConfig {
    address addr;
    uint256 idx;
    uint256 daiBalance;
    uint256 usdtBalance;
    uint256 usdcBalance;
    uint256 wethBalance;
}

function defaultTestUser(address who, uint32 i) returns (TestUserConfig memory) {
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
