import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { ethers, kresko } = hre;

    const Dollar = await ethers.getContract<Token>("Dollar");
    const KrGold = await ethers.getContract<KreskoAsset>("KrGold");

    // Approve Dollar token to be deposited to Kresko
    let tx = await Dollar.approve(kresko.address, ethers.constants.MaxUint256);
    await tx.wait();

    // Deposit collateral to mint
    tx = await kresko.depositCollateral(Dollar.address, ethers.utils.parseEther("1000000"));
    await tx.wait();

    // Mint 1 krGold
    tx = await kresko.mintKreskoAsset(KrGold.address, ethers.utils.parseEther("100"));
    await tx.wait();
};
export default func;

func.tags = ["local", "mint"];
