import { expect } from '@test/chai';
import { kreskoAssetFixture } from '@utils/test/fixtures';
import Role from '@utils/test/roles';
import { toBig } from '@utils/values';
import { WETH9 } from 'src/types/typechain';

describe('KreskoAsset', () => {
  let KreskoAsset: KreskoAsset;
  let WETH: WETH9;
  beforeEach(async function () {
    ({ KreskoAsset } = await kreskoAssetFixture({
      name: 'Ether',
      symbol: 'krETH',
    }));

    // Deploy WETH
    WETH = (await hre.ethers.deployContract('WETH9')) as WETH9;
    // Give WETH to deployer
    await WETH.connect(hre.users.devOne).deposit({ value: toBig(100) });

    await KreskoAsset.connect(hre.users.deployer).grantRole(Role.OPERATOR, hre.addr.deployer);
    await KreskoAsset.connect(hre.users.deployer).setUnderlying(WETH.address);
    // set Kresko Anchor token address in KreskoAsset

    // Approve WETH for KreskoAsset
    await WETH.connect(hre.users.devOne).approve(KreskoAsset.address, hre.ethers.constants.MaxUint256);
  });

  describe('Deposit / Wrap', () => {
    it('cannot deposit when paused', async function () {
      await KreskoAsset.connect(hre.users.admin).pause();
      await expect(KreskoAsset.wrap(hre.addr.devOne, toBig(10))).to.be.revertedWithCustomError(
        KreskoAsset,
        'EnforcedPause',
      );
      await KreskoAsset.connect(hre.users.admin).unpause();
    });
    it('can deposit with token', async function () {
      await KreskoAsset.connect(hre.users.devOne).wrap(hre.addr.devOne, toBig(10));
      expect(await KreskoAsset.balanceOf(hre.addr.devOne)).to.equal(toBig(10));
    });
    it('cannot deposit native token if not enabled', async function () {
      await expect(hre.users.devOne.sendTransaction({ to: KreskoAsset.address, value: toBig(10) })).to.be.reverted;
    });
    it('can deposit native token if enabled', async function () {
      await KreskoAsset.connect(hre.users.admin).enableNativeUnderlying(true);
      const prevBalance = await KreskoAsset.balanceOf(hre.addr.devOne);
      await hre.users.devOne.sendTransaction({ to: KreskoAsset.address, value: toBig(10) });
      const currentBalance = await KreskoAsset.balanceOf(hre.addr.devOne);
      expect(currentBalance.sub(prevBalance)).to.equal(toBig(10));
    });
    it('transfers the correct fees to feeRecipient', async function () {
      await KreskoAsset.connect(hre.users.admin).setOpenFee(0.1e4);
      await KreskoAsset.connect(hre.users.admin).enableNativeUnderlying(true);

      let prevBalanceDevOne = await KreskoAsset.balanceOf(hre.addr.devOne);
      const treasuryWETHBal = await WETH.balanceOf(hre.addr.treasury);

      await KreskoAsset.connect(hre.users.devOne).wrap(hre.addr.devOne, toBig(10));

      let currentBalanceDevOne = await KreskoAsset.balanceOf(hre.addr.devOne);
      const currentWETHBalanceTreasury = await WETH.balanceOf(hre.addr.treasury);
      expect(currentBalanceDevOne.sub(prevBalanceDevOne)).to.equal(toBig(9));
      expect(currentWETHBalanceTreasury.sub(treasuryWETHBal)).to.equal(toBig(1));

      prevBalanceDevOne = await KreskoAsset.balanceOf(hre.addr.devOne);
      const prevBalanceTreasury = await hre.ethers.provider.getBalance(hre.addr.treasury);
      await hre.users.devOne.sendTransaction({ to: KreskoAsset.address, value: toBig(10) });
      currentBalanceDevOne = await KreskoAsset.balanceOf(hre.addr.devOne);
      const currentBalanceTreasury = await hre.ethers.provider.getBalance(hre.addr.treasury);
      expect(currentBalanceDevOne.sub(prevBalanceDevOne)).to.equal(toBig(9));
      expect(currentBalanceTreasury.sub(prevBalanceTreasury)).to.equal(toBig(1));

      // Set openfee to 0
      await KreskoAsset.connect(hre.users.admin).setOpenFee(0);
    });
  });
  describe('Withdraw / Unwrap', () => {
    beforeEach(async function () {
      // Deposit some tokens here
      await KreskoAsset.connect(hre.users.devOne).wrap(hre.addr.devOne, toBig(10));

      await KreskoAsset.connect(hre.users.admin).enableNativeUnderlying(true);
      await hre.users.devOne.sendTransaction({ to: KreskoAsset.address, value: toBig(100) });
    });
    it('cannot withdraw when paused', async function () {
      await KreskoAsset.connect(hre.users.admin).pause();
      await expect(KreskoAsset.unwrap(toBig(1), false)).to.be.revertedWithCustomError(KreskoAsset, 'EnforcedPause');
      await KreskoAsset.connect(hre.users.admin).unpause();
    });
    it('can withdraw', async function () {
      const prevBalance = await WETH.balanceOf(hre.addr.devOne);
      await KreskoAsset.connect(hre.users.devOne).unwrap(toBig(1), false);
      const currentBalance = await WETH.balanceOf(hre.addr.devOne);
      expect(currentBalance).to.equal(toBig(1).add(prevBalance));
    });
    it('can withdraw native token if enabled', async function () {
      await KreskoAsset.connect(hre.users.admin).enableNativeUnderlying(true);
      const prevBalance = await KreskoAsset.balanceOf(hre.addr.devOne);
      await KreskoAsset.connect(hre.users.devOne).unwrap(toBig(1), true);
      const currentBalance = await KreskoAsset.balanceOf(hre.addr.devOne);
      expect(prevBalance.sub(currentBalance)).to.equal(toBig(1));
    });
    it('transfers the correct fees to feeRecipient', async function () {
      // set close fee to 10%
      await KreskoAsset.connect(hre.users.admin).setCloseFee(0.1e4);

      const prevBalanceDevOne = await WETH.balanceOf(hre.addr.devOne);
      let prevBalanceTreasury = await WETH.balanceOf(hre.addr.treasury);
      await KreskoAsset.connect(hre.users.devOne).unwrap(toBig(9), false);
      const currentBalanceDevOne = await WETH.balanceOf(hre.addr.devOne);
      let currentBalanceTreasury = await WETH.balanceOf(hre.addr.treasury);
      expect(currentBalanceDevOne.sub(prevBalanceDevOne)).to.equal(toBig(8.1));
      expect(currentBalanceTreasury.sub(prevBalanceTreasury)).to.equal(toBig(0.9));

      // Withdraw native token and check if fee is transferred
      await hre.users.devOne.sendTransaction({ to: KreskoAsset.address, value: toBig(10) });
      prevBalanceTreasury = await hre.ethers.provider.getBalance(hre.addr.treasury);
      await KreskoAsset.connect(hre.users.devOne).unwrap(toBig(9), true);
      currentBalanceTreasury = await hre.ethers.provider.getBalance(hre.addr.treasury);
      expect(currentBalanceTreasury.sub(prevBalanceTreasury)).to.equal(toBig(0.9));
    });
  });
});
