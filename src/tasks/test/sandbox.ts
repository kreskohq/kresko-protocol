import { task } from "hardhat/config";
import { TaskArguments } from "hardhat/types";
import { ERC20PresetMinterPauser, ERC20Upgradeable, KreskoViewer } from "types/contracts";

task("sandbox").setAction(async function (_taskArgs: TaskArguments, hre) {
    const { deployer } = await hre.getNamedAccounts();
    const KreskoViewer = await hre.ethers.getContract<KreskoViewer>("KreskoViewer");

    const USDC = await hre.ethers.getContract<ERC20PresetMinterPauser>("USDC");

    await USDC.burn(hre.toBig("10000000"));
});
