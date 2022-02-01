import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { ethers } = hre;

    const DollarOracle = await ethers.getContract<BasicOracle>("DollarOracle");

    await hre.run("kresko:addcollateral", {
        name: "Dollar",
        closeFactor: 0.85,
        oracleAddr: DollarOracle.address,
    });
};
export default func;

func.tags = ["auroratest", "addcollateral"];
