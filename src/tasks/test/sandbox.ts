import { task } from "hardhat/config";
import { TaskArguments } from "hardhat/types";

task("sandbox").setAction(async function (_taskArgs: TaskArguments, hre) {
    const { ethers } = hre;
    console.log(ethers.constants.AddressZero);
    // const Kresko = await hre.ethers.getContract<Kresko>("Diamond");
    // const users = await hre.getUsers();
    // const data = await Kresko.getDepositedCollateralAssets(users.deployer.address);

    // const coll = await Kresko.collateralAsset("0xdE945BB222777d72F82d589Fa711Ba522A5FDec9");
    // await Kresko.connect(users.operator).updateCollateralAsset(
    //     "0xdE945BB222777d72F82d589Fa711Ba522A5FDec9",
    //     coll.anchor,
    //     0,
    //     coll.oracle,
    // );
});
