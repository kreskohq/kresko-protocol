import { smock } from "@defi-wonderland/smock";
import { toBig } from "@kreskolabs/lib";
import { defaultOraclePrice } from "../mocks";
import { MockOracle, MockOracle__factory } from "types/typechain";

export const getMockOracles = async (price = defaultOraclePrice, marketOpen = true) => {
    const MockFeed = await (await smock.mock<MockOracle__factory>("MockOracle")).deploy("SOME/FEED", toBig(price, 8));
    MockFeed.decimals.returns(8);

    const FakeFeed = await smock.fake<MockOracle>("MockOracle");
    FakeFeed.latestRoundData.returns([1, toBig(price, 8), 1, 1, 1]);
    FakeFeed.decimals.returns(8);

    return [MockFeed, FakeFeed] as const;
};

export const setPrice = (oracles: any, price: number) => {
    oracles.mockFeed.latestRoundData.returns([1, toBig(price, 8), 1, 1, 1]);
    oracles.fakeFeed.latestRoundData.returns([1, toBig(price, 8), 1, 1, 1]);
};
