import { testnetConfigs } from "@deploy-config/arbitrumGoerli";
import { fromBig, getLogger, toBig } from "@kreskolabs/lib";
import type { DeployFunction } from "hardhat-deploy/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

const logger = getLogger("deploy-staking");

const deploy: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const Staking = await hre.getContractOrFork("KrStaking");

    const config = testnetConfigs[hre.network.name];
    const [rewardToken1] = config.rewardTokens;
    const Reward1 = await hre.getContractOrFork("MockERC20", rewardToken1.symbol);
    const RewardTokens = [Reward1.address];

    const Factory = await hre.getContractOrFork("UniswapV2Factory");

    // First pool is added on the constructor
    const pools = config.stakingPools.slice(1);

    for (const pool of pools) {
        logger.log(`Adding pool ${pool.lpToken[0].symbol}- ${pool.lpToken[1].symbol}`);
        const [token0, token1] = pool.lpToken;
        const Token0 = await hre.getContractOrFork("MockERC20", token0.symbol);
        const Token1 = await hre.getContractOrFork("MockERC20", token1.symbol);
        const lpToken = await Factory.getPair(Token0.address, Token1.address);
        const result0 = await Staking.getPidFor(lpToken);
        if (!result0.found) {
            const tx = await Staking.addPool(RewardTokens, lpToken, pool.allocPoint, pool.startBlock);
            await tx.wait();
        }
    }

    const [amount1] = config.rewardTokenAmounts;
    if (!(await Reward1.balanceOf(Staking.address)).gt(0)) {
        await Reward1.mint(Staking.address, toBig(amount1));
    }

    const Reward1Bal = await Reward1.balanceOf(Staking.address);

    logger.success("Pools total", Number(await Staking.poolLength()));
    logger.success("R1", fromBig(Reward1Bal), rewardToken1.symbol);
    logger.success("Incentives added");
};

deploy.skip = async hre => {
    if (process.env.COVERAGE) return true;

    const Staking = await hre.getContractOrFork("KrStaking");
    const config = testnetConfigs[hre.network.name];
    const [rewardToken1] = config.rewardTokens;
    const Reward1 = await hre.getContractOrFork("IERC20Minimal", rewardToken1.symbol);
    const Reward1Bal = await Reward1.balanceOf(Staking.address);
    const skip = Reward1Bal.gt(0);
    if (skip) {
        logger.log("Skipping deploying staking");
    }
    return skip || hre.network.live;
};

deploy.tags = ["local", "staking-incentive", "staking-deployment"];
deploy.dependencies = ["staking"];

export default deploy;
