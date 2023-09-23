import { FakeContract, smock } from "@defi-wonderland/smock";
import { toBig } from "@kreskolabs/lib";
import { MockOracle } from "types/typechain";
import { TEN_USD } from "../mocks";

export const getFakeOracle = async (price = TEN_USD, marketOpen = true) => {
    const FakeOracle = await smock.fake<MockOracle>("MockOracle");
    FakeOracle.latestRoundData.returns([1, toBig(price, 8), 1, 1, 1]);
    FakeOracle.decimals.returns(8);

    return FakeOracle;
};

export const setPrice = (fakeOracle: FakeContract<MockOracle>, price: number) => {
    fakeOracle.initialAnswer.returns(toBig(price, 8));
    fakeOracle.latestRoundData.returns([1, toBig(price, 8), 1, 1, 1]);
};
