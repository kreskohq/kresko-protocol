import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { fromBig, toBig } from "@utils/numbers";
import { getLogger } from "@utils/deployment";
import type { KrStaking } from "types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("deploy-staking");
    const { ethers, uniPairs } = hre;

    const RewardToken1 = await ethers.getContract<Token>("Aurora");
    const RewardToken2 = await ethers.getContract<Token>("Wrapped Near");

    const USDCKRTSLA = uniPairs["USDC/KRTSLA"].address;
    const USDCKRGOLD = uniPairs["USDC/KRGOLD"].address;
    const USDCKRETH = uniPairs["USDC/KRETH"].address;

    const Staking: KrStaking = await hre.run("deploy:staking", {
        stakingToken: USDCKRTSLA,
        rewardTokens: `${RewardToken1.address},${RewardToken2.address}`,
        rewardPerBlocks: "0.2,0.4",
        wait: 2,
    });

    const RewardTokens = [RewardToken1.address, RewardToken2.address];

    let tx = await Staking.addPool(RewardTokens, USDCKRGOLD, 500, 0);
    await tx.wait(2);

    tx = await Staking.addPool(RewardTokens, USDCKRETH, 500, 0);
    await tx.wait(2);

    tx = await RewardToken1.mint(Staking.address, toBig(50_000_000));
    await tx.wait(2);
    tx = await RewardToken2.mint(Staking.address, toBig(50_000_000));
    await tx.wait(2);

    const Reward1Bal = await RewardToken1.balanceOf(Staking.address);
    const Reward2Bal = await RewardToken2.balanceOf(Staking.address);

    logger.success("Pools total", Number(await Staking.poolLength()));
    logger.success("R1", fromBig(Reward1Bal), "R2", fromBig(Reward2Bal));
    logger.success("Succesfully deployed Staking contract @", Staking.address);
};
export default func;

func.tags = ["auroratest", "auroratest-staking"];
