import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { UniswapV2Pair } from "types";
import { fromBig } from "@utils";
import { getLogger } from "@utils/deployment";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployer } = await hre.getNamedAccounts();
    const { ethers, priceFeeds } = hre;
    const USDC = await ethers.getContract<Token>("USDC");
    const logger = getLogger("create-uni-pools");
    /** === USDC/KRTSLA ===  */
    const krTSLA = await ethers.getContract<KreskoAsset>("krTSLA");
    const TSLAValue = fromBig(await priceFeeds["TSLA/USD"].latestAnswer(), 8);
    const TSLADepositAmount = 100;

    const usdcDec = await USDC.decimals();
    // Add initial LP (also creates the pair) according to oracle price
    const USDCKRTSLApair: UniswapV2Pair = await hre.run("uniswap:addliquidity", {
        tknA: {
            address: USDC.address,
            amount: Number(TSLAValue) * TSLADepositAmount,
        },
        tknB: {
            address: krTSLA.address,
            amount: TSLADepositAmount,
        },
    });
    hre.uniPairs["USDC/KRTSLA"] = USDCKRTSLApair;

    logger.log("USDC AMOUNT", fromBig(await USDC.balanceOf(deployer), usdcDec));

    /** === USDC/krETH ===  */
    const krETH = await ethers.getContract<KreskoAsset>("krETH");
    const ETHValue = fromBig(await priceFeeds["ETH/USD"].latestAnswer(), 8);
    const ETHDepositAmount = 100;

    // Add initial LP (also creates the pair) according to oracle price
    const USDCKRETHPair: UniswapV2Pair = await hre.run("uniswap:addliquidity", {
        tknA: {
            address: USDC.address,
            amount: Number(ETHValue) * ETHDepositAmount,
        },
        tknB: {
            address: krETH.address,
            amount: ETHDepositAmount,
        },
    });
    hre.uniPairs["USDC/KRETH"] = USDCKRETHPair;

    /** === USDC/krGOLD ===  */
    const krGOLD = await ethers.getContract<KreskoAsset>("krGOLD");
    const GOLDValue = fromBig(await priceFeeds["GOLD/USD"].latestAnswer(), 8);
    const GOLDDepositAmount = 100;

    // Add initial LP (also creates the pair) according to oracle price
    const USDCKRGOLDPair: UniswapV2Pair = await hre.run("uniswap:addliquidity", {
        tknA: {
            address: USDC.address,
            amount: Number(GOLDValue) * GOLDDepositAmount,
        },
        tknB: {
            address: krGOLD.address,
            amount: GOLDDepositAmount,
        },
    });
    hre.uniPairs["USDC/KRGOLD"] = USDCKRGOLDPair;
    logger.success("Succesfully added all liquidity");
};

func.tags = ["local", "liquidity", "uniswap"];
export default func;
