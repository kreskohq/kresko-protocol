import {
  commonFacets,
  diamondFacets,
  getCommonInitializer,
  getMinterInitializer,
  getSCDPInitializer,
  minterFacets,
  scdpFacets,
} from '@config/deploy';
import { expect } from '@test/chai';
import { defaultFixture } from '@utils/test/fixtures';
import { Role } from '@utils/test/roles';

describe('Diamond', () => {
  beforeEach(async function () {
    await defaultFixture();
  });
  describe('#protocol initialization', () => {
    it('initialized all facets', async function () {
      const facetsOnChain = (await hre.Diamond.facets()).map(([facetAddress, functionSelectors]) => ({
        facetAddress,
        functionSelectors,
      }));
      const expectedFacets = await Promise.all(
        [...diamondFacets, ...minterFacets, ...scdpFacets, ...commonFacets].map(async name => {
          const deployment = await hre.deployments.get(name);
          return {
            facetAddress: deployment.address,
            functionSelectors: facetsOnChain.find(f => f.facetAddress === deployment.address)!.functionSelectors,
          };
        }),
      );
      expect(facetsOnChain).to.have.deep.members(expectedFacets);
    });
    it('initialized correct state', async function () {
      expect(await hre.Diamond.getStorageVersion()).to.equal(3);

      const { args } = await getCommonInitializer(hre);
      const { args: minterArgs } = await getMinterInitializer(hre);
      const { args: scdpArgs } = await getSCDPInitializer(hre);

      expect(await hre.Diamond.hasRole(Role.ADMIN, args.admin)).to.equal(true);
      expect(await hre.Diamond.hasRole(Role.SAFETY_COUNCIL, hre.Multisig.address)).to.equal(true);

      expect(await hre.Diamond.getFeeRecipient()).to.equal(args.treasury);
      expect(await hre.Diamond.getMinCollateralRatioMinter()).to.equal(minterArgs.minCollateralRatio);
      expect(await hre.Diamond.getLiquidationThresholdMinter()).to.equal(minterArgs.liquidationThreshold);
      expect(await hre.Diamond.getMaxLiquidationRatioMinter()).to.equal(
        Number(minterArgs.liquidationThreshold) + 0.01e4,
      );

      const scdpParams = await hre.Diamond.getParametersSCDP();
      expect(scdpParams.minCollateralRatio).to.equal(scdpArgs.minCollateralRatio);
      expect(scdpParams.liquidationThreshold).to.equal(scdpArgs.liquidationThreshold);
      expect(await hre.Diamond.getMinDebtValue()).to.equal(args.minDebtValue);
      expect(await hre.Diamond.getOracleDeviationPct()).to.equal(args.maxPriceDeviationPct);
    });

    it('can modify configuration parameters', async function () {
      await expect(hre.Diamond.setMaxPriceDeviationPct(0.05e4)).to.not.be.reverted;
      await expect(hre.Diamond.setSequencerGracePeriod(1000)).to.not.be.reverted;
      await expect(hre.Diamond.setDefaultOraclePrecision(9)).to.not.be.reverted;
      await expect(hre.Diamond.setStaleTime(9)).to.not.be.reverted;
      await expect(hre.Diamond.setMinDebtValue(20e8)).to.not.be.reverted;

      expect(await hre.Diamond.getMinDebtValue()).to.equal(20e8);
      expect(await hre.Diamond.getDefaultOraclePrecision()).to.equal(9);
      expect(await hre.Diamond.getOracleDeviationPct()).to.equal(0.05e4);
      expect(await hre.Diamond.getSequencerGracePeriod()).to.equal(1000);
    });
  });
});
