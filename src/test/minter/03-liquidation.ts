import { fromBig, getNamedEvent, toBig, WAD } from "@kreskolabs/lib";
import {
    defaultCloseFee,
    defaultCollateralArgs,
    defaultKrAssetArgs,
    defaultOpenFee,
    leverageKrAsset,
    Role,
    wrapContractWithSigner,
} from "@test-utils";
import { expect } from "@test/chai";
import { Error } from "@utils/test/errors";
import { depositCollateral, getCollateralConfig } from "@utils/test/helpers/collaterals";
import { mintKrAsset } from "@utils/test/helpers/krassets";
import { getCR, getExpectedMaxLiq, getLiqAmount, liquidate } from "@utils/test/helpers/liquidations";

import { wrapKresko } from "@utils/redstone";
import { BigNumber } from "ethers";
import { Kresko, LiquidationOccurredEvent } from "types/typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const INTEREST_RATE_DELTA = 0.01;
const USD_DELTA = toBig(0.1, "gwei");
const CR_DELTA = 1e-4;

// -------------------------------- Set up mock assets --------------------------------
const collateralArgs = {
    ...defaultCollateralArgs,
    price: 10, // $10
    factor: 1,
    decimals: 18,
};

// Set up mock KreskoAsset
const krAssetArgs = {
    price: 11, // $11
    factor: 1,
    supplyLimit: 100000000,
    closeFee: defaultCloseFee,
    openFee: defaultOpenFee,
};

