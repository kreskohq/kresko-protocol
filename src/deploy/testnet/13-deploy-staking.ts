import type { DeployFunction } from "@kreskolabs/hardhat-deploy/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { KrStaking, MockERC20, UniswapV2Factory } from "types";
import { getLogger } from "@kreskolabs/lib";
import { testnetConfigs } from "@deploy-config/testnet-goerli";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("deploy-staking");
    const { ethers } = hre;

    const config = testnetConfigs[hre.network.name];

    const Factory = await hre.ethers.getContract<UniswapV2Factory>("UniswapV2Factory");

    const pools = config.stakingPools;
    const [token0, token1] = pools[0].lpToken;
    const [rewardToken1] = config.rewardTokens;

    const Token0 = await ethers.getContract<MockERC20>(token0.symbol);
    const Token1 = await ethers.getContract<MockERC20>(token1.symbol);
    const InitialStakingToken = await Factory.getPair(Token0.address, Token1.address);

    if (InitialStakingToken === ethers.constants.AddressZero) {
        throw new Error("No pools deployed and trying to initialize staking");
    }

    const Reward1: MockERC20 = await hre.run("deploy-token", {
        name: rewardToken1.name,
        symbol: rewardToken1.symbol,
        log: true,
        amount: rewardToken1.mintAmount,
        decimals: rewardToken1.decimals,
    });

    const [perBlock1] = config.rewardsPerBlock;

    const Staking: KrStaking = await hre.run("deploy-staking", {
        stakingToken: InitialStakingToken,
        rewardTokens: `${Reward1.address}`,
        rewardPerBlocks: `${perBlock1}`,
    });

    logger.success("Succesfully deployed Staking contract @", Staking.address);
};

func.skip = async hre => {
    const Staking = await hre.deployments.getOrNull("KrStaking");
    const logger = getLogger("deploy-staking");
    !!Staking && logger.log("Skipping deploying staking");
    return !!Staking;
};
func.tags = ["testnet", "staking", "staking-deployment"];
func.dependencies = ["add-liquidity"];

export default func;
