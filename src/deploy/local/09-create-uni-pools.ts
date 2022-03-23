import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { UniswapV2Pair } from "types";
import { fromBig } from "@utils";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployer } = await hre.getNamedAccounts();
    const { ethers, priceFeeds } = hre;
    const USDC = await ethers.getContract<Token>("USDC");
    /** === USDC/KRTSLA ===  */
    const krTSLA = await ethers.getContract<KreskoAsset>("krTSLA");
    const TSLAValue = fromBig(await priceFeeds["TSLA/USD"].latestAnswer(), 8);
    const TSLADepositAmount = 100;

    const usdcDec = await USDC.decimals();
    // Add initial LP (also creates the pair) according to oracle price
    const USDCKRTSLApair: UniswapV2Pair = await hre.run("uniswap:addliquidity", {
        tkn0: {
            address: USDC.address,
            amount: Number(TSLAValue) * TSLADepositAmount,
        },
        tkn1: {
            address: krTSLA.address,
            amount: TSLADepositAmount,
        },
    });
    hre.uniPairs["USDC/KRTSLA"] = USDCKRTSLApair;

    console.log("USDC AMOUNT", fromBig(await USDC.balanceOf(deployer), usdcDec));
    console.log("Liquidity added for pair @ ", USDCKRTSLApair.address);

    /** === USDC/krETH ===  */
    const krETH = await ethers.getContract<KreskoAsset>("krETH");
    const ETHValue = fromBig(await priceFeeds["ETH/USD"].latestAnswer(), 8);
    const ETHDepositAmount = 100;

    // Add initial LP (also creates the pair) according to oracle price
    const USDCKRETHPair: UniswapV2Pair = await hre.run("uniswap:addliquidity", {
        tkn0: {
            address: USDC.address,
            amount: Number(ETHValue) * ETHDepositAmount,
        },
        tkn1: {
            address: krETH.address,
            amount: ETHDepositAmount,
        },
    });
    hre.uniPairs["USDC/KRETH"] = USDCKRETHPair;
    console.log("Liquidity added for pair @ ", USDCKRETHPair.address);

    /** === USDC/krGOLD ===  */
    const krGOLD = await ethers.getContract<KreskoAsset>("krGOLD");
    const GOLDValue = fromBig(await priceFeeds["GOLD/USD"].latestAnswer(), 8);
    const GOLDDepositAmount = 100;

    // Add initial LP (also creates the pair) according to oracle price
    const USDCKRGOLDPair: UniswapV2Pair = await hre.run("uniswap:addliquidity", {
        tkn0: {
            address: USDC.address,
            amount: Number(GOLDValue) * GOLDDepositAmount,
        },
        tkn1: {
            address: krGOLD.address,
            amount: GOLDDepositAmount,
        },
    });
    hre.uniPairs["USDC/KRGOLD"] = USDCKRGOLDPair;
    console.log("Liquidity added for pair @ ", USDCKRGOLDPair.address);
};

func.tags = ["local", "liquidity", "uniswap"];
export default func;