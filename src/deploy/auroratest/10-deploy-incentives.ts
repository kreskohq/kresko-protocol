import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { RewardToken } from "@typechain";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const RewardToken1: RewardToken = await hre.run("deploy:token", {
        name: "RewardToken1",
        symbol: "Reward2",
        amount: 50000,
    });
    const RewardToken2: RewardToken = await hre.run("deploy:token", {
        name: "RewardToken2",
        symbol: "Reward2",
        amount: 50000,
    });
    const contracts = {
        RewardToken1: RewardToken1.address,
        RewardToken2: RewardToken2.address,
    };

    console.table(contracts);
};
export default func;

func.tags = ["auroratest"];
