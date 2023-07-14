import { FakeContract, smock } from "@defi-wonderland/smock";
import { toBig } from "@kreskolabs/lib";
import type { HardhatRuntimeEnvironment } from "hardhat/types/runtime";
import { MockAggregatorV3__factory } from "types/typechain";
import { defaultOraclePrice } from "../mocks";

export const getMockOraclesFor = async (assetName = "Asset", price = defaultOraclePrice, marketOpen = true) => {
    const CLFeed = await (await smock.mock<MockAggregatorV3__factory>("MockAggregatorV3")).deploy();
    CLFeed.latestRoundData.returns([1, toBig(price, 8), 1, 1, 1]);
    CLFeed.decimals.returns(8);

    const FluxFeed = await smock.fake<FluxPriceFeed>("FluxPriceFeed");
    FluxFeed.latestAnswer.returns(toBig(price, 8));
    FluxFeed.latestMarketOpen.returns(marketOpen);
    FluxFeed.decimals.returns(8);
    return [CLFeed, FluxFeed] as const;
};

export const setPrice = (oracles: any, price: number) => {
    oracles.fluxFeed.latestAnswer.returns(toBig(price, 8));
    oracles.clFeed.latestRoundData.returns([1, toBig(price, 8), 1, 1, 1]);
};
export const setMarketOpen = <T extends "FluxPriceFeed">(oracle: FakeContract<TC[T]>, marketOpen: boolean) => {
    oracle.latestMarketOpen.returns(marketOpen);
};

export const getOracle = async (oracleDesc: string, hre: HardhatRuntimeEnvironment) => {
    const { feedValidator } = await hre.ethers.getNamedSigners();
    const factory = await hre.getContractOrFork("FluxPriceFeedFactory");

    const fluxFeed = await factory.addressOfPricePair(oracleDesc, 8, feedValidator.address);
    // if (fluxFeed === hre!.ethers.constants.AddressZero) {
    //     throw new Error(`Oracle ${oracleDesc} address is 0`);
    // }
    return fluxFeed;
};
