// import { toBig } from "hardhat";
import { DeployFunction } from "hardhat-deploy/types";
// import { MockERC20 } from "types/typechain";

/** Deployment stub */
const deploy: DeployFunction = async () => {
    // const { deployer } = await hre.getNamedAccounts();
    const Kresko = await hre.getContractOrFork("Kresko");
    console.log(Kresko.address);
    // const KISS = await hre.getContractOrFork("KISS");
    // const krETH = await hre.getContractOrFork("KreskoAsset", "krETH");
};

deploy.tags = ["sandbox"];
export default deploy;
