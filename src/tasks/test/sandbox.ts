import { task } from "hardhat/config";
import { TaskArguments } from "hardhat/types";
import { KreskoViewer } from "types/contracts";

task("sandbox").setAction(async function (_taskArgs: TaskArguments, hre) {
    const { deployer } = await hre.getNamedAccounts();
    const KreskoViewer = await hre.ethers.getContract<KreskoViewer>("KreskoViewer");

    const user = await KreskoViewer.kreskoUser(deployer);
    console.log(`User ${deployer}`, user);
});
