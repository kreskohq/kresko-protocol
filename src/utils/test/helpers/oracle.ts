import { type FakeContract, smock } from '@defi-wonderland/smock';
import type { MockOracle } from '@/types/typechain';
import { TEN_USD } from '../mocks';
import { toBig } from '@utils/values';

export const getFakeOracle = async (price = TEN_USD, marketOpen = true): Promise<FakeContract<MockOracle>> => {
  const FakeOracle = await smock.fake<MockOracle>('MockOracle');
  FakeOracle.latestRoundData.returns([
    1,
    toBig(price, 8),
    Math.floor(Date.now() / 1000),
    Math.floor(Date.now() / 1000),
    1,
  ]);
  FakeOracle.decimals.returns(8);

  return FakeOracle;
};

export const setPrice = (fakeOracle: FakeContract<MockOracle>, price: number) => {
  fakeOracle.initialAnswer.returns(toBig(price, 8));
  fakeOracle.latestRoundData.returns([
    1,
    toBig(price, 8),
    Math.floor(Date.now() / 1000),
    Math.floor(Date.now() / 1000),
    1,
  ]);
};
