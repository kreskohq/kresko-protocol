import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { UniswapV2Factory, UniswapV2Pair } from "types";
import { AddressZero, fromBig } from "@utils";
import { getLogger } from "@utils/deployment";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { ethers, priceFeeds } = hre;
    const USDC = await ethers.getContract<Token>("USDC");

    /** === USDC/KRTSLA ===  */
    const krTSLA = await ethers.getContract<KreskoAsset>("krTSLA");
    const TSLAValue = fromBig(await priceFeeds["TSLA/USD"].latestAnswer(), 8);
    const TSLADepositAmount = 100;

    const logger = getLogger("create-uni-pools");

    const Factory = await ethers.getContract<UniswapV2Factory>("UniswapV2Factory");

    const TSLAPair = await Factory.getPair(USDC.address, krTSLA.address);

    let USDCKRTSLApair: UniswapV2Pair;

    if (TSLAPair == AddressZero) {
        // Add initial LP (also creates the pair) according to oracle price
        USDCKRTSLApair = await hre.run("uniswap:addliquidity", {
            tknA: {
                address: USDC.address,
                amount: Number(TSLAValue) * TSLADepositAmount,
            },
            tknB: {
                address: krTSLA.address,
                amount: TSLADepositAmount,
            },
        });
    } else {
        USDCKRTSLApair = await ethers.getContractAt("UniswapV2Pair", TSLAPair);
        logger.log("Pair already found @ ", USDCKRTSLApair.address);
    }

    hre.uniPairs["USDC/KRTSLA"] = USDCKRTSLApair;

    /** === USDC/krETH ===  */
    const krETH = await ethers.getContract<KreskoAsset>("krETH");
    const ETHValue = fromBig(await priceFeeds["ETH/USD"].latestAnswer(), 8);
    const ETHDepositAmount = 100;

    const krETHPAIR = await Factory.getPair(USDC.address, krETH.address);

    let USDCKRETHPair: UniswapV2Pair;

    // Add initial LP (also creates the pair) according to oracle price
    if (krETHPAIR == AddressZero) {
        USDCKRETHPair = await hre.run("uniswap:addliquidity", {
            tknA: {
                address: USDC.address,
                amount: Number(ETHValue) * ETHDepositAmount,
            },
            tknB: {
                address: krETH.address,
                amount: ETHDepositAmount,
            },
        });
    } else {
        USDCKRETHPair = await ethers.getContractAt("UniswapV2Pair", krETHPAIR);
        logger.log("Pair already found @ ", USDCKRETHPair.address);
    }
    hre.uniPairs["USDC/KRETH"] = USDCKRETHPair;

    /** === USDC/krGOLD ===  */
    const krGOLD = await ethers.getContract<KreskoAsset>("krGOLD");
    const GOLDValue = fromBig(await priceFeeds["GOLD/USD"].latestAnswer(), 8);
    const GOLDDepositAmount = 100;
    const krGOLDPair = await Factory.getPair(USDC.address, krGOLD.address);

    let USDCKRGOLDPair: UniswapV2Pair;

    if (krGOLDPair == AddressZero) {
        // Add initial LP (also creates the pair) according to oracle price
        USDCKRGOLDPair = await hre.run("uniswap:addliquidity", {
            tknA: {
                address: USDC.address,
                amount: Number(GOLDValue) * GOLDDepositAmount,
            },
            tknB: {
                address: krGOLD.address,
                amount: GOLDDepositAmount,
            },
        });
    } else {
        USDCKRGOLDPair = await ethers.getContractAt("UniswapV2Pair", krGOLDPair);
        logger.log("pair already found @ ", USDCKRGOLDPair.address);
    }
    hre.uniPairs["USDC/KRGOLD"] = USDCKRGOLDPair;
};

func.tags = ["local"];

export default func;
