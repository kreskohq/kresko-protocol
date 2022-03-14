import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { ethers, kresko, getNamedAccounts } = hre;
    let tx;
    const { deployer } = await getNamedAccounts();
    const USDC = await ethers.getContract<Token>("USDC");
    const collateralDec = await USDC.decimals();

    /** === krTSLA ===  */
    const krTSLA = await ethers.getContract<KreskoAsset>("krTSLA");
    console.log("Approving USDC");

    // Approve USDC token to be deposited to Kresko
    tx = await USDC.approve(kresko.address, ethers.constants.MaxUint256);
    await tx.wait();
    console.log("Depositing USDC");

    // Deposit collateral to mint
    tx = await kresko.depositCollateral(deployer, USDC.address, ethers.utils.parseUnits("1000000", collateralDec));
    await tx.wait();

    // Mint 100 krTSLA
    console.log("Minting KRTSLA");
    tx = await kresko.mintKreskoAsset(deployer, krTSLA.address, ethers.utils.parseEther("100"));
    await tx.wait();

    /** === krETH ===  */
    const krETH = await ethers.getContract<KreskoAsset>("krETH");

    console.log("Depositing USDC for krETH");

    // Deposit collateral to mint
    tx = await kresko.depositCollateral(deployer, USDC.address, ethers.utils.parseUnits("1000000", collateralDec));
    await tx.wait();

    // Mint 100 krETH
    console.log("Minting krETH");
    tx = await kresko.mintKreskoAsset(deployer, krETH.address, ethers.utils.parseEther("100"));
    await tx.wait();

    /** === krGOLD ===  */
    const krGOLD = await ethers.getContract<KreskoAsset>("krGOLD");

    console.log("Depositing USDC for krGOLD");

    // Deposit collateral to mint
    tx = await kresko.depositCollateral(deployer, USDC.address, ethers.utils.parseUnits("1000000", collateralDec));
    await tx.wait();

    // Mint 100 krGOLD
    console.log("Minting krGOLD");
    tx = await kresko.mintKreskoAsset(deployer, krGOLD.address, ethers.utils.parseEther("100"));
    await tx.wait();

    console.log("Minting done");

    // Mint 100 krQQQ
    const krQQQ = await ethers.getContract<KreskoAsset>("krQQQ");
    console.log("Minting krQQQ");
    tx = await kresko.mintKreskoAsset(deployer, krQQQ.address, ethers.utils.parseEther("100"));
    await tx.wait();

    console.log("Minting done");
};

func.tags = ["local", "mint", "mint-test"];

export default func;
