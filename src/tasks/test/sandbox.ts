import { task } from "hardhat/config";
import { TaskArguments } from "hardhat/types";

task("sandbox").setAction(async function (_taskArgs: TaskArguments, _hre) {
    const { ethers } = _hre;
    console.log(ethers.constants.AddressZero);
});
