import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { fromBig, toBig } from "@utils/numbers";
import { getLogger } from "@utils/deployment";
import type { KrStaking } from "types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("deploy-staking");
    const { ethers, uniPairs } = hre;

    const RewardToken1 = await ethers.getContract<Token>("AURORA");
    const RewardToken2 = await ethers.getContract<Token>("wNEAR");

    const USDCKRTSLA = uniPairs["USDC/KRTSLA"].address;
    const USDCKRIAU = uniPairs["USDC/KRIAU"].address;
    const USDCKRGME = uniPairs["USDC/KRGME"].address;

    const Staking: KrStaking = await hre.run("deploy:staking", {
        stakingToken: USDCKRTSLA,
        rewardTokens: `${RewardToken1.address},${RewardToken2.address}`,
        rewardPerBlocks: "0.004,0.002",
    });

    const RewardTokens = [RewardToken1.address, RewardToken2.address];

    await Staking.addPool(RewardTokens, USDCKRIAU, 500, 0);
    // await tx.wait(2);

    await Staking.addPool(RewardTokens, USDCKRGME, 500, 0);
    // await tx.wait(2);

    await RewardToken1.mint(Staking.address, toBig(50_000_000));
    // await tx.wait(2);
    await RewardToken2.mint(Staking.address, toBig(50_000_000));
    // await tx.wait(2);

    const Reward1Bal = await RewardToken1.balanceOf(Staking.address);
    const Reward2Bal = await RewardToken2.balanceOf(Staking.address);

    logger.success("Pools total", Number(await Staking.poolLength()));
    logger.success("R1", fromBig(Reward1Bal), "R2", fromBig(Reward2Bal));
    logger.success("Succesfully deployed Staking contract @", Staking.address);
};
export default func;

func.skip = async hre => {
    const Staking = await hre.deployments.getOrNull("KrStaking");
    if (!Staking) {
        return false;
    }
    const logger = getLogger("deploy-staking");

    const RewardToken2 = await hre.ethers.getContract<Token>("wNEAR");
    const Reward2Bal = fromBig(await RewardToken2.balanceOf(Staking.address));
    Reward2Bal > 0 && logger.log("Skipping deploying staking");
    return true;
};

func.tags = ["auroratest", "auroratest-staking"];
