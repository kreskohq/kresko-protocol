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
    const TSLADepositAmount = 750;

    const logger = getLogger("create-uni-pools");

    const Factory = await ethers.getContract<UniswapV2Factory>("UniswapV2Factory");

    const TSLAPairAddress = await Factory.getPair(USDC.address, krTSLA.address);

    let USDCKRTSLApair: UniswapV2Pair;

    if (TSLAPairAddress == AddressZero) {
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
        USDCKRTSLApair = await ethers.getContractAt("UniswapV2Pair", TSLAPairAddress);
        logger.log("Pair already found @ ", USDCKRTSLApair.address);
    }

    hre.uniPairs["USDC/KRTSLA"] = USDCKRTSLApair;

    /** === USDC/krGME ===  */
    const krGME = await ethers.getContract<KreskoAsset>("krGME");
    const GMEValue = fromBig(await priceFeeds["GME/USD"].latestAnswer(), 8);
    const GMEDepositAmount = 8500;

    const krGMEPAIRAddress = await Factory.getPair(USDC.address, krGME.address);

    let USDCKRGMEPair: UniswapV2Pair;

    // Add initial LP (also creates the pair) according to oracle price
    if (krGMEPAIRAddress == AddressZero) {
        USDCKRGMEPair = await hre.run("uniswap:addliquidity", {
            tknA: {
                address: USDC.address,
                amount: (Number(GMEValue) * GMEDepositAmount).toFixed(6),
            },
            tknB: {
                address: krGME.address,
                amount: GMEDepositAmount,
            },
        });
    } else {
        USDCKRGMEPair = await ethers.getContractAt("UniswapV2Pair", krGMEPAIRAddress);
        logger.log("Pair already found @ ", USDCKRGMEPair.address);
    }
    hre.uniPairs["USDC/KRGME"] = USDCKRGMEPair;

    /** === USDC/krIAU ===  */
    const krIAU = await ethers.getContract<KreskoAsset>("krIAU");
    const GOLDValue = fromBig(await priceFeeds["GOLD/USD"].latestAnswer(), 8);
    const GOLDDepositAmount = 800;
    const krIAUPair = await Factory.getPair(USDC.address, krIAU.address);

    let USDCKRIAUPair: UniswapV2Pair;

    if (krIAUPair == AddressZero) {
        // Add initial LP (also creates the pair) according to oracle price
        USDCKRIAUPair = await hre.run("uniswap:addliquidity", {
            tknA: {
                address: USDC.address,
                amount: (Number(GOLDValue) * GOLDDepositAmount).toFixed(6),
            },
            tknB: {
                address: krIAU.address,
                amount: GOLDDepositAmount,
            },
        });
    } else {
        USDCKRIAUPair = await ethers.getContractAt("UniswapV2Pair", krIAUPair);
        logger.log("pair already found @ ", USDCKRIAUPair.address);
    }
    hre.uniPairs["USDC/KRIAU"] = USDCKRIAUPair;

    /** === USDC/krQQQ ===  */
    const krQQQ = await ethers.getContract<KreskoAsset>("krQQQ");
    const QQQValue = fromBig(await priceFeeds["QQQ/USD"].latestAnswer(), 8);
    const QQQDepositAmount = 900;
    const krQQQPairAddress = await Factory.getPair(USDC.address, krQQQ.address);

    let USDCKRQQQPair: UniswapV2Pair;

    if (krQQQPairAddress == AddressZero) {
        // Add initial LP (also creates the pair) according to oracle price
        USDCKRQQQPair = await hre.run("uniswap:addliquidity", {
            tknA: {
                address: USDC.address,
                amount: (Number(QQQValue) * QQQDepositAmount).toFixed(6),
            },
            tknB: {
                address: krQQQ.address,
                amount: QQQDepositAmount,
            },
        });
    } else {
        USDCKRQQQPair = await ethers.getContractAt("UniswapV2Pair", krQQQPairAddress);
        logger.log("pair already found @ ", USDCKRQQQPair.address);
    }
    hre.uniPairs["USDC/KRQQQ"] = USDCKRQQQPair;
};

func.tags = ["local"];

export default func;
