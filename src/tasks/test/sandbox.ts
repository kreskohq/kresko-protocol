import { task } from "hardhat/config";
import { TaskArguments } from "hardhat/types";
import { Token__factory } from "../../../types";

task("sandbox").setAction(async function (_taskArgs: TaskArguments, _hre) {
    const { getNamedAccounts, ethers } = _hre;
    const { deployer } = await getNamedAccounts();
    const Kresko = await ethers.getContract<Kresko>("Kresko");

    const tx = await Kresko.burnKreskoAsset(
        deployer,
        "0xd2c8834280d9891B3DF3e606865e2d1660Cb7B0d",
        ethers.utils.parseEther("0.003"),
        2,
    );
    const res = await tx.wait(2);

    console.log(res);
});
