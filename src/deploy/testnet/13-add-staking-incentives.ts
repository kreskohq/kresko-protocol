import type { KrStaking, MockERC20, UniswapV2Factory } from "types";
import type { DeployFunction } from "@kreskolabs/hardhat-deploy/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { getLogger } from "@kreskolabs/lib/dist/utils";
import { fromBig } from "@kreskolabs/lib";
import { testnetConfigs } from "@deploy-config/testnet";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("deploy-staking");
    const { ethers } = hre;

    const Staking = await ethers.getContract<KrStaking>("KrStaking");

    const config = testnetConfigs[hre.network.name];
    const [rewardToken1, rewardToken2] = config.rewardTokens;
    const Reward1 = await ethers.getContract<MockERC20>(rewardToken1.symbol);
    const Reward2 = await ethers.getContract<MockERC20>(rewardToken2.symbol);
    const RewardTokens = [Reward1.address, Reward2.address];

    const Factory = await hre.ethers.getContract<UniswapV2Factory>("UniswapV2Factory");

    // First pool is added on the constructor
    const pools = config.stakingPools.slice(1);

    for (const pool of pools) {
        logger.log(`Adding pool ${pool.lpToken[0].symbol}- ${pool.lpToken[1].symbol}`);
        const [token0, token1] = pool.lpToken;
        const Token0 = await ethers.getContract<MockERC20>(token0.symbol);
        const Token1 = await ethers.getContract<MockERC20>(token1.symbol);
        const lpToken = await Factory.getPair(Token0.address, Token1.address);
        const result0 = await Staking.getPidFor(lpToken);
        if (!result0.found) {
            const tx = await Staking.addPool(RewardTokens, lpToken, pool.allocPoint, pool.startBlock);
            await tx.wait();
        }
    }

    const [amount1, amount2] = config.rewardTokenAmounts;
    if (!(await Reward1.balanceOf(Staking.address)).gt(0)) {
        await Reward1.mint(Staking.address, hre.toBig(amount1));
    }
    if (!(await Reward2.balanceOf(Staking.address)).gt(0)) {
        const tx = await Reward2.mint(Staking.address, hre.toBig(amount2));
        await tx.wait();
    }

    const Reward1Bal = await Reward1.balanceOf(Staking.address);
    const Reward2Bal = await Reward2.balanceOf(Staking.address);

    logger.success("Pools total", Number(await Staking.poolLength()));
    logger.success("R1", fromBig(Reward1Bal), rewardToken1.symbol, "R2", fromBig(Reward2Bal), rewardToken2.symbol);
    logger.success("Incentives added");
};

func.skip = async hre => {
    const Staking = await hre.ethers.getContract<KrStaking>("KrStaking");
    const config = testnetConfigs[hre.network.name];
    const [rewardToken1, rewardToken2] = config.rewardTokens;
    const Reward1 = await hre.ethers.getContract<MockERC20>(rewardToken1.symbol);
    const Reward2 = await hre.ethers.getContract<MockERC20>(rewardToken2.symbol);
    const Reward1Bal = await Reward1.balanceOf(Staking.address);
    const Reward2Bal = await Reward2.balanceOf(Staking.address);
    const logger = getLogger("deploy-staking");

    if (Reward1Bal.gt(0) && Reward2Bal.gt(0)) {
        logger.log("Skipping deploying staking");
        return true;
    }
    return false;
};

func.tags = ["testnet", "staking-incentive"];
func.dependencies = ["staking"];

export default func;
