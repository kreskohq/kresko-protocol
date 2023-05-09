import {
    defaultCloseFee,
    defaultCollateralArgs,
    defaultKrAssetArgs,
    defaultOpenFee,
    getHealthFactor,
    leverageKrAsset,
    Role,
    withFixture,
} from "@test-utils";
import { expect } from "@test/chai";

import { fromBig, getInternalEvent, toBig, toFixedPoint } from "@kreskolabs/lib";
import { Error } from "@utils/test/errors";
import { addMockCollateralAsset, depositCollateral } from "@utils/test/helpers/collaterals";
import { mintKrAsset } from "@utils/test/helpers/krassets";
import { calcExpectedMaxLiquidatableValue, liquidate } from "@utils/test/helpers/liquidations";
import hre from "hardhat";
import { MinterEvent__factory } from "types/typechain";
import { LiquidationOccurredEvent } from "types/typechain/src/contracts/libs/Events.sol/MinterEvent";

const INTEREST_RATE_DELTA = 0.01;
const USD_DELTA = toBig(0.1, "gwei");
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
        await hre.Diamond.connect(hre.users.deployer).addCollateralAsset(
            this.krAsset!.contract.address,
            this.krAsset!.anchor!.address,
            toFixedPoint(1),
            toFixedPoint(1.05),
            assetInfo.oracle,
            assetInfo.oracle,
        );

        // -------------------------------- Set up userOne deposit/debt --------------------------------

        await this.collateral!.setBalance(hre.users.liquidator, hre.toBig(100000000));
        await this.collateral!.mocks!.contract.setVariable("_allowances", {
            [hre.users.liquidator.address]: {
                [hre.Diamond.address]: hre.toBig(100000000),
            },
        });
        // Deposit collateral
        this.defaultDepositAmount = 20; // 20 * $10 = $200 in collateral asset value
        await this.collateral!.setBalance(hre.users.userOne, hre.toBig(this.defaultDepositAmount));
        await this.collateral!.mocks!.contract.setVariable("_allowances", {
            [hre.users.userOne.address]: {
                [hre.Diamond.address]: hre.toBig(this.defaultDepositAmount),
            },
        });
        await depositCollateral({
            user: hre.users.userOne,
            amount: this.defaultDepositAmount,
            asset: this.collateral,
        });

        // // Mint KrAsset
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
            user = hre.users.userOne;
            this.collateral!.setPrice(collateralPrice);
            this.krAsset!.setPrice(krAssetPrice);
            await this.collateral!.setBalance(hre.users.userOne, hre.toBig(this.defaultDepositAmount * 100));
            await this.collateral!.mocks!.contract.setVariable("_allowances", {
                [hre.users.userOne.address]: {
                    [hre.Diamond.address]: hre.toBig(this.defaultDepositAmount * 100),
                },
            });

            newCollateral = await addMockCollateralAsset({
                name: "Coll",
                decimals: 8,
                price: 10,
                factor: 0.9,
            });
            await newCollateral.setBalance(hre.users.userOne, hre.toBig(this.defaultDepositAmount * 100, 8));
            await newCollateral.mocks!.contract.setVariable("_allowances", {
                [hre.users.userOne.address]: {
                    [hre.Diamond.address]: hre.toBig(this.defaultDepositAmount * 100, 8),
                },
            });
        });

        it("calculates correct max liquidation with single market cdp", async function () {
            await depositCollateral({
                user: hre.users.userOne,
                amount: this.defaultDepositAmount * 49,
                asset: this.collateral!,
            });

            this.collateral!.setPrice(collateralPriceAfter * 0.7);

            expect(await hre.Diamond.isAccountLiquidatable(user.address)).to.be.true;

            const expectedMaxLiquidatableValue = await calcExpectedMaxLiquidatableValue(
                user,
                this.krAsset,
                this.collateral,
            );

            expect(expectedMaxLiquidatableValue.gt(0)).to.be.true;
            const maxLiquidatableValue = await hre.Diamond.calculateMaxLiquidatableValueForAssets(
                user.address,
                this.krAsset!.address,
                this.collateral.address,
            );

            expect(expectedMaxLiquidatableValue).to.be.closeTo(maxLiquidatableValue.rawValue, USD_DELTA);
        });

        it("calculates correct max liquidation with multiple cdps", async function () {
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

            const expectedMaxLiquidatableValue = await calcExpectedMaxLiquidatableValue(
                user,
                this.krAsset,
                this.collateral,
            );
            expect(expectedMaxLiquidatableValue.gt(0)).to.be.true;
            const maxLiquidatableValue = await hre.Diamond.calculateMaxLiquidatableValueForAssets(
                user.address,
                this.krAsset!.address,
                this.collateral.address,
            );

            expect(expectedMaxLiquidatableValue).to.be.closeTo(maxLiquidatableValue.rawValue, USD_DELTA);

            const expectedMaxLiquidatableValueNewCollateral = await calcExpectedMaxLiquidatableValue(
                user,
                this.krAsset,
                newCollateral,
            );

            expect(expectedMaxLiquidatableValueNewCollateral.gt(0)).to.be.true;
            const maxLiquidatableValueNewCollateral = await hre.Diamond.calculateMaxLiquidatableValueForAssets(
                user.address,
                this.krAsset!.address,
                this.collateral.address,
            );

            expect(expectedMaxLiquidatableValueNewCollateral).to.be.closeTo(
                maxLiquidatableValueNewCollateral.rawValue,
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
                expect(
                    this.defaultDepositAmount * this.collateral!.deployArgs!.price >
                        hre.fromBig(minCollateralUSD.rawValue, 8),
                );

                // The account should be NOT liquidatable as collateral value ($200) >= min collateral value ($154)
                const initialCanLiquidate = await hre.Diamond.isAccountLiquidatable(hre.users.userOne.address);
                expect(initialCanLiquidate).to.equal(false);

                // Update collateral price to $7.5
                const newCollateralPrice = 7.5;
                this.collateral!.setPrice(newCollateralPrice);

                const [, newCollateralOraclePrice] = await hre.Diamond.getCollateralValueAndOraclePrice(
                    this.collateral!.address,
                    hre.toBig(1),
                    true,
                );
                expect(hre.fromBig(newCollateralOraclePrice.rawValue, 8)).to.equal(newCollateralPrice);

                // The account should be liquidatable as collateral value ($140) < min collateral value ($154)
                const secondaryCanLiquidate = await hre.Diamond.isAccountLiquidatable(hre.users.userOne.address);
                expect(secondaryCanLiquidate).to.equal(true);
            });
        });

        describe("#liquidate", () => {
            beforeEach(async function () {
                // Grant userTwo tokens to use for liquidation
                await this.krAsset!.mocks.contract.setVariable("_balances", {
                    [hre.users.userTwo.address]: hre.toBig(10000),
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
                const maxLiq = await hre.Diamond.calculateMaxLiquidatableValueForAssets(
                    hre.users.userOne.address,
                    this.krAsset!.address,
                    this.collateral.address,
                );
                const maxRepayAmount = hre.toBig(Number(maxLiq.rawValue.div(await this.krAsset!.getPrice())));
                const mintedKreskoAssetIndex = 0;
                const depositedCollateralAssetIndex = 0;
                await hre.Diamond.connect(hre.users.userTwo).liquidate(
                    hre.users.userOne.address,
                    this.krAsset!.address,
                    maxRepayAmount,
                    this.collateral!.address,
                    mintedKreskoAssetIndex,
                    depositedCollateralAssetIndex,
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

                const maxLiqValue = fromBig(
                    (
                        await hre.Diamond.calculateMaxLiquidatableValueForAssets(
                            hre.users.userOne.address,
                            this.krAsset!.address,
                            this.collateral.address,
                        )
                    ).rawValue,
                    8,
                );
                const repayAmount = toBig(maxLiqValue / (+(await this.krAsset!.getPrice()) / 1e8));
                const tx = await hre.Diamond.connect(hre.users.userTwo).liquidate(
                    hre.users.userOne.address,
                    this.krAsset!.address,
                    repayAmount,
                    this.collateral!.address,
                    mintedKreskoAssetIndex,
                    collateralIndex,
                );

                const event = await getInternalEvent<LiquidationOccurredEvent["args"]>(
                    tx,
                    MinterEvent__factory.connect(hre.Diamond.address, hre.users.userTwo),
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
                    hre.fromBig(currUserOneCollateralAmount) * newCollateralPrice >
                        hre.fromBig(minimumCollateralUSDValueRequired.rawValue, 8),
                );

                const canLiquidate = await hre.Diamond.isAccountLiquidatable(hre.users.userOne.address);
                expect(canLiquidate).to.equal(false);

                const repayAmount = 10;
                const mintedKreskoAssetIndex = 0;
                const depositedCollateralAssetIndex = 0;
                await expect(
                    hre.Diamond.connect(hre.users.userTwo).liquidate(
                        hre.users.userOne.address,
                        this.krAsset!.address,
                        repayAmount,
                        this.collateral!.address,
                        mintedKreskoAssetIndex,
                        depositedCollateralAssetIndex,
                    ),
                ).to.be.revertedWith(Error.NOT_LIQUIDATABLE);
            });

            it("should not allow liquidations if repayment amount is 0", async function () {
                // Liquidation should fail
                const repayAmount = 0;
                await expect(
                    hre.Diamond.connect(hre.users.userTwo).liquidate(
                        hre.users.userOne.address,
                        this.krAsset!.address,
                        repayAmount,
                        this.collateral!.address,
                        0,
                        0,
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
                const repayAmount = krAssetDebtUserOne.add(hre.toBig(1));

                // Liquidation should fail
                await expect(
                    hre.Diamond.connect(hre.users.userTwo).liquidate(
                        hre.users.userOne.address,
                        this.krAsset!.address,
                        repayAmount,
                        this.collateral!.address,
                        0,
                        0,
                    ),
                ).to.be.revertedWith(Error.KRASSET_BURN_AMOUNT_OVERFLOW);
            });

            it("should not allow liquidations with USD value greater than the USD value required for regaining healthy position", async function () {
                const maxLiquidation = hre.fromBig(
                    (
                        await hre.Diamond.calculateMaxLiquidatableValueForAssets(
                            hre.users.userOne.address,
                            this.krAsset!.address,
                            this.collateral.address,
                        )
                    ).rawValue,
                    8,
                );
                const repaymentAmount = hre.toBig((maxLiquidation + 1) / this.krAsset!.deployArgs!.price);
                // Ensure liquidation cannot happen
                await expect(
                    hre.Diamond.connect(hre.users.userTwo).liquidate(
                        hre.users.userOne.address,
                        this.krAsset!.address,
                        repaymentAmount,
                        this.collateral!.address,
                        0,
                        0,
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

                expect(accountCollateralValue.rawValue.lt(minCollateralUSD.rawValue)).to.be.true;
                expect(accountCollateralValue.rawValue.gt(liquidationThresholdUSD.rawValue)).to.be.true;
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
                await hre.Diamond.connect(hre.users.userTwo).liquidate(
                    hre.users.userOne.address,
                    this.krAsset!.address,
                    repayAmount,
                    this.collateral!.address,
                    mintedKreskoAssetIndex,
                    depositedCollateralAssetIndex,
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
                    hre.Diamond.connect(hre.users.userTwo).liquidate(
                        hre.users.userOne.address,
                        this.krAsset!.address,
                        repayAmount,
                        this.collateral!.address,
                        mintedKreskoAssetIndex,
                        depositedCollateralAssetIndex,
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
                    hre.Diamond.connect(hre.users.userOne).liquidate(
                        hre.users.userOne.address,
                        this.krAsset!.address,
                        repayAmount,
                        this.collateral!.address,
                        0,
                        0,
                    ),
                ).to.be.revertedWith(Error.SELF_LIQUIDATION);
            });
        });
        describe("#liquidate - rebasing events", () => {
            let userToLiquidate: SignerWithAddress;
            let userToLiquidateTwo: SignerWithAddress;
            const collateralPrice = 10;
            const krAssetPrice = 1;
            const thousand = hre.toBig(1000);
            const liquidatorAmounts = {
                collateralDeposits: thousand,
            };
            const userToLiquidateAmounts = {
                krAssetCollateralDeposits: thousand,
            };

            beforeEach(async function () {
                userToLiquidate = hre.users.userThree;
                userToLiquidateTwo = hre.users.userFour;
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

                // 1.5 = collateral value === debt value * MCR
                expect(await getHealthFactor(userToLiquidate)).to.lessThanOrEqual(1.51);
                expect(await getHealthFactor(userToLiquidateTwo)).to.lessThanOrEqual(1.51);
                // not liquidatable
                expect(await hre.Diamond.isAccountLiquidatable(userToLiquidate.address)).to.be.false;
                expect(await hre.Diamond.isAccountLiquidatable(userToLiquidateTwo.address)).to.be.false;
            });
            it("should not allow liquidation of healthy accounts after a positive rebase", async function () {
                // Rebase params
                const denominator = 4;
                const positive = true;
                const rebasePrice = hre.fromBig(await this.krAsset!.getPrice(), 8) / denominator;

                this.krAsset!.setPrice(rebasePrice);
                await this.krAsset!.contract.rebase(hre.toBig(denominator), positive, []);

                expect(await hre.Diamond.isAccountLiquidatable(userToLiquidate.address)).to.be.false;
                await expect(
                    hre.Diamond.connect(hre.users.liquidator).liquidate(
                        userToLiquidate.address,
                        this.krAsset!.address,
                        1,
                        this.collateral!.address,
                        await hre.Diamond.getMintedKreskoAssetsIndex(userToLiquidate.address, this.krAsset!.address),
                        await hre.Diamond.getDepositedCollateralAssetIndex(
                            userToLiquidate.address,
                            this.collateral!.address,
                        ),
                    ),
                ).to.be.revertedWith(Error.NOT_LIQUIDATABLE);
            });

            it("should not allow liquidation of healthy accounts after a negative rebase", async function () {
                // Rebase params
                const denominator = 4;
                const positive = false;
                const rebasePrice = hre.fromBig(await this.krAsset!.getPrice(), 8) * denominator;

                this.krAsset!.setPrice(rebasePrice);
                await this.krAsset!.contract.rebase(hre.toBig(denominator), positive, []);

                expect(await hre.Diamond.isAccountLiquidatable(userToLiquidate.address)).to.be.false;

                await expect(
                    hre.Diamond.connect(hre.users.liquidator).liquidate(
                        userToLiquidate.address,
                        this.krAsset!.address,
                        1,
                        this.collateral!.address,
                        await hre.Diamond.getMintedKreskoAssetsIndex(userToLiquidate.address, this.krAsset!.address),
                        await hre.Diamond.getDepositedCollateralAssetIndex(
                            userToLiquidate.address,
                            this.collateral!.address,
                        ),
                    ),
                ).to.be.revertedWith(Error.NOT_LIQUIDATABLE);
            });
            it("should allow liquidations of unhealthy accounts after a positive rebase", async function () {
                // Rebase params
                const denominator = 4;
                const positive = true;
                const rebasePrice = hre.fromBig(await this.krAsset!.getPrice(), 8) / denominator;

                this.krAsset!.setPrice(rebasePrice);
                await this.krAsset!.contract.rebase(hre.toBig(denominator), positive, []);

                expect(await hre.Diamond.isAccountLiquidatable(userToLiquidate.address)).to.be.false;

                this.collateral!.setPrice(5);
                expect(await hre.Diamond.isAccountLiquidatable(userToLiquidate.address)).to.be.true;
                await liquidate(userToLiquidate, this.krAsset, this.collateral);
            });
            it("should allow liquidations of unhealthy accounts after a negative rebase", async function () {
                // Rebase params
                const denominator = 4;
                const positive = false;
                const rebasePrice = hre.fromBig(await this.krAsset!.getPrice(), 8) * denominator;

                this.krAsset!.setPrice(rebasePrice);
                await this.krAsset!.contract.rebase(hre.toBig(denominator), positive, []);

                expect(await hre.Diamond.isAccountLiquidatable(userToLiquidate.address)).to.be.false;

                this.krAsset!.setPrice(rebasePrice * 2);
                expect(await hre.Diamond.isAccountLiquidatable(userToLiquidate.address)).to.be.true;
                await expect(liquidate(userToLiquidate, this.krAsset, this.collateral)).to.not.be.reverted;
            });
            it("should liquidate correct amount of krAssets after a positive rebase", async function () {
                // Change price to make user position unhealthy
                const startingPrice = hre.fromBig(await this.krAsset!.getPrice(), 8);
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
                results.userOneValueAfter = hre.fromBig(
                    (await hre.Diamond.getAccountCollateralValue(userToLiquidate.address)).rawValue,
                    8,
                );

                results.userOneHFAfter = await getHealthFactor(userToLiquidate);

                // Rebase params
                const denominator = 4;
                const positive = true;
                const rebasePrice = newPrice / denominator;

                // Rebase
                this.krAsset!.setPrice(rebasePrice);
                await this.krAsset!.contract.rebase(hre.toBig(denominator), positive, []);

                expect(await hre.Diamond.isAccountLiquidatable(userToLiquidateTwo.address)).to.be.true;

                // Get values for a liquidation that happens after a rebase
                while (await hre.Diamond.isAccountLiquidatable(userToLiquidateTwo.address)) {
                    const values = await liquidate(userToLiquidateTwo, this.krAsset, this.krAsset);
                    results.collateralSeizedRebase += values.collateralSeized;
                    results.debtRepaidRebase += values.debtRepaid;
                }
                results.userTwoValueAfter = hre.fromBig(
                    (await hre.Diamond.getAccountCollateralValue(userToLiquidateTwo.address)).rawValue,
                    8,
                );
                results.userTwoHFAfter = await getHealthFactor(userToLiquidateTwo);

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
                const startingPrice = hre.fromBig(await this.krAsset!.getPrice(), 8);
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
                results.userOneValueAfter = hre.fromBig(
                    (await hre.Diamond.getAccountCollateralValue(userToLiquidate.address)).rawValue,
                    8,
                );

                results.userOneHFAfter = await getHealthFactor(userToLiquidate);

                // Rebase params
                const denominator = 4;
                const positive = false;
                const rebasePrice = newPrice * denominator;

                // Rebase
                this.krAsset!.setPrice(rebasePrice);
                await this.krAsset!.contract.rebase(hre.toBig(denominator), positive, []);

                expect(await hre.Diamond.isAccountLiquidatable(userToLiquidateTwo.address)).to.be.true;

                // Get values for a liquidation that happens after a rebase
                while (await hre.Diamond.isAccountLiquidatable(userToLiquidateTwo.address)) {
                    const values = await liquidate(userToLiquidateTwo, this.krAsset, this.krAsset);
                    results.collateralSeizedRebase += values.collateralSeized;
                    results.debtRepaidRebase += values.debtRepaid;
                }
                results.userTwoValueAfter = hre.fromBig(
                    (await hre.Diamond.getAccountCollateralValue(userToLiquidateTwo.address)).rawValue,
                    8,
                );
                results.userTwoHFAfter = await getHealthFactor(userToLiquidateTwo);

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
