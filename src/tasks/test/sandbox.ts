/* eslint-disable @typescript-eslint/no-unused-vars */
import { getLogger } from "@kreskolabs/lib";
import { defaultKrAssetArgs } from "@utils/test/mocks";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

const TASK_NAME = "sandbox";
const log = getLogger(TASK_NAME);
task(TASK_NAME).setAction(async function (_taskArgs: TaskArguments, hre) {
    const { deployer } = await hre.ethers.getNamedSigners();

    const Diamond = await hre.getContractOrFork("Kresko");
    const krETH = (await hre.ethers.getContract("krETH")) as KreskoAsset;
    const krTSLA = (await hre.ethers.getContract("krTSLA")) as KreskoAsset;

    const UniOracle = await hre.getContractOrFork("UniswapV2Oracle");

    await UniOracle.update("0x311F38234E3A9EAC1AF2a3b618924b0D46E73C13");
    await UniOracle.update("0xB267127D5FE72bdbEE86A204A0f1A9Ad14BE75Ee");

    // await UniOracle.initPair("0x311F38234E3A9EAC1AF2a3b618924b0D46E73C13", krETH.address, 60 * 30);
    // await UniOracle.initPair("0xB267127D5FE72bdbEE86A204A0f1A9Ad14BE75Ee", krTSLA.address, 60 * 30);
    // console.log("Configured UniV2Oracle");

    // await Diamond.setupStabilityRateParams(krTSLA.address, defaultKrAssetArgs.stabilityRates);
    // await Diamond.setupStabilityRateParams(krETH.address, defaultKrAssetArgs.stabilityRates);
    // console.log("Configured stability rates");

    try {
        console.log(Diamond.address);
        log.log("Finished");
    } catch (e) {
        log.error(e);
    }

    return;
});
