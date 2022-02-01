import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { ethers } = hre;
    const GoldOracle = await ethers.getContract<BasicOracle>("GoldOracle");
    await hre.run("kresko:addkrasset", {
        name: "KrGold",
        kFactor: 1.1,
        oracleAddr: GoldOracle.address,
    });
};
export default func;

func.tags = ["kovan", "addkrasset"];
