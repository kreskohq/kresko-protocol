import { fromBig, getNamedEvent, toBig } from "@kreskolabs/lib";
import { LiquidationFixtureParams, liquidationsFixture } from "@test-utils";
import { expect } from "@test/chai";
import { Error } from "@utils/test/errors";
import { depositMockCollateral } from "@utils/test/helpers/collaterals";
import { getCR, getExpectedMaxLiq, getLiqAmount, liquidate } from "@utils/test/helpers/liquidations";
import optimized from "@utils/test/helpers/optimizations";
import { BigNumber } from "ethers";
import { Kresko, LiquidationOccurredEvent } from "types/typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko";

const INTEREST_RATE_DELTA = 0.01;
const USD_DELTA = toBig(0.1, "gwei");
const CR_DELTA = 1e-4;

// -------------------------------- Set up mock assets --------------------------------

describe.only("Minter - Liquidations", function () {
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

    let f: LiquidationFixtureParams;

    this.slow(4000);
    beforeEach(async function () {
        f = await liquidationsFixture();
        [[user1, User], [user2], [user3], [user4], [user5], [liquidator, Liquidator], [liquidatorTwo, LiquidatorTwo]] =
            f.users;

        f.reset();
    });

    describe("#isAccountLiquidatable", () => {
        it("should identify accounts below their liquidation threshold", async function () {
            const [cr, minCollateralUSD, initialCanLiquidate] = await Promise.all([
                getCR(user1.address),
                hre.Diamond.getAccountMinCollateralAtRatio(user1.address, hre.Diamond.getLiquidationThreshold()),
                hre.Diamond.getAccountLiquidatable(user1.address),
            ]);
            expect(cr).to.be.equal(1.5);
            expect(f.initialDeposits.mul(10).gt(minCollateralUSD));

            expect(initialCanLiquidate).to.equal(false);

            f.Collateral.setPrice(7.5);
            expect(await hre.Diamond.getAccountLiquidatable(user1.address)).to.equal(true);
        });
    });

    describe("#maxLiquidatableValue", () => {
        it("calculates correct MLV when kFactor = 1, cFactor = 1", async function () {
            f.Collateral.setPrice(7.5);

            const [crAfter, isLiquidatableAfter, MLV, MLVCalc] = await Promise.all([
                getCR(user1.address),
                hre.Diamond.getAccountLiquidatable(user1.address),
                hre.Diamond.getMaxLiquidation(user1.address, f.KrAsset.address, f.Collateral.address),
                getExpectedMaxLiq(user1, f.KrAsset, f.Collateral),
            ]);

            expect(crAfter).to.be.equal(1.125);
            expect(isLiquidatableAfter).to.be.true;
            expect(MLVCalc).to.be.closeTo(MLV, USD_DELTA);
        });
        it("calculates correct MLV when kFactor = 1, cFactor = 0.25", async function () {
            await hre.Diamond.updateCollateralFactor(f.Collateral.address, toBig(0.25));

            await depositMockCollateral({
                user: user1,
                amount: f.initialDeposits.div(2),
                asset: f.Collateral2,
            });

            const expectedCR = 1.125;

            const [crAfter, isLiquidatableAfter, MLVAfterC1, MLVAfterC2] = await Promise.all([
                getCR(user1.address),
                hre.Diamond.getAccountLiquidatable(user1.address),
                hre.Diamond.getMaxLiquidation(user1.address, f.KrAsset.address, f.Collateral.address),
                hre.Diamond.getMaxLiquidation(user1.address, f.KrAsset.address, f.Collateral2.address),
            ]);
            expect(isLiquidatableAfter).to.be.true;
            expect(crAfter).to.be.closeTo(expectedCR, CR_DELTA);

            expect(MLVAfterC2.gt(MLVAfterC1)).to.be.true;
            // await liquidate(user1, f.KrAsset, f.Collateral);
            // expect(await getCR(user1.address)).to.be.gt(1.4);
        });

        it("calculates correct MLV with multiple cdps", async function () {
            await depositMockCollateral({
                user: user1,
                amount: toBig(0.1, 8),
                asset: f.Collateral8Dec,
            });

            f.Collateral.setPrice(7.5);
            expect(await hre.Diamond.getAccountLiquidatable(user1.address)).to.be.true;

            const [expectedMaxLiq, maxLiq, expectedMaxLiq8Dec, maxLiq8Dec] = await Promise.all([
                getExpectedMaxLiq(user1, f.KrAsset, f.Collateral),
                hre.Diamond.getMaxLiquidation(user1.address, f.KrAsset.address, f.Collateral.address),
                getExpectedMaxLiq(user1, f.KrAsset, f.Collateral8Dec),
                hre.Diamond.getMaxLiquidation(user1.address, f.KrAsset.address, f.Collateral8Dec.address),
            ]);
            expect(expectedMaxLiq.gt(0)).to.be.true;
            expect(expectedMaxLiq8Dec.gt(0)).to.be.true;

            expect(expectedMaxLiq).to.be.closeTo(maxLiq, USD_DELTA);
            expect(expectedMaxLiq8Dec).to.be.closeTo(maxLiq8Dec, USD_DELTA);
            expect(expectedMaxLiq8Dec).lt(expectedMaxLiq);
        });
    });

    describe("#liquidation", () => {
        describe("#liquidate", () => {
            beforeEach(async function () {
                f.Collateral.setPrice(7.5);
            });

            it("should allow unhealthy accounts to be liquidated", async function () {
                // Fetch pre-liquidation state for users and contracts
                const beforeUserOneCollateralAmount = await optimized.getAccountCollateralAmount(
                    user1.address,
                    f.Collateral,
                );
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
                    false,
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
                const repayAmount = f.userOneMaxLiqPrecalc.wadDiv(toBig(11, 8));

                await Liquidator.liquidate(
                    user1.address,
                    f.KrAsset.address,
                    repayAmount,
                    f.Collateral.address,
                    optimized.getAccountMintIndex(user1.address, f.KrAsset.address),
                    optimized.getAccountDepositIndex(user1.address, f.Collateral.address),
                    false,
                );
                expect(await getCR(user1.address, true)).to.be.closeTo(
                    await optimized.getMaxLiquidationRatio(),
                    toBig(CR_DELTA),
                );
                expect(await hre.Diamond.getAccountLiquidatable(user1.address)).to.be.false;
            });

            it("should liquidate up to MLR with multiple CDPs", async function () {
                await depositMockCollateral({
                    user: user1,
                    amount: toBig(10, 8),
                    asset: f.Collateral8Dec,
                });

                f.Collateral.setPrice(5);
                f.Collateral8Dec.setPrice(6);

                await hre.Diamond.updateCollateralFactor(f.Collateral.address, toBig(0.975));
                await hre.Diamond.updateKFactor(f.KrAsset.address, toBig(1.05));

                await liquidate(user1, f.KrAsset, f.Collateral8Dec);

                const [crAfter, isLiquidatableAfter] = await Promise.all([
                    getCR(user1.address, true),
                    hre.Diamond.getAccountLiquidatable(user1.address),
                ]);

                expect(isLiquidatableAfter).to.be.false;
                expect(crAfter).to.be.closeTo(await optimized.getMaxLiquidationRatio(), toBig(CR_DELTA));
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
                    false,
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
                        false,
                    ),
                ).to.be.revertedWith(Error.NOT_LIQUIDATABLE);
            });

            it("should not allow liquidations if repayment amount is 0", async function () {
                // Liquidation should fail
                const repayAmount = 0;
                await expect(
                    LiquidatorTwo.liquidate(
                        user1.address,
                        f.KrAsset.address,
                        repayAmount,
                        f.Collateral.address,
                        0,
                        0,
                        false,
                    ),
                ).to.be.revertedWith(Error.ZERO_REPAY);
            });

            it("should not allow liquidations with krAsset amount greater than krAsset debt of user", async function () {
                // Get user's debt for this kresko asset
                const krAssetDebtUserOne = await optimized.getAccountDebtAmount(user1.address, f.KrAsset);

                // Ensure we are repaying more than debt
                const repayAmount = krAssetDebtUserOne.add(toBig(1));

                // Liquidation should fail
                await expect(
                    LiquidatorTwo.liquidate(
                        user1.address,
                        f.KrAsset.address,
                        repayAmount,
                        f.Collateral.address,
                        0,
                        0,
                        false,
                    ),
                ).to.be.revertedWith(Error.KRASSET_BURN_AMOUNT_OVERFLOW);
            });

            it("should not allow liquidations with USD value greater than the USD value required for regaining healthy position", async function () {
                await depositMockCollateral({
                    user: user1,
                    amount: toBig(2, 8),
                    asset: f.Collateral8Dec,
                });
                const allowedRepaymentValue = await hre.Diamond.getMaxLiquidation(
                    user1.address,
                    f.KrAsset.address,
                    f.Collateral.address,
                );
                const allowedRepaymentAmount = allowedRepaymentValue.wadDiv(toBig(11, 8));
                const overflowRepayment = allowedRepaymentAmount.add(toBig(1));

                const tx = await Liquidator.liquidate(
                    user1.address,
                    f.KrAsset.address,
                    overflowRepayment,
                    f.Collateral.address,
                    0,
                    0,
                    false,
                );

                const event = await getNamedEvent<LiquidationOccurredEvent>(tx, "LiquidationOccurred");

                const assetInfo = await f.Collateral.kresko();
                const expectedSeizedCollateralAmount = allowedRepaymentValue
                    .wadMul(BigNumber.from(assetInfo.liquidationIncentive))
                    .wadDiv(await f.Collateral.getPrice());

                expect(event.args.account).to.equal(user1.address);
                expect(event.args.liquidator).to.equal(liquidator.address);
                expect(event.args.repayKreskoAsset).to.equal(f.KrAsset.address);
                expect(event.args.seizedCollateralAsset).to.equal(f.Collateral.address);

                expect(event.args.repayAmount).to.not.equal(overflowRepayment);
                expect(event.args.repayAmount).to.equal(allowedRepaymentAmount);
                expect(event.args.collateralSent).to.be.equal(expectedSeizedCollateralAmount);
            });

            it("should not allow liquidations when account is under MCR but not under liquidation threshold", async function () {
                f.Collateral.setPrice(f.Collateral.deployArgs!.price);

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

                const accountCollateralValue = await hre.Diamond.getAccountCollateralValue(user1.address);

                expect(accountCollateralValue.lt(minCollateralUSD)).to.be.true;
                expect(accountCollateralValue.gt(liquidationThresholdUSD)).to.be.true;
                expect(await hre.Diamond.getAccountLiquidatable(user1.address)).to.be.false;
            });

            it("should allow liquidations without liquidator token approval for Kresko Assets", async function () {
                // Check that liquidator's token approval to Kresko.sol contract is 0
                expect(await f.KrAsset.contract.allowance(liquidatorTwo.address, hre.Diamond.address)).to.equal(0);
                const repayAmount = toBig(0.5);
                await f.KrAsset.setBalance(liquidatorTwo, repayAmount);
                await LiquidatorTwo.liquidate(
                    user1.address,
                    f.KrAsset.address,
                    repayAmount,
                    f.Collateral.address,
                    0,
                    0,
                    false,
                );

                // Confirm that liquidator's token approval is still 0
                expect(await f.KrAsset.contract.allowance(user2.address, hre.Diamond.address)).to.equal(0);
            });

            it("should not change liquidator's existing token approvals during a successful liquidation", async function () {
                const repayAmount = toBig(0.5);
                await f.KrAsset.setBalance(liquidatorTwo, repayAmount);
                await f.KrAsset.contract.setVariable("_allowances", {
                    [liquidatorTwo.address]: { [hre.Diamond.address]: repayAmount },
                });

                await expect(
                    LiquidatorTwo.liquidate(
                        user1.address,
                        f.KrAsset.address,
                        repayAmount,
                        f.Collateral.address,
                        0,
                        0,
                        false,
                    ),
                ).not.to.be.reverted;

                // Confirm that liquidator's token approval is unchanged
                expect(await f.KrAsset.contract.allowance(liquidatorTwo.address, hre.Diamond.address)).to.equal(
                    repayAmount,
                );
            });

            it("should not allow borrowers to liquidate themselves", async function () {
                // Liquidation should fail
                const repayAmount = 5;
                await expect(
                    User.liquidate(user1.address, f.KrAsset.address, repayAmount, f.Collateral.address, 0, 0, false),
                ).to.be.revertedWith(Error.SELF_LIQUIDATION);
            });
            it("should not allow seized amount to underflow without liquidators permission", async function () {
                f.Collateral.setPrice(6);

                const liqAmount = await getLiqAmount(user1, f.KrAsset, f.Collateral);
                const allowSeizeUnderflow = false;
                await expect(
                    Liquidator.liquidate(
                        user1.address,
                        f.KrAsset.address,
                        liqAmount,
                        f.Collateral.address,
                        0,
                        0,
                        allowSeizeUnderflow,
                    ),
                ).to.be.revertedWith(Error.SEIZED_COLLATERAL_UNDERFLOW);
            });
            it("should allow seized amount to underflow with liquidators permission", async function () {
                f.Collateral.setPrice(6);
                const liqAmount = await getLiqAmount(user1, f.KrAsset, f.Collateral);
                const allowSeizeUnderflow = true;
                await expect(
                    Liquidator.liquidate(
                        user1.address,
                        f.KrAsset.address,
                        liqAmount,
                        f.Collateral.address,
                        hre.Diamond.getAccountMintIndex(user1.address, f.KrAsset.address),
                        hre.Diamond.getAccountDepositIndex(user1.address, f.Collateral.address),
                        allowSeizeUnderflow,
                    ),
                ).to.not.be.reverted;
            });
        });
        describe("#liquidate - rebasing events", () => {
            beforeEach(async function () {
                await f.resetRebasing();
            });

            it("should setup correct", async function () {
                const [mcr, cr, cr2, liquidatable] = await Promise.all([
                    optimized.getMinCollateralRatio(),
                    getCR(user3.address),
                    getCR(user4.address),
                    hre.Diamond.getAccountLiquidatable(user3.address),
                ]);
                const mcrDecimal = fromBig(mcr, 18);
                expect(cr).to.closeTo(mcrDecimal, 0.001);
                expect(cr2).to.closeTo(mcrDecimal, 0.001);
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
                        false,
                    ),
                ).to.be.revertedWith(Error.NOT_LIQUIDATABLE);
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
                        false,
                    ),
                ).to.be.revertedWith(Error.NOT_LIQUIDATABLE);
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
                const MAGIC_NUMBER = BigNumber.from("1869158877653366666667"); // repay amount to bring user3 debt under 1e12
                await f.KrAssetCollateral.setBalance(hre.users.liquidator, MAGIC_NUMBER, hre.Diamond.address);
                await Liquidator.liquidate(
                    user3.address,
                    f.KrAssetCollateral.address,
                    MAGIC_NUMBER,
                    f.KrAssetCollateral.address,
                    optimized.getAccountMintIndex(user3.address, f.KrAssetCollateral.address),
                    optimized.getAccountDepositIndex(user3.address, f.KrAssetCollateral.address),
                    false,
                );

                const depositsAfter = await hre.Diamond.getAccountCollateralAmount(
                    user3.address,
                    f.KrAssetCollateral.address,
                );

                expect(depositsAfter).to.equal((1e12).toString());
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
                results.userOneValueAfter = fromBig(await hre.Diamond.getAccountCollateralValue(user4.address), 8);

                results.userOneHFAfter = (await getCR(user4.address)) as number;

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

                results.userTwoValueAfter = fromBig(await hre.Diamond.getAccountCollateralValue(user5.address), 8);
                results.userTwoHFAfter = (await getCR(user5.address)) as number;

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
                results.userOneValueAfter = fromBig(await hre.Diamond.getAccountCollateralValue(user4.address), 8);

                results.userOneHFAfter = (await getCR(user4.address)) as number;

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
                results.userTwoValueAfter = fromBig(await hre.Diamond.getAccountCollateralValue(user5.address), 8);
                results.userTwoHFAfter = (await getCR(user5.address)) as number;
                expect(results.userTwoHFAfter).to.equal(results.userOneHFAfter);
                expect(results.collateralSeized).to.equal(results.collateralSeizedRebase);
                expect(results.debtRepaid / denominator).to.equal(results.debtRepaidRebase);
                expect(results.userOneValueAfter).to.equal(results.userTwoValueAfter);
            });
        });
    });
});
