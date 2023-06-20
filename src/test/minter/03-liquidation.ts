import {
    defaultCloseFee,
    defaultCollateralArgs,
    defaultKrAssetArgs,
    defaultOpenFee,
    leverageKrAsset,
    Role,
    withFixture,
    wrapContractWithSigner,
} from "@test-utils";
import { expect } from "@test/chai";
import { fromBig, getInternalEvent, toBig } from "@kreskolabs/lib";
import { Error } from "@utils/test/errors";
import { addMockCollateralAsset, depositCollateral, getCollateralConfig } from "@utils/test/helpers/collaterals";
import { mintKrAsset } from "@utils/test/helpers/krassets";
import { getExpectedMaxLiq, getCR, liquidate, getLiqAmount } from "@utils/test/helpers/liquidations";
import { LiquidationOccurredEvent } from "types/typechain/src/contracts/libs/Events.sol/MinterEvent";

const INTEREST_RATE_DELTA = 0.01;
const USD_DELTA = toBig(0.1, "gwei");
const CR_DELTA = 1e-4;

describe("Minter", () => {
    withFixture(["minter-test"]);
    beforeEach(async function () {
        // -------------------------------- Set up mock assets --------------------------------
        const collateralArgs = {
            name: "CollateralAsset",
            price: 10, // $10
            factor: 1,
            decimals: 18,
        };
        this.collateral = hre.collaterals.find(c => c.deployArgs!.name === defaultCollateralArgs.name)!;
        this.collateral = await this.collateral!.update!(collateralArgs);
        this.collateral!.setPrice(collateralArgs.price);

        // Set up mock KreskoAsset
        const krAssetArgs = {
            name: "KreskoAsset",
            price: 11, // $11
            factor: 1,
            supplyLimit: 100000000,
            closeFee: defaultCloseFee,
            openFee: defaultOpenFee,
        };

        this.krAsset = hre.krAssets.find(c => c.deployArgs!.name === defaultKrAssetArgs.name)!;
        this.krAsset!.setPrice(krAssetArgs.price);

        // grant operator role to deployer for rebases
        await this.krAsset!.contract.grantRole(Role.OPERATOR, hre.users.deployer.address);
        const assetInfo = await this.krAsset!.kresko();

        // Add krAsset as a collateral with anchor and cFactor of 1
        await wrapContractWithSigner(hre.Diamond, hre.users.deployer).addCollateralAsset(
            this.krAsset!.contract.address,
            await getCollateralConfig(
                this.krAsset!.contract,
                this.krAsset!.anchor!.address,
                toBig(1),
                toBig(1.05),
                assetInfo.oracle,
                assetInfo.oracle,
            ),
        );

        // -------------------------------- Set up userOne deposit/debt --------------------------------

        await this.collateral!.setBalance(hre.users.liquidator, toBig(100000000));
        await this.collateral!.mocks!.contract.setVariable("_allowances", {
            [hre.users.liquidator.address]: {
                [hre.Diamond.address]: toBig(100000000),
            },
        });
        // Deposit collateral
        this.defaultDepositAmount = 20; // 20 * $10 = $200 in collateral asset value
        await this.collateral!.setBalance(hre.users.userOne, toBig(this.defaultDepositAmount));
        await this.collateral!.mocks!.contract.setVariable("_allowances", {
            [hre.users.userOne.address]: {
                [hre.Diamond.address]: toBig(this.defaultDepositAmount),
            },
        });
        await depositCollateral({
            user: hre.users.userOne,
            amount: this.defaultDepositAmount,
            asset: this.collateral,
        });

        // Mint KrAsset
        this.defaultMintAmount = 10; // 10 * $11 = $110 in debt value
        await mintKrAsset({
            user: hre.users.userOne,
            amount: this.defaultMintAmount,
            asset: this.krAsset!,
        });
    });
    describe("#maxLiquidatableValue", () => {
        let user: SignerWithAddress;
        let newCollateral: TestCollateral;
        const collateralPrice = 10;
        const krAssetPrice = 10;
        const collateralPriceAfter = 135 / (20 * 50);
        beforeEach(async function () {
            const depositAmountBig18 = toBig(this.defaultDepositAmount * 100);
            const depositAmountBig8 = toBig(this.defaultDepositAmount * 100, 8);
            user = hre.users.userOne;

            this.collateral!.setPrice(collateralPrice);
            this.krAsset!.setPrice(krAssetPrice);

            await this.collateral!.setBalance(hre.users.userOne, depositAmountBig18);
            await this.collateral!.mocks!.contract.setVariable("_allowances", {
                [hre.users.userOne.address]: {
                    [hre.Diamond.address]: depositAmountBig18,
                },
            });

            newCollateral = await addMockCollateralAsset({
                name: "Collateral",
                decimals: 8, // 8 decimals
                price: 10,
                factor: 0.9,
            });
            await newCollateral.setBalance(hre.users.userOne, depositAmountBig8);
            await newCollateral.mocks!.contract.setVariable("_allowances", {
                [hre.users.userOne.address]: {
                    [hre.Diamond.address]: depositAmountBig8,
                },
            });
        });
        it("calculates correct MLV when kFactor = 1, cFactor = 1", async function () {
            const [deposits, borrows] = [toBig(20), toBig(10)];

            await this.collateral.setBalance(hre.users.userThree, deposits);
            await depositCollateral({
                user: hre.users.userThree,
                amount: deposits,
                asset: this.collateral,
            });

            await mintKrAsset({
                user: hre.users.userThree,
                amount: borrows,
                asset: this.krAsset,
            });

            expect(await hre.Diamond.isAccountLiquidatable(hre.users.userThree.address)).to.be.false;
            expect(await getCR(hre.users.userThree.address)).to.be.equal(2);

            this.collateral.setPrice(5);

            expect(await getCR(hre.users.userThree.address)).to.be.equal(1);
            expect(await hre.Diamond.isAccountLiquidatable(hre.users.userThree.address)).to.be.true;

            const maxLiquidatableValue = await hre.Diamond.getMaxLiquidation(
                hre.users.userThree.address,
                this.krAsset.address,
                this.collateral.address,
            );

            const MLCalc = await getExpectedMaxLiq(hre.users.userThree, this.krAsset, this.collateral);

            expect(MLCalc).to.be.closeTo(maxLiquidatableValue, USD_DELTA);
        });
        it("calculates correct MLV when kFactor = 1, cFactor = 0.25", async function () {
            await hre.Diamond.updateMinimumDebtValue(0);
            const userThree = hre.users.userThree;
            const [deposits1, deposits2] = [toBig(10), toBig(10)];
            const borrows = toBig(10);

            const collateralPrice = 10;
            this.collateral.setPrice(collateralPrice);

            const collateral2 = await addMockCollateralAsset({
                name: "Collateral18Dec",
                decimals: 18,
                factor: 1,
                price: 10,
            });
            await this.collateral.setBalance(userThree, deposits1);
            await collateral2.setBalance(userThree, deposits2);
            await depositCollateral({
                user: userThree,
                amount: deposits2,
                asset: collateral2,
            });
            await depositCollateral({
                user: userThree,
                amount: deposits1,
                asset: this.collateral,
            });

            await mintKrAsset({
                user: userThree,
                amount: borrows,
                asset: this.krAsset,
            });

            const cr = await getCR(userThree.address);
            expect(await hre.Diamond.isAccountLiquidatable(userThree.address)).to.be.false;
            expect(cr).to.be.equal(2);

            await this.collateral.update({
                factor: 0.25,
                name: "updated",
            });
            this.collateral.setPrice(5);

            const expectedCR = 1.125;
            expect(await getCR(userThree.address)).to.be.closeTo(expectedCR, CR_DELTA);

            expect(await hre.Diamond.isAccountLiquidatable(userThree.address)).to.be.true;

            const maxLiquidatableValueC1 = await hre.Diamond.getMaxLiquidation(
                userThree.address,
                this.krAsset.address,
                this.collateral.address,
            );

            const MLCalcC1 = await getExpectedMaxLiq(userThree, this.krAsset, this.collateral);
            expect(MLCalcC1).to.be.closeTo(maxLiquidatableValueC1, USD_DELTA);

            const maxLiquidatableValueC2 = await hre.Diamond.getMaxLiquidation(
                userThree.address,
                this.krAsset.address,
                collateral2.address,
            );

            const MLCalcC2 = await getExpectedMaxLiq(userThree, this.krAsset, collateral2);
            expect(MLCalcC2).to.be.closeTo(maxLiquidatableValueC2, USD_DELTA);

            expect(maxLiquidatableValueC2.gt(maxLiquidatableValueC1)).to.be.true;

            await liquidate(userThree, this.krAsset, this.collateral);
            expect(await getCR(userThree.address)).to.be.lessThan(1.4);
            await liquidate(userThree, this.krAsset, collateral2);
            expect(await getCR(userThree.address)).to.be.greaterThan(1.4);
            expect(await hre.Diamond.isAccountLiquidatable(userThree.address)).to.be.false;
        });

        it("calculates correct MLV with single market cdp", async function () {
            await depositCollateral({
                user: hre.users.userOne,
                amount: this.defaultDepositAmount * 49,
                asset: this.collateral!,
            });

            this.collateral!.setPrice(collateralPriceAfter * 0.7);

            expect(await hre.Diamond.isAccountLiquidatable(user.address)).to.be.true;

            const expectedMaxLiquidatableValue = await getExpectedMaxLiq(user, this.krAsset, this.collateral);

            expect(expectedMaxLiquidatableValue.gt(0)).to.be.true;
            const maxLiquidatableValue = await hre.Diamond.getMaxLiquidation(
                user.address,
                this.krAsset!.address,
                this.collateral.address,
            );

            expect(expectedMaxLiquidatableValue).to.be.closeTo(maxLiquidatableValue, USD_DELTA);
        });

        it("calculates correct MLV with multiple cdps", async function () {
            await depositCollateral({
                user: hre.users.userOne,
                amount: this.defaultDepositAmount * 49,
                asset: this.collateral!,
            });

            await depositCollateral({
                user: hre.users.userOne,
                amount: toBig(0.1, 8),
                asset: newCollateral,
            });

            this.collateral!.setPrice(collateralPriceAfter);
            expect(await hre.Diamond.isAccountLiquidatable(user.address)).to.be.true;

            const expectedMaxLiquidatableValue = await getExpectedMaxLiq(user, this.krAsset, this.collateral);
            expect(expectedMaxLiquidatableValue.gt(0)).to.be.true;
            const maxLiquidatableValue = await hre.Diamond.getMaxLiquidation(
                user.address,
                this.krAsset!.address,
                this.collateral.address,
            );

            expect(expectedMaxLiquidatableValue).to.be.closeTo(maxLiquidatableValue, USD_DELTA);

            const expectedMaxLiquidatableValueNewCollateral = await getExpectedMaxLiq(
                user,
                this.krAsset,
                newCollateral,
            );

            expect(expectedMaxLiquidatableValueNewCollateral.gt(0)).to.be.true;
            const maxLiquidatableValueNewCollateral = await hre.Diamond.getMaxLiquidation(
                user.address,
                this.krAsset!.address,
                newCollateral.address,
            );

            expect(expectedMaxLiquidatableValueNewCollateral).to.be.closeTo(
                maxLiquidatableValueNewCollateral,
                USD_DELTA,
            );
        });
    });

    describe("#liquidation", () => {
        describe("#isAccountLiquidatable", () => {
            it("should identify accounts below their liquidation threshold", async function () {
                // Confirm that current amount is under min collateral value
                const liquidationThreshold = await hre.Diamond.liquidationThreshold();
                const minCollateralUSD = await hre.Diamond.getAccountMinimumCollateralValueAtRatio(
                    hre.users.userOne.address,
                    liquidationThreshold,
                );
                expect(this.defaultDepositAmount * this.collateral!.deployArgs!.price > fromBig(minCollateralUSD, 8));

                // The account should be NOT liquidatable as collateral value ($200) >= min collateral value ($154)
                const initialCanLiquidate = await hre.Diamond.isAccountLiquidatable(hre.users.userOne.address);
                expect(initialCanLiquidate).to.equal(false);

                // Update collateral price to $7.5
                const newCollateralPrice = 7.5;
                this.collateral!.setPrice(newCollateralPrice);

                const [, newCollateralOraclePrice] = await hre.Diamond.getCollateralValueAndOraclePrice(
                    this.collateral!.address,
                    toBig(1),
                    true,
                );
                expect(fromBig(newCollateralOraclePrice, 8)).to.equal(newCollateralPrice);

                // The account should be liquidatable as collateral value ($140) < min collateral value ($154)
                const secondaryCanLiquidate = await hre.Diamond.isAccountLiquidatable(hre.users.userOne.address);
                expect(secondaryCanLiquidate).to.equal(true);
            });
        });

        describe("#liquidate", () => {
            beforeEach(async function () {
                // Grant userTwo tokens to use for liquidation
                await this.krAsset!.mocks.contract.setVariable("_balances", {
                    [hre.users.userTwo.address]: toBig(10000),
                });

                // Update collateral price from $10 to $7.5
                const newCollateralPrice = 7.5;
                this.collateral!.setPrice(newCollateralPrice);
            });

            it("should allow unhealthy accounts to be liquidated", async function () {
                // Confirm we can liquidate this account
                const canLiquidate = await hre.Diamond.isAccountLiquidatable(hre.users.userOne.address);
                expect(canLiquidate).to.equal(true);

                // Fetch pre-liquidation state for users and contracts
                const beforeUserOneCollateralAmount = await hre.Diamond.collateralDeposits(
                    hre.users.userOne.address,
                    this.collateral!.address,
                );
                const beforeUserOneDebtAmount = await hre.Diamond.kreskoAssetDebt(
                    hre.users.userOne.address,
                    this.krAsset!.address,
                );
                const beforeUserTwoCollateralBalance = await this.collateral!.contract.balanceOf(
                    hre.users.userTwo.address,
                );
                const beforeUserTwoKreskoAssetBalance = await this.krAsset!.contract.balanceOf(
                    hre.users.userTwo.address,
                );
                const beforeKreskoCollateralBalance = await this.collateral!.contract.balanceOf(hre.Diamond.address);

                // Liquidate userOne
                const maxLiq = await hre.Diamond.getMaxLiquidation(
                    hre.users.userOne.address,
                    this.krAsset!.address,
                    this.collateral.address,
                );
                const maxRepayAmount = toBig(Number(maxLiq.div(await this.krAsset!.getPrice())));
                const mintedKreskoAssetIndex = 0;
                const depositedCollateralAssetIndex = 0;
                await wrapContractWithSigner(hre.Diamond, hre.users.userTwo).liquidate(
                    hre.users.userOne.address,
                    this.krAsset!.address,
                    maxRepayAmount,
                    this.collateral!.address,
                    mintedKreskoAssetIndex,
                    depositedCollateralAssetIndex,
                    false,
                );

                // Confirm that the liquidated user's debt amount has decreased by the repaid amount
                const afterUserOneDebtAmount = await hre.Diamond.kreskoAssetDebt(
                    hre.users.userOne.address,
                    this.krAsset!.address,
                );
                expect(afterUserOneDebtAmount.eq(beforeUserOneDebtAmount.sub(maxRepayAmount)));

                // Confirm that some of the liquidated user's collateral has been seized
                const afterUserOneCollateralAmount = await hre.Diamond.collateralDeposits(
                    hre.users.userOne.address,
                    this.collateral!.address,
                );
                expect(afterUserOneCollateralAmount.lt(beforeUserOneCollateralAmount));

                // Confirm that userTwo's kresko asset balance has decreased by the repaid amount
                const afterUserTwoKreskoAssetBalance = await this.krAsset!.contract.balanceOf(
                    hre.users.userTwo.address,
                );
                expect(afterUserTwoKreskoAssetBalance.eq(beforeUserTwoKreskoAssetBalance.sub(maxRepayAmount)));

                // Confirm that userTwo has received some collateral from the contract
                const afterUserTwoCollateralBalance = await this.collateral!.contract.balanceOf(
                    hre.users.userTwo.address,
                );
                expect(afterUserTwoCollateralBalance).gt(beforeUserTwoCollateralBalance);

                // Confirm that Kresko contract's collateral balance has decreased.
                const afterKreskoCollateralBalance = await this.collateral!.contract.balanceOf(hre.Diamond.address);
                expect(afterKreskoCollateralBalance).lt(beforeKreskoCollateralBalance);
            });

            it("should liquidate up to LT with a single CDP", async function () {
                const userThree = hre.users.userThree;
                const deposits = toBig(15);
                const borrows = toBig(10);

                this.collateral.setPrice(10);
                this.krAsset.setPrice(10);

                await this.collateral.setBalance(userThree, deposits);
                await depositCollateral({
                    user: userThree,
                    amount: deposits,
                    asset: this.collateral,
                });

                await mintKrAsset({
                    user: userThree,
                    amount: borrows,
                    asset: this.krAsset,
                });

                expect(await hre.Diamond.isAccountLiquidatable(userThree.address)).to.be.false;
                this.collateral.setPrice(7.5);

                expect(await hre.Diamond.isAccountLiquidatable(userThree.address)).to.be.true;

                await liquidate(userThree, this.krAsset, this.collateral);
                const MLM = fromBig(await hre.Diamond.maxLiquidationMultiplier(), 18);
                expect(await getCR(userThree.address)).to.be.closeTo(1.4 * MLM, CR_DELTA);
                expect(await hre.Diamond.isAccountLiquidatable(userThree.address)).to.be.false;
            });

            it("should liquidate up to LT with multiple CDPs", async function () {
                const collateral2 = await addMockCollateralAsset({
                    name: "Collateral",
                    decimals: 18,
                    factor: 1,
                    price: 10,
                });

                const userThree = hre.users.userThree;
                const [deposits1, deposits2] = [toBig(10), toBig(5)];
                const borrows = toBig(10);

                this.collateral.setPrice(10);
                this.krAsset.setPrice(10);

                await Promise.all([
                    await this.collateral.setBalance(userThree, deposits1),
                    await collateral2.setBalance(userThree, deposits2),
                    await depositCollateral({
                        user: userThree,
                        amount: deposits1,
                        asset: this.collateral,
                    }),
                    await depositCollateral({
                        user: userThree,
                        amount: deposits2,
                        asset: collateral2,
                    }),
                    await mintKrAsset({
                        user: userThree,
                        amount: borrows,
                        asset: this.krAsset,
                    }),
                ]);

                expect(await hre.Diamond.isAccountLiquidatable(userThree.address)).to.be.false;

                // seemingly random order of updates to test that the liquidation works regardless
                this.collateral.setPrice(6.25);
                await collateral2.update({
                    factor: 0.975,
                    name: "updated",
                });
                await this.krAsset.update({
                    factor: 1.05,
                    name: "updated",
                    closeFee: 0.02,
                    openFee: 0,
                    supplyLimit: 1_000_000,
                });
                expect(await getCR(userThree.address)).to.be.greaterThan(1.05);

                expect(await hre.Diamond.isAccountLiquidatable(userThree.address)).to.be.true;

                await liquidate(userThree, this.krAsset, this.collateral, true);

                expect(await getCR(userThree.address)).to.be.lessThan(1.4);
                expect(await hre.Diamond.isAccountLiquidatable(userThree.address)).to.be.true;

                await liquidate(userThree, this.krAsset, collateral2);
                expect(await getCR(userThree.address)).to.be.closeTo(1.4, CR_DELTA);
                // expect(await hre.Diamond.isAccountLiquidatable(userThree.address)).to.be.false;
            });

            it("should emit LiquidationOccurred event", async function () {
                // Attempt liquidation
                const collateralIndex = await hre.Diamond.getDepositedCollateralAssetIndex(
                    hre.users.userOne.address,
                    this.collateral!.address,
                );

                await this.krAsset.update({
                    name: "jesus",
                    factor: 1.5,
                    supplyLimit: 10000000,
                    closeFee: 0.05,
                    openFee: 0,
                });

                const mintedKreskoAssetIndex = await hre.Diamond.getMintedKreskoAssetsIndex(
                    hre.users.userOne.address,
                    this.krAsset!.address,
                );

                const maxLiqValue = await hre.Diamond.getMaxLiquidation(
                    hre.users.userOne.address,
                    this.krAsset!.address,
                    this.collateral.address,
                );

                const repayAmount = maxLiqValue.wadDiv(await this.krAsset!.getPrice());
                const tx = await wrapContractWithSigner(hre.Diamond, hre.users.userTwo).liquidate(
                    hre.users.userOne.address,
                    this.krAsset!.address,
                    repayAmount,
                    this.collateral!.address,
                    mintedKreskoAssetIndex,
                    collateralIndex,
                    false,
                );

                const event = await getInternalEvent<LiquidationOccurredEvent["args"]>(
                    tx,
                    hre.Diamond,
                    "LiquidationOccurred",
                );

                expect(event.account).to.equal(hre.users.userOne.address);
                expect(event.liquidator).to.equal(hre.users.userTwo.address);
                expect(event.repayKreskoAsset).to.equal(this.krAsset!.address);
                expect(event.repayAmount).to.equal(repayAmount);
                expect(event.seizedCollateralAsset).to.equal(this.collateral!.address);
            });

            it("should not allow liquidations of healthy accounts", async function () {
                // Update collateral price from $5 to $10
                const newCollateralPrice = 10;
                this.collateral!.setPrice(newCollateralPrice);

                // Confirm that the account has sufficient collateral to not be liquidated
                const liquidationThreshold = await hre.Diamond.liquidationThreshold();
                const minimumCollateralUSDValueRequired = await hre.Diamond.getAccountMinimumCollateralValueAtRatio(
                    hre.users.userOne.address,
                    liquidationThreshold,
                );
                const currUserOneCollateralAmount = await hre.Diamond.collateralDeposits(
                    hre.users.userOne.address,
                    this.collateral!.address,
                );
                expect(
                    fromBig(currUserOneCollateralAmount) * newCollateralPrice >
                        fromBig(minimumCollateralUSDValueRequired, 8),
                );

                const canLiquidate = await hre.Diamond.isAccountLiquidatable(hre.users.userOne.address);
                expect(canLiquidate).to.equal(false);

                const repayAmount = 10;
                const mintedKreskoAssetIndex = 0;
                const depositedCollateralAssetIndex = 0;
                await expect(
                    wrapContractWithSigner(hre.Diamond, hre.users.userTwo).liquidate(
                        hre.users.userOne.address,
                        this.krAsset!.address,
                        repayAmount,
                        this.collateral!.address,
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
                    wrapContractWithSigner(hre.Diamond, hre.users.userTwo).liquidate(
                        hre.users.userOne.address,
                        this.krAsset!.address,
                        repayAmount,
                        this.collateral!.address,
                        0,
                        0,
                        false,
                    ),
                ).to.be.revertedWith(Error.ZERO_REPAY);
            });

            it("should not allow liquidations with krAsset amount greater than krAsset debt of user", async function () {
                // Get user's debt for this kresko asset
                const krAssetDebtUserOne = await hre.Diamond.kreskoAssetDebt(
                    hre.users.userOne.address,
                    this.krAsset!.address,
                );

                // Ensure we are repaying more than debt
                const repayAmount = krAssetDebtUserOne.add(toBig(1));

                // Liquidation should fail
                await expect(
                    wrapContractWithSigner(hre.Diamond, hre.users.userTwo).liquidate(
                        hre.users.userOne.address,
                        this.krAsset!.address,
                        repayAmount,
                        this.collateral!.address,
                        0,
                        0,
                        false,
                    ),
                ).to.be.revertedWith(Error.KRASSET_BURN_AMOUNT_OVERFLOW);
            });

            it("should not allow liquidations with USD value greater than the USD value required for regaining healthy position", async function () {
                const maxLiquidation = fromBig(
                    await hre.Diamond.getMaxLiquidation(
                        hre.users.userOne.address,
                        this.krAsset!.address,
                        this.collateral.address,
                    ),
                    8,
                );
                const repaymentAmount = toBig((maxLiquidation + 1) / this.krAsset!.deployArgs!.price);
                // Ensure liquidation cannot happen
                await expect(
                    wrapContractWithSigner(hre.Diamond, hre.users.userTwo).liquidate(
                        hre.users.userOne.address,
                        this.krAsset!.address,
                        repaymentAmount,
                        this.collateral!.address,
                        0,
                        0,
                        false,
                    ),
                ).to.be.revertedWith(Error.LIQUIDATION_OVERFLOW);
            });

            it("should not allow liquidations when account is under MCR but not under liquidation threshold", async function () {
                this.collateral!.setPrice(this.collateral!.deployArgs!.price);

                expect(await hre.Diamond.isAccountLiquidatable(hre.users.userOne.address)).to.be.false;

                const minCollateralUSD = await hre.Diamond.getAccountMinimumCollateralValueAtRatio(
                    hre.users.userOne.address,
                    await hre.Diamond.minimumCollateralizationRatio(),
                );
                const liquidationThresholdUSD = await hre.Diamond.getAccountMinimumCollateralValueAtRatio(
                    hre.users.userOne.address,
                    await hre.Diamond.liquidationThreshold(),
                );
                this.collateral!.setPrice(this.collateral!.deployArgs!.price * 0.775);

                const accountCollateralValue = await hre.Diamond.getAccountCollateralValue(hre.users.userOne.address);

                expect(accountCollateralValue.lt(minCollateralUSD)).to.be.true;
                expect(accountCollateralValue.gt(liquidationThresholdUSD)).to.be.true;
                expect(await hre.Diamond.isAccountLiquidatable(hre.users.userOne.address)).to.be.false;
            });

            it("should allow liquidations without liquidator approval of Kresko assets to Kresko.sol contract", async function () {
                // Check that liquidator's token approval to Kresko.sol contract is 0
                expect(await this.krAsset!.contract.allowance(hre.users.userTwo.address, hre.Diamond.address)).to.equal(
                    0,
                );

                // Liquidation should succeed despite lack of token approval
                const repayAmount = 10;
                const mintedKreskoAssetIndex = 0;
                const depositedCollateralAssetIndex = 0;
                await wrapContractWithSigner(hre.Diamond, hre.users.userTwo).liquidate(
                    hre.users.userOne.address,
                    this.krAsset!.address,
                    repayAmount,
                    this.collateral!.address,
                    mintedKreskoAssetIndex,
                    depositedCollateralAssetIndex,
                    false,
                );

                // Confirm that liquidator's token approval is still 0
                expect(await this.krAsset!.contract.allowance(hre.users.userTwo.address, hre.Diamond.address)).to.equal(
                    0,
                );
            });

            it("should not change liquidator's existing token approvals during a successful liquidation", async function () {
                // Liquidator increases contract's token approval
                const repayAmount = 10;
                await this.krAsset!.contract.connect(hre.users.userTwo).approve(hre.Diamond.address, repayAmount);
                expect(await this.krAsset!.contract.allowance(hre.users.userTwo.address, hre.Diamond.address)).to.equal(
                    repayAmount,
                );

                const mintedKreskoAssetIndex = 0;
                const depositedCollateralAssetIndex = 0;
                await expect(
                    wrapContractWithSigner(hre.Diamond, hre.users.userTwo).liquidate(
                        hre.users.userOne.address,
                        this.krAsset!.address,
                        repayAmount,
                        this.collateral!.address,
                        mintedKreskoAssetIndex,
                        depositedCollateralAssetIndex,
                        false,
                    ),
                ).not.to.be.reverted;

                // Confirm that liquidator's token approval is unchanged
                expect(await this.krAsset!.contract.allowance(hre.users.userTwo.address, hre.Diamond.address)).to.equal(
                    repayAmount,
                );
            });

            it("should not allow borrowers to liquidate themselves", async function () {
                // Liquidation should fail
                const repayAmount = 5;
                await expect(
                    wrapContractWithSigner(hre.Diamond, hre.users.userOne).liquidate(
                        hre.users.userOne.address,
                        this.krAsset!.address,
                        repayAmount,
                        this.collateral!.address,
                        0,
                        0,
                        false,
                    ),
                ).to.be.revertedWith(Error.SELF_LIQUIDATION);
            });
            it("should not allow seized amount to underflow without liquidators permission", async function () {
                const userThree = hre.users.userThree;
                const deposits = toBig(15);
                const borrows = toBig(10);

                this.collateral.setPrice(10);
                this.krAsset.setPrice(10);

                await this.collateral.setBalance(userThree, deposits);
                await depositCollateral({
                    user: userThree,
                    amount: deposits,
                    asset: this.collateral,
                });

                await mintKrAsset({
                    user: userThree,
                    amount: borrows,
                    asset: this.krAsset,
                });

                this.collateral.setPrice(2.5);

                expect(await hre.Diamond.isAccountLiquidatable(userThree.address)).to.be.true;

                await this.collateral.setBalance(hre.users.liquidator, deposits.mul(1000));
                const liqAmount = await getLiqAmount(userThree, this.krAsset, this.collateral);
                await depositCollateral({
                    user: hre.users.liquidator,
                    amount: deposits.mul(1000),
                    asset: this.collateral,
                });

                await mintKrAsset({
                    user: hre.users.liquidator,
                    amount: liqAmount,
                    asset: this.krAsset,
                });
                const allowSeizeUnderflow = false;
                await expect(
                    wrapContractWithSigner(hre.Diamond, hre.users.liquidator).liquidate(
                        userThree.address,
                        this.krAsset.address,
                        liqAmount,
                        this.collateral.address,
                        await hre.Diamond.getMintedKreskoAssetsIndex(userThree.address, this.krAsset.address),
                        await hre.Diamond.getDepositedCollateralAssetIndex(userThree.address, this.collateral.address),
                        allowSeizeUnderflow,
                    ),
                ).to.be.revertedWith(Error.SEIZED_COLLATERAL_UNDERFLOW);
            });
            it("should allow seized amount to underflow with liquidators permission", async function () {
                const userThree = hre.users.userThree;
                const deposits = toBig(15);
                const borrows = toBig(10);

                this.collateral.setPrice(10);
                this.krAsset.setPrice(10);

                await this.collateral.setBalance(userThree, deposits);
                await depositCollateral({
                    user: userThree,
                    amount: deposits,
                    asset: this.collateral,
                });

                await mintKrAsset({
                    user: userThree,
                    amount: borrows,
                    asset: this.krAsset,
                });

                this.collateral.setPrice(2.5);

                expect(await hre.Diamond.isAccountLiquidatable(userThree.address)).to.be.true;

                await this.collateral.setBalance(hre.users.liquidator, deposits.mul(1000));
                const liqAmount = await getLiqAmount(userThree, this.krAsset, this.collateral);
                await depositCollateral({
                    user: hre.users.liquidator,
                    amount: deposits.mul(1000),
                    asset: this.collateral,
                });

                await mintKrAsset({
                    user: hre.users.liquidator,
                    amount: liqAmount,
                    asset: this.krAsset,
                });
                const allowSeizeUnderflow = true;
                await expect(
                    wrapContractWithSigner(hre.Diamond, hre.users.liquidator).liquidate(
                        userThree.address,
                        this.krAsset.address,
                        liqAmount,
                        this.collateral.address,
                        await hre.Diamond.getMintedKreskoAssetsIndex(userThree.address, this.krAsset.address),
                        await hre.Diamond.getDepositedCollateralAssetIndex(userThree.address, this.collateral.address),
                        allowSeizeUnderflow,
                    ),
                ).to.not.be.reverted;
            });
        });
        describe("#liquidate - rebasing events", () => {
            let userToLiquidate: SignerWithAddress;
            let userToLiquidateTwo: SignerWithAddress;
            const collateralPrice = 10;
            const krAssetPrice = 1;
            const thousand = toBig(1000);
            const liquidatorAmounts = {
                collateralDeposits: thousand,
            };
            const userToLiquidateAmounts = {
                krAssetCollateralDeposits: thousand,
            };

            beforeEach(async function () {
                userToLiquidate = hre.users.testUserEight;
                userToLiquidateTwo = hre.users.testUserNine;
                this.collateral!.setPrice(collateralPrice);
                this.krAsset!.setPrice(krAssetPrice);

                // Deposit collateral for liquidator
                await depositCollateral({
                    user: hre.users.liquidator,
                    asset: this.collateral!,
                    amount: liquidatorAmounts.collateralDeposits,
                });

                await leverageKrAsset(
                    userToLiquidate,
                    this.krAsset,
                    this.collateral,
                    userToLiquidateAmounts.krAssetCollateralDeposits,
                );
                await leverageKrAsset(
                    userToLiquidateTwo,
                    this.krAsset,
                    this.collateral,
                    userToLiquidateAmounts.krAssetCollateralDeposits,
                );
                const mcr = fromBig(await hre.Diamond.minimumCollateralizationRatio(), 8);
                expect(await getCR(userToLiquidate.address)).to.lessThanOrEqual(mcr);
                expect(await getCR(userToLiquidateTwo.address)).to.lessThanOrEqual(mcr);

                expect(await hre.Diamond.isAccountLiquidatable(userToLiquidate.address)).to.be.false;
                expect(await hre.Diamond.isAccountLiquidatable(userToLiquidateTwo.address)).to.be.false;
            });

            it("should not allow liquidation of healthy accounts after a positive rebase", async function () {
                // Rebase params
                const denominator = 4;
                const positive = true;
                const rebasePrice = fromBig(await this.krAsset!.getPrice(), 8) / denominator;

                this.krAsset!.setPrice(rebasePrice);
                await this.krAsset!.contract.rebase(toBig(denominator), positive, []);

                expect(await hre.Diamond.isAccountLiquidatable(userToLiquidate.address)).to.be.false;
                await expect(
                    wrapContractWithSigner(hre.Diamond, hre.users.liquidator).liquidate(
                        userToLiquidate.address,
                        this.krAsset!.address,
                        1,
                        this.collateral!.address,
                        await hre.Diamond.getMintedKreskoAssetsIndex(userToLiquidate.address, this.krAsset!.address),
                        await hre.Diamond.getDepositedCollateralAssetIndex(
                            userToLiquidate.address,
                            this.collateral!.address,
                        ),
                        false,
                    ),
                ).to.be.revertedWith(Error.NOT_LIQUIDATABLE);
            });

            it("should not allow liquidation of healthy accounts after a negative rebase", async function () {
                // Rebase params
                const denominator = 4;
                const positive = false;
                const rebasePrice = fromBig(await this.krAsset!.getPrice(), 8) * denominator;

                this.krAsset!.setPrice(rebasePrice);
                await this.krAsset!.contract.rebase(toBig(denominator), positive, []);

                expect(await hre.Diamond.isAccountLiquidatable(userToLiquidate.address)).to.be.false;

                await expect(
                    wrapContractWithSigner(hre.Diamond, hre.users.liquidator).liquidate(
                        userToLiquidate.address,
                        this.krAsset!.address,
                        1,
                        this.collateral!.address,
                        await hre.Diamond.getMintedKreskoAssetsIndex(userToLiquidate.address, this.krAsset!.address),
                        await hre.Diamond.getDepositedCollateralAssetIndex(
                            userToLiquidate.address,
                            this.collateral!.address,
                        ),
                        false,
                    ),
                ).to.be.revertedWith(Error.NOT_LIQUIDATABLE);
            });
            it("should allow liquidations of unhealthy accounts after a positive rebase", async function () {
                // Rebase params
                const denominator = 4;
                const positive = true;
                const rebasePrice = fromBig(await this.krAsset!.getPrice(), 8) / denominator;
                this.krAsset!.setPrice(rebasePrice);
                await this.krAsset!.contract.rebase(toBig(denominator), positive, []);

                expect(await hre.Diamond.isAccountLiquidatable(userToLiquidate.address)).to.be.false;

                this.collateral!.setPrice(5);
                expect(await hre.Diamond.isAccountLiquidatable(userToLiquidate.address)).to.be.true;
                await expect(liquidate(userToLiquidate, this.krAsset, this.collateral, true)).to.not.be.reverted;
            });
            it("should allow liquidations of unhealthy accounts after a negative rebase", async function () {
                // Rebase params
                const denominator = 4;
                const positive = false;
                const rebasePrice = fromBig(await this.krAsset!.getPrice(), 8) * denominator;

                this.krAsset!.setPrice(rebasePrice);
                await this.krAsset!.contract.rebase(toBig(denominator), positive, []);

                expect(await hre.Diamond.isAccountLiquidatable(userToLiquidate.address)).to.be.false;

                this.krAsset!.setPrice(rebasePrice * 2);
                expect(await hre.Diamond.isAccountLiquidatable(userToLiquidate.address)).to.be.true;
                await expect(liquidate(userToLiquidate, this.krAsset, this.collateral, true)).to.not.be.reverted;
            });
            it("should liquidate correct amount of krAssets after a positive rebase", async function () {
                // Change price to make user position unhealthy
                const startingPrice = fromBig(await this.krAsset!.getPrice(), 8);
                const newPrice = startingPrice * 2;
                this.krAsset!.setPrice(newPrice);

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
                while (await hre.Diamond.isAccountLiquidatable(userToLiquidate.address)) {
                    const values = await liquidate(userToLiquidate, this.krAsset, this.krAsset);
                    results.collateralSeized += values.collateralSeized;
                    results.debtRepaid += values.debtRepaid;
                }
                results.userOneValueAfter = fromBig(
                    await hre.Diamond.getAccountCollateralValue(userToLiquidate.address),
                    8,
                );

                results.userOneHFAfter = (await getCR(userToLiquidate.address)) as number;

                // Rebase params
                const denominator = 4;
                const positive = true;
                const rebasePrice = newPrice / denominator;

                // Rebase
                this.krAsset!.setPrice(rebasePrice);
                await this.krAsset!.contract.rebase(toBig(denominator), positive, []);

                expect(await hre.Diamond.isAccountLiquidatable(userToLiquidateTwo.address)).to.be.true;
                // Get values for a liquidation that happens after a rebase
                while (await hre.Diamond.isAccountLiquidatable(userToLiquidateTwo.address)) {
                    const values = await liquidate(userToLiquidateTwo, this.krAsset, this.krAsset);
                    results.collateralSeizedRebase += values.collateralSeized;
                    results.debtRepaidRebase += values.debtRepaid;
                }

                results.userTwoValueAfter = fromBig(
                    await hre.Diamond.getAccountCollateralValue(userToLiquidateTwo.address),
                    8,
                );
                results.userTwoHFAfter = (await getCR(userToLiquidateTwo.address)) as number;

                expect(results.userTwoHFAfter).to.closeTo(results.userOneHFAfter, INTEREST_RATE_DELTA);
                expect(results.collateralSeized * denominator).to.closeTo(
                    results.collateralSeizedRebase,
                    INTEREST_RATE_DELTA,
                );
                expect(results.debtRepaid * denominator).to.closeTo(results.debtRepaidRebase, INTEREST_RATE_DELTA);
                expect(results.userOneValueAfter).to.closeTo(results.userTwoValueAfter, INTEREST_RATE_DELTA);
            });
            it("should liquidate correct amount of assets after a negative rebase", async function () {
                // Change price to make user position unhealthy
                const startingPrice = fromBig(await this.krAsset!.getPrice(), 8);
                const newPrice = startingPrice * 2;
                this.krAsset!.setPrice(newPrice);

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
                while (await hre.Diamond.isAccountLiquidatable(userToLiquidate.address)) {
                    const values = await liquidate(userToLiquidate, this.krAsset, this.krAsset);
                    results.collateralSeized += values.collateralSeized;
                    results.debtRepaid += values.debtRepaid;
                }
                results.userOneValueAfter = fromBig(
                    await hre.Diamond.getAccountCollateralValue(userToLiquidate.address),
                    8,
                );

                results.userOneHFAfter = (await getCR(userToLiquidate.address)) as number;

                // Rebase params
                const denominator = 4;
                const positive = false;
                const rebasePrice = newPrice * denominator;

                // Rebase
                this.krAsset!.setPrice(rebasePrice);
                await this.krAsset!.contract.rebase(toBig(denominator), positive, []);

                expect(await hre.Diamond.isAccountLiquidatable(userToLiquidateTwo.address)).to.be.true;

                // Get values for a liquidation that happens after a rebase
                while (await hre.Diamond.isAccountLiquidatable(userToLiquidateTwo.address)) {
                    const values = await liquidate(userToLiquidateTwo, this.krAsset, this.krAsset);
                    results.collateralSeizedRebase += values.collateralSeized;
                    results.debtRepaidRebase += values.debtRepaid;
                }
                results.userTwoValueAfter = fromBig(
                    await hre.Diamond.getAccountCollateralValue(userToLiquidateTwo.address),
                    8,
                );
                results.userTwoHFAfter = (await getCR(userToLiquidateTwo.address)) as number;
                expect(results.userTwoHFAfter).to.closeTo(results.userOneHFAfter, INTEREST_RATE_DELTA);
                expect(results.collateralSeized / denominator).to.closeTo(
                    results.collateralSeizedRebase,
                    INTEREST_RATE_DELTA,
                );
                expect(results.debtRepaid / denominator).to.closeTo(results.debtRepaidRebase, INTEREST_RATE_DELTA);
                expect(results.userOneValueAfter).to.closeTo(results.userTwoValueAfter, INTEREST_RATE_DELTA);
            });
        });
    });
});