describe("Minter - Liquidations", function () {
    // withFixture(["minter-test"]);
    let KreskoLiquidator: Kresko;
    let KreskoLiquidatorTwo: Kresko;
    let KreskoUserToLiquidate: Kresko;
    let userToLiquidate: SignerWithAddress;
    let userToLiquidateTwo: SignerWithAddress;
    let Collateral8Dec: TestCollateral;
    let Collateral2: TestCollateral;
    let KreskoAsset2: TestKrAsset;

    this.slow(4000);
    beforeEach(async function () {
        const result = await hre.deployments.fixture("minter-init");
        await time.increase(3602);
        if (result.Diamond) {
            hre.Diamond = wrapKresko(await hre.getContractOrFork("Kresko"));
        }
        this.facets = result.Diamond?.facets?.length ? result.Diamond.facets : [];
        this.collaterals = hre.collaterals;
        this.krAssets = hre.krAssets;

        userToLiquidate = hre.users.testUserEight;
        userToLiquidateTwo = hre.users.testUserNine;
        KreskoLiquidator = wrapKresko(hre.Diamond, hre.users.liquidator);
        KreskoUserToLiquidate = wrapKresko(hre.Diamond, userToLiquidate);
        KreskoLiquidatorTwo = wrapKresko(hre.Diamond, hre.users.userTwo);
        this.collateral = hre.collaterals.find(c => c.deployArgs!.name === defaultCollateralArgs.name)!;
        Collateral2 = hre.collaterals.find(c => c.deployArgs!.name === "MockCollateral2")!;

        Collateral8Dec = hre.collaterals.find(c => c.deployArgs!.name === "MockCollateral8Dec")!;

        KreskoAsset2 = hre.krAssets.find(c => c.deployArgs!.name === "MockKreskoAsset2")!;

        this.krAsset = hre.krAssets.find(c => c.deployArgs!.name === defaultKrAssetArgs.name)!;

        await this.krAsset!.contract.grantRole(Role.OPERATOR, hre.users.deployer.address);
        await Promise.all([
            hre.Diamond.addCollateralAsset(
                this.krAsset!.contract.address,
                ...(await getCollateralConfig(
                    this.krAsset!.contract,
                    this.krAsset!.anchor!.address,
                    toBig(1),
                    toBig(1.05),
                    this.krAsset.mocks.mockFeed.address,
                    "MockKreskoAsset",
                )),
            ),
        ]);

        // -------------------------------- Set up userOne deposit/debt --------------------------------

        await Promise.all([
            this.collateral.update(collateralArgs),
            this.collateral!.setBalance(hre.users.liquidator, toBig(100000000)),
            this.collateral!.mocks!.contract.setVariable("_allowances", {
                [hre.users.liquidator.address]: {
                    [hre.Diamond.address]: toBig(100000000),
                },
            }),
        ]);
        this.krAsset.setPrice(krAssetArgs.price);
        this.collateral.setPrice(collateralArgs.price);
        KreskoAsset2.setPrice(10);
        Collateral2.setPrice(10);
        Collateral8Dec.setPrice(10);
        // Deposit collateral
        this.defaultDepositAmount = 20; // 20 * $10 = $200 in collateral asset value

        await Promise.all([
            this.collateral!.setBalance(hre.users.userOne, toBig(this.defaultDepositAmount)),
            this.collateral!.mocks!.contract.setVariable("_allowances", {
                [hre.users.userOne.address]: {
                    [hre.Diamond.address]: toBig(this.defaultDepositAmount),
                },
            }),
        ]);
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

        const collateralPrice = 10;
        const krAssetPrice = 10;
        const collateralPriceAfter = 135 / (20 * 50);

        // before(async function () {});
        beforeEach(async function () {
            const depositAmountBig18 = toBig(this.defaultDepositAmount * 100);
            user = hre.users.userOne;

            this.collateral!.setPrice(collateralPrice);
            this.krAsset!.setPrice(krAssetPrice);

            await Promise.all([
                this.collateral!.setBalance(hre.users.userOne, depositAmountBig18),
                this.collateral!.mocks!.contract.setVariable("_allowances", {
                    [hre.users.userOne.address]: {
                        [hre.Diamond.address]: depositAmountBig18,
                    },
                }),
            ]);
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

            const [cr, isLiquidatable] = await Promise.all([
                getCR(hre.users.userThree.address),
                hre.Diamond.getAccountLiquidatable(hre.users.userThree.address),
            ]);

            expect(isLiquidatable).to.be.false;
            expect(cr).to.be.equal(2);

            this.collateral.setPrice(5);

            const [crAfter, isLiquidatableAfter, MLV, MLVCalc] = await Promise.all([
                getCR(hre.users.userThree.address),
                hre.Diamond.getAccountLiquidatable(hre.users.userThree.address),
                hre.Diamond.getMaxLiquidation(
                    hre.users.userThree.address,
                    this.krAsset.address,
                    this.collateral.address,
                ),
                getExpectedMaxLiq(hre.users.userThree, this.krAsset, this.collateral),
            ]);

            expect(crAfter).to.be.equal(1);
            expect(isLiquidatableAfter).to.be.true;
            expect(MLVCalc).to.be.closeTo(MLV, USD_DELTA);
        });
        it("calculates correct MLV when kFactor = 1, cFactor = 0.25", async function () {
            await hre.Diamond.updateMinDebtValue(0);
            const userThree = hre.users.userThree;
            const [deposits1, deposits2] = [toBig(10), toBig(10)];
            const borrows = toBig(10);

            const collateralPrice = 10;
            this.collateral.setPrice(collateralPrice);

            await this.collateral.setBalance(userThree, deposits1);
            await Collateral2.setBalance(userThree, deposits2);

            await Promise.all([
                depositCollateral({
                    user: userThree,
                    amount: deposits2,
                    asset: Collateral2,
                }),
                depositCollateral({
                    user: userThree,
                    amount: deposits1,
                    asset: this.collateral,
                }),
            ]);

            await mintKrAsset({
                user: userThree,
                amount: borrows,
                asset: this.krAsset,
            });

            const [cr, isLiquidatable] = await Promise.all([
                getCR(userThree.address),
                hre.Diamond.getAccountLiquidatable(userThree.address),
            ]);

            expect(isLiquidatable).to.be.false;
            expect(cr).to.be.equal(2);
            await this.collateral.update({
                factor: 0.25,
                name: "updated",
                redstoneId: "updated",
            });
            this.collateral.setPrice(5);

            const expectedCR = 1.125;

            const [crAfter, isLiquidatableAfter, MLVAfterC1, MLVAfterC2] = await Promise.all([
                getCR(userThree.address),
                hre.Diamond.getAccountLiquidatable(userThree.address),
                hre.Diamond.getMaxLiquidation(userThree.address, this.krAsset.address, this.collateral.address),
                hre.Diamond.getMaxLiquidation(userThree.address, this.krAsset.address, Collateral2.address),
            ]);

            expect(crAfter).to.be.closeTo(expectedCR, CR_DELTA);
            expect(isLiquidatableAfter).to.be.true;
            expect(MLVAfterC2.gt(MLVAfterC1)).to.be.true;

            await liquidate(userThree, this.krAsset, this.collateral);
            expect(await getCR(userThree.address)).to.be.lessThan(1.4);
            await liquidate(userThree, this.krAsset, Collateral2);

            const [CR, isLiquidatableAfter2] = await Promise.all([
                getCR(userThree.address),
                hre.Diamond.getAccountLiquidatable(userThree.address),
            ]);
            expect(CR).to.be.greaterThan(1.4);
            expect(isLiquidatableAfter2).to.be.false;
        });

        it("calculates correct MLV with single market cdp", async function () {
            await depositCollateral({
                user: hre.users.userOne,
                amount: this.defaultDepositAmount * 49,
                asset: this.collateral!,
            });

            this.collateral!.setPrice(collateralPriceAfter * 0.7);

            expect(await hre.Diamond.getAccountLiquidatable(user.address)).to.be.true;

            const [expectedMaxLiquidatableValue, maxLiquidatableValue] = await Promise.all([
                getExpectedMaxLiq(user, this.krAsset, this.collateral),
                hre.Diamond.getMaxLiquidation(user.address, this.krAsset!.address, this.collateral.address),
            ]);

            expect(expectedMaxLiquidatableValue.gt(0)).to.be.true;

            expect(expectedMaxLiquidatableValue).to.be.closeTo(maxLiquidatableValue, USD_DELTA);
        });

        it("calculates correct MLV with multiple cdps", async function () {
            await Collateral8Dec.setBalance(hre.users.userOne, toBig(this.defaultDepositAmount * 100, 8));
            await Collateral8Dec.mocks!.contract.setVariable("_allowances", {
                [hre.users.userOne.address]: {
                    [hre.Diamond.address]: toBig(this.defaultDepositAmount * 100, 8),
                },
            });
            await Promise.all([
                depositCollateral({
                    user: hre.users.userOne,
                    amount: this.defaultDepositAmount * 49,
                    asset: this.collateral,
                }),
                depositCollateral({
                    user: hre.users.userOne,
                    amount: toBig(0.1, 8),
                    asset: Collateral8Dec,
                }),
            ]);

            this.collateral.setPrice(collateralPriceAfter);
            expect(await hre.Diamond.getAccountLiquidatable(user.address)).to.be.true;

            const [
                expectedMaxLiquidatableValue,
                maxLiquidatableValue,
                expectedMaxLiquidatableValueNewCollateral,
                maxLiquidatableValueNewCollateral,
            ] = await Promise.all([
                getExpectedMaxLiq(user, this.krAsset, this.collateral),
                hre.Diamond.getMaxLiquidation(user.address, this.krAsset!.address, this.collateral.address),
                getExpectedMaxLiq(user, this.krAsset, Collateral8Dec),
                hre.Diamond.getMaxLiquidation(user.address, this.krAsset!.address, Collateral8Dec.address),
            ]);
            expect(expectedMaxLiquidatableValue.gt(0)).to.be.true;

            expect(expectedMaxLiquidatableValue).to.be.closeTo(maxLiquidatableValue, USD_DELTA);

            expect(expectedMaxLiquidatableValueNewCollateral.gt(0)).to.be.true;

            expect(expectedMaxLiquidatableValueNewCollateral).to.be.closeTo(
                maxLiquidatableValueNewCollateral,
                USD_DELTA,
            );
        });
    });

    describe("#liquidation", () => {
        describe("#isAccountLiquidatable", () => {
            it("should identify accounts below their liquidation threshold", async function () {
                const [minCollateralUSD, initialCanLiquidate] = await Promise.all([
                    hre.Diamond.getAccountMinCollateralAtRatio(
                        hre.users.userOne.address,
                        hre.Diamond.getLiquidationThreshold(),
                    ),
                    hre.Diamond.getAccountLiquidatable(hre.users.userOne.address),
                ]);

                expect(this.defaultDepositAmount * this.collateral!.deployArgs!.price > fromBig(minCollateralUSD, 8));

                // The account should be NOT liquidatable as collateral value ($200) >= min collateral value ($154)
                // const initialCanLiquidate = await hre.Diamond.getAccountLiquidatable(hre.users.userOne.address);
                expect(initialCanLiquidate).to.equal(false);

                // Update collateral price to $7.5
                const newCollateralPrice = 7.5;
                this.collateral!.setPrice(newCollateralPrice);

                const [, newCollateralOraclePrice] = await hre.Diamond.getCollateralAmountToValue(
                    this.collateral!.address,
                    toBig(1),
                    true,
                );
                expect(fromBig(newCollateralOraclePrice, 8)).to.equal(newCollateralPrice);

                // The account should be liquidatable as collateral value ($140) < min collateral value ($154)
                const secondaryCanLiquidate = await hre.Diamond.getAccountLiquidatable(hre.users.userOne.address);
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
                // Fetch pre-liquidation state for users and contracts
                const beforeUserOneCollateralAmount = await hre.Diamond.getAccountCollateralAmount(
                    hre.users.userOne.address,
                    this.collateral!.address,
                );
                const beforeUserOneDebtAmount = await hre.Diamond.getAccountDebtAmount(
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
                const afterUserOneDebtAmount = await hre.Diamond.getAccountDebtAmount(
                    hre.users.userOne.address,
                    this.krAsset!.address,
                );
                expect(afterUserOneDebtAmount.eq(beforeUserOneDebtAmount.sub(maxRepayAmount)));

                // Confirm that some of the liquidated user's collateral has been seized
                const afterUserOneCollateralAmount = await hre.Diamond.getAccountCollateralAmount(
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

            it("should liquidate up to MLR with a single CDP", async function () {
                this.collateral.setPrice(16.5);
                const userThree = hre.users.userThree;
                const deposits = toBig(10);
                const borrows = toBig(10);

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

                expect(await hre.Diamond.getAccountLiquidatable(userThree.address)).to.be.false;
                this.collateral.setPrice(14);

                expect(await hre.Diamond.getAccountLiquidatable(userThree.address)).to.be.true;

                const MLR = await hre.Diamond.getMaxLiquidationRatio();
                await liquidate(userThree, this.krAsset, this.collateral);

                expect(await getCR(userThree.address, true)).to.be.closeTo(MLR, toBig(CR_DELTA));
                expect(await hre.Diamond.getAccountLiquidatable(userThree.address)).to.be.false;
            });

            it("should liquidate up to MLR with multiple CDPs", async function () {
                const userThree = hre.users.userThree;
                const [deposits1, deposits2] = [toBig(10), toBig(5)];
                const borrows = toBig(10);

                this.collateral.setPrice(10);
                this.krAsset.setPrice(10);
                await this.collateral.setBalance(userThree, deposits1);
                await Collateral2.setBalance(userThree, deposits2);
                await Promise.all([
                    depositCollateral({
                        user: userThree,
                        amount: deposits1,
                        asset: this.collateral,
                    }),
                    depositCollateral({
                        user: userThree,
                        amount: deposits2,
                        asset: Collateral2,
                    }),
                ]);
                await mintKrAsset({
                    user: userThree,
                    amount: borrows,
                    asset: this.krAsset,
                });
                expect(await hre.Diamond.getAccountLiquidatable(userThree.address)).to.be.false;

                // seemingly random order of updates to test that the liquidation works regardless
                this.collateral.setPrice(6.25);

                await Promise.all([
                    Collateral2.update({
                        factor: 0.975,
                        name: "MockCollateral2",
                        redstoneId: "MockCollateral2",
                    }),
                    this.krAsset.update({
                        factor: 1.05,
                        name: "MockKreskoAsset",
                        closeFee: 0.02,
                        openFee: 0,
                        supplyLimit: 1_000_000,
                        redstoneId: "MockKreskoAsset",
                    }),
                ]);
                const [CRUserThree1, isLiquidatable1] = await Promise.all([
                    getCR(userThree.address),
                    hre.Diamond.getAccountLiquidatable(userThree.address),
                ]);
                expect(CRUserThree1).to.be.greaterThan(1.05);

                expect(isLiquidatable1).to.be.true;

                await liquidate(userThree, this.krAsset, this.collateral, true);

                const [CRUserThree2, isLiquidatable2] = await Promise.all([
                    getCR(userThree.address),
                    hre.Diamond.getAccountLiquidatable(userThree.address),
                ]);

                expect(CRUserThree2).to.be.lessThan(1.4);
                expect(isLiquidatable2).to.be.true;

                await liquidate(userThree, this.krAsset, Collateral2);
                expect(await getCR(userThree.address, true)).to.be.closeTo(
                    await hre.Diamond.getMaxLiquidationRatio(),
                    toBig(CR_DELTA),
                );
                // expect(await hre.Diamond.getAccountLiquidatable(userThree.address)).to.be.false;
            });

            it("should emit LiquidationOccurred event", async function () {
                // Attempt liquidation
                await this.krAsset.update({
                    name: "MockKreskoAsset",
                    factor: 1.5,
                    supplyLimit: 10000000,
                    closeFee: 0.05,
                    openFee: 0,
                    redstoneId: "MockKreskoAsset",
                });
                const [collateralIndex, mintedKreskoAssetIndex, maxLiqValue, krAssetPrice] = await Promise.all([
                    hre.Diamond.getAccountDepositIndex(hre.users.userOne.address, this.collateral!.address),
                    hre.Diamond.getAccountMintIndex(hre.users.userOne.address, this.krAsset!.address),
                    hre.Diamond.getMaxLiquidation(
                        hre.users.userOne.address,
                        this.krAsset!.address,
                        this.collateral.address,
                    ),
                    this.krAsset!.getPrice(),
                ]);

                const repayAmount = maxLiqValue.wadDiv(krAssetPrice);
                const tx = await wrapContractWithSigner(hre.Diamond, hre.users.userTwo).liquidate(
                    hre.users.userOne.address,
                    this.krAsset!.address,
                    repayAmount,
                    this.collateral!.address,
                    mintedKreskoAssetIndex,
                    collateralIndex,
                    false,
                );

                const event = await getNamedEvent<LiquidationOccurredEvent>(tx, "LiquidationOccurred");

                expect(event.args.account).to.equal(hre.users.userOne.address);
                expect(event.args.liquidator).to.equal(hre.users.userTwo.address);
                expect(event.args.repayKreskoAsset).to.equal(this.krAsset!.address);
                expect(event.args.repayAmount).to.equal(repayAmount);
                expect(event.args.seizedCollateralAsset).to.equal(this.collateral!.address);
            });

            it("should not allow liquidations of healthy accounts", async function () {
                // Update collateral price from $5 to $10
                const newCollateralPrice = 10;
                this.collateral!.setPrice(newCollateralPrice);

                // Confirm that the account has sufficient collateral to not be liquidated

                const [minimumCollateralUSDValueRequired, currUserOneCollateralAmount, canLiquidate] =
                    await Promise.all([
                        hre.Diamond.getAccountMinCollateralAtRatio(
                            hre.users.userOne.address,
                            hre.Diamond.getLiquidationThreshold(),
                        ),
                        hre.Diamond.getAccountCollateralAmount(hre.users.userOne.address, this.collateral!.address),
                        hre.Diamond.getAccountLiquidatable(hre.users.userOne.address),
                    ]);

                expect(
                    fromBig(currUserOneCollateralAmount) * newCollateralPrice >
                        fromBig(minimumCollateralUSDValueRequired, 8),
                );
                expect(canLiquidate).to.equal(false);

                const repayAmount = 10;
                const mintedKreskoAssetIndex = 0;
                const depositedCollateralAssetIndex = 0;
                await expect(
                    KreskoLiquidatorTwo.liquidate(
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
                    KreskoLiquidatorTwo.liquidate(
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
                const krAssetDebtUserOne = await hre.Diamond.getAccountDebtAmount(
                    hre.users.userOne.address,
                    this.krAsset!.address,
                );

                // Ensure we are repaying more than debt
                const repayAmount = krAssetDebtUserOne.add(toBig(1));

                // Liquidation should fail
                await expect(
                    KreskoLiquidatorTwo.liquidate(
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
                const maxLiquidationUSD = await hre.Diamond.getMaxLiquidation(
                    hre.users.userOne.address,
                    this.krAsset!.address,
                    this.collateral.address,
                );

                const repaymentAmount = maxLiquidationUSD.add((1e9).toString()).wadDiv(await this.krAsset.getPrice());

                // Ensure liquidation cannot happen
                const tx = await KreskoLiquidatorTwo.liquidate(
                    hre.users.userOne.address,
                    this.krAsset!.address,
                    repaymentAmount,
                    this.collateral!.address,
                    0,
                    0,
                    false,
                );

                const event = await getNamedEvent<LiquidationOccurredEvent>(tx, "LiquidationOccurred");

                const assetInfo = await this.collateral.kresko();
                const expectedSeizedCollateralAmount = maxLiquidationUSD
                    .wadMul(BigNumber.from(assetInfo.liquidationIncentive))
                    .wadDiv(await this.collateral.getPrice());

                expect(event.args.account).to.equal(hre.users.userOne.address);
                expect(event.args.liquidator).to.equal(hre.users.userTwo.address);
                expect(event.args.repayKreskoAsset).to.equal(this.krAsset!.address);
                expect(event.args.seizedCollateralAsset).to.equal(this.collateral!.address);

                expect(event.args.repayAmount).to.not.equal(repaymentAmount);
                expect(event.args.repayAmount).to.be.closeTo(
                    maxLiquidationUSD.wadDiv(await this.krAsset.getPrice()),
                    1e12,
                );
                expect(event.args.collateralSent).to.be.closeTo(expectedSeizedCollateralAmount, 1e12);
            });

            it("should not allow liquidations when account is under MCR but not under liquidation threshold", async function () {
                this.collateral!.setPrice(this.collateral!.deployArgs!.price);

                expect(await hre.Diamond.getAccountLiquidatable(hre.users.userOne.address)).to.be.false;

                const minCollateralUSD = await hre.Diamond.getAccountMinCollateralAtRatio(
                    hre.users.userOne.address,
                    hre.Diamond.getMinCollateralRatio(),
                );
                const liquidationThresholdUSD = await hre.Diamond.getAccountMinCollateralAtRatio(
                    hre.users.userOne.address,
                    hre.Diamond.getLiquidationThreshold(),
                );
                this.collateral!.setPrice(this.collateral!.deployArgs!.price * 0.775);

                const accountCollateralValue = await hre.Diamond.getAccountCollateralValue(hre.users.userOne.address);

                expect(accountCollateralValue.lt(minCollateralUSD)).to.be.true;
                expect(accountCollateralValue.gt(liquidationThresholdUSD)).to.be.true;
                expect(await hre.Diamond.getAccountLiquidatable(hre.users.userOne.address)).to.be.false;
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
                await KreskoLiquidatorTwo.liquidate(
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
                    KreskoLiquidatorTwo.liquidate(
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
                    wrapKresko(hre.Diamond, hre.users.userOne).liquidate(
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

                expect(await hre.Diamond.getAccountLiquidatable(userThree.address)).to.be.true;

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
                        hre.Diamond.getAccountMintIndex(userThree.address, this.krAsset.address),
                        hre.Diamond.getAccountDepositIndex(userThree.address, this.collateral.address),
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

                expect(await hre.Diamond.getAccountLiquidatable(userThree.address)).to.be.true;

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
                    KreskoLiquidator.liquidate(
                        userThree.address,
                        this.krAsset.address,
                        liqAmount,
                        this.collateral.address,
                        hre.Diamond.getAccountMintIndex(userThree.address, this.krAsset.address),
                        hre.Diamond.getAccountDepositIndex(userThree.address, this.collateral.address),
                        allowSeizeUnderflow,
                    ),
                ).to.not.be.reverted;
            });
        });
        describe("#liquidate - rebasing events", () => {
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
                this.collateral!.setPrice(collateralPrice);
                this.krAsset!.setPrice(krAssetPrice);
                await this.collateral.setBalance(hre.users.liquidator, liquidatorAmounts.collateralDeposits);
                // Deposit collateral for liquidator
                await this.collateral!.contract.connect(hre.users.liquidator).approve(
                    hre.Diamond.address,
                    hre.ethers.constants.MaxUint256,
                );
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
            });

            it("should setup correct", async function () {
                const [mcr, cr1, cr2, liquidatable1, liquidatable2] = await Promise.all([
                    hre.Diamond.getMinCollateralRatio(),
                    getCR(userToLiquidate.address),
                    getCR(userToLiquidateTwo.address),
                    hre.Diamond.getAccountLiquidatable(userToLiquidate.address),
                    hre.Diamond.getAccountLiquidatable(userToLiquidateTwo.address),
                ]);
                const mcrDecimal = fromBig(mcr, 18);
                expect(cr1).to.closeTo(mcrDecimal, 0.001);
                expect(cr2).to.closeTo(mcrDecimal, 0.001);

                expect(liquidatable1).to.be.false;
                expect(liquidatable2).to.be.false;
            });

            it("should not allow liquidation of healthy accounts after a positive rebase", async function () {
                // Rebase params
                const denominator = 4;
                const positive = true;
                const rebasePrice = fromBig(await this.krAsset!.getPrice(), 8) / denominator;

                this.krAsset!.setPrice(rebasePrice);
                await this.krAsset!.contract.rebase(toBig(denominator), positive, []);

                expect(await hre.Diamond.getAccountLiquidatable(userToLiquidate.address)).to.be.false;
                await expect(
                    KreskoLiquidator.liquidate(
                        userToLiquidate.address,
                        this.krAsset!.address,
                        1,
                        this.collateral!.address,
                        hre.Diamond.getAccountMintIndex(userToLiquidate.address, this.krAsset!.address),
                        hre.Diamond.getAccountDepositIndex(userToLiquidate.address, this.collateral!.address),
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

                expect(await hre.Diamond.getAccountLiquidatable(userToLiquidate.address)).to.be.false;

                await expect(
                    KreskoLiquidator.liquidate(
                        userToLiquidate.address,
                        this.krAsset!.address,
                        1,
                        this.collateral!.address,
                        hre.Diamond.getAccountMintIndex(userToLiquidate.address, this.krAsset!.address),
                        hre.Diamond.getAccountDepositIndex(userToLiquidate.address, this.collateral!.address),
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

                expect(await hre.Diamond.getAccountLiquidatable(userToLiquidate.address)).to.be.false;

                this.collateral!.setPrice(5);
                expect(await hre.Diamond.getAccountLiquidatable(userToLiquidate.address)).to.be.true;
                await expect(liquidate(userToLiquidate, this.krAsset, this.collateral, true)).to.not.be.reverted;
            });
            it("should allow liquidations of unhealthy accounts after a negative rebase", async function () {
                // Rebase params
                const denominator = 4;
                const positive = false;
                const rebasePrice = fromBig(await this.krAsset!.getPrice(), 8) * denominator;

                this.krAsset!.setPrice(rebasePrice);
                await this.krAsset!.contract.rebase(toBig(denominator), positive, []);

                expect(await hre.Diamond.getAccountLiquidatable(userToLiquidate.address)).to.be.false;

                this.krAsset!.setPrice(rebasePrice * 2);
                expect(await hre.Diamond.getAccountLiquidatable(userToLiquidate.address)).to.be.true;
                await expect(liquidate(userToLiquidate, this.krAsset, this.collateral, true)).to.not.be.reverted;
            });
            it("should liquidate krAsset collaterals up to min amount", async function () {
                // Change price to make user position unhealthy
                const startingPrice = fromBig(await this.krAsset!.getPrice(), 8);
                const newPrice = startingPrice * 10;
                const userKresko = wrapContractWithSigner(hre.Diamond, userToLiquidate);
                await this.collateral.setBalance(userToLiquidate, toBig(100));

                await userKresko.depositCollateral(userToLiquidate.address, this.collateral.address, toBig(100));
                await userKresko.mintKreskoAsset(userToLiquidate.address, KreskoAsset2.address, toBig(65));
                this.krAsset!.setPrice(newPrice);

                const deposits = await hre.Diamond.getAccountCollateralAmount(
                    userToLiquidate.address,
                    this.krAsset!.address,
                );

                const [debt, liqAmount] = await Promise.all([
                    hre.Diamond.getAccountDebtAmount(userToLiquidate.address, this.krAsset!.address),
                    getLiqAmount(userToLiquidate, this.krAsset, this.krAsset),
                ]);

                expect(deposits).to.equal(liqAmount);
                expect(debt).to.gte(liqAmount);

                const [assetInfoCollateral, assetInfoKr] = await Promise.all([
                    hre.Diamond.getCollateralAsset(this.krAsset!.address),
                    hre.Diamond.getKreskoAsset(this.krAsset!.address),
                    this.krAsset.setBalance(hre.users.liquidator, debt),
                ]);

                const liquidationAmount = liqAmount
                    .add("263684912200000000")
                    .wadDiv(assetInfoCollateral.liquidationIncentive)
                    .wadMul(BigNumber.from(WAD).sub(assetInfoKr.closeFee))
                    .add(WAD);

                await KreskoLiquidator.liquidate(
                    userToLiquidate.address,
                    this.krAsset!.address,
                    liquidationAmount,
                    this.krAsset!.address,
                    hre.Diamond.getAccountMintIndex(userToLiquidate.address, this.krAsset!.address),
                    hre.Diamond.getAccountDepositIndex(userToLiquidate.address, this.krAsset!.address),
                    false,
                );

                const depositsAfter = await hre.Diamond.getAccountCollateralAmount(
                    userToLiquidate.address,
                    this.krAsset!.address,
                );

                expect(depositsAfter).to.equal((1e12).toString());
            });
            it("should liquidate krAsset collaterals to 0", async function () {
                // Change price to make user position unhealthy
                const startingPrice = fromBig(await this.krAsset!.getPrice(), 8);
                const newPrice = startingPrice * 10;

                await this.collateral.setBalance(userToLiquidate, toBig(100));
                await KreskoUserToLiquidate.depositCollateral(
                    userToLiquidate.address,
                    this.collateral.address,
                    toBig(100),
                );
                await KreskoUserToLiquidate.mintKreskoAsset(userToLiquidate.address, KreskoAsset2.address, toBig(65));
                this.krAsset!.setPrice(newPrice);

                const deposits = await hre.Diamond.getAccountCollateralAmount(
                    userToLiquidate.address,
                    this.krAsset!.address,
                );
                const debt = await hre.Diamond.getAccountDebtAmount(userToLiquidate.address, this.krAsset!.address);
                const liqAmount = await getLiqAmount(userToLiquidate, this.krAsset, this.krAsset);

                expect(deposits).to.equal(liqAmount);
                expect(debt).to.gte(liqAmount);
                await this.krAsset.setBalance(hre.users.liquidator, debt);

                const assetInfoCollateral = await hre.Diamond.getCollateralAsset(this.krAsset!.address);
                const assetInfoKr = await hre.Diamond.getKreskoAsset(this.krAsset!.address);

                const liquidationAmount = liqAmount
                    .add("263684912400000000")
                    .wadDiv(assetInfoCollateral.liquidationIncentive)
                    .wadMul(BigNumber.from(WAD).sub(assetInfoKr.closeFee))
                    .add(WAD);

                await KreskoLiquidator.liquidate(
                    userToLiquidate.address,
                    this.krAsset!.address,
                    liquidationAmount,
                    this.krAsset!.address,
                    hre.Diamond.getAccountMintIndex(userToLiquidate.address, this.krAsset!.address),
                    hre.Diamond.getAccountDepositIndex(userToLiquidate.address, this.krAsset!.address),
                    false,
                );

                const depositsAfter = await hre.Diamond.getAccountCollateralAmount(
                    userToLiquidate.address,
                    this.krAsset!.address,
                );

                expect(depositsAfter).to.equal(0);
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
                while (await hre.Diamond.getAccountLiquidatable(userToLiquidate.address)) {
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

                expect(await hre.Diamond.getAccountLiquidatable(userToLiquidateTwo.address)).to.be.true;
                // Get values for a liquidation that happens after a rebase
                while (await hre.Diamond.getAccountLiquidatable(userToLiquidateTwo.address)) {
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
                while (await hre.Diamond.getAccountLiquidatable(userToLiquidate.address)) {
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

                expect(await hre.Diamond.getAccountLiquidatable(userToLiquidateTwo.address)).to.be.true;

                // Get values for a liquidation that happens after a rebase
                while (await hre.Diamond.getAccountLiquidatable(userToLiquidateTwo.address)) {
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
