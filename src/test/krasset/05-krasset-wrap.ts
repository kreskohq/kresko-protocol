import type { WETH9 } from '@/types/typechain';
import { expect } from '@test/chai';
import { kreskoAssetFixture } from '@utils/test/fixtures';
import { Role } from '@utils/test/roles';
import { toBig } from '@utils/values';

describe('KreskoAsset', () => {
  let KreskoAsset: KreskoAsset;
  let WETH: WETH9;
  let operator: SignerWithAddress;
  let user: SignerWithAddress;
  let treasury: string;
  beforeEach(async function () {
    operator = hre.users.deployer;
    user = hre.users.userOne;
    treasury = hre.addr.treasury;
    ({ KreskoAsset } = await kreskoAssetFixture({
      name: 'Ether',
      symbol: 'krETH',
    }));

    // Deploy WETH
    WETH = (await hre.ethers.deployContract('WETH9')) as WETH9;
    // Give WETH to deployer
    await WETH.connect(user).deposit({ value: toBig(100) });

    await KreskoAsset.connect(hre.users.deployer).grantRole(Role.OPERATOR, operator.address);
    await KreskoAsset.connect(hre.users.deployer).setUnderlying(WETH.address);
    // Approve WETH for KreskoAsset
    await WETH.connect(user).approve(KreskoAsset.address, hre.ethers.constants.MaxUint256);
  });

  describe('Deposit / Wrap', () => {
    it('cannot deposit when paused', async function () {
      await KreskoAsset.connect(operator).pause();
      await expect(KreskoAsset.wrap(user.address, toBig(10))).to.be.revertedWithCustomError(
        KreskoAsset,
        'EnforcedPause',
      );
      await KreskoAsset.connect(operator).unpause();
    });
    it('can deposit with token', async function () {
      await KreskoAsset.connect(user).wrap(user.address, toBig(10));
      expect(await KreskoAsset.balanceOf(user.address)).to.equal(toBig(10));
    });
    it('cannot deposit native token if not enabled', async function () {
      await expect(user.sendTransaction({ to: KreskoAsset.address, value: toBig(10) })).to.be.reverted;
    });
    it('can deposit native token if enabled', async function () {
      await KreskoAsset.connect(operator).enableNativeUnderlying(true);
      const prevBalance = await KreskoAsset.balanceOf(user.address);
      await user.sendTransaction({ to: KreskoAsset.address, value: toBig(10) });
      const currentBalance = await KreskoAsset.balanceOf(user.address);
      expect(currentBalance.sub(prevBalance)).to.equal(toBig(10));
    });
    it('transfers the correct fees to feeRecipient', async function () {
      await KreskoAsset.connect(operator).setOpenFee(0.1e4);
      await KreskoAsset.connect(operator).enableNativeUnderlying(true);

      let prevBalanceDevOne = await KreskoAsset.balanceOf(user.address);
      const treasuryWETHBal = await WETH.balanceOf(treasury);

      await KreskoAsset.connect(user).wrap(user.address, toBig(10));

      let currentBalanceDevOne = await KreskoAsset.balanceOf(user.address);
      const currentWETHBalanceTreasury = await WETH.balanceOf(treasury);
      expect(currentBalanceDevOne.sub(prevBalanceDevOne)).to.equal(toBig(9));
      expect(currentWETHBalanceTreasury.sub(treasuryWETHBal)).to.equal(toBig(1));

      prevBalanceDevOne = await KreskoAsset.balanceOf(user.address);
      const prevBalanceTreasury = await hre.ethers.provider.getBalance(treasury);
      await user.sendTransaction({ to: KreskoAsset.address, value: toBig(10) });
      currentBalanceDevOne = await KreskoAsset.balanceOf(user.address);
      const currentBalanceTreasury = await hre.ethers.provider.getBalance(treasury);
      expect(currentBalanceDevOne.sub(prevBalanceDevOne)).to.equal(toBig(9));
      expect(currentBalanceTreasury.sub(prevBalanceTreasury)).to.equal(toBig(1));

      // Set openfee to 0
      await KreskoAsset.connect(operator).setOpenFee(0);
    });
  });
  describe('Withdraw / Unwrap', () => {
    beforeEach(async function () {
      // Deposit some tokens here
      await KreskoAsset.connect(user).wrap(user.address, toBig(10));

      await KreskoAsset.connect(operator).enableNativeUnderlying(true);
      await user.sendTransaction({ to: KreskoAsset.address, value: toBig(100) });
    });
    it('cannot withdraw when paused', async function () {
      await KreskoAsset.connect(operator).pause();
      await expect(KreskoAsset.unwrap(toBig(1), false)).to.be.revertedWithCustomError(KreskoAsset, 'EnforcedPause');
      await KreskoAsset.connect(operator).unpause();
    });
    it('can withdraw', async function () {
      const prevBalance = await WETH.balanceOf(user.address);
      await KreskoAsset.connect(user).unwrap(toBig(1), false);
      const currentBalance = await WETH.balanceOf(user.address);
      expect(currentBalance).to.equal(toBig(1).add(prevBalance));
    });
    it('can withdraw native token if enabled', async function () {
      await KreskoAsset.connect(operator).enableNativeUnderlying(true);
      const prevBalance = await KreskoAsset.balanceOf(user.address);
      await KreskoAsset.connect(user).unwrap(toBig(1), true);
      const currentBalance = await KreskoAsset.balanceOf(user.address);
      expect(prevBalance.sub(currentBalance)).to.equal(toBig(1));
    });
    it('transfers the correct fees to feeRecipient', async function () {
      // set close fee to 10%
      await KreskoAsset.connect(operator).setCloseFee(0.1e4);

      const prevBalanceDevOne = await WETH.balanceOf(user.address);
      let prevBalanceTreasury = await WETH.balanceOf(treasury);
      await KreskoAsset.connect(user).unwrap(toBig(9), false);
      const currentBalanceDevOne = await WETH.balanceOf(user.address);
      let currentBalanceTreasury = await WETH.balanceOf(treasury);
      expect(currentBalanceDevOne.sub(prevBalanceDevOne)).to.equal(toBig(8.1));
      expect(currentBalanceTreasury.sub(prevBalanceTreasury)).to.equal(toBig(0.9));

      // Withdraw native token and check if fee is transferred
      await user.sendTransaction({ to: KreskoAsset.address, value: toBig(10) });
      prevBalanceTreasury = await hre.ethers.provider.getBalance(treasury);
      await KreskoAsset.connect(user).unwrap(toBig(9), true);
      currentBalanceTreasury = await hre.ethers.provider.getBalance(treasury);
      expect(currentBalanceTreasury.sub(prevBalanceTreasury)).to.equal(toBig(0.9));
    });
  });
});
