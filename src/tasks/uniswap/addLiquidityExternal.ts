import { getLogger } from "@utils/deployment";
import { fromBig } from "@utils/numbers";
import { task, types } from "hardhat/config";
import { UniswapV2Pair } from "types";

task("addliquidity:external")
    .addOptionalParam("log", "log information", true, types.boolean)
    .addOptionalParam("wait", "wait confirmations", 1, types.int)
    .setAction(async (taskArgs, hre) => {
        const { ethers, deployments } = hre;
        const { log, wait } = taskArgs;
        const USDC = await ethers.getContract<Token>("USDC");

        const logger = getLogger("addLiquidityExternal", log);

        /**  Aurora/USDC */
        const Aurora = await ethers.getContract<Token>("Aurora");
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
            wait,
        });

        hre.uniPairs["AURORA/USDC"] = AURORAUSDCPair;

        /**  wNEAR/USDC */
        const wNEAR = await ethers.getContract<Token>("Wrapped Near");
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
            wait,
        });

        hre.uniPairs["wNEAR/USDC"] = NEARUSDCPair;

        logger.success("Succesfully added external liquidity @ ", NEARUSDCPair.address);
    });
