import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { getLogger } from "@utils/deployment";
import { fromBig } from "@utils/numbers";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("mint-krassets");
    const { ethers, kresko, getNamedAccounts } = hre;
    let tx;
    const { deployer } = await getNamedAccounts();
    const USDC = await ethers.getContract<Token>("USDC");

    /** === krTSLA ===  */
    // const krTSLA = await ethers.getContract<KreskoAsset>("krTSLA");
    // logger.log("Approving USDC");

    // // Approve USDC token to be deposited to Kresko
    // tx = await USDC.approve(kresko.address, ethers.constants.MaxUint256);
    // // await tx.wait(2);
    // logger.log("Depositing USDC");

    // // Deposit collateral to mint
    // tx = await kresko.depositCollateral(deployer, USDC.address, ethers.utils.parseUnits("10000000", 6));
    // // await tx.wait(2);

    // // Mint 100 krTSLA
    // logger.log("Minting KRTSLA");
    // tx = await kresko.mintKreskoAsset(deployer, krTSLA.address, ethers.utils.parseEther("1000"));
    // // await tx.wait(2);

    // /** === krGME ===  */
    // const krGME = await ethers.getContract<KreskoAsset>("krGME");

    // logger.log("Depositing USDC for krGME");

    // // Deposit collateral to mint
    // tx = await kresko.depositCollateral(deployer, USDC.address, ethers.utils.parseUnits("5000000", 6));
    // // await tx.wait(2);

    // // Mint 1000 krGME
    // logger.log("Minting krGME");
    // tx = await kresko.mintKreskoAsset(deployer, krGME.address, ethers.utils.parseEther("10000"));
    // await tx.wait(2);

    /** === krIAU ===  */
    const krIAU = await ethers.getContract<KreskoAsset>("krIAU");

    logger.log("Depositing USDC for krIAU");

    // Deposit collateral to mint
    await kresko.depositCollateral(deployer, USDC.address, ethers.utils.parseUnits("2500000", 6));
    // await tx.wait(2);

    // Mint 1000 krIAU
    logger.log("Minting krIAU");
    await kresko.mintKreskoAsset(deployer, krIAU.address, ethers.utils.parseEther("1000"));
    // await tx.wait(2);

    logger.log("Minting done");

    // Mint 1000 krQQQ
    const krQQQ = await ethers.getContract<KreskoAsset>("krQQQ");
    logger.log("Minting krQQQ");
    await kresko.mintKreskoAsset(deployer, krQQQ.address, ethers.utils.parseEther("1000"));
    // await tx.wait(2);

    logger.log("Minting done");
};
func.tags = ["auroratest", "mint", "mint-test"];

func.skip = async hre => {
    const logger = getLogger("mint-krassets");
    const krQQQ = await hre.ethers.getContract<KreskoAsset>("krQQQ");
    const { deployer } = await hre.getNamedAccounts();
    const isFinished = fromBig(await hre.kresko.kreskoAssetDebt(deployer, krQQQ.address)) > 0;
    isFinished && logger.log("Skipping minting krAssets");
    return isFinished;
};

export default func;
