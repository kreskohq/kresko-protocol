import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "@kreskolabs/hardhat-deploy/types";
import { getLogger } from "@utils/deployment";
import type { KrStaking } from "types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("deploy-staking");
    const { ethers, uniPairs } = hre;

    const RewardToken1 = await ethers.getContract<Token>("AURORA");
    const RewardToken2 = await ethers.getContract<Token>("wNEAR");

    const USDCKRTSLA = uniPairs["USDC/KRTSLA"].address;

    const Staking: KrStaking = await hre.run("deploy:staking", {
        stakingToken: USDCKRTSLA,
        rewardTokens: `${RewardToken1.address},${RewardToken2.address}`,
        rewardPerBlocks: "0.004,0.002",
    });

    logger.success("Succesfully deployed Staking contract @", Staking.address);
};

func.skip = async hre => {
    const Staking = await hre.deployments.getOrNull("KrStaking");
    const logger = getLogger("deploy-staking");
    !!Staking && logger.log("Skipping deploying staking");
    return !!Staking;
};

func.tags = ["auroratest", "auroratest-staking"];

export default func;
