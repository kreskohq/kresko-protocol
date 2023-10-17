import { ZERO_ADDRESS } from '@kreskolabs/lib';
import { expect } from '@test/chai';
import { kreskoAssetFixture } from '@utils/test/fixtures';
import { Role } from '@utils/test/roles';

describe('KreskoAsset', () => {
  let KreskoAsset: KreskoAsset;

  beforeEach(async function () {
    ({ KreskoAsset } = await kreskoAssetFixture({ name: 'Ether', symbol: 'krETH', underlyingToken: ZERO_ADDRESS }));
    this.mintAmount = 125;
    this.owner = hre.users.deployer;
    await KreskoAsset.grantRole(Role.OPERATOR, this.owner.address);
  });

  describe('#mint', () => {
    it('should allow the owner to mint to their own address', async function () {
      expect(await KreskoAsset.totalSupply()).to.equal(0);
      expect(await KreskoAsset.balanceOf(this.owner.address)).to.equal(0);

      await KreskoAsset.connect(this.owner).mint(this.owner.address, this.mintAmount);

      // Check total supply and owner's balances increased
      expect(await KreskoAsset.totalSupply()).to.equal(this.mintAmount);
      expect(await KreskoAsset.balanceOf(this.owner.address)).to.equal(this.mintAmount);
    });

    it('should allow the asset owner to mint to another address', async function () {
      expect(await KreskoAsset.totalSupply()).to.equal(0);
      expect(await KreskoAsset.balanceOf(hre.users.userOne.address)).to.equal(0);

      await KreskoAsset.connect(this.owner).mint(hre.users.userOne.address, this.mintAmount);

      // Check total supply and user's balances increased
      expect(await KreskoAsset.totalSupply()).to.equal(this.mintAmount);
      expect(await KreskoAsset.balanceOf(hre.users.userOne.address)).to.equal(this.mintAmount);
    });

    it('should not allow non-owner addresses to mint tokens', async function () {
      expect(await KreskoAsset.totalSupply()).to.equal(0);
      expect(await KreskoAsset.balanceOf(this.owner.address)).to.equal(0);

      await expect(KreskoAsset.connect(hre.users.userOne).mint(this.owner.address, this.mintAmount)).to.be.reverted;

      // Check total supply and all account balances unchanged
      expect(await KreskoAsset.totalSupply()).to.equal(0);
      expect(await KreskoAsset.balanceOf(this.owner.address)).to.equal(0);
      expect(await KreskoAsset.balanceOf(hre.users.userOne.address)).to.equal(0);
    });

    it('should not allow admin to mint tokens', async function () {
      await KreskoAsset.renounceRole(Role.OPERATOR, this.owner.address);
      await expect(KreskoAsset.connect(this.owner).mint(this.owner.address, this.mintAmount)).to.be.reverted;
    });
  });

  describe('#burn', () => {
    beforeEach(async function () {
      await KreskoAsset.connect(this.owner).mint(hre.users.userOne.address, this.mintAmount);
      this.owner = hre.users.deployer;
      this.mintAmount = 125;
      await KreskoAsset.grantRole(Role.OPERATOR, this.owner.address);
    });

    it("should allow the owner to burn tokens from user's address (without token allowance)", async function () {
      expect(await KreskoAsset.totalSupply()).to.equal(this.mintAmount);

      await KreskoAsset.connect(this.owner).burn(hre.users.userOne.address, this.mintAmount);

      // Check total supply and user's balances decreased
      expect(await KreskoAsset.totalSupply()).to.equal(0);
      expect(await KreskoAsset.balanceOf(this.owner.address)).to.equal(0);
      // Confirm that owner doesn't hold any tokens
      expect(await KreskoAsset.balanceOf(hre.users.userOne.address)).to.equal(0);
    });

    it("should allow the operator to burn tokens from user's address without changing existing allowances", async function () {
      await KreskoAsset.connect(this.owner).approve(hre.users.userOne.address, this.mintAmount);

      expect(await KreskoAsset.totalSupply()).to.equal(this.mintAmount);
      expect(await KreskoAsset.allowance(this.owner.address, hre.users.userOne.address)).to.equal(this.mintAmount);

      await KreskoAsset.connect(this.owner).burn(hre.users.userOne.address, this.mintAmount);

      // Check total supply and user's balances decreased
      expect(await KreskoAsset.totalSupply()).to.equal(0);
      expect(await KreskoAsset.balanceOf(hre.users.userOne.address)).to.equal(0);
      // Confirm that owner doesn't hold any tokens
      expect(await KreskoAsset.balanceOf(this.owner.address)).to.equal(0);
      // Confirm that token allowances are unchanged
      expect(await KreskoAsset.allowance(this.owner.address, hre.users.userOne.address)).to.equal(this.mintAmount);
    });

    it('should not allow the operator to burn more tokens than user holds', async function () {
      const userBalance = await KreskoAsset.balanceOf(hre.users.userOne.address);
      const overUserBalance = Number(userBalance) + 1;

      await expect(KreskoAsset.connect(this.owner).burn(hre.users.userOne.address, overUserBalance)).to.be.reverted;

      // Check total supply and user's balances are unchanged
      expect(await KreskoAsset.totalSupply()).to.equal(this.mintAmount);
      expect(await KreskoAsset.balanceOf(hre.users.userOne.address)).to.equal(this.mintAmount);
    });

    it('should not allow non-operator addresses to burn tokens', async function () {
      await expect(KreskoAsset.connect(hre.users.userTwo).burn(hre.users.userOne.address, this.mintAmount))
        .to.be.revertedWithCustomError(KreskoAsset, 'AccessControlUnauthorizedAccount')
        .withArgs(hre.users.userTwo.address, Role.OPERATOR);

      // Check total supply and user's balances unchanged
      expect(await KreskoAsset.totalSupply()).to.equal(this.mintAmount);
      expect(await KreskoAsset.balanceOf(hre.users.userOne.address)).to.equal(this.mintAmount);
    });
  });
});
