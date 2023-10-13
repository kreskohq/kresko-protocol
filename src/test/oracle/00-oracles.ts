import { OracleType } from '@/types';
import { expect } from '@test/chai';
import { defaultRedstoneDataPoints, wrapPrices } from '@utils/redstone';
import { defaultFixture, type DefaultFixture } from '@utils/test/fixtures';
import { testCollateralConfig } from '@utils/test/mocks';
import { toBig } from '@utils/values';

describe('Oracles', () => {
  let f: DefaultFixture;
  let user: SignerWithAddress;
  beforeEach(async function () {
    f = await defaultFixture();
    // Deploy one price feed
    [, [user]] = f.users;
    this.deployer = await hre.ethers.getNamedSigner('deployer');
    this.userOne = await hre.ethers.getNamedSigner('userOne');
    f.Collateral.setPrice(10);
  });

  describe('Redstone', () => {
    it('should have correct setup', async function () {
      // check initial conditions
      expect(await hre.Diamond.getAccountTotalCollateralValue(user.address)).to.equal(
        toBig(10000, 8),
        'collateral value should be $10',
      );
    });

    it('should get redstone price when chainlink price = 0', async function () {
      /// set chainlink price to 0
      f.Collateral.setPrice(0);
      const redstoneCollateralPrice = 20;

      const redstoneDiamond = wrapPrices(hre.Diamond, [
        { dataFeedId: testCollateralConfig.ticker, value: redstoneCollateralPrice },
      ]);

      expect(await redstoneDiamond.getAccountTotalCollateralValue(user.address)).to.equal(
        f.depositAmount.wadMul(toBig(redstoneCollateralPrice, 8)),
        'collateral value should be $20',
      );
    });

    it('should get primary price when price +- maxPriceDeviationPct of reference price ', async function () {
      await f.Collateral.setOracleOrder([OracleType.Redstone, OracleType.Chainlink]);
      /// set chainlink price to 12
      f.Collateral.setPrice(12);

      /// set redstone price to 11
      const redstoneCollateralPrice = 11;

      const redstoneDiamond = wrapPrices(hre.Diamond, [
        { dataFeedId: testCollateralConfig.ticker, value: redstoneCollateralPrice },
      ]);

      expect(await redstoneDiamond.getAccountTotalCollateralValue(user.address)).to.equal(
        f.depositAmount.wadMul(toBig(redstoneCollateralPrice, 8)),
        'collateral value should be $11',
      );
    });

    it('should revert if price deviates too much', async function () {
      /// set chainlink price to 20
      f.Collateral.setPrice(20);

      const redstoneCollateralPrice = 10;
      const redstoneDiamond = wrapPrices(hre.Diamond, [
        { dataFeedId: testCollateralConfig.ticker, value: redstoneCollateralPrice },
      ]);

      // should revert if price deviates more than maxPriceDeviationPct
      await expect(redstoneDiamond.getAccountTotalCollateralValue(user.address)).to.be.reverted;
      f.Collateral.setPrice(10);
    });

    it('should return redstone price if sequencer is down', async function () {
      /// set chainlink price to 5
      f.Collateral.setPrice(5);

      const redstoneCollateralPrice = 200;
      const redstoneDiamond = wrapPrices(hre.Diamond, [
        ...defaultRedstoneDataPoints.map(p => (p.value === 0 ? { ...p, value: 1 } : p)),
        { dataFeedId: testCollateralConfig.ticker, value: redstoneCollateralPrice },
      ]);
      await (await hre.getContractOrFork('MockSequencerUptimeFeed')).setAnswer(1);
      // should return redstone price if sequencer is down
      expect(await redstoneDiamond.getAccountTotalCollateralValue(user.address)).to.be.equal(
        f.depositAmount.wadMul(toBig(redstoneCollateralPrice, 8)),
        'collateral value should be $200',
      );

      f.Collateral.setPrice(10);
      await (await hre.getContractOrFork('MockSequencerUptimeFeed')).setAnswer(0);
    });
  });
});
