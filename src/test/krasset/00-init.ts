import { ZERO_ADDRESS } from '@kreskolabs/lib';
import { expect } from '@test/chai';
import { getAnchorNameAndSymbol } from '@utils/strings';
import { kreskoAssetFixture } from '@utils/test/fixtures';
import { Role } from '@utils/test/roles';

const name = 'Ether';
const symbol = 'krETH';
const { anchorSymbol, anchorName } = getAnchorNameAndSymbol(symbol, name);
describe('KreskoAsset', function () {
  let f: Awaited<ReturnType<typeof kreskoAssetFixture>>;
  beforeEach(async function () {
    f = await kreskoAssetFixture({ name, symbol, underlyingToken: ZERO_ADDRESS });
  });
  describe('KreskoAsset', function () {
    describe('#initialization - anchor', () => {
      it('cant initialize twice', async function () {
        await expect(
          f.KreskoAsset.initialize(
            name,
            symbol,
            18,
            hre.addr.deployer,
            hre.Diamond.address,
            hre.ethers.constants.AddressZero,
            hre.addr.deployer,
            0,
            0,
          ),
        ).to.be.reverted;
      });

      it.skip('cant initialize implementation', async function () {
        const deployment = await hre.deployments.get(symbol);
        const implementationAddress = deployment!.implementation;
        expect(implementationAddress).to.not.equal(hre.ethers.constants.AddressZero);
        const KreskoAssetImpl = await hre.ethers.getContractAt('KreskoAsset', implementationAddress!);

        await expect(
          KreskoAssetImpl.initialize(
            name,
            symbol,
            18,
            hre.addr.deployer,
            hre.Diamond.address,
            hre.ethers.constants.AddressZero,
            hre.addr.deployer,
            0,
            0,
          ),
        ).to.be.reverted;
      });

      it('sets correct state', async function () {
        expect(await f.KreskoAsset.name()).to.equal(name);
        expect(await f.KreskoAsset.symbol()).to.equal(symbol);
        expect(await f.KreskoAsset.kresko()).to.equal(hre.Diamond.address);
        expect(await f.KreskoAsset.hasRole(Role.ADMIN, hre.addr.deployer)).to.equal(true);
        expect(await f.KreskoAsset.hasRole(Role.OPERATOR, hre.Diamond.address)).to.equal(true);

        expect(await f.KreskoAsset.totalSupply()).to.equal(0);
        expect(await f.KreskoAsset.isRebased()).to.equal(false);

        const rebaseInfo = await f.KreskoAsset.rebaseInfo();
        expect(rebaseInfo.denominator).to.equal(0);
        expect(rebaseInfo.positive).to.equal(false);
      });

      it('can reinitialize metadata', async function () {
        const newName = 'foo';
        const newSymbol = 'bar';
        await expect(f.KreskoAsset.reinitializeERC20(newName, newSymbol, 2)).to.not.be.reverted;
        expect(await f.KreskoAsset.name()).to.equal(newName);
        expect(await f.KreskoAsset.symbol()).to.equal(newSymbol);
      });
    });

    it.skip('cant initialize implementation', async function () {
      const deployment = await hre.deployments.get(symbol);
      const implementationAddress = deployment!.implementation;
      expect(implementationAddress).to.not.equal(hre.ethers.constants.AddressZero);
      const KreskoAssetImpl = await hre.ethers.getContractAt('KreskoAsset', implementationAddress!);

      await expect(
        KreskoAssetImpl.initialize(
          name!,
          symbol,
          18,
          hre.addr.deployer,
          hre.Diamond.address,
          hre.ethers.constants.AddressZero,
          hre.addr.deployer,
          0,
          0,
        ),
      ).to.be.reverted;
    });

    it('sets correct state', async function () {
      expect(await f.KreskoAsset.name()).to.equal(name);
      expect(await f.KreskoAsset.symbol()).to.equal(symbol);
      expect(await f.KreskoAsset.kresko()).to.equal(hre.Diamond.address);
      expect(await f.KreskoAsset.hasRole(Role.ADMIN, hre.addr.deployer)).to.equal(true);
      expect(await f.KreskoAsset.hasRole(Role.OPERATOR, hre.Diamond.address)).to.equal(true);

      expect(await f.KreskoAsset.totalSupply()).to.equal(0);
      expect(await f.KreskoAsset.isRebased()).to.equal(false);

      const rebaseInfo = await f.KreskoAsset.rebaseInfo();
      expect(rebaseInfo.denominator).to.equal(0);
      expect(rebaseInfo.positive).to.equal(false);
    });

    it('can reinitialize metadata', async function () {
      const newName = 'foo';
      const newSymbol = 'bar';
      await expect(f.KreskoAsset.reinitializeERC20(newName, newSymbol, 2)).to.not.be.reverted;
      expect(await f.KreskoAsset.name()).to.equal(newName);
      expect(await f.KreskoAsset.symbol()).to.equal(newSymbol);
    });
  });

  describe('#initialization - wrapped', () => {
    it('cant initialize twice', async function () {
      await expect(f.KreskoAssetAnchor.initialize(f.KreskoAsset.address, name!, symbol, hre.addr.deployer)).to.be
        .reverted;
    });
    it('sets correct state', async function () {
      expect(await f.KreskoAssetAnchor.name()).to.equal(anchorName);
      expect(await f.KreskoAssetAnchor.symbol()).to.equal(anchorSymbol);
      expect(await f.KreskoAssetAnchor.asset()).to.equal(f.KreskoAsset.address);
      expect(await f.KreskoAssetAnchor.hasRole(Role.ADMIN, hre.addr.deployer)).to.equal(true);
      expect(await f.KreskoAssetAnchor.hasRole(Role.OPERATOR, hre.Diamond.address)).to.equal(true);

      expect(await f.KreskoAssetAnchor.totalSupply()).to.equal(0);
      expect(await f.KreskoAssetAnchor.totalAssets()).to.equal(await f.KreskoAsset.totalSupply());

      const rebaseInfo = await f.KreskoAsset.rebaseInfo();
      expect(rebaseInfo.denominator).to.equal(0);
      expect(rebaseInfo.positive).to.equal(false);
    });

    it.skip('cant initialize implementation', async function () {
      const deployment = await hre.deployments.get(anchorSymbol);
      const implementationAddress = deployment!.implementation;

      expect(implementationAddress).to.not.equal(hre.ethers.constants.AddressZero);
      const KreskoAssetAnchorImpl = await hre.ethers.getContractAt('KreskoAssetAnchor', implementationAddress!);

      await expect(KreskoAssetAnchorImpl.initialize(f.KreskoAsset.address, name!, symbol, hre.addr.deployer)).to.be
        .reverted;
    });

    it('can reinitialize metadata', async function () {
      const newName = 'foo';
      const newSymbol = 'bar';
      await expect(f.KreskoAssetAnchor.reinitializeERC20(newName, newSymbol, 2)).to.not.be.reverted;
      expect(await f.KreskoAssetAnchor.name()).to.equal(newName);
      expect(await f.KreskoAssetAnchor.symbol()).to.equal(newSymbol);
      await f.KreskoAssetAnchor.reinitializeERC20(name!, symbol, 3);
    });
  });
});
