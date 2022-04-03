import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { RewardToken } from "@typechain";
import { getLogger } from "@utils/deployment";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("deploy-incentives");
    const RewardToken1: RewardToken = await hre.run("deploy:token", {
        name: "RewardToken1",
        symbol: "Reward2",
        amount: 50_000_000,
        wait: 2,
    });
    const RewardToken2: RewardToken = await hre.run("deploy:token", {
        name: "RewardToken2",
        symbol: "Reward2",
        amount: 50_000_000,
        wait: 2,
    });
    const contracts = {
        RewardToken1: RewardToken1.address,
        RewardToken2: RewardToken2.address,
    };

    logger.table(contracts);
};
export default func;

func.tags = ["auroratest"];
