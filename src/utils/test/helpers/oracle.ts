import { smock } from "@defi-wonderland/smock";
import { toBig } from "@kreskolabs/lib";
import { MockAggregatorV3__factory } from "types/typechain";
import { defaultOraclePrice } from "../mocks";
import { MockAggregatorV3 } from "types/typechain/src/contracts/test/MockOracleFull.sol";

export const getMockOracles = async (price = defaultOraclePrice, marketOpen = true) => {
    const MockFeed = await (await smock.mock<MockAggregatorV3__factory>("MockAggregatorV3")).deploy();
    MockFeed.latestRoundData.returns([1, toBig(price, 8), 1, 1, 1]);
    MockFeed.decimals.returns(8);

    const FakeFeed = await smock.fake<MockAggregatorV3>("MockAggregatorV3");
    FakeFeed.latestRoundData.returns([1, toBig(price, 8), 1, 1, 1]);
    FakeFeed.decimals.returns(8);

    return [MockFeed, FakeFeed] as const;
};

export const setPrice = (oracles: any, price: number) => {
    oracles.mockFeed.latestRoundData.returns([1, toBig(price, 8), 1, 1, 1]);
    oracles.fakeFeed.latestRoundData.returns([1, toBig(price, 8), 1, 1, 1]);
};
