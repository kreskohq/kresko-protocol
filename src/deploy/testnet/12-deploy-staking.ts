import type { DeployFunction } from "@kreskolabs/hardhat-deploy/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { KrStaking, MockERC20, UniswapV2Factory } from "types";
import { getLogger } from "@utils/deployment";
import { testnetConfigs } from "src/config/deployment";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("deploy-staking");
    const { ethers } = hre;

    const config = testnetConfigs[hre.network.name];

    const Factory = await hre.ethers.getContract<UniswapV2Factory>("UniswapV2Factory");

    const pools = config.stakingPools;
    const [token0, token1] = pools[0].lpToken;

    const Token0 = await ethers.getContract<MockERC20>(token0.symbol);
    const Token1 = await ethers.getContract<MockERC20>(token1.symbol);
    const InitialStakingToken = await Factory.getPair(Token0.address, Token1.address);

    if (InitialStakingToken === ethers.constants.AddressZero) {
        throw new Error("No pools deployed and trying to initialize staking");
    }

    const [rewardToken1, rewardToken2] = config.rewardTokens;
    const RewardToken1 = await ethers.getContract<MockERC20>(rewardToken1.symbol);
    const RewardToken2 = await ethers.getContract<MockERC20>(rewardToken2.symbol);

    const [perBlock1, perBlock2] = config.rewardsPerBlock;

    const Staking: KrStaking = await hre.run("deploy-staking", {
        stakingToken: InitialStakingToken,
        rewardTokens: `${RewardToken1.address},${RewardToken2.address}`,
        rewardPerBlocks: `${perBlock1},${perBlock2}`,
    });

    logger.success("Succesfully deployed Staking contract @", Staking.address);
};

func.skip = async hre => {
    const Staking = await hre.deployments.getOrNull("KrStaking");
    const logger = getLogger("deploy-staking");
    !!Staking && logger.log("Skipping deploying staking");
    return !!Staking;
};
func.tags = ["testnet", "staking"];
func.dependencies = ["add-liquidity"];

export default func;
