/* eslint-disable @typescript-eslint/no-unused-vars */
import { RPC } from "@kreskolabs/configs";
import { getLogger } from "@kreskolabs/lib";
import { getAMMPairs } from "@kreskolabs/protocol-ts";
import { ethers } from "ethers";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";
import { Kresko__factory } from "types/typechain";
// import { FluxPriceFeed__factory } from "types";
// import { flux } from "types/typechain/src/contracts/vendor";

const TASK_NAME = "sandbox";
const log = getLogger(TASK_NAME);
// const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
task(TASK_NAME).setAction(async function (_taskArgs: TaskArguments, hre) {
    const { deployer, testnetFunder, feedValidator } = await hre.ethers.getNamedSigners();

    try {
        await hre.deploy("Funder", {
            args: [(await hre.getContractOrFork("Kresko")).address],
        });
        log.log("Finished");
    } catch (e) {
        log.error(e);
    }

    return;
});
