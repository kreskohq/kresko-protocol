import { testnetConfigs } from "@deploy-config/opgoerli";
import { getLogger } from "@kreskolabs/lib";
import { TASK_DEPLOY_STAKING, TASK_DEPLOY_TOKEN } from "@tasks";
import type { DeployFunction } from "hardhat-deploy/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

const logger = getLogger("deploy-staking");

const deploy: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const config = testnetConfigs[hre.network.name];

    const Factory = await hre.getContractOrFork("UniswapV2Factory");

    const pools = config.stakingPools;
    const [token0, token1] = pools[0].lpToken;
    const [rewardToken1] = config.rewardTokens;

    const Token0 = await hre.getContractOrFork("ERC20Upgradeable", token0.symbol);
    const Token1 = await hre.getContractOrFork("ERC20Upgradeable", token1.symbol);
    const InitialStakingToken = await Factory.getPair(Token0.address, Token1.address);

    if (InitialStakingToken === hre.ethers.constants.AddressZero) {
        throw new Error("No pools deployed and trying to initialize staking");
    }

    const Reward1: typeof Token0 = await hre.run(TASK_DEPLOY_TOKEN, {
        name: rewardToken1.name,
        symbol: rewardToken1.symbol,
        log: true,
        amount: rewardToken1.mintAmount,
        decimals: rewardToken1.decimals,
    });

    const [perBlock1] = config.rewardsPerBlock;

    const Staking: KrStaking = await hre.run(TASK_DEPLOY_STAKING, {
        stakingToken: InitialStakingToken,
        rewardTokens: `${Reward1.address}`,
        rewardPerBlocks: `${perBlock1}`,
    });

    logger.success("Succesfully deployed Staking contract @", Staking.address);
};

deploy.skip = async hre => {
    const skip = (await hre.deployments.getOrNull("KrStaking")) != null;
    if (skip) {
        logger.log("Skipping deploying staking");
    }
    return skip || hre.network.live;
};
deploy.tags = ["local", "staking", "staking-deployment"];
deploy.dependencies = ["add-liquidity"];

export default deploy;
