import { expect } from "@test/chai";
import hre, { users } from "hardhat";

import {
    mintKrAsset,
    depositMockCollateral,
    withFixture,
    defaultCloseFee,
    defaultCollateralArgs,
    defaultKrAssetArgs,
} from "@test-utils";
import { fromBig, toBig } from "@utils/numbers";

import { extractInternalIndexedEventFromTxReceipt } from "@utils/events";
import { Error } from "@utils/test/errors";
import { MinterEvent__factory } from "types/typechain";
import { LiquidationOccurredEvent } from "types/typechain/src/contracts/libs/Events.sol/MinterEvent";

describe("Minter", function () {
    withFixture(["minter-test"]);

    beforeEach(async function () {
        // -------------------------------- Set up mock assets --------------------------------
        const collateralArgs = {
            name: "CollateralAsset",
            price: 10, // $10
            factor: 1,
            decimals: 18,
        };
        this.collateral = hre.collaterals.find(c => c.deployArgs.name === defaultCollateralArgs.name);
        this.collateral = await this.collateral.update(collateralArgs);
        this.collateral.setPrice(collateralArgs.price);
        // Set up mock KreskoAsset
        const krAssetArgs = {
            name: "KreskoAsset",
            price: 11, // $11
            factor: 1,
            supplyLimit: 10000,
            closeFee: defaultCloseFee,
        };
        this.krAsset = hre.krAssets.find(c => c.deployArgs.name === defaultKrAssetArgs.name);
        await this.collateral.update(collateralArgs);
        this.krAsset.setPrice(krAssetArgs.price);
        // -------------------------------- Set up userOne deposit/debt --------------------------------
        // Deposit collateral
        this.depositAmount = 20; // 20 * $10 = $200 in collateral asset value
        await depositMockCollateral({
            user: users.userOne,
            amount: this.depositAmount,
            asset: this.collateral,
        });

        // Mint KrAsset
        this.mintAmount = 10; // 10 * $11 = $110 in debt value
        await mintKrAsset({
            user: users.userOne,
            amount: this.mintAmount,
            asset: this.krAsset,
        });
    });

    describe("#liquidation", function () {
        describe("#isAccountLiquidatable", async function () {
            it("should identify accounts below their liquidation threshold", async function () {
                // Confirm that current amount is under min collateral value
                const liquidationThreshold = await hre.Diamond.liquidationThreshold();
                const minCollateralUSD = await hre.Diamond.getAccountMinimumCollateralValueAtRatio(
                    users.userOne.address,
                    liquidationThreshold,
                );
                expect(this.depositAmount * this.collateral.deployArgs.price > fromBig(minCollateralUSD));

                // The account should be NOT liquidatable as collateral value ($200) >= min collateral value ($154)
                const initialCanLiquidate = await hre.Diamond.isAccountLiquidatable(users.userOne.address);
                expect(initialCanLiquidate).to.equal(false);

                // Update collateral price to $7.5
                const newCollateralPrice = 7.5;
                this.collateral.setPrice(newCollateralPrice);

                const [, newCollateralOraclePrice] = await hre.Diamond.getCollateralValueAndOraclePrice(
                    this.collateral.address,
                    hre.toBig(1),
                    true,
                );
                expect(fromBig(newCollateralOraclePrice, 8)).to.equal(7.5);

                // The account should be liquidatable as collateral value ($140) < min collateral value ($154)
                const secondaryCanLiquidate = await hre.Diamond.isAccountLiquidatable(users.userOne.address);
                expect(secondaryCanLiquidate).to.equal(true);
            });
        });

        describe("#liquidate", async () => {
            beforeEach(async function () {
                // Grant userTwo tokens to use for liquidation
                await this.krAsset.mocks.contract.setVariable("_balances", {
                    [users.userTwo.address]: toBig(10000),
                });

                // Update collateral price from $10 to $5
                const newCollateralPrice = 5;
                this.collateral.setPrice(newCollateralPrice);
            });

            it("should allow unhealthy accounts to be liquidated", async function () {
                // Confirm we can liquidate this account
                const canLiquidate = await hre.Diamond.isAccountLiquidatable(users.userOne.address);
                expect(canLiquidate).to.equal(true);

                // Fetch pre-liquidation state for users and contracts
                const beforeUserOneCollateralAmount = await hre.Diamond.collateralDeposits(
                    users.userOne.address,
                    this.collateral.address,
                );
                const beforeUserOneDebtAmount = await hre.Diamond.kreskoAssetDebt(
                    users.userOne.address,
                    this.krAsset.address,
                );
                const beforeUserTwoCollateralBalance = await this.collateral.contract.balanceOf(users.userTwo.address);
                const beforeUserTwoKreskoAssetBalance = await this.krAsset.contract.balanceOf(users.userTwo.address);
                const beforeKreskoCollateralBalance = await this.collateral.contract.balanceOf(hre.Diamond.address);

                // Liquidate userOne
                const maxLiq = await hre.Diamond.calculateMaxLiquidatableValueForAssets(
                    users.userOne.address,
                    this.krAsset.address,
                    this.collateral.address,
                );
                const maxRepayAmount = toBig(Number(maxLiq.rawValue.div(await this.krAsset.getPrice())));
                const mintedKreskoAssetIndex = 0;
                const depositedCollateralAssetIndex = 0;
                await hre.Diamond.connect(users.userTwo).liquidate(
                    users.userOne.address,
                    this.krAsset.address,
                    maxRepayAmount,
                    this.collateral.address,
                    mintedKreskoAssetIndex,
                    depositedCollateralAssetIndex,
                );

                // Confirm that the liquidated user's debt amount has decreased by the repaid amount
                const afterUserOneDebtAmount = await hre.Diamond.kreskoAssetDebt(
                    users.userOne.address,
                    this.krAsset.address,
                );
                expect(afterUserOneDebtAmount.eq(beforeUserOneDebtAmount.sub(maxRepayAmount)));

                // Confirm that some of the liquidated user's collateral has been seized
                const afterUserOneCollateralAmount = await hre.Diamond.collateralDeposits(
                    users.userOne.address,
                    this.collateral.address,
                );
                expect(afterUserOneCollateralAmount.lt(beforeUserOneCollateralAmount));

                // Confirm that userTwo's kresko asset balance has decreased by the repaid amount
                const afterUserTwoKreskoAssetBalance = await this.krAsset.contract.balanceOf(users.userTwo.address);
                expect(afterUserTwoKreskoAssetBalance.eq(beforeUserTwoKreskoAssetBalance.sub(maxRepayAmount)));

                // Confirm that userTwo has received some collateral from the contract
                const afterUserTwoCollateralBalance = await this.collateral.contract.balanceOf(users.userTwo.address);
                expect(afterUserTwoCollateralBalance).gt(beforeUserTwoCollateralBalance);

                // Confirm that Kresko contract's collateral balance has decreased.
                const afterKreskoCollateralBalance = await this.collateral.contract.balanceOf(hre.Diamond.address);
                expect(afterKreskoCollateralBalance).lt(beforeKreskoCollateralBalance);
            });

            it("should emit LiquidationOccurred event", async function () {
                // Attempt liquidation
                const repayAmount = 10; // userTwo holds Kresko assets that can be used to repay userOne's loan
                const mintedKreskoAssetIndex = 0;
                const depositedCollateralAssetIndex = 0;
                const tx = await hre.Diamond.connect(users.userTwo).liquidate(
                    users.userOne.address,
                    this.krAsset.address,
                    repayAmount,
                    this.collateral.address,
                    mintedKreskoAssetIndex,
                    depositedCollateralAssetIndex,
                );

                const event = await extractInternalIndexedEventFromTxReceipt<LiquidationOccurredEvent["args"]>(
                    tx,
                    MinterEvent__factory.connect(hre.Diamond.address, users.userTwo),
                    "LiquidationOccurred",
                );

                expect(event.account).to.equal(users.userOne.address);
                expect(event.liquidator).to.equal(users.userTwo.address);
                expect(event.repayKreskoAsset).to.equal(this.krAsset.address);
                expect(event.repayAmount).to.equal(repayAmount);
                expect(event.seizedCollateralAsset).to.equal(this.collateral.address);
            });

            it("should not allow liquidations of healthy accounts", async function () {
                // Update collateral price from $5 to $10
                const newCollateralPrice = 10;
                this.collateral.setPrice(newCollateralPrice);

                // Confirm that the account has sufficient collateral to not be liquidated
                const liquidationThreshold = await hre.Diamond.liquidationThreshold();
                const minimumCollateralUSDValueRequired = await hre.Diamond.getAccountMinimumCollateralValueAtRatio(
                    users.userOne.address,
                    liquidationThreshold,
                );
                const currUserOneCollateralAmount = await hre.Diamond.collateralDeposits(
                    users.userOne.address,
                    this.collateral.address,
                );
                expect(
                    fromBig(currUserOneCollateralAmount) * newCollateralPrice >
                        fromBig(minimumCollateralUSDValueRequired),
                );

                const canLiquidate = await hre.Diamond.isAccountLiquidatable(users.userOne.address);
                expect(canLiquidate).to.equal(false);

                const repayAmount = 10;
                const mintedKreskoAssetIndex = 0;
                const depositedCollateralAssetIndex = 0;
                await expect(
                    hre.Diamond.connect(users.userTwo).liquidate(
                        users.userOne.address,
                        this.krAsset.address,
                        repayAmount,
                        this.collateral.address,
                        mintedKreskoAssetIndex,
                        depositedCollateralAssetIndex,
                    ),
                ).to.be.revertedWith(Error.NOT_LIQUIDATABLE);
            });

            it("should not allow liquidations if repayment amount is 0", async function () {
                // Liquidation should fail
                const repayAmount = 0;
                await expect(
                    hre.Diamond.connect(users.userTwo).liquidate(
                        users.userOne.address,
                        this.krAsset.address,
                        repayAmount,
                        this.collateral.address,
                        0,
                        0,
                    ),
                ).to.be.revertedWith(Error.ZERO_REPAY);
            });

            it("should not allow liquidations with krAsset amount greater than krAsset debt of user", async function () {
                // Get user's debt for this kresko asset
                const krAssetDebtUserOne = await hre.Diamond.kreskoAssetDebt(
                    users.userOne.address,
                    this.krAsset.address,
                );

                // Ensure we are repaying more than debt
                const repayAmount = toBig(100);
                expect(repayAmount.gt(krAssetDebtUserOne)).to.be.true;

                // Liquidation should fail
                await expect(
                    hre.Diamond.connect(users.userTwo).liquidate(
                        users.userOne.address,
                        this.krAsset.address,
                        repayAmount,
                        this.collateral.address,
                        0,
                        0,
                    ),
                ).to.be.revertedWith(Error.KRASSET_BURN_AMOUNT_OVERFLOW);
            });

            it("should not allow liquidations with USD value greater than the USD value required for regaining healthy position", async function () {
                const repayAmount = 10;
                const repayAmountUSD = repayAmount * this.krAsset.deployArgs.price;
                const maxLiquidation = fromBig(
                    await hre.Diamond.calculateMaxLiquidatableValueForAssets(
                        users.userOne.address,
                        this.krAsset.address,
                        this.collateral.address,
                    ),
                    8,
                );
                expect(maxLiquidation).to.be.lessThan(repayAmountUSD);
                // Ensure liquidation cannot happen
                await expect(
                    hre.Diamond.connect(users.userTwo).liquidate(
                        users.userOne.address,
                        this.krAsset.address,
                        hre.toBig(repayAmount),
                        this.collateral.address,
                        0,
                        0,
                    ),
                ).to.be.revertedWith(Error.LIQUIDATION_OVERFLOW);
            });

            it("should not allow liquidations when account is under MCR but not under liquidation threshold", async function () {
                this.collateral.setPrice(this.collateral.deployArgs.price);

                expect(await hre.Diamond.isAccountLiquidatable(users.userOne.address)).to.be.false;

                const minCollateralUSD = await hre.Diamond.getAccountMinimumCollateralValueAtRatio(
                    users.userOne.address,
                    await hre.Diamond.minimumCollateralizationRatio(),
                );
                const liquidationThresholdUSD = await hre.Diamond.getAccountMinimumCollateralValueAtRatio(
                    users.userOne.address,
                    await hre.Diamond.liquidationThreshold(),
                );

                expect(liquidationThresholdUSD.rawValue.lt(minCollateralUSD.rawValue)).to.be.true;

                const valueUnderMinMCR = fromBig(minCollateralUSD, 8) / this.depositAmount - 0.1;
                this.collateral.setPrice(valueUnderMinMCR);

                const collateralValueBig = await hre.Diamond.getAccountCollateralValue(users.userOne.address);

                expect(collateralValueBig.rawValue.lt(minCollateralUSD.rawValue)).to.be.true;
                expect(collateralValueBig.rawValue.gt(liquidationThresholdUSD.rawValue)).to.be.true;
                expect(await hre.Diamond.isAccountLiquidatable(users.userOne.address)).to.be.false;
            });

            it("should allow liquidations without liquidator approval of Kresko assets to Kresko.sol contract", async function () {
                // Check that liquidator's token approval to Kresko.sol contract is 0
                expect(await this.krAsset.contract.allowance(users.userTwo.address, hre.Diamond.address)).to.equal(0);

                // Liquidation should succeed despite lack of token approval
                const repayAmount = 10;
                const mintedKreskoAssetIndex = 0;
                const depositedCollateralAssetIndex = 0;
                await hre.Diamond.connect(users.userTwo).liquidate(
                    users.userOne.address,
                    this.krAsset.address,
                    repayAmount,
                    this.collateral.address,
                    mintedKreskoAssetIndex,
                    depositedCollateralAssetIndex,
                );

                // Confirm that liquidator's token approval is still 0
                expect(await this.krAsset.contract.allowance(users.userTwo.address, hre.Diamond.address)).to.equal(0);
            });

            it("should not change liquidator's existing token approvals during a successful liquidation", async function () {
                // Liquidator increases contract's token approval
                const repayAmount = 10;
                await this.krAsset.contract.connect(users.userTwo).approve(hre.Diamond.address, repayAmount);
                expect(await this.krAsset.contract.allowance(users.userTwo.address, hre.Diamond.address)).to.equal(
                    repayAmount,
                );

                const mintedKreskoAssetIndex = 0;
                const depositedCollateralAssetIndex = 0;
                await expect(
                    hre.Diamond.connect(users.userTwo).liquidate(
                        users.userOne.address,
                        this.krAsset.address,
                        repayAmount,
                        this.collateral.address,
                        mintedKreskoAssetIndex,
                        depositedCollateralAssetIndex,
                    ),
                ).not.to.be.reverted;

                // Confirm that liquidator's token approval is unchanged
                expect(await this.krAsset.contract.allowance(users.userTwo.address, hre.Diamond.address)).to.equal(
                    repayAmount,
                );
            });

            it("should not allow borrowers to liquidate themselves", async function () {
                // Liquidation should fail
                const repayAmount = 5;
                await expect(
                    hre.Diamond.connect(users.userOne).liquidate(
                        users.userOne.address,
                        this.krAsset.address,
                        repayAmount,
                        this.collateral.address,
                        0,
                        0,
                    ),
                ).to.be.revertedWith(Error.SELF_LIQUIDATION);
            });
        });
    });
});
