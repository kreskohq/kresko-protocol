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
        [...minterFacets, ...diamondFacets, ...scdpFacets, ...commonFacets].map(async name => {
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
      expect(await hre.Diamond.getStorageVersion()).to.equal(4);

      const { args } = await getCommonInitializer(hre);
      const { args: minterArgs } = await getMinterInitializer(hre);
      const { args: scdpArgs } = await getSCDPInitializer(hre);

      expect(await hre.Diamond.hasRole(Role.ADMIN, args.admin)).to.equal(true);
      expect(await hre.Diamond.hasRole(Role.SAFETY_COUNCIL, hre.Multisig.address)).to.equal(true);

      expect(await hre.Diamond.getFeeRecipient()).to.equal(args.treasury);
      expect(await hre.Diamond.getMinCollateralRatio()).to.equal(minterArgs.minCollateralRatio);

      const scdpParams = await hre.Diamond.getCurrentParametersSCDP();
      expect(scdpParams.minCollateralRatio).to.equal(scdpArgs.minCollateralRatio);
      expect(scdpParams.liquidationThreshold).to.equal(scdpArgs.liquidationThreshold);
      expect(scdpParams.swapFeeRecipient).to.equal(scdpArgs.swapFeeRecipient);
      expect(await hre.Diamond.getMinDebtValue()).to.equal(args.minDebtValue);
      expect(await hre.Diamond.getOracleDeviationPct()).to.equal(args.oracleDeviationPct);
    });
  });
});
