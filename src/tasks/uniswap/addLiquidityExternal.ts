import { fromBig } from "@utils/numbers";
import { task } from "hardhat/config";
import { UniswapV2Pair } from "types";

task("addliquidity:external").setAction(async (taskArgs, hre) => {
    const { ethers, deployments } = hre;
    const USDC = await ethers.getContract<Token>("USDC");

    /**  Aurora/USDC */
    const Aurora = await ethers.getContract<Token>("Aurora");
    console.log("AURORA", Aurora.address);
    const auroraFeedDeployment = await deployments.get("AURORAUSD");
    const auroraFeed = await ethers.getContractAt<FluxPriceFeed>(
        auroraFeedDeployment.abi,
        auroraFeedDeployment.address,
    );
    const AuroraValue = fromBig(await auroraFeed.latestAnswer(), 8);
    const AURORADepositAmount = 45000;

    console.log("Aurora amount", Number(AuroraValue) * AURORADepositAmount);

    const AURORAUSDCPair: UniswapV2Pair = await hre.run("uniswap:addliquidity", {
        tkn0: {
            address: USDC.address,
            amount: Number((Number(AuroraValue) * AURORADepositAmount).toFixed(0)),
        },
        tkn1: {
            address: Aurora.address,
            amount: AURORADepositAmount,
        },
    });

    hre.uniPairs["AURORA/USDC"] = AURORAUSDCPair;

    console.log("Liquidity added for pair @ ", AURORAUSDCPair.address);

    /**  wNEAR/USDC */
    const wNEAR = await ethers.getContract<Token>("Wrapped Near");
    const nearFeedDeployment = await deployments.get("NEARUSD");
    const nearFeed = await ethers.getContractAt<FluxPriceFeed>(nearFeedDeployment.abi, nearFeedDeployment.address);
    const NearValue = fromBig(await nearFeed.latestAnswer(), 8);
    const NearDepositAmount = 32500;

    const NEARUSDCPair: UniswapV2Pair = await hre.run("uniswap:addliquidity", {
        tkn0: {
            address: USDC.address,
            amount: Number((Number(NearValue) * AURORADepositAmount).toFixed(0)),
        },
        tkn1: {
            address: wNEAR.address,
            amount: NearDepositAmount,
        },
    });

    hre.uniPairs["wNEAR/USDC"] = NEARUSDCPair;

    console.log("Liquidity added for pair @ ", NEARUSDCPair.address);
});
