import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { getLogger, sleep } from "@utils/deployment";
import { fromBig, toBig } from "@utils/numbers";
import type { KrStaking } from "types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("deploy-staking");
    const { ethers, uniPairs } = hre;

    const Staking = await ethers.getContract<KrStaking>("KrStaking");

    const RewardToken1 = await ethers.getContract<Token>("AURORA");
    const RewardToken2 = await ethers.getContract<Token>("wNEAR");

    const RewardTokens = [RewardToken1.address, RewardToken2.address];

    const USDCKRIAU = uniPairs["USDC/KRIAU"].address;
    const USDCKRGME = uniPairs["USDC/KRGME"].address;

    const result0 = await Staking.getPidFor(USDCKRIAU);
    if (!result0.found) {
        const tx = await Staking.addPool(RewardTokens, USDCKRIAU, 500, 0);
        await tx.wait();
    }
    sleep(1500);
    const result1 = await Staking.getPidFor(USDCKRGME);
    if (!result1.found) {
        const tx = await Staking.addPool(RewardTokens, USDCKRGME, 500, 0);
        await tx.wait();
    }

    sleep(1500);
    let tx = await RewardToken1.mint(Staking.address, toBig(50_000_000));
    await tx.wait();

    sleep(1500);
    tx = await RewardToken2.mint(Staking.address, toBig(50_000_000));
    await tx.wait();

    sleep(1500);
    const Reward1Bal = await RewardToken1.balanceOf(Staking.address);
    const Reward2Bal = await RewardToken2.balanceOf(Staking.address);

    logger.success("Pools total", Number(await Staking.poolLength()));
    logger.success("R1", fromBig(Reward1Bal), "R2", fromBig(Reward2Bal));
    logger.success("Incentives added");
};

func.skip = async hre => {
    const Staking = await hre.ethers.getContract<KrStaking>("KrStaking");
    const RewardToken1 = await hre.ethers.getContract<Token>("AURORA");
    const RewardToken2 = await hre.ethers.getContract<Token>("wNEAR");
    const Reward1Bal = await RewardToken1.balanceOf(Staking.address);
    const Reward2Bal = await RewardToken2.balanceOf(Staking.address);
    const logger = getLogger("deploy-staking");

    if (Reward1Bal.gt(0) && Reward2Bal.gt(0)) {
        logger.log("Skipping deploying staking");
        return true;
    }
    return false;
};

func.tags = ["auroratest", "auroratest-staking"];

export default func;
