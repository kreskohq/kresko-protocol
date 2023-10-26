import type { LiquidationOccurredEvent } from '@/types/typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko'
import { expect } from '@test/chai'
import { Errors } from '@utils/errors'
import { getNamedEvent } from '@utils/events'
import { type LiquidationFixture, liquidationsFixture } from '@utils/test/fixtures'
import { depositMockCollateral } from '@utils/test/helpers/collaterals'
import { getLiqAmount, liquidate } from '@utils/test/helpers/liquidations'
import optimized from '@utils/test/helpers/optimizations'
import { fromBig, toBig } from '@utils/values'

const USD_DELTA = toBig(0.1, 9)

// -------------------------------- Set up mock assets --------------------------------

describe('Minter - Liquidations', function () {
  let f: LiquidationFixture

  this.slow(4000)
  beforeEach(async function () {
    f = await liquidationsFixture()
    await f.reset()
  })

  describe('#isAccountLiquidatable', () => {
    it('should identify accounts below their liquidation threshold', async function () {
      const [cr, minCollateralUSD, initialCanLiquidate] = await Promise.all([
        hre.Diamond.getAccountCollateralRatio(f.user1.address),
        hre.Diamond.getAccountMinCollateralAtRatio(f.user1.address, hre.Diamond.getLiquidationThresholdMinter()),
        hre.Diamond.getAccountLiquidatable(f.user1.address),
      ])
      expect(cr).to.be.equal(1.5e4)
      expect(f.initialDeposits.mul(10).gt(minCollateralUSD))
      expect(initialCanLiquidate).to.equal(false)

      f.Collateral.setPrice(7.5)
      expect(await hre.Diamond.getAccountLiquidatable(f.user1.address)).to.equal(true)
    })
  })

  describe('#maxLiquidatableValue', () => {
    it('calculates correct MLV when kFactor = 1, cFactor = 0.25', async function () {
      const MLVBeforeC1 = await hre.Diamond.getMaxLiqValue(f.user1.address, f.KrAsset.address, f.Collateral.address)
      const MLVBeforeC2 = await hre.Diamond.getMaxLiqValue(f.user1.address, f.KrAsset.address, f.Collateral2.address)
      expect(MLVBeforeC1.repayValue).to.be.closeTo(MLVBeforeC2.repayValue, USD_DELTA)
      await hre.Diamond.setAssetCFactor(f.Collateral.address, 0.25e4)

      await depositMockCollateral({
        user: f.user1,
        amount: f.initialDeposits.div(2),
        asset: f.Collateral2,
      })

      const expectedCR = 1.125e4

      const [crAfter, isLiquidatableAfter, MLVAfterC1, MLVAfterC2] = await Promise.all([
        hre.Diamond.getAccountCollateralRatio(f.user1.address),
        hre.Diamond.getAccountLiquidatable(f.user1.address),
        hre.Diamond.getMaxLiqValue(f.user1.address, f.KrAsset.address, f.Collateral.address),
        hre.Diamond.getMaxLiqValue(f.user1.address, f.KrAsset.address, f.Collateral2.address),
      ])
      expect(isLiquidatableAfter).to.be.true
      expect(crAfter).to.be.closeTo(expectedCR, 1)

      expect(MLVAfterC1.repayValue).to.gt(MLVBeforeC1.repayValue)
      expect(MLVAfterC2.repayValue).to.gt(MLVBeforeC2.repayValue)

      expect(MLVAfterC2.repayValue.gt(MLVAfterC1.repayValue)).to.be.true
    })

    it('calculates correct MLV with multiple cdps', async function () {
      await depositMockCollateral({
        user: f.user1,
        amount: toBig(0.1, 8),
        asset: f.Collateral8Dec,
      })

      f.Collateral.setPrice(7.5)
      expect(await hre.Diamond.getAccountLiquidatable(f.user1.address)).to.be.true

      const [maxLiq, maxLiq8Dec] = await Promise.all([
        hre.Diamond.getMaxLiqValue(f.user1.address, f.KrAsset.address, f.Collateral.address),
        hre.Diamond.getMaxLiqValue(f.user1.address, f.KrAsset.address, f.Collateral8Dec.address),
      ])
      expect(maxLiq.repayValue).gt(0)
      expect(maxLiq8Dec.repayValue).gt(0)
      expect(maxLiq.repayValue).gt(maxLiq8Dec.repayValue)
    })
  })

  describe('#liquidation', () => {
    describe('#liquidate', () => {
      beforeEach(async function () {
        f.Collateral.setPrice(7.5)
      })

      it('should allow unhealthy accounts to be liquidated', async function () {
        // Fetch pre-liquidation state for users and contracts
        const beforeUserOneCollateralAmount = await optimized.getAccountCollateralAmount(f.user1.address, f.Collateral)
        const userOneDebtBefore = await optimized.getAccountDebtAmount(f.user1.address, f.KrAsset)
        const liquidatorBalanceBefore = await f.Collateral.balanceOf(f.liquidator.address)
        const liquidatorBalanceKrBefore = await f.KrAsset.balanceOf(f.liquidator.address)
        const kreskoBalanceBefore = await f.Collateral.balanceOf(hre.Diamond.address)

        // Liquidate userOne
        const maxRepayAmount = f.userOneMaxLiqPrecalc.wadDiv(toBig(11, 8))
        await f.Liquidator.liquidate({
          account: f.user1.address,
          repayAssetAddr: f.KrAsset.address,
          repayAmount: maxRepayAmount,
          seizeAssetAddr: f.Collateral.address,
          repayAssetIndex: optimized.getAccountMintIndex(f.user1.address, f.KrAsset.address),
          seizeAssetIndex: optimized.getAccountDepositIndex(f.user1.address, f.Collateral.address),
        })

        // Confirm that the liquidated user's debt amount has decreased by the repaid amount
        const userOneDebtAfterLiquidation = await optimized.getAccountDebtAmount(f.user1.address, f.KrAsset)
        expect(userOneDebtAfterLiquidation.eq(userOneDebtBefore.sub(maxRepayAmount)))

        // Confirm that some of the liquidated user's collateral has been seized
        const userOneCollateralAfterLiquidation = await optimized.getAccountCollateralAmount(
          f.user1.address,
          f.Collateral,
        )
        expect(userOneCollateralAfterLiquidation.lt(beforeUserOneCollateralAmount))

        // Confirm that userTwo's kresko asset balance has decreased by the repaid amount
        expect(await f.KrAsset.balanceOf(f.liquidator.address)).eq(liquidatorBalanceKrBefore.sub(maxRepayAmount))
        // Confirm that userTwo has received some collateral from the contract
        expect(await f.Collateral.balanceOf(f.liquidator.address)).gt(liquidatorBalanceBefore)
        // Confirm that Kresko contract's collateral balance has decreased.
        expect(await f.Collateral.balanceOf(hre.Diamond.address)).lt(kreskoBalanceBefore)
      })

      it('should liquidate up to MLR with a single CDP', async function () {
        await hre.Diamond.setAssetCFactor(f.Collateral.address, 0.99e4)
        await hre.Diamond.setAssetKFactor(f.KrAsset.address, 1.02e4)

        const maxLiq = await hre.Diamond.getMaxLiqValue(f.user1.address, f.KrAsset.address, f.Collateral.address)

        await f.Liquidator.liquidate({
          account: f.user1.address,
          repayAssetAddr: f.KrAsset.address,
          repayAmount: maxLiq.repayAmount.add(toBig(1222, 27)),
          seizeAssetAddr: f.Collateral.address,
          repayAssetIndex: maxLiq.repayAssetIndex,
          seizeAssetIndex: maxLiq.seizeAssetIndex,
        })

        expect(await hre.Diamond.getAccountCollateralRatio(f.user1.address)).to.be.eq(
          await optimized.getMaxLiquidationRatioMinter(),
        )

        expect(await hre.Diamond.getAccountLiquidatable(f.user1.address)).to.be.false
      })

      it('should liquidate up to MLR with multiple CDPs', async function () {
        await depositMockCollateral({
          user: f.user1,
          amount: toBig(10, 8),
          asset: f.Collateral8Dec,
        })

        f.Collateral.setPrice(5.5)
        f.Collateral8Dec.setPrice(6)

        await hre.Diamond.setAssetCFactor(f.Collateral.address, 0.9754e4)
        await hre.Diamond.setAssetKFactor(f.KrAsset.address, 1.05e4)

        await liquidate(f.user1, f.KrAsset, f.Collateral8Dec)

        const [crAfter, isLiquidatableAfter] = await Promise.all([
          hre.Diamond.getAccountCollateralRatio(f.user1.address),
          hre.Diamond.getAccountLiquidatable(f.user1.address),
        ])

        expect(isLiquidatableAfter).to.be.false
        expect(crAfter).to.be.eq(await optimized.getMaxLiquidationRatioMinter())
      })

      it('should emit LiquidationOccurred event', async function () {
        const repayAmount = f.userOneMaxLiqPrecalc.wadDiv(toBig(11))

        const tx = await f.Liquidator.liquidate({
          account: f.user1.address,
          repayAssetAddr: f.KrAsset.address,
          repayAmount: repayAmount,
          seizeAssetAddr: f.Collateral.address,
          repayAssetIndex: optimized.getAccountMintIndex(f.user1.address, f.KrAsset.address),
          seizeAssetIndex: optimized.getAccountDepositIndex(f.user1.address, f.Collateral.address),
        })

        const event = await getNamedEvent<LiquidationOccurredEvent>(tx, 'LiquidationOccurred')

        expect(event.args.account).to.equal(f.user1.address)
        expect(event.args.liquidator).to.equal(f.liquidator.address)
        expect(event.args.repayKreskoAsset).to.equal(f.KrAsset.address)
        expect(event.args.repayAmount).to.equal(repayAmount)
        expect(event.args.seizedCollateralAsset).to.equal(f.Collateral.address)
      })

      it('should not allow liquidations of healthy accounts', async function () {
        f.Collateral.setPrice(10)
        const repayAmount = 10
        const mintedKreskoAssetIndex = 0
        const depositedCollateralAssetIndex = 0
        await expect(
          f.Liquidator.liquidate({
            account: f.user1.address,
            repayAssetAddr: f.KrAsset.address,
            repayAmount: repayAmount,
            seizeAssetAddr: f.Collateral.address,
            repayAssetIndex: mintedKreskoAssetIndex,
            seizeAssetIndex: depositedCollateralAssetIndex,
          }),
        )
          .to.be.revertedWithCustomError(Errors(hre), 'CANNOT_LIQUIDATE_HEALTHY_ACCOUNT')
          .withArgs(f.user1.address, 16500000000, 15400000000, await hre.Diamond.getLiquidationThresholdMinter())
      })

      it('should not allow liquidations if repayment amount is 0', async function () {
        // Liquidation should fail
        const repayAmount = 0
        await expect(
          f.LiquidatorTwo.liquidate({
            account: f.user1.address,
            repayAssetAddr: f.KrAsset.address,
            repayAmount: repayAmount,
            seizeAssetAddr: f.Collateral.address,
            repayAssetIndex: 0,
            seizeAssetIndex: 0,
          }),
        )
          .to.be.revertedWithCustomError(Errors(hre), 'LIQUIDATION_VALUE_IS_ZERO')
          .withArgs(f.KrAsset.errorId, f.Collateral.errorId)
      })

      it('should clamp liquidations if repay value/amount exceeds debt', async function () {
        // Get user's debt for this kresko asset
        const krAssetDebtUserOne = await optimized.getAccountDebtAmount(f.user1.address, f.KrAsset)

        // Ensure we are repaying more than debt
        const repayAmount = krAssetDebtUserOne.add(toBig(10))

        await f.KrAsset.setBalance(f.liquidatorTwo, repayAmount, hre.Diamond.address)

        // Liquidation should fail
        const liquidatorBalanceBefore = await f.KrAsset.balanceOf(f.liquidatorTwo.address)
        const maxLiq = await hre.Diamond.getMaxLiqValue(f.user1.address, f.KrAsset.address, f.Collateral.address)
        expect(maxLiq.repayAmount).to.be.lt(repayAmount)

        const tx = await f.LiquidatorTwo.liquidate({
          account: f.user1.address,
          repayAssetAddr: f.KrAsset.address,
          repayAmount,
          seizeAssetAddr: f.Collateral.address,
          repayAssetIndex: 0,
          seizeAssetIndex: 0,
        })
        const event = await getNamedEvent<LiquidationOccurredEvent>(tx, 'LiquidationOccurred')
        const liquidatorBalanceAfter = await f.KrAsset.balanceOf(f.liquidatorTwo.address)
        expect(event.args.account).to.equal(f.user1.address)
        expect(event.args.liquidator).to.equal(f.liquidatorTwo.address)
        expect(event.args.repayKreskoAsset).to.equal(f.KrAsset.address)
        expect(event.args.seizedCollateralAsset).to.equal(f.Collateral.address)

        expect(event.args.repayAmount).to.not.equal(repayAmount)
        expect(event.args.repayAmount).to.equal(maxLiq.repayAmount)
        expect(event.args.collateralSent).to.be.equal(maxLiq.seizeAmount)

        expect(liquidatorBalanceAfter.add(repayAmount)).to.not.equal(liquidatorBalanceBefore)
        expect(liquidatorBalanceAfter.add(maxLiq.repayAmount)).to.equal(liquidatorBalanceBefore)
        expect(await hre.Diamond.getAccountCollateralRatio(f.user1.address)).to.be.eq(
          await hre.Diamond.getMaxLiquidationRatioMinter(),
        )
      })

      it('should not allow liquidations when account is under MCR but not under liquidation threshold', async function () {
        f.Collateral.setPrice(f.Collateral.config!.args.price!)

        expect(await hre.Diamond.getAccountLiquidatable(f.user1.address)).to.be.false

        const minCollateralUSD = await hre.Diamond.getAccountMinCollateralAtRatio(
          f.user1.address,
          optimized.getMinCollateralRatioMinter(),
        )
        const liquidationThresholdUSD = await hre.Diamond.getAccountMinCollateralAtRatio(
          f.user1.address,
          optimized.getLiquidationThresholdMinter(),
        )
        f.Collateral.setPrice(9.9)

        const accountCollateralValue = await hre.Diamond.getAccountTotalCollateralValue(f.user1.address)

        expect(accountCollateralValue.lt(minCollateralUSD)).to.be.true
        expect(accountCollateralValue.gt(liquidationThresholdUSD)).to.be.true
        expect(await hre.Diamond.getAccountLiquidatable(f.user1.address)).to.be.false
      })

      it('should allow liquidations without f.liquidator token approval for Kresko Assets', async function () {
        // Check that f.liquidator's token approval to Kresko.sol contract is 0
        expect(await f.KrAsset.contract.allowance(f.liquidatorTwo.address, hre.Diamond.address)).to.equal(0)
        const repayAmount = toBig(0.5)
        await f.KrAsset.setBalance(f.liquidatorTwo, repayAmount)
        await f.LiquidatorTwo.liquidate({
          account: f.user1.address,
          repayAssetAddr: f.KrAsset.address,
          repayAmount: repayAmount,
          seizeAssetAddr: f.Collateral.address,
          repayAssetIndex: 0,
          seizeAssetIndex: 0,
        })

        // Confirm that f.liquidator's token approval is still 0
        expect(await f.KrAsset.contract.allowance(f.user2.address, hre.Diamond.address)).to.equal(0)
      })

      it("should not change f.liquidator's existing token approvals during a successful liquidation", async function () {
        const repayAmount = toBig(0.5)
        await f.KrAsset.setBalance(f.liquidatorTwo, repayAmount)
        await f.KrAsset.contract.setVariable('_allowances', {
          [f.liquidatorTwo.address]: { [hre.Diamond.address]: repayAmount },
        })

        await expect(
          f.LiquidatorTwo.liquidate({
            account: f.user1.address,
            repayAssetAddr: f.KrAsset.address,
            repayAmount: repayAmount,
            seizeAssetAddr: f.Collateral.address,
            repayAssetIndex: 0,
            seizeAssetIndex: 0,
          }),
        ).not.to.be.reverted

        // Confirm that f.liquidator's token approval is unchanged
        expect(await f.KrAsset.contract.allowance(f.liquidatorTwo.address, hre.Diamond.address)).to.equal(repayAmount)
      })

      it('should not allow borrowers to liquidate themselves', async function () {
        // Liquidation should fail
        const repayAmount = 5
        await expect(
          f.User.liquidate({
            account: f.user1.address,
            repayAssetAddr: f.KrAsset.address,
            repayAmount: repayAmount,
            seizeAssetAddr: f.Collateral.address,
            repayAssetIndex: 0,
            seizeAssetIndex: 0,
          }),
        ).to.be.revertedWithCustomError(Errors(hre), 'CANNOT_LIQUIDATE_SELF')
      })
      it.skip('should error on seize underflow', async function () {
        f.Collateral.setPrice(8)

        const liqAmount = await getLiqAmount(f.user1, f.KrAsset, f.Collateral)
        // const allowSeizeUnderflow = false;

        await expect(
          f.Liquidator.liquidate({
            account: f.user1.address,
            repayAssetAddr: f.KrAsset.address,
            repayAmount: liqAmount,
            seizeAssetAddr: f.Collateral.address,
            repayAssetIndex: optimized.getAccountMintIndex(f.user1.address, f.KrAsset.address),
            seizeAssetIndex: optimized.getAccountDepositIndex(f.user1.address, f.Collateral.address),
          }),
        ).to.be.revertedWithCustomError(Errors(hre), 'LIQUIDATION_SEIZED_LESS_THAN_EXPECTED')
      })
    })
    describe('#liquidate - rebasing events', () => {
      beforeEach(async function () {
        await f.resetRebasing()
      })

      it('should setup correct', async function () {
        const [mcr, cr, cr2, liquidatable] = await Promise.all([
          optimized.getMinCollateralRatioMinter(),
          hre.Diamond.getAccountCollateralRatio(f.user3.address),
          hre.Diamond.getAccountCollateralRatio(f.user4.address),
          hre.Diamond.getAccountLiquidatable(f.user3.address),
        ])
        expect(cr).to.closeTo(mcr, 8)
        expect(cr2).to.closeTo(mcr, 1)
        expect(liquidatable).to.be.false
      })

      it('should not allow liquidation of healthy accounts after a positive rebase', async function () {
        // Rebase params
        const denominator = 4
        const positive = true
        const rebasePrice = 1 / denominator

        f.KrAsset.setPrice(rebasePrice)
        await f.KrAsset.contract.rebase(toBig(denominator), positive, [])
        await expect(
          f.Liquidator.liquidate({
            account: f.user4.address,
            repayAssetAddr: f.KrAsset.address,
            repayAmount: 100,
            seizeAssetAddr: f.Collateral.address,
            repayAssetIndex: optimized.getAccountMintIndex(f.user4.address, f.KrAsset.address),
            seizeAssetIndex: optimized.getAccountDepositIndex(f.user4.address, f.Collateral.address),
          }),
        )
          .to.be.revertedWithCustomError(Errors(hre), 'CANNOT_LIQUIDATE_HEALTHY_ACCOUNT')
          .withArgs(f.user4.address, 1000000000000, 933333332400, await hre.Diamond.getLiquidationThresholdMinter())
      })

      it('should not allow liquidation of healthy accounts after a negative rebase', async function () {
        const denominator = 4
        const positive = false
        const rebasePrice = 1 * denominator

        f.KrAsset.setPrice(rebasePrice)
        await f.KrAsset.contract.rebase(toBig(denominator), positive, [])

        await expect(
          f.Liquidator.liquidate({
            account: f.user4.address,
            repayAssetAddr: f.KrAsset.address,
            repayAmount: 100,
            seizeAssetAddr: f.Collateral.address,
            repayAssetIndex: optimized.getAccountMintIndex(f.user4.address, f.KrAsset.address),
            seizeAssetIndex: optimized.getAccountDepositIndex(f.user4.address, f.Collateral.address),
          }),
        )
          .to.be.revertedWithCustomError(Errors(hre), 'CANNOT_LIQUIDATE_HEALTHY_ACCOUNT')
          .withArgs(f.user4.address, 1000000000000, 933333332400, await hre.Diamond.getLiquidationThresholdMinter())
      })
      it('should allow liquidations of unhealthy accounts after a positive rebase', async function () {
        const denominator = 4
        const positive = true
        const rebasePrice = 1 / denominator

        f.KrAsset.setPrice(rebasePrice)
        await f.KrAsset.contract.rebase(toBig(denominator), positive, [])

        expect(await hre.Diamond.getAccountLiquidatable(f.user4.address)).to.be.false

        f.Collateral.setPrice(7.5)

        expect(await hre.Diamond.getAccountLiquidatable(f.user4.address)).to.be.true
        await liquidate(f.user4, f.KrAsset, f.Collateral, true)
        await expect(liquidate(f.user4, f.KrAsset, f.Collateral, true)).to.not.be.reverted
      })
      it('should allow liquidations of unhealthy accounts after a negative rebase', async function () {
        const denominator = 4
        const positive = false
        const rebasePrice = 1 * denominator

        f.KrAsset.setPrice(rebasePrice)
        await f.KrAsset.contract.rebase(toBig(denominator), positive, [])

        expect(await hre.Diamond.getAccountLiquidatable(f.user4.address)).to.be.false
        f.KrAsset.setPrice(rebasePrice + 1)
        expect(await hre.Diamond.getAccountLiquidatable(f.user4.address)).to.be.true
        await expect(liquidate(f.user4, f.KrAsset, f.Collateral, true)).to.not.be.reverted
      })
      it('should liquidate krAsset collaterals up to min amount', async function () {
        f.KrAssetCollateral.setPrice(100)
        await hre.Diamond.setAssetCFactor(f.KrAssetCollateral.address, 0.99e4)
        await hre.Diamond.setAssetKFactor(f.KrAssetCollateral.address, 1e4)

        const maxLiq = await hre.Diamond.getMaxLiqValue(
          f.user3.address,
          f.KrAssetCollateral.address,
          f.KrAssetCollateral.address,
        )

        await f.KrAssetCollateral.setBalance(f.liquidator, maxLiq.repayAmount, hre.Diamond.address)
        await f.Liquidator.liquidate({
          account: f.user3.address,
          repayAssetAddr: f.KrAssetCollateral.address,
          repayAmount: maxLiq.repayAmount.sub(1e9),
          seizeAssetAddr: f.KrAssetCollateral.address,
          repayAssetIndex: maxLiq.repayAssetIndex,
          seizeAssetIndex: maxLiq.seizeAssetIndex,
        })

        const depositsAfter = await hre.Diamond.getAccountCollateralAmount(f.user3.address, f.KrAssetCollateral.address)

        expect(depositsAfter).to.equal((1e12).toString())
      })
      it('should liquidate to 0', async function () {
        f.KrAssetCollateral.setPrice(100)
        await hre.Diamond.setAssetCFactor(f.KrAssetCollateral.address, 1e4)
        await hre.Diamond.setAssetKFactor(f.KrAssetCollateral.address, 1e4)

        const maxLiq = await hre.Diamond.getMaxLiqValue(
          f.user3.address,
          f.KrAssetCollateral.address,
          f.KrAssetCollateral.address,
        )

        const liquidationAmount = maxLiq.repayAmount.add(toBig(20, 27))

        await f.KrAssetCollateral.setBalance(hre.users.liquidator, liquidationAmount, hre.Diamond.address)
        await f.Liquidator.liquidate({
          account: f.user3.address,
          repayAssetAddr: f.KrAssetCollateral.address,
          repayAmount: liquidationAmount,
          seizeAssetAddr: f.KrAssetCollateral.address,
          repayAssetIndex: maxLiq.repayAssetIndex,
          seizeAssetIndex: maxLiq.seizeAssetIndex,
        })

        const depositsAfter = await hre.Diamond.getAccountCollateralAmount(f.user3.address, f.KrAssetCollateral.address)

        expect(depositsAfter).to.equal(0)
      })

      it('should liquidate correct amount of krAssets after a positive rebase', async function () {
        const newPrice = 1.2
        f.KrAsset.setPrice(newPrice)

        const results = {
          collateralSeized: 0,
          debtRepaid: 0,
          userOneValueAfter: 0,
          userOneHFAfter: 0,
          collateralSeizedRebase: 0,
          debtRepaidRebase: 0,
          userTwoValueAfter: 0,
          userTwoHFAfter: 0,
        }
        // Get values for a liquidation that happens before rebase
        while (await hre.Diamond.getAccountLiquidatable(f.user4.address)) {
          const values = await liquidate(f.user4, f.KrAsset, f.Collateral)
          results.collateralSeized += values.collateralSeized
          results.debtRepaid += values.debtRepaid
        }
        results.userOneValueAfter = fromBig(await hre.Diamond.getAccountTotalCollateralValue(f.user4.address), 8)

        results.userOneHFAfter = (await hre.Diamond.getAccountCollateralRatio(f.user4.address)).toNumber()

        // Rebase params
        const denominator = 4
        const positive = true
        const rebasePrice = newPrice / denominator

        // Rebase
        f.KrAsset.setPrice(rebasePrice)
        await f.KrAsset.contract.rebase(toBig(denominator), positive, [])

        expect(await hre.Diamond.getAccountLiquidatable(f.user5.address)).to.be.true
        // Get values for a liquidation that happens after a rebase
        while (await hre.Diamond.getAccountLiquidatable(f.user5.address)) {
          const values = await liquidate(f.user5, f.KrAsset, f.Collateral)
          results.collateralSeizedRebase += values.collateralSeized
          results.debtRepaidRebase += values.debtRepaid
        }

        results.userTwoValueAfter = fromBig(await hre.Diamond.getAccountTotalCollateralValue(f.user5.address), 8)
        results.userTwoHFAfter = (await hre.Diamond.getAccountCollateralRatio(f.user5.address)).toNumber()

        expect(results.userTwoHFAfter).to.equal(results.userOneHFAfter)
        expect(results.collateralSeized).to.equal(results.collateralSeizedRebase)
        expect(results.debtRepaid * denominator).to.equal(results.debtRepaidRebase)
        expect(results.userOneValueAfter).to.equal(results.userTwoValueAfter)
      })
      it('should liquidate correct amount of assets after a negative rebase', async function () {
        const newPrice = 1.2
        f.KrAsset.setPrice(newPrice)

        const results = {
          collateralSeized: 0,
          debtRepaid: 0,
          userOneValueAfter: 0,
          userOneHFAfter: 0,
          collateralSeizedRebase: 0,
          debtRepaidRebase: 0,
          userTwoValueAfter: 0,
          userTwoHFAfter: 0,
        }

        // Get values for a liquidation that happens before rebase
        while (await hre.Diamond.getAccountLiquidatable(f.user4.address)) {
          const values = await liquidate(f.user4, f.KrAsset, f.Collateral)
          results.collateralSeized += values.collateralSeized
          results.debtRepaid += values.debtRepaid
        }
        results.userOneValueAfter = fromBig(await hre.Diamond.getAccountTotalCollateralValue(f.user4.address), 8)

        results.userOneHFAfter = (await hre.Diamond.getAccountCollateralRatio(f.user4.address)).toNumber()

        // Rebase params
        const denominator = 4
        const positive = false
        const rebasePrice = newPrice * denominator

        // Rebase
        f.KrAsset.setPrice(rebasePrice)
        await f.KrAsset.contract.rebase(toBig(denominator), positive, [])

        expect(await hre.Diamond.getAccountLiquidatable(f.user5.address)).to.be.true

        // Get values for a liquidation that happens after a rebase
        while (await hre.Diamond.getAccountLiquidatable(f.user5.address)) {
          const values = await liquidate(f.user5, f.KrAsset, f.Collateral)
          results.collateralSeizedRebase += values.collateralSeized
          results.debtRepaidRebase += values.debtRepaid
        }
        results.userTwoValueAfter = fromBig(await hre.Diamond.getAccountTotalCollateralValue(f.user5.address), 8)
        results.userTwoHFAfter = (await hre.Diamond.getAccountCollateralRatio(f.user5.address)).toNumber()
        expect(results.userTwoHFAfter).to.equal(results.userOneHFAfter)
        expect(results.collateralSeized).to.equal(results.collateralSeizedRebase)
        expect(results.debtRepaid / denominator).to.equal(results.debtRepaidRebase)
        expect(results.userOneValueAfter).to.equal(results.userTwoValueAfter)
      })
    })
  })
})
