import { expect } from "@test/chai";
import { CError } from "@utils/errors";
import { getNamedEvent } from "@utils/events";
import { LiquidationFixture, liquidationsFixture } from "@utils/test/fixtures";
import { depositMockCollateral } from "@utils/test/helpers/collaterals";
import { getLiqAmount, liquidate } from "@utils/test/helpers/liquidations";
import optimized from "@utils/test/helpers/optimizations";
import { fromBig, toBig } from "@utils/values";
import { Kresko, LiquidationOccurredEvent } from "types/typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko";

const USD_DELTA = toBig(0.1, 9);

// -------------------------------- Set up mock assets --------------------------------

describe("Minter - Liquidations", function () {
  let Liquidator: Kresko;
  let LiquidatorTwo: Kresko;
  let User: Kresko;
  let liquidator: SignerWithAddress;
  let liquidatorTwo: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;
  let user4: SignerWithAddress;
  let user5: SignerWithAddress;

  let f: LiquidationFixture;

  this.slow(4000);
  beforeEach(async function () {
    f = await liquidationsFixture();
    [[user1, User], [user2], [user3], [user4], [user5], [liquidator, Liquidator], [liquidatorTwo, LiquidatorTwo]] =
      f.users;

    await f.reset();
  });

  describe("#isAccountLiquidatable", () => {
    it("should identify accounts below their liquidation threshold", async function () {
      const [cr, minCollateralUSD, initialCanLiquidate] = await Promise.all([
        hre.Diamond.getAccountCollateralRatio(user1.address),
        hre.Diamond.getAccountMinCollateralAtRatio(user1.address, hre.Diamond.getLiquidationThreshold()),
        hre.Diamond.getAccountLiquidatable(user1.address),
      ]);
      expect(cr).to.be.equal(1.5e4);
      expect(f.initialDeposits.mul(10).gt(minCollateralUSD));
      expect(initialCanLiquidate).to.equal(false);

      f.Collateral.setPrice(7.5);
      expect(await hre.Diamond.getAccountLiquidatable(user1.address)).to.equal(true);
    });
  });

  describe("#maxLiquidatableValue", () => {
    it("calculates correct MLV when kFactor = 1, cFactor = 0.25", async function () {
      const MLVBeforeC1 = await hre.Diamond.getMaxLiqValue(user1.address, f.KrAsset.address, f.Collateral.address);
      const MLVBeforeC2 = await hre.Diamond.getMaxLiqValue(user1.address, f.KrAsset.address, f.Collateral2.address);
      expect(MLVBeforeC1.repayValue).to.be.closeTo(MLVBeforeC2.repayValue, USD_DELTA);
      await hre.Diamond.updateCollateralFactor(f.Collateral.address, 0.25e4);

      await depositMockCollateral({
        user: user1,
        amount: f.initialDeposits.div(2),
        asset: f.Collateral2,
      });

      const expectedCR = 1.125e4;

      const [crAfter, isLiquidatableAfter, MLVAfterC1, MLVAfterC2] = await Promise.all([
        hre.Diamond.getAccountCollateralRatio(user1.address),
        hre.Diamond.getAccountLiquidatable(user1.address),
        hre.Diamond.getMaxLiqValue(user1.address, f.KrAsset.address, f.Collateral.address),
        hre.Diamond.getMaxLiqValue(user1.address, f.KrAsset.address, f.Collateral2.address),
      ]);
      expect(isLiquidatableAfter).to.be.true;
      expect(crAfter).to.be.closeTo(expectedCR, 1);

      expect(MLVAfterC1.repayValue).to.gt(MLVBeforeC1.repayValue);
      expect(MLVAfterC2.repayValue).to.gt(MLVBeforeC2.repayValue);

      expect(MLVAfterC2.repayValue.gt(MLVAfterC1.repayValue)).to.be.true;
    });

    it("calculates correct MLV with multiple cdps", async function () {
      await depositMockCollateral({
        user: user1,
        amount: toBig(0.1, 8),
        asset: f.Collateral8Dec,
      });

      f.Collateral.setPrice(7.5);
      expect(await hre.Diamond.getAccountLiquidatable(user1.address)).to.be.true;

      const [maxLiq, maxLiq8Dec] = await Promise.all([
        hre.Diamond.getMaxLiqValue(user1.address, f.KrAsset.address, f.Collateral.address),
        hre.Diamond.getMaxLiqValue(user1.address, f.KrAsset.address, f.Collateral8Dec.address),
      ]);
      expect(maxLiq.repayValue).gt(0);
      expect(maxLiq8Dec.repayValue).gt(0);
      expect(maxLiq.repayValue).gt(maxLiq8Dec.repayValue);
    });
  });

  describe("#liquidation", () => {
    describe("#liquidate", () => {
      beforeEach(async function () {
        f.Collateral.setPrice(7.5);
      });

      it("should allow unhealthy accounts to be liquidated", async function () {
        // Fetch pre-liquidation state for users and contracts
        const beforeUserOneCollateralAmount = await optimized.getAccountCollateralAmount(user1.address, f.Collateral);
        const userOneDebtBefore = await optimized.getAccountDebtAmount(user1.address, f.KrAsset);
        const liquidatorBalanceBefore = await f.Collateral.balanceOf(liquidator.address);
        const liquidatorBalanceKrBefore = await f.KrAsset.balanceOf(liquidator.address);
        const kreskoBalanceBefore = await f.Collateral.balanceOf(hre.Diamond.address);

        // Liquidate userOne
        const maxRepayAmount = f.userOneMaxLiqPrecalc.wadDiv(toBig(11, 8));
        await Liquidator.liquidate(
          user1.address,
          f.KrAsset.address,
          maxRepayAmount,
          f.Collateral.address,
          optimized.getAccountMintIndex(user1.address, f.KrAsset.address),
          optimized.getAccountDepositIndex(user1.address, f.Collateral.address),
        );

        // Confirm that the liquidated user's debt amount has decreased by the repaid amount
        const userOneDebtAfterLiquidation = await optimized.getAccountDebtAmount(user1.address, f.KrAsset);
        expect(userOneDebtAfterLiquidation.eq(userOneDebtBefore.sub(maxRepayAmount)));

        // Confirm that some of the liquidated user's collateral has been seized
        const userOneCollateralAfterLiquidation = await optimized.getAccountCollateralAmount(
          user1.address,
          f.Collateral,
        );
        expect(userOneCollateralAfterLiquidation.lt(beforeUserOneCollateralAmount));

        // Confirm that userTwo's kresko asset balance has decreased by the repaid amount
        expect(await f.KrAsset.balanceOf(liquidator.address)).eq(liquidatorBalanceKrBefore.sub(maxRepayAmount));
        // Confirm that userTwo has received some collateral from the contract
        expect(await f.Collateral.balanceOf(liquidator.address)).gt(liquidatorBalanceBefore);
        // Confirm that Kresko contract's collateral balance has decreased.
        expect(await f.Collateral.balanceOf(hre.Diamond.address)).lt(kreskoBalanceBefore);
      });

      it("should liquidate up to MLR with a single CDP", async function () {
        await hre.Diamond.updateCollateralFactor(f.Collateral.address, 0.99e4);
        await hre.Diamond.updateKFactor(f.KrAsset.address, 1.02e4);

        const maxLiq = await hre.Diamond.getMaxLiqValue(user1.address, f.KrAsset.address, f.Collateral.address);

        await Liquidator.liquidate(
          user1.address,
          f.KrAsset.address,
          maxLiq.repayAmount.add(toBig(1222, 27)),
          f.Collateral.address,
          maxLiq.repayAssetIndex,
          maxLiq.seizeAssetIndex,
        );

        expect(await hre.Diamond.getAccountCollateralRatio(user1.address)).to.be.eq(
          await optimized.getMaxLiquidationRatio(),
        );

        expect(await hre.Diamond.getAccountLiquidatable(user1.address)).to.be.false;
      });

      it("should liquidate up to MLR with multiple CDPs", async function () {
        await depositMockCollateral({
          user: user1,
          amount: toBig(10, 8),
          asset: f.Collateral8Dec,
        });

        f.Collateral.setPrice(5.5);
        f.Collateral8Dec.setPrice(6);

        await hre.Diamond.updateCollateralFactor(f.Collateral.address, 0.9754e4);
        await hre.Diamond.updateKFactor(f.KrAsset.address, 1.05e4);

        await liquidate(user1, f.KrAsset, f.Collateral8Dec);

        const [crAfter, isLiquidatableAfter] = await Promise.all([
          hre.Diamond.getAccountCollateralRatio(user1.address),
          hre.Diamond.getAccountLiquidatable(user1.address),
        ]);

        expect(isLiquidatableAfter).to.be.false;
        expect(crAfter).to.be.eq(await optimized.getMaxLiquidationRatio());
      });

      it("should emit LiquidationOccurred event", async function () {
        const repayAmount = f.userOneMaxLiqPrecalc.wadDiv(toBig(11));

        const tx = await Liquidator.liquidate(
          user1.address,
          f.KrAsset.address,
          repayAmount,
          f.Collateral.address,
          optimized.getAccountMintIndex(user1.address, f.KrAsset.address),
          optimized.getAccountDepositIndex(user1.address, f.Collateral.address),
        );

        const event = await getNamedEvent<LiquidationOccurredEvent>(tx, "LiquidationOccurred");

        expect(event.args.account).to.equal(user1.address);
        expect(event.args.liquidator).to.equal(liquidator.address);
        expect(event.args.repayKreskoAsset).to.equal(f.KrAsset.address);
        expect(event.args.repayAmount).to.equal(repayAmount);
        expect(event.args.seizedCollateralAsset).to.equal(f.Collateral.address);
      });

      it("should not allow liquidations of healthy accounts", async function () {
        f.Collateral.setPrice(10);
        const repayAmount = 10;
        const mintedKreskoAssetIndex = 0;
        const depositedCollateralAssetIndex = 0;
        await expect(
          Liquidator.liquidate(
            user1.address,
            f.KrAsset.address,
            repayAmount,
            f.Collateral.address,
            mintedKreskoAssetIndex,
            depositedCollateralAssetIndex,
          ),
        )
          .to.be.revertedWithCustomError(CError(hre), "CANNOT_LIQUIDATE")
          .withArgs(16500000000, 15400000000);
      });

      it("should not allow liquidations if repayment amount is 0", async function () {
        // Liquidation should fail
        const repayAmount = 0;
        await expect(LiquidatorTwo.liquidate(user1.address, f.KrAsset.address, repayAmount, f.Collateral.address, 0, 0))
          .to.be.revertedWithCustomError(CError(hre), "ZERO_REPAY")
          .withArgs(f.KrAsset.address);
      });

      it("should clamp liquidations if repay value/amount exceeds debt", async function () {
        // Get user's debt for this kresko asset
        const krAssetDebtUserOne = await optimized.getAccountDebtAmount(user1.address, f.KrAsset);

        // Ensure we are repaying more than debt
        const repayAmount = krAssetDebtUserOne.add(toBig(10));

        await f.KrAsset.setBalance(liquidatorTwo, repayAmount, hre.Diamond.address);

        // Liquidation should fail
        const liquidatorBalanceBefore = await f.KrAsset.balanceOf(liquidatorTwo.address);
        const maxLiq = await hre.Diamond.getMaxLiqValue(user1.address, f.KrAsset.address, f.Collateral.address);
        expect(maxLiq.repayAmount).to.be.lt(repayAmount);

        const tx = await LiquidatorTwo.liquidate(
          user1.address,
          f.KrAsset.address,
          repayAmount,
          f.Collateral.address,
          0,
          0,
        );
        const event = await getNamedEvent<LiquidationOccurredEvent>(tx, "LiquidationOccurred");
        const liquidatorBalanceAfter = await f.KrAsset.balanceOf(liquidatorTwo.address);
        expect(event.args.account).to.equal(user1.address);
        expect(event.args.liquidator).to.equal(liquidatorTwo.address);
        expect(event.args.repayKreskoAsset).to.equal(f.KrAsset.address);
        expect(event.args.seizedCollateralAsset).to.equal(f.Collateral.address);

        expect(event.args.repayAmount).to.not.equal(repayAmount);
        expect(event.args.repayAmount).to.equal(maxLiq.repayAmount);
        expect(event.args.collateralSent).to.be.equal(maxLiq.seizeAmount);

        expect(liquidatorBalanceAfter.add(repayAmount)).to.not.equal(liquidatorBalanceBefore);
        expect(liquidatorBalanceAfter.add(maxLiq.repayAmount)).to.equal(liquidatorBalanceBefore);
        expect(await hre.Diamond.getAccountCollateralRatio(user1.address)).to.be.eq(
          await hre.Diamond.getMaxLiquidationRatio(),
        );
      });

      it("should not allow liquidations when account is under MCR but not under liquidation threshold", async function () {
        f.Collateral.setPrice(f.Collateral.config!.args.price!);

        expect(await hre.Diamond.getAccountLiquidatable(user1.address)).to.be.false;

        const minCollateralUSD = await hre.Diamond.getAccountMinCollateralAtRatio(
          user1.address,
          optimized.getMinCollateralRatio(),
        );
        const liquidationThresholdUSD = await hre.Diamond.getAccountMinCollateralAtRatio(
          user1.address,
          optimized.getLiquidationThreshold(),
        );
        f.Collateral.setPrice(9.9);

        const accountCollateralValue = await hre.Diamond.getAccountTotalCollateralValue(user1.address);

        expect(accountCollateralValue.lt(minCollateralUSD)).to.be.true;
        expect(accountCollateralValue.gt(liquidationThresholdUSD)).to.be.true;
        expect(await hre.Diamond.getAccountLiquidatable(user1.address)).to.be.false;
      });

      it("should allow liquidations without liquidator token approval for Kresko Assets", async function () {
        // Check that liquidator's token approval to Kresko.sol contract is 0
        expect(await f.KrAsset.contract.allowance(liquidatorTwo.address, hre.Diamond.address)).to.equal(0);
        const repayAmount = toBig(0.5);
        await f.KrAsset.setBalance(liquidatorTwo, repayAmount);
        await LiquidatorTwo.liquidate(user1.address, f.KrAsset.address, repayAmount, f.Collateral.address, 0, 0);

        // Confirm that liquidator's token approval is still 0
        expect(await f.KrAsset.contract.allowance(user2.address, hre.Diamond.address)).to.equal(0);
      });

      it("should not change liquidator's existing token approvals during a successful liquidation", async function () {
        const repayAmount = toBig(0.5);
        await f.KrAsset.setBalance(liquidatorTwo, repayAmount);
        await f.KrAsset.contract.setVariable("_allowances", {
          [liquidatorTwo.address]: { [hre.Diamond.address]: repayAmount },
        });

        await expect(LiquidatorTwo.liquidate(user1.address, f.KrAsset.address, repayAmount, f.Collateral.address, 0, 0))
          .not.to.be.reverted;

        // Confirm that liquidator's token approval is unchanged
        expect(await f.KrAsset.contract.allowance(liquidatorTwo.address, hre.Diamond.address)).to.equal(repayAmount);
      });

      it("should not allow borrowers to liquidate themselves", async function () {
        // Liquidation should fail
        const repayAmount = 5;
        await expect(
          User.liquidate(user1.address, f.KrAsset.address, repayAmount, f.Collateral.address, 0, 0),
        ).to.be.revertedWithCustomError(CError(hre), "SELF_LIQUIDATION");
      });
      it.skip("should error on seize underflow", async function () {
        f.Collateral.setPrice(8);

        const liqAmount = await getLiqAmount(user1, f.KrAsset, f.Collateral);
        // const allowSeizeUnderflow = false;
        console.debug({
          cr: await hre.Diamond.getAccountCollateralRatio(user1.address),
          userInfo: await hre.Diamond.getAccountState(user1.address),
        });

        await expect(
          Liquidator.liquidate(
            user1.address,
            f.KrAsset.address,
            liqAmount,
            f.Collateral.address,
            optimized.getAccountMintIndex(user1.address, f.KrAsset.address),
            optimized.getAccountDepositIndex(user1.address, f.Collateral.address),
          ),
        ).to.be.revertedWithCustomError(CError(hre), "SEIZE_UNDERFLOW");
      });
    });
    describe("#liquidate - rebasing events", () => {
      beforeEach(async function () {
        await f.resetRebasing();
      });

      it("should setup correct", async function () {
        const [mcr, cr, cr2, liquidatable] = await Promise.all([
          optimized.getMinCollateralRatio(),
          hre.Diamond.getAccountCollateralRatio(user3.address),
          hre.Diamond.getAccountCollateralRatio(user4.address),
          hre.Diamond.getAccountLiquidatable(user3.address),
        ]);
        expect(cr).to.closeTo(mcr, 8);
        expect(cr2).to.closeTo(mcr, 1);
        expect(liquidatable).to.be.false;
      });

      it("should not allow liquidation of healthy accounts after a positive rebase", async function () {
        // Rebase params
        const denominator = 4;
        const positive = true;
        const rebasePrice = 1 / denominator;

        f.KrAsset.setPrice(rebasePrice);
        await f.KrAsset.contract.rebase(toBig(denominator), positive, []);
        await expect(
          Liquidator.liquidate(
            user4.address,
            f.KrAsset.address,
            100,
            f.Collateral.address,
            optimized.getAccountMintIndex(user4.address, f.KrAsset.address),
            optimized.getAccountDepositIndex(user4.address, f.Collateral.address),
          ),
        )
          .to.be.revertedWithCustomError(CError(hre), "CANNOT_LIQUIDATE")
          .withArgs(1000000000000, 933333332400);
      });

      it("should not allow liquidation of healthy accounts after a negative rebase", async function () {
        const denominator = 4;
        const positive = false;
        const rebasePrice = 1 * denominator;

        f.KrAsset.setPrice(rebasePrice);
        await f.KrAsset.contract.rebase(toBig(denominator), positive, []);

        await expect(
          Liquidator.liquidate(
            user4.address,
            f.KrAsset.address,
            100,
            f.Collateral.address,
            optimized.getAccountMintIndex(user4.address, f.KrAsset.address),
            optimized.getAccountDepositIndex(user4.address, f.Collateral.address),
          ),
        )
          .to.be.revertedWithCustomError(CError(hre), "CANNOT_LIQUIDATE")
          .withArgs(1000000000000, 933333332400);
      });
      it("should allow liquidations of unhealthy accounts after a positive rebase", async function () {
        const denominator = 4;
        const positive = true;
        const rebasePrice = 1 / denominator;

        f.KrAsset.setPrice(rebasePrice);
        await f.KrAsset.contract.rebase(toBig(denominator), positive, []);

        expect(await hre.Diamond.getAccountLiquidatable(user4.address)).to.be.false;

        f.Collateral.setPrice(7.5);

        expect(await hre.Diamond.getAccountLiquidatable(user4.address)).to.be.true;
        await liquidate(user4, f.KrAsset, f.Collateral, true);
        await expect(liquidate(user4, f.KrAsset, f.Collateral, true)).to.not.be.reverted;
      });
      it("should allow liquidations of unhealthy accounts after a negative rebase", async function () {
        const denominator = 4;
        const positive = false;
        const rebasePrice = 1 * denominator;

        f.KrAsset.setPrice(rebasePrice);
        await f.KrAsset.contract.rebase(toBig(denominator), positive, []);

        expect(await hre.Diamond.getAccountLiquidatable(user4.address)).to.be.false;
        f.KrAsset.setPrice(rebasePrice + 1);
        expect(await hre.Diamond.getAccountLiquidatable(user4.address)).to.be.true;
        await expect(liquidate(user4, f.KrAsset, f.Collateral, true)).to.not.be.reverted;
      });
      it("should liquidate krAsset collaterals up to min amount", async function () {
        f.KrAssetCollateral.setPrice(100);
        await hre.Diamond.updateCollateralFactor(f.KrAssetCollateral.address, 0.99e4);
        await hre.Diamond.updateKFactor(f.KrAssetCollateral.address, 1e4);

        const maxLiq = await hre.Diamond.getMaxLiqValue(
          user3.address,
          f.KrAssetCollateral.address,
          f.KrAssetCollateral.address,
        );

        await f.KrAssetCollateral.setBalance(hre.users.liquidator, maxLiq.repayAmount, hre.Diamond.address);
        await Liquidator.liquidate(
          user3.address,
          f.KrAssetCollateral.address,
          maxLiq.repayAmount.sub(1e9),
          f.KrAssetCollateral.address,
          maxLiq.repayAssetIndex,
          maxLiq.seizeAssetIndex,
        );

        const depositsAfter = await hre.Diamond.getAccountCollateralAmount(user3.address, f.KrAssetCollateral.address);

        expect(depositsAfter).to.equal((1e12).toString());
      });
      it("should liquidate to 0", async function () {
        f.KrAssetCollateral.setPrice(100);
        await hre.Diamond.updateCollateralFactor(f.KrAssetCollateral.address, 1e4);
        await hre.Diamond.updateKFactor(f.KrAssetCollateral.address, 1e4);

        const maxLiq = await hre.Diamond.getMaxLiqValue(
          user3.address,
          f.KrAssetCollateral.address,
          f.KrAssetCollateral.address,
        );

        const liquidationAmount = maxLiq.repayAmount.add(toBig(20, 27));

        await f.KrAssetCollateral.setBalance(hre.users.liquidator, liquidationAmount, hre.Diamond.address);
        await Liquidator.liquidate(
          user3.address,
          f.KrAssetCollateral.address,
          liquidationAmount,
          f.KrAssetCollateral.address,
          maxLiq.repayAssetIndex,
          maxLiq.seizeAssetIndex,
        );

        const depositsAfter = await hre.Diamond.getAccountCollateralAmount(user3.address, f.KrAssetCollateral.address);

        expect(depositsAfter).to.equal(0);
      });

      it("should liquidate correct amount of krAssets after a positive rebase", async function () {
        const newPrice = 1.2;
        f.KrAsset.setPrice(newPrice);

        const results = {
          collateralSeized: 0,
          debtRepaid: 0,
          userOneValueAfter: 0,
          userOneHFAfter: 0,
          collateralSeizedRebase: 0,
          debtRepaidRebase: 0,
          userTwoValueAfter: 0,
          userTwoHFAfter: 0,
        };
        // Get values for a liquidation that happens before rebase
        while (await hre.Diamond.getAccountLiquidatable(user4.address)) {
          const values = await liquidate(user4, f.KrAsset, f.Collateral);
          results.collateralSeized += values.collateralSeized;
          results.debtRepaid += values.debtRepaid;
        }
        results.userOneValueAfter = fromBig(await hre.Diamond.getAccountTotalCollateralValue(user4.address), 8);

        results.userOneHFAfter = (await hre.Diamond.getAccountCollateralRatio(user4.address)).toNumber();

        // Rebase params
        const denominator = 4;
        const positive = true;
        const rebasePrice = newPrice / denominator;

        // Rebase
        f.KrAsset.setPrice(rebasePrice);
        await f.KrAsset.contract.rebase(toBig(denominator), positive, []);

        expect(await hre.Diamond.getAccountLiquidatable(user5.address)).to.be.true;
        // Get values for a liquidation that happens after a rebase
        while (await hre.Diamond.getAccountLiquidatable(user5.address)) {
          const values = await liquidate(user5, f.KrAsset, f.Collateral);
          results.collateralSeizedRebase += values.collateralSeized;
          results.debtRepaidRebase += values.debtRepaid;
        }

        results.userTwoValueAfter = fromBig(await hre.Diamond.getAccountTotalCollateralValue(user5.address), 8);
        results.userTwoHFAfter = (await hre.Diamond.getAccountCollateralRatio(user5.address)).toNumber();

        expect(results.userTwoHFAfter).to.equal(results.userOneHFAfter);
        expect(results.collateralSeized).to.equal(results.collateralSeizedRebase);
        expect(results.debtRepaid * denominator).to.equal(results.debtRepaidRebase);
        expect(results.userOneValueAfter).to.equal(results.userTwoValueAfter);
      });
      it("should liquidate correct amount of assets after a negative rebase", async function () {
        const newPrice = 1.2;
        f.KrAsset.setPrice(newPrice);

        const results = {
          collateralSeized: 0,
          debtRepaid: 0,
          userOneValueAfter: 0,
          userOneHFAfter: 0,
          collateralSeizedRebase: 0,
          debtRepaidRebase: 0,
          userTwoValueAfter: 0,
          userTwoHFAfter: 0,
        };

        // Get values for a liquidation that happens before rebase
        while (await hre.Diamond.getAccountLiquidatable(user4.address)) {
          const values = await liquidate(user4, f.KrAsset, f.Collateral);
          results.collateralSeized += values.collateralSeized;
          results.debtRepaid += values.debtRepaid;
        }
        results.userOneValueAfter = fromBig(await hre.Diamond.getAccountTotalCollateralValue(user4.address), 8);

        results.userOneHFAfter = (await hre.Diamond.getAccountCollateralRatio(user4.address)).toNumber();

        // Rebase params
        const denominator = 4;
        const positive = false;
        const rebasePrice = newPrice * denominator;

        // Rebase
        f.KrAsset.setPrice(rebasePrice);
        await f.KrAsset.contract.rebase(toBig(denominator), positive, []);

        expect(await hre.Diamond.getAccountLiquidatable(user5.address)).to.be.true;

        // Get values for a liquidation that happens after a rebase
        while (await hre.Diamond.getAccountLiquidatable(user5.address)) {
          const values = await liquidate(user5, f.KrAsset, f.Collateral);
          results.collateralSeizedRebase += values.collateralSeized;
          results.debtRepaidRebase += values.debtRepaid;
        }
        results.userTwoValueAfter = fromBig(await hre.Diamond.getAccountTotalCollateralValue(user5.address), 8);
        results.userTwoHFAfter = (await hre.Diamond.getAccountCollateralRatio(user5.address)).toNumber();
        expect(results.userTwoHFAfter).to.equal(results.userOneHFAfter);
        expect(results.collateralSeized).to.equal(results.collateralSeizedRebase);
        expect(results.debtRepaid / denominator).to.equal(results.debtRepaidRebase);
        expect(results.userOneValueAfter).to.equal(results.userTwoValueAfter);
      });
    });
  });
});
