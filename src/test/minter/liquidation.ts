import hre, { users } from "hardhat";
import { expect } from "@test/chai";

import { toBig, fromBig } from "@utils/numbers";
import { toFixedPoint } from "@utils/fixed-point";
import {
    withFixture,
    getMockOracleFor,
    defaultDecimals,
    defaultCloseFee,
    addMockCollateralAsset,
    addMockKreskoAsset,
    defaultOraclePrice,
} from "@test-utils";

import { LiquidationOccurredEvent } from "types/typechain/MinterEvent";
import { Error } from "@utils/test/errors"
import { extractEventFromTxReceipt } from "@utils/events";

describe("Minter", function () {
    withFixture("createMinterUser");
    beforeEach(async function () {

        // -------------------------------- Set up mock assets --------------------------------
        // Set up mock collateral asset
        const collateralArgs = {
            name: "Collateral002",
            price: defaultOraclePrice, // $10
            factor: 1,
            decimals: defaultDecimals,
        };
        const [Collateral] = await addMockCollateralAsset(collateralArgs);

        expect(await hre.Diamond.collateralExists(Collateral.address)).to.equal(true);
        const [, collateralOraclePrice] = await hre.Diamond.getCollateralValueAndOraclePrice(
            Collateral.address,
            hre.toBig(1),
            true,
        );
        expect(Number(collateralOraclePrice)).to.equal(Number(toFixedPoint(collateralArgs.price)));

        this.collateral = Collateral;
        this.initialCollateralPrice = collateralOraclePrice;

        // Set up mock KreskoAsset
        const krAssetArgs = {
            name: "KreskoAsset",
            price: 11, // $11
            factor: 1,
            supplyLimit: 10000,
            closeFee: defaultCloseFee
        }
        const [KreskoAsset] = await addMockKreskoAsset(krAssetArgs);
        const kreskoAssetPrice = Number(
            await hre.Diamond.getKrAssetValue(KreskoAsset.address, hre.toBig(1), true),
        );
        expect(Number(kreskoAssetPrice)).to.equal(Number(toFixedPoint(krAssetArgs.price)));
      
        this.krAsset = KreskoAsset;
        this.initialKreskoAssetPrice = kreskoAssetPrice;

        // -------------------------------- Set up userOne deposit/debt --------------------------------
        // Deposit collateral
        this.depositAmount = toBig(20); // 20 * $10 = $200 in collateral asset value
        await this.collateral.setVariable("_balances", {
            [users.userOne.address]: this.depositAmount,
        });
        await this.collateral.connect(users.userOne).approve(hre.Diamond.address, hre.ethers.constants.MaxUint256);
        // initial collateral value: 20 * $10 = $200 in collateral asset value
        await expect(hre.Diamond.connect(users.userOne).depositCollateral(users.userOne.address,  this.collateral.address, this.depositAmount)).not.to.be
        .reverted;
        expect(await hre.Diamond.collateralDeposits(users.userOne.address, this.collateral.address)).to.equal(this.depositAmount);

        // Mint KrAsset
        this.mintAmount = toBig(10); // 10 * $11 = $110 in debt value
        await hre.Diamond.connect(users.userOne).mintKreskoAsset(users.userOne.address, this.krAsset.address, this.mintAmount);

        // Initial debt value: (10 * $11) = $110
        const userDebtAmount = await hre.Diamond.kreskoAssetDebt(users.userOne.address, this.krAsset.address);
        const userDebtAmountInUSD = await hre.Diamond.getKrAssetValue(this.krAsset.address, userDebtAmount, false);
        expect(fromBig(userDebtAmountInUSD)).to.equal(110);
    });

    describe("#liquidation", () => {

        describe("#isAccountLiquidatable", function () {
            it("should identify accounts below their liquidation threshold", async function () {
                // Confirm that current amount is under min collateral value
                const liquidationThreshold = await hre.Diamond.liquidationThreshold();
                const minimumCollateralUSDValueRequired = await hre.Diamond.getAccountMinimumCollateralValueAtRatio(users.userOne.address, liquidationThreshold);
                expect(fromBig(this.depositAmount)*fromBig(this.initialCollateralPrice) > fromBig(minimumCollateralUSDValueRequired))
                
                // The account should be NOT liquidatable as collateral value ($200) >= min collateral value ($154)
                const initialCanLiquidate = await  hre.Diamond.isAccountLiquidatable(users.userOne.address);
                expect(initialCanLiquidate).to.equal(false);

                // Update collateral price to $7.5
                const newCollateralPrice = 7.5;
                const updatedOracle = await getMockOracleFor(await this.collateral.name(), newCollateralPrice);

                await hre.Diamond.connect(users.operator).updateCollateralAsset(
                    this.collateral.address,
                    1,
                    updatedOracle.address,
                );
                const [, newCollateralOraclePrice] = await hre.Diamond.getCollateralValueAndOraclePrice(
                    this.collateral.address,
                    hre.toBig(1),
                    true,
                );
                expect(fromBig(newCollateralOraclePrice)).to.equal(7.5);

                // The account should be liquidatable as collateral value ($140) < min collateral value ($154)
                const secondaryCanLiquidate = await hre.Diamond.isAccountLiquidatable(users.userOne.address);
                expect(secondaryCanLiquidate).to.equal(true);
            });
        });

        describe("#liquidate", () => {
            beforeEach(async function () {
                // Grant userTwo tokens to use for liquidation
                await this.krAsset.setVariable("_balances", {
                    [users.userTwo.address]: toBig(10000),
                });

                // Update collateral price from $10 to $5
                const newCollateralPrice = 5;
                const updatedOracle = await getMockOracleFor(await this.collateral.name(), newCollateralPrice);
                await hre.Diamond.connect(users.operator).updateCollateralAsset(
                    this.collateral.address,
                    1,
                    updatedOracle.address,
                );
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
                const beforeUserTwoCollateralBalance = await this.collateral.balanceOf(users.userTwo.address);
                const beforeUserTwoKreskoAssetBalance = await this.krAsset.balanceOf(users.userTwo.address);
                const beforeKreskoCollateralBalance = await this.collateral.balanceOf(hre.Diamond.address);

                // Liquidate userOne
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

                // Confirm that the liquidated user's debt amount has decreased by the repaid amount
                const afterUserOneDebtAmount = await hre.Diamond.kreskoAssetDebt(
                    users.userOne.address,
                    this.krAsset.address,
                );
                expect(afterUserOneDebtAmount.eq(beforeUserOneDebtAmount.sub(toBig(repayAmount))))

                // Confirm that some of the liquidated user's collateral has been seized
                const afterUserOneCollateralAmount = await hre.Diamond.collateralDeposits(
                    users.userOne.address,
                    this.collateral.address,
                );
                expect(afterUserOneCollateralAmount.lt(beforeUserOneCollateralAmount));

                // Confirm that userTwo's kresko asset balance has decreased by the repaid amount
                const afterUserTwoKreskoAssetBalance = await this.krAsset.balanceOf(users.userTwo.address);
                expect(afterUserTwoKreskoAssetBalance.eq(beforeUserTwoKreskoAssetBalance.sub(toBig(repayAmount))));

                // Confirm that userTwo has received some collateral from the contract
                const afterUserTwoCollateralBalance = await this.collateral.balanceOf(users.userTwo.address);
                expect(afterUserTwoCollateralBalance).gt(beforeUserTwoCollateralBalance);

                // Confirm that Kresko contract's collateral balance has decreased.
                const afterKreskoCollateralBalance = await this.collateral.balanceOf(hre.Diamond.address);
                expect(afterKreskoCollateralBalance).lt(beforeKreskoCollateralBalance);
            });

            // it("should emit LiquidationOccurred event", async function () {
            //     // Fetch user's debt amount prior to liquidation
            //     const beforeUserOneDebtAmount = fromBig(
            //         await hre.Diamond.kreskoAssetDebt(users.userOne.address, this.krAsset.address),
            //     );

            //     // Attempt liquidation
            //     const repayAmount = 10; // userTwo holds Kresko assets that can be used to repay userOne's loan
            //     const mintedKreskoAssetIndex = 0;
            //     const depositedCollateralAssetIndex = 0;
            //     const tx = await hre.Diamond.connect(users.userTwo).liquidate(
            //         users.userOne.address,
            //         this.krAsset.address,
            //         repayAmount,
            //         this.collateral.address,
            //         mintedKreskoAssetIndex,
            //         depositedCollateralAssetIndex,
            //     );

            //     // TODO: event extraction not working
            //     const event = await extractEventFromTxReceipt<LiquidationOccurredEvent>(
            //         tx,
            //         "LiquidationOccurred",
            //     );

            //     expect(event.args.account).to.equal(users.userOne.address);
            //     expect(event.args.liquidator).to.equal(users.userTwo.address);
            //     expect(event.args.repayKreskoAsset).to.equal(this.krAsset.address);
            //     expect(event.args.repayAmount).to.equal(repayAmount);
            //     expect(event.args.seizedCollateralAsset).to.equal(this.collateral.address);

            //     // Seized amount is calculated internally on contract, here we're just doing a sanity max check
            //     const maxPossibleSeizedAmount = beforeUserOneDebtAmount;
            //     expect(event.args.collateralSent).lte(maxPossibleSeizedAmount);
            // });

            it("should not allow liquidations of healthy accounts", async function () {
                // Update collateral price from $5 to $10
                const newCollateralPrice = 10;
                const updatedOracle = await getMockOracleFor(await this.collateral.name(), newCollateralPrice);
                await expect (
                    hre.Diamond.connect(users.operator).updateCollateralAsset(
                        this.collateral.address,
                        1,
                        updatedOracle.address,
                    ),
                ).not.to.be.reverted;
  
                // Confirm that the account has sufficient collateral to not be liquidated
                const liquidationThreshold = await hre.Diamond.liquidationThreshold();
                const minimumCollateralUSDValueRequired = await hre.Diamond.getAccountMinimumCollateralValueAtRatio(users.userOne.address, liquidationThreshold);
                const currUserOneCollateralAmount = await hre.Diamond.collateralDeposits(
                    users.userOne.address,
                    this.collateral.address,
                );
                expect(fromBig(currUserOneCollateralAmount)*newCollateralPrice > fromBig(minimumCollateralUSDValueRequired))
                    
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
                    )
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
                    )
                ).to.be.revertedWith(Error.KRASSET_BURN_AMOUNT_OVERFLOW);
            });

            it("should not allow liquidations with USD value greater than the USD value required for regaining healthy position", async function () {
                const repayAmount = 100;
                // Ensure liquidation cannot happen
                await expect(
                    hre.Diamond.connect(users.userTwo).liquidate(
                        users.userOne.address,
                        this.krAsset.address,
                        repayAmount,
                        this.collateral.address,
                        0,
                        0,
                    ),
                ).to.be.revertedWith(Error.LIQUIDATION_OVERFLOW);
            });

            it("should allow liquidations without liquidator approval of Kresko assets to Kresko.sol contract", async function () {
                // Check that liquidator's token approval to Kresko.sol contract is 0
                expect(await this.krAsset.allowance(users.userTwo.address, hre.Diamond.address)).to.equal(0);

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
                expect(await this.krAsset.allowance(users.userTwo.address, hre.Diamond.address)).to.equal(0);
            });

            it("should not change liquidator's existing token approvals during a successful liquidation", async function () {
                // Liquidator increases contract's token approval
                const repayAmount = 10;
                await this.krAsset.connect(users.userTwo).approve(hre.Diamond.address, repayAmount);
                expect(await this.krAsset.allowance(users.userTwo.address, hre.Diamond.address)).to.equal(
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
                    )
                ).not.to.be.reverted;

                // Confirm that liquidator's token approval is unchanged
                expect(await this.krAsset.allowance(users.userTwo.address, hre.Diamond.address)).to.equal(
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
                    )
                ).to.be.revertedWith(Error.SELF_LIQUIDATION);
            });
        });
    });
});
