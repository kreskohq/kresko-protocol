import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { getLogger } from "@utils/deployment";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("mint-krassets");
    const { ethers, kresko, getNamedAccounts } = hre;
    let tx;
    const { deployer } = await getNamedAccounts();
    const USDC = await ethers.getContract<Token>("USDC");

    /** === krTSLA ===  */
    const krTSLA = await ethers.getContract<KreskoAsset>("krTSLA");
    logger.log("Approving USDC");

    // Approve USDC token to be deposited to Kresko
    tx = await USDC.approve(kresko.address, ethers.constants.MaxUint256);
    await tx.wait(2);
    logger.log("Depositing USDC");

    // Deposit collateral to mint
    tx = await kresko.depositCollateral(deployer, USDC.address, ethers.utils.parseUnits("1000000", 6));
    await tx.wait(2);

    // Mint 100 krTSLA
    logger.log("Minting KRTSLA");
    tx = await kresko.mintKreskoAsset(deployer, krTSLA.address, ethers.utils.parseEther("100"));
    await tx.wait(2);

    /** === krETH ===  */
    const krETH = await ethers.getContract<KreskoAsset>("krETH");

    logger.log("Depositing USDC for krETH");

    // Deposit collateral to mint
    tx = await kresko.depositCollateral(deployer, USDC.address, ethers.utils.parseUnits("1000000", 6));
    await tx.wait(2);

    // Mint 100 krETH
    logger.log("Minting krETH");
    tx = await kresko.mintKreskoAsset(deployer, krETH.address, ethers.utils.parseEther("100"));
    await tx.wait(2);

    /** === krGOLD ===  */
    const krGOLD = await ethers.getContract<KreskoAsset>("krGOLD");

    logger.log("Depositing USDC for krGOLD");

    // Deposit collateral to mint
    tx = await kresko.depositCollateral(deployer, USDC.address, ethers.utils.parseUnits("1000000", 6));
    await tx.wait(2);

    // Mint 100 krGOLD
    logger.log("Minting krGOLD");
    tx = await kresko.mintKreskoAsset(deployer, krGOLD.address, ethers.utils.parseEther("100"));
    await tx.wait(2);

    logger.log("Minting done");

    // Mint 100 krQQQ
    const krQQQ = await ethers.getContract<KreskoAsset>("krQQQ");
    logger.log("Minting krQQQ");
    tx = await kresko.mintKreskoAsset(deployer, krQQQ.address, ethers.utils.parseEther("100"));
    await tx.wait(2);

    logger.log("Minting done");
};
func.tags = ["auroratest", "mint", "mint-test"];
export default func;
