/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { Action } from '@/types';
import type { SafetyStateChangeEventObject } from '@/types/typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko';
import { getInternalEvent } from '@utils/events';
import { executeContractCallWithSigners } from '@utils/gnosis/utils/execution';
import { defaultFixture, type DefaultFixture } from '@utils/test/fixtures';
import { expect } from 'chai';

describe('Safety Council', () => {
  let f: DefaultFixture;

  beforeEach(async function () {
    f = await defaultFixture();
    // These are the 5 signers on the SafetyCouncil multisig
    const { deployer, devOne, userOne, extOne, extTwo } = await hre.ethers.getNamedSigners();
    this.deployer = deployer;
    this.devOne = devOne;
    this.userOne = userOne;
    this.extOne = extOne;
    this.extTwo = extTwo;
  });

  describe('#setSafetyStateSet', () => {
    it('correctly sets the safety state', async function () {
      const beforeSafetyState = await hre.Diamond.safetyStateSet();
      expect(beforeSafetyState).to.equal(false);

      await executeContractCallWithSigners(
        hre.Multisig,
        hre.Diamond,
        'setSafetyStateSet',
        [true],
        [this.deployer, this.devOne, this.userOne],
      );

      const safetyState = await hre.Diamond.safetyStateSet();
      expect(safetyState).to.equal(true);
    });
  });

  describe('#toggleAssetsPaused', () => {
    describe('multisig signature threshold', () => {
      it('multisig transacts successfully with majority of signers (3/5)', async function () {
        await executeContractCallWithSigners(
          hre.Multisig,
          hre.Diamond,
          'toggleAssetsPaused',
          [[f.Collateral.address], Action.DEPOSIT, false, 0],
          [this.deployer, this.devOne, this.userOne],
        );

        const isPaused = await hre.Diamond.assetActionPaused(Action.DEPOSIT.toString(), f.Collateral.address);
        expect(isPaused).to.equal(true);
      });

      it('multisig transacts successfully with super-majority of signers (4/5)', async function () {
        await executeContractCallWithSigners(
          hre.Multisig,
          hre.Diamond,
          'toggleAssetsPaused',
          [[f.Collateral.address], Action.DEPOSIT, false, 0],
          [this.deployer, this.devOne, this.userOne, this.extOne],
        );

        const isPaused = await hre.Diamond.assetActionPaused(Action.DEPOSIT.toString(), f.Collateral.address);
        expect(isPaused).to.equal(true);
      });

      it('multisig transacts successfully with all signers (5/5)', async function () {
        await executeContractCallWithSigners(
          hre.Multisig,
          hre.Diamond,
          'toggleAssetsPaused',
          [[f.Collateral.address], Action.DEPOSIT, false, 0],
          [this.deployer, this.devOne, this.userOne, this.extOne, this.extTwo],
        );

        const isPaused = await hre.Diamond.assetActionPaused(Action.DEPOSIT.toString(), f.Collateral.address);
        expect(isPaused).to.equal(true);
      });

      it('multisig should reject transactions signed by a minority of signers (2/5)', async function () {
        await expect(
          executeContractCallWithSigners(
            hre.Multisig,
            hre.Diamond,
            'toggleAssetsPaused',
            [[f.Collateral.address], Action.DEPOSIT, false, 0],
            [this.deployer],
          ),
        ).to.be.reverted;

        const isPaused = await hre.Diamond.assetActionPaused(Action.DEPOSIT.toString(), f.Collateral.address);
        expect(isPaused).to.equal(false);
      });
    });

    describe('toggle actions only for listed assets', () => {
      it('can toggle actions for listed collateral assets', async function () {
        await executeContractCallWithSigners(
          hre.Multisig,
          hre.Diamond,
          'toggleAssetsPaused',
          [[f.Collateral.address], Action.DEPOSIT, false, 0],
          [this.deployer, this.devOne, this.userOne],
        );

        const isPaused = await hre.Diamond.assetActionPaused(Action.DEPOSIT.toString(), f.Collateral.address);
        expect(isPaused).to.equal(true);
      });

      it('can toggle actions for listed krAssets', async function () {
        await executeContractCallWithSigners(
          hre.Multisig,
          hre.Diamond,
          'toggleAssetsPaused',
          [[f.KrAsset.address], Action.REPAY, false, 0],
          [this.deployer, this.devOne, this.userOne],
        );

        const isPaused = await hre.Diamond.assetActionPaused(Action.REPAY.toString(), f.KrAsset.address);
        expect(isPaused).to.equal(true);
      });

      it('cannot toggle actions for addresses that are not listed collateral assets or krAssets', async function () {
        const randomAddr = hre.ethers.utils.computeAddress(
          '0xb976778317b23a1285ec2d483eda6904d9319135b89f1d8eee9f6d2593e2665d',
        );

        await expect(
          executeContractCallWithSigners(
            hre.Multisig,
            hre.Diamond,
            'toggleAssetsPaused',
            [[randomAddr], Action.DEPOSIT, false, 0],
            [this.deployer, this.devOne, this.userOne],
          ),
        ).to.be.reverted;

        const isPaused = await hre.Diamond.assetActionPaused(Action.DEPOSIT.toString(), randomAddr);
        expect(isPaused).to.equal(false);
      });
    });

    describe('duration based pausing', () => {
      it('can optionally set a timeout on a given pause command', async function () {
        const duration = 100000000;

        await executeContractCallWithSigners(
          hre.Multisig,
          hre.Diamond,
          'toggleAssetsPaused',
          [[f.Collateral.address], Action.DEPOSIT, true, duration],
          [this.deployer, this.devOne, this.userOne],
        );

        const depositSafetyState = await hre.Diamond.safetyStateFor(f.Collateral.address, Action.DEPOSIT);
        expect(depositSafetyState.length).to.equal(1);
        // Blocktime timestamp + duration should be equal to final timestamp
        expect(depositSafetyState[0].timestamp0.add(duration)).eq(depositSafetyState[0].timestamp1);
      });

      // TODO: should the protocol be updated to use duration based pausing, we can test it at the end of this function
      it.skip('duration based pause functionality should expire after the duration has passed', async function () {
        const duration = 100000;

        await executeContractCallWithSigners(
          hre.Multisig,
          hre.Diamond,
          'toggleAssetsPaused',
          [[f.Collateral.address], Action.DEPOSIT, true, duration],
          [this.deployer, this.devOne, this.userOne],
        );

        const depositSafetyState = await hre.Diamond.safetyStateFor(f.Collateral.address, Action.DEPOSIT);
        expect(depositSafetyState.length).to.equal(1);

        // Blocktime timestamp + duration should be equal to final timestamp
        expect(depositSafetyState[0].timestamp0.add(duration)).eq(depositSafetyState[0].timestamp1);

        // Confirm that the current blocktime is within the pause action's duration
        const blockNumBefore = await hre.ethers.provider.getBlockNumber();
        const blockBefore = await hre.ethers.provider.getBlock(blockNumBefore);
        const timestampBefore = blockBefore.timestamp;
        expect(Number(depositSafetyState[0].timestamp1)).to.be.greaterThan(timestampBefore);

        // Increase time by seven days
        const sevenDays = 7 * 24 * 60 * 60;
        await hre.ethers.provider.send('evm_increaseTime', [sevenDays]);
        await hre.ethers.provider.send('evm_mine', []);

        // Confirm that block time has increased as expected
        const blockNumAfter = await hre.ethers.provider.getBlockNumber();
        const blockAfter = await hre.ethers.provider.getBlock(blockNumAfter);
        const timestampAfter = blockAfter.timestamp;
        expect(blockNumAfter).to.be.equal(blockNumBefore + 1);
        expect(timestampAfter).to.be.equal(timestampBefore + sevenDays);

        // Confirm that the current blocktime is after the pause action's duration
        expect(timestampAfter).to.be.greaterThan(Number(depositSafetyState[0].timestamp1));

        // NOTE: now we can test any functionality that should have now expired
      });
    });

    describe('toggle all possible actions: DEPOSIT, WITHDRAW, REPAY, BORROW, LIQUIDATION', () => {
      it('can toggle action DEPOSIT pause status on and off', async function () {
        await executeContractCallWithSigners(
          hre.Multisig,
          hre.Diamond,
          'toggleAssetsPaused',
          [[f.Collateral.address], Action.DEPOSIT, false, 0],
          [this.deployer, this.devOne, this.extOne],
        );

        let isPaused = await hre.Diamond.assetActionPaused(Action.DEPOSIT.toString(), f.Collateral.address);
        expect(isPaused).to.equal(true);

        await executeContractCallWithSigners(
          hre.Multisig,
          hre.Diamond,
          'toggleAssetsPaused',
          [[f.Collateral.address], Action.DEPOSIT, false, 0],
          [this.deployer, this.devOne, this.extOne],
        );

        isPaused = await hre.Diamond.assetActionPaused(Action.DEPOSIT.toString(), f.Collateral.address);
        expect(isPaused).to.equal(false);
      });

      it('can toggle action WITHDRAW pause status on and off', async function () {
        await executeContractCallWithSigners(
          hre.Multisig,
          hre.Diamond,
          'toggleAssetsPaused',
          [[f.Collateral.address], Action.WITHDRAW, false, 0],
          [this.deployer, this.devOne, this.extOne],
        );

        let isPaused = await hre.Diamond.assetActionPaused(Action.WITHDRAW.toString(), f.Collateral.address);
        expect(isPaused).to.equal(true);

        await executeContractCallWithSigners(
          hre.Multisig,
          hre.Diamond,
          'toggleAssetsPaused',
          [[f.Collateral.address], Action.WITHDRAW, false, 0],
          [this.deployer, this.devOne, this.extOne],
        );

        isPaused = await hre.Diamond.assetActionPaused(Action.WITHDRAW.toString(), f.Collateral.address);
        expect(isPaused).to.equal(false);
      });

      it('can toggle action REPAY pause status on and off', async function () {
        await executeContractCallWithSigners(
          hre.Multisig,
          hre.Diamond,
          'toggleAssetsPaused',
          [[f.Collateral.address], Action.REPAY, false, 0],
          [this.deployer, this.devOne, this.extOne],
        );

        let isPaused = await hre.Diamond.assetActionPaused(Action.REPAY.toString(), f.Collateral.address);
        expect(isPaused).to.equal(true);

        await executeContractCallWithSigners(
          hre.Multisig,
          hre.Diamond,
          'toggleAssetsPaused',
          [[f.Collateral.address], Action.REPAY, false, 0],
          [this.deployer, this.devOne, this.extOne],
        );

        isPaused = await hre.Diamond.assetActionPaused(Action.REPAY.toString(), f.Collateral.address);
        expect(isPaused).to.equal(false);
      });

      it('can toggle action BORROW pause status on and off', async function () {
        await executeContractCallWithSigners(
          hre.Multisig,
          hre.Diamond,
          'toggleAssetsPaused',
          [[f.Collateral.address], Action.BORROW, false, 0],
          [this.deployer, this.devOne, this.extOne],
        );

        let isPaused = await hre.Diamond.assetActionPaused(Action.BORROW.toString(), f.Collateral.address);
        expect(isPaused).to.equal(true);

        await executeContractCallWithSigners(
          hre.Multisig,
          hre.Diamond,
          'toggleAssetsPaused',
          [[f.Collateral.address], Action.BORROW, false, 0],
          [this.deployer, this.devOne, this.extOne],
        );

        isPaused = await hre.Diamond.assetActionPaused(Action.BORROW.toString(), f.Collateral.address);
        expect(isPaused).to.equal(false);
      });

      it('can toggle action LIQUIDATION pause status on and off', async function () {
        await executeContractCallWithSigners(
          hre.Multisig,
          hre.Diamond,
          'toggleAssetsPaused',
          [[f.Collateral.address], Action.LIQUIDATION, false, 0],
          [this.deployer, this.devOne, this.extOne],
        );

        let isPaused = await hre.Diamond.assetActionPaused(Action.LIQUIDATION.toString(), f.Collateral.address);
        expect(isPaused).to.equal(true);

        await executeContractCallWithSigners(
          hre.Multisig,
          hre.Diamond,
          'toggleAssetsPaused',
          [[f.Collateral.address], Action.LIQUIDATION, false, 0],
          [this.deployer, this.devOne, this.extOne],
        );

        isPaused = await hre.Diamond.assetActionPaused(Action.LIQUIDATION.toString(), f.Collateral.address);
        expect(isPaused).to.equal(false);
      });
    });

    describe('event emission', () => {
      it('should emit event MinterEvent.SafetyStateChange on action changed containing action, asset, and description', async function () {
        const tx = await executeContractCallWithSigners(
          hre.Multisig,
          hre.Diamond,
          'toggleAssetsPaused',
          [[f.Collateral.address], Action.DEPOSIT, false, 0],
          [this.deployer, this.devOne, this.extOne],
        );

        const event = await getInternalEvent<SafetyStateChangeEventObject>(tx, hre.Diamond, 'SafetyStateChange');
        expect(event.action).to.equal(Action.DEPOSIT);
        expect(event.asset).to.equal(f.Collateral.address);
        expect(event.description).to.equal('paused');
      });
    });
  });
});
