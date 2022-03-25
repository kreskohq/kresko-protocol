import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { KrStaking, RewardToken } from "types";
import { fromBig, toBig } from "@utils/numbers";
import { getLogger } from "@utils/deployment";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("deploy-staking");
    const { ethers, uniPairs } = hre;

    const RewardToken1 = await ethers.getContract<RewardToken>("RewardToken1");
    const RewardToken2 = await ethers.getContract<RewardToken>("RewardToken2");

    const USDCKRTSLA = uniPairs["USDC/KRTSLA"].address;
    const USDCKRGOLD = uniPairs["USDC/KRGOLD"].address;
    const USDCKRETH = uniPairs["USDC/KRETH"].address;

    const Staking: KrStaking = await hre.run("deploy:staking", {
        stakingToken: USDCKRTSLA,
        rewardTokens: `${RewardToken1.address},${RewardToken2.address}`,
        rewardPerBlocks: "0.2,0.4",
    });

    const RewardTokens = [RewardToken1.address, RewardToken2.address];

    let tx = await Staking.addPool(RewardTokens, USDCKRGOLD, 500);
    await tx.wait();

    tx = await Staking.addPool(RewardTokens, USDCKRETH, 500);
    await tx.wait();

    tx = await RewardToken1.mint(Staking.address, toBig(5_000_000));
    await tx.wait();
    tx = await RewardToken2.mint(Staking.address, toBig(5_000_000));
    await tx.wait();

    const Reward1Bal = await RewardToken1.balanceOf(Staking.address);
    const Reward2Bal = await RewardToken2.balanceOf(Staking.address);
    logger.log("Pools total", Number(await Staking.poolLength()));
    logger.log("Reward tokens in staking: ", fromBig(Reward1Bal), "R2", fromBig(Reward2Bal));
    logger.success("Succesfully deployed staking @", Staking.address);
};
export default func;

func.tags = ["local", "local-staking"];
