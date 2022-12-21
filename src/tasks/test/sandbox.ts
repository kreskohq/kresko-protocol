import { fromBig, toBig } from "@kreskolabs/lib";
import { oneRay } from "@kreskolabs/lib/dist/numbers/wadray";
import { getLogger } from "@kreskolabs/lib/dist/utils";
import { getOracle } from "@utils/general";
import { BASIS_POINT, ONE_PERCENT } from "@utils/test/mocks";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";
import { FluxPriceFeedFactory, KrStaking, UniswapV2Oracle, UniswapV2Pair, UniswapV2Router02 } from "types";

task("sandbox").setAction(async function (_taskArgs: TaskArguments, hre) {
    const { feedValidator, deployer } = await hre.ethers.getNamedSigners();
    const krETHRATE = await hre.ethers.getContract<KrStaking>("krETHRATE");
    const Diamond = await hre.ethers.getContract<Kresko>("Diamond");
    const logger = getLogger("sandbox");

    // await Diamond.setupStabilityRateParams(krETHRATE.address, {
    //     stabilityRateBase: BASIS_POINT.mul(50), // 0.5%
    //     rateSlope1: ONE_PERCENT.div(10).mul(3), // 0.3
    //     rateSlope2: ONE_PERCENT.div(10).mul(30), // 3
    //     optimalPriceRate: oneRay, // price parity = 1 ray
    //     priceRateDelta: ONE_PERCENT.div(10).mul(25), // 2.5% delta
    // });

    // const pair = await hre.run("add-liquidity-v2", {
    //     tknA: {
    //         address: krETHRATE.address,
    //         amount: 1000,
    //     },
    //     tknB: {
    //         address: (await hre.deployments.get("KISS")).address,
    //         amount: 1000 * 1212,
    //     },
    // });
    // const krETHRATEPAIR = await hre.ethers.getContractAt<UniswapV2Pair>(
    //     "UniswapV2Pair",
    //     "0x1342f4BD3a10f1AD261f7533CD8b7Bc33e861E71",
    // );
    // const UniOracle = await hre.ethers.getContract<UniswapV2Oracle>("UniswapV2Oracle");

    // await UniOracle.configurePair(krETHRATEPAIR.address, 60);
    // await UniOracle.initPair(krETHRATEPAIR.address, krETHRATE.address, 60 * 30);

    // const Router = await hre.ethers.getContract<UniswapV2Router02>("UniswapV2Router02");
    // await Router.swapTokensForExactTokens(
    //     hre.toBig(1),
    //     hre.toBig(200 * 1300),
    //     [(await hre.deployments.get("KISS")).address, krETHRATE.address],
    //     deployer.address,
    //     Math.round(Date.now() / 1000) + 60,
    // );
    // await Router.swapExactTokensForTokens(
    //     hre.toBig(10),
    //     0,
    //     [krETHRATE.address, (await hre.deployments.get("KISS")).address],
    //     deployer.address,
    //     Math.round(Date.now() / 1000) + 60,
    // );

    // await UniOracle.update(krETHRATEPAIR.address);

    // const Factory = await hre.ethers.getContract<FluxPriceFeedFactory>("FluxPriceFeedFactory");

    // const data = Factory.interface.decodeFunctionData(
    //     "transmit",
    //     "0x6cee6b8600000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000001a0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000854534c412f555344000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000033cebfac000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001",
    // );
    // // const oracleAddr = await getOracle("TSLA/USD", hre);
    // // const oracleAddrW = await getOracle("WTI/USD", hre);
    // // const oracle = await hre.ethers.getContractAt<FluxPriceFeed>("FluxPriceFeed", oracleAddr);
    // // const oracleW = await hre.ethers.getContractAt<FluxPriceFeed>("FluxPriceFeed", oracleAddrW);

    // const rate = await Diamond.getPriceRateForAsset(krETHRATE.address);

    // const r = await UniOracle.consultKrAsset(krETHRATE.address, toBig(1));
    // console.log(fromBig(r));
    // console.log(fromBig(rate, 27));

    // await UniOracle.update(krETHRATEPAIR.address);
    logger.log("Success!");

    // for (const collateral of testnetConfigs[hre.network.name].collaterals) {
    //     const fluxFeed = await factory.addressOfPricePair(collateral.oracle.description, 8, feedValidator.address);
    //     console.log(collateral.symbol, fluxFeed);
    // }
    // for (const krAsset of testnetConfigs[hre.network.name].krAssets) {
    //     const fluxFeed = await factory.addressOfPricePair(krAsset.oracle.description, 8, feedValidator.address);
    //     console.log(krAsset.symbol, fluxFeed);
    // }
    // logger.success("All price feeds deployed");
});
