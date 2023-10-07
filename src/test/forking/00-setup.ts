import { minterFacets } from '@config/deploy';

import { updateFacets } from '@scripts/update-facets';
import { expect } from '@test/chai';
import { toBig } from '@utils/values';

(process.env.FORKING ? describe : describe.skip)('Forking', () => {
  describe('#setup', () => {
    it('should get Kresko from the companion network locally', async function () {
      expect(hre.companionNetworks).to.have.property('live');

      const Kresko = await hre.getContractOrFork('Kresko');
      expect(await Kresko.initialized()).to.equal(true);

      // const Safe = await hre.getContractOrFork("GnosisSafeL2", "Multisig");
      // expect(await Kresko.hasRole(Role.DEFAULT_ADMIN, Safe.address)).to.be.true;
    });
  });
  describe('#rate-upgrade-11-04-2023', () => {
    it.skip('should be able to deploy facets', async function () {
      expect(hre.companionNetworks).to.have.property('live');
      const { deployer } = await hre.getNamedAccounts();
      const Kresko = await hre.getContractOrFork('Kresko');
      const krETH = await hre.getContractOrFork('KreskoAsset', 'krETH');

      const facetsBefore = await Kresko.facets();
      const { facetsAfter } = await updateFacets({ facetNames: minterFacets });
      expect(facetsAfter).to.not.deep.equal(facetsBefore);

      await expect(Kresko.mintKreskoAsset(deployer, krETH.address, toBig(0.1))).to.not.be.reverted;
    });
  });
});
