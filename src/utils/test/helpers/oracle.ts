import { MockContract, smock } from "@defi-wonderland/smock";
import { toBig } from "@kreskolabs/lib";
import { FluxPriceFeed__factory } from "types/typechain";
import { defaultOraclePrice, defaultOracleDecimals } from "../mocks";
import type { HardhatRuntimeEnvironment } from "hardhat/types/runtime";

export const getMockOracleFor = async (assetName = "Asset", price = defaultOraclePrice, marketOpen = true) => {
    const FakeFeed = await smock.fake<FluxPriceFeed>("FluxPriceFeed");
    const { deployer } = await hre.ethers.getNamedSigners();

    const MockFeed = await (
        await smock.mock<FluxPriceFeed__factory>("FluxPriceFeed")
    ).deploy(deployer.address, defaultOracleDecimals, assetName);

    MockFeed.latestAnswer.returns(toBig(price, 8));
    MockFeed.latestMarketOpen.returns(marketOpen);
    MockFeed.decimals.returns(8);
    FakeFeed.latestAnswer.returns(toBig(price, 8));
    FakeFeed.latestMarketOpen.returns(marketOpen);
    FakeFeed.decimals.returns(8);
    return [MockFeed, FakeFeed] as const;
};

export const setPrice = (oracles: any, price: number) => {
    oracles.priceFeed.latestAnswer.returns(toBig(price, 8));
    oracles.mockFeed.latestAnswer.returns(toBig(price, 8));
};
export const setMarketOpen = <T extends "FluxPriceFeed">(oracle: MockContract<TC[T]>, marketOpen: boolean) => {
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
