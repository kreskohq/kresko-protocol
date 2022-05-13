import { getLogger, getPriceFeeds, sleep } from "@utils/deployment";
import { fromBig, toBig } from "@utils/numbers";
import { task, types } from "hardhat/config";
import { MockWETH10, UniswapV2Pair } from "types";

task("addliquidity:external")
    .addOptionalParam("log", "log information", true, types.boolean)
    .addOptionalParam("wait", "wait confirmations", 1, types.int)
    .setAction(async (taskArgs, hre) => {
        const { ethers, deployments } = hre;
        const priceFeeds = await getPriceFeeds(hre);
        const { log } = taskArgs;
        const USDC = await ethers.getContract<Token>("USDC");

        const logger = getLogger("addLiquidityExternal", log);

        /**  Aurora/USDC */
        const Aurora = await ethers.getContract<Token>("AURORA");
        const auroraFeedDeployment = await deployments.get("AURORAUSD");
        const auroraFeed = await ethers.getContractAt<FluxPriceFeed>(
            auroraFeedDeployment.abi,
            auroraFeedDeployment.address,
        );
        const AuroraValue = fromBig(await auroraFeed.latestAnswer(), 8);
        const AURORADepositAmount = 75000;

        const AURORAUSDCPair: UniswapV2Pair = await hre.run("uniswap:addliquidity", {
            tknA: {
                address: USDC.address,
                amount: Number((Number(AuroraValue) * AURORADepositAmount).toFixed(0)),
            },
            tknB: {
                address: Aurora.address,
                amount: AURORADepositAmount,
            },
            skipIfLiqExists: true,
        });

        hre.uniPairs["AURORA/USDC"] = AURORAUSDCPair;

        logger.success("Succesfully added AURORA/USDC liquidity @ ", AURORAUSDCPair.address);

        /**  wNEAR/USDC */
        const wNEAR = await ethers.getContract<Token>("wNEAR");
        const nearFeedDeployment = await deployments.get("NEARUSD");
        const nearFeed = await ethers.getContractAt<FluxPriceFeed>(nearFeedDeployment.abi, nearFeedDeployment.address);
        const NearValue = fromBig(await nearFeed.latestAnswer(), 8);
        const NearDepositAmount = 52500;

        const NEARUSDCPair: UniswapV2Pair = await hre.run("uniswap:addliquidity", {
            tknA: {
                address: USDC.address,
                amount: Number((Number(NearValue) * AURORADepositAmount).toFixed(0)),
            },
            tknB: {
                address: wNEAR.address,
                amount: NearDepositAmount,
            },
            skipIfLiqExists: true,
        });

        hre.uniPairs["wNEAR/USDC"] = NEARUSDCPair;

        logger.success("Succesfully added wNEAR/USDC liquidity @ ", NEARUSDCPair.address);

        /**  WETH/USDC */
        const WETH = await ethers.getContract<MockWETH10>("WETH");
        const ethValue = fromBig(await priceFeeds["ETH/USD"].latestAnswer(), 8);
        const wethDepositAmount = 250;

        const tx = await WETH.deposit(toBig(250));
        await tx.wait();
        sleep(1500);
        const WETHUSDCPair: UniswapV2Pair = await hre.run("uniswap:addliquidity", {
            tknA: {
                address: USDC.address,
                amount: Number((Number(ethValue) * wethDepositAmount).toFixed(0)),
            },
            tknB: {
                address: WETH.address,
                amount: wethDepositAmount,
            },
            skipIfLiqExists: true,
        });

        hre.uniPairs["WETH/USDC"] = WETHUSDCPair;

        logger.success("Succesfully added WETH/USDC liquidity @ ", WETHUSDCPair.address);
        return;
    });
