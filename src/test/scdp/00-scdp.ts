import { getSCDPInitializer } from "@deploy-config/shared";
import { RAY, getNamedEvent, toBig } from "@kreskolabs/lib";
import { expect } from "@test/chai";
import { withFixture, wrapContractWithSigner } from "@utils/test";
import { addMockCollateralAsset, depositCollateral } from "@utils/test/helpers/collaterals";
import { addMockKreskoAsset, mintKrAsset } from "@utils/test/helpers/krassets";
import hre, { ethers } from "hardhat";
import { ISCDPConfigFacet } from "types/typechain";
import {
    CollateralPoolLiquidationOccuredEvent,
    PoolCollateralStruct,
    PoolKrAssetStruct,
    SwapEvent,
} from "types/typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko";

describe("SCDP", function () {
    describe("#Configuration", async () => {
        it("should be initialized with correct params", async () => {
            const { args } = await getSCDPInitializer(hre);

            const configuration = await hre.Diamond.getSCDPConfig();
            expect(configuration.swapFeeRecipient).to.equal(args.swapFeeRecipient);
            expect(configuration.lt).to.equal(args.lt);
            expect(configuration.mcr).to.equal(args.mcr);
        });
        it("should be able to add whitelisted collateral", async () => {
            const configuration: PoolCollateralStruct = {
                decimals: 18,
                liquidationIncentive: toBig(1.1),
                depositLimit: ethers.constants.MaxUint256,
                liquidityIndex: RAY,
            };
            await hre.Diamond.enablePoolCollaterals([CollateralAsset.address], [configuration]);
            const collateral = await hre.Diamond.getPoolCollateral(CollateralAsset.address);
            expect(collateral.decimals).to.equal(configuration.decimals);
            expect(collateral.liquidationIncentive).to.equal(configuration.liquidationIncentive);
            expect(collateral.liquidityIndex).to.equal(RAY);
            expect(collateral.depositLimit).to.equal(configuration.depositLimit);

            const collaterals = await hre.Diamond.getPoolCollateralAssets();
            expect(collaterals).to.deep.equal([CollateralAsset.address]);
            expect(await hre.Diamond.getSCDPAssetEnabled(CollateralAsset.address)).to.equal(true);
        });

        it("should be able to update a whitelisted collateral", async () => {
            const configuration: PoolCollateralStruct = {
                decimals: 18,
                liquidationIncentive: toBig(1.1),
                depositLimit: ethers.constants.MaxUint256,
                liquidityIndex: RAY,
            };
            await hre.Diamond.enablePoolCollaterals([CollateralAsset.address], [configuration]);
            await hre.Diamond.updatePoolCollateral(CollateralAsset.address, toBig(1.05), 1);

            const collateral = await hre.Diamond.getPoolCollateral(CollateralAsset.address);
            expect(collateral.decimals).to.equal(configuration.decimals);
            expect(collateral.liquidationIncentive).to.equal(toBig(1.05));
            expect(collateral.liquidityIndex).to.equal(RAY);
            expect(collateral.depositLimit).to.equal(1);
        });

        it("should be able to disable a whitelisted collateral asset", async () => {
            const configuration: PoolCollateralStruct = {
                decimals: 18,
                liquidationIncentive: toBig(1.1),
                depositLimit: ethers.constants.MaxUint256,
                liquidityIndex: RAY,
            };
            await hre.Diamond.enablePoolCollaterals([CollateralAsset.address], [configuration]);
            await hre.Diamond.disablePoolCollaterals([CollateralAsset.address]);
            const collaterals = await hre.Diamond.getPoolCollateralAssets();
            expect(collaterals).to.deep.equal([CollateralAsset.address]);
            expect(await hre.Diamond.getSCDPAssetEnabled(CollateralAsset.address)).to.equal(false);
        });

        it("should be able to remove a collateral asset", async () => {
            const configuration: PoolCollateralStruct = {
                decimals: 18,
                liquidationIncentive: toBig(1.1),
                depositLimit: ethers.constants.MaxUint256,
                liquidityIndex: RAY,
            };
            await hre.Diamond.enablePoolCollaterals([CollateralAsset.address], [configuration]);
            await hre.Diamond.removePoolCollaterals([CollateralAsset.address]);
            const collaterals = await hre.Diamond.getPoolCollateralAssets();
            expect(collaterals).to.deep.equal([]);
            expect(await hre.Diamond.getSCDPAssetEnabled(CollateralAsset.address)).to.equal(false);
        });

        it("should be able to add whitelisted kresko asset", async () => {
            const configuration: PoolKrAssetStruct = {
                openFee: toBig(0.01),
                closeFee: toBig(0.01),
                protocolFee: toBig(0.25),
                supplyLimit: toBig(1000000),
            };
            await hre.Diamond.enablePoolKrAssets([KreskoAsset.address], [configuration]);
            const kreskoAsset = await hre.Diamond.getPoolKrAsset(KreskoAsset.address);
            expect(kreskoAsset.openFee).to.equal(configuration.openFee);
            expect(kreskoAsset.closeFee).to.equal(configuration.closeFee);
            expect(kreskoAsset.protocolFee).to.equal(configuration.protocolFee);
            expect(kreskoAsset.supplyLimit).to.equal(configuration.supplyLimit);

            const krAssets = await hre.Diamond.getPoolKrAssets();
            expect(krAssets).to.deep.equal([KreskoAsset.address]);
            expect(await hre.Diamond.getSCDPAssetEnabled(KreskoAsset.address)).to.equal(true);
        });

        it("should be able to update a whitelisted kresko asset", async () => {
            const configuration: PoolKrAssetStruct = {
                openFee: toBig(0.01),
                closeFee: toBig(0.01),
                protocolFee: toBig(0.25),
                supplyLimit: toBig(1000000),
            };
            await hre.Diamond.enablePoolKrAssets([KreskoAsset.address], [configuration]);
            const update: PoolKrAssetStruct = {
                openFee: toBig(0.05),
                closeFee: toBig(0.05),
                protocolFee: toBig(0.4),
                supplyLimit: toBig(50000),
            };
            await hre.Diamond.updatePoolKrAsset(KreskoAsset.address, update);
            const kreskoAsset = await hre.Diamond.getPoolKrAsset(KreskoAsset.address);
            expect(kreskoAsset.openFee).to.equal(update.openFee);
            expect(kreskoAsset.closeFee).to.equal(update.closeFee);
            expect(kreskoAsset.protocolFee).to.equal(update.protocolFee);
            expect(kreskoAsset.supplyLimit).to.equal(update.supplyLimit);

            const krAssets = await hre.Diamond.getPoolKrAssets();
            expect(krAssets).to.deep.equal([KreskoAsset.address]);
            expect(await hre.Diamond.getSCDPAssetEnabled(KreskoAsset.address)).to.equal(true);
        });
        it("should be able to disable a whitelisted kresko asset", async () => {
            const configuration: PoolKrAssetStruct = {
                openFee: toBig(0.01),
                closeFee: toBig(0.01),
                protocolFee: toBig(0.25),
                supplyLimit: toBig(1000000),
            };
            await hre.Diamond.enablePoolKrAssets([KreskoAsset.address], [configuration]);
            await hre.Diamond.disablePoolKrAssets([KreskoAsset.address]);
            const krAssets = await hre.Diamond.getPoolKrAssets();
            expect(krAssets).to.deep.equal([KreskoAsset.address]);
            expect(await hre.Diamond.getSCDPAssetEnabled(KreskoAsset.address)).to.equal(false);
        });
        it("should be able to remove a whitelisted kresko asset", async () => {
            const configuration: PoolKrAssetStruct = {
                openFee: toBig(0.01),
                closeFee: toBig(0.01),
                protocolFee: toBig(0.25),
                supplyLimit: toBig(1000000),
            };
            await hre.Diamond.enablePoolKrAssets([KreskoAsset.address], [configuration]);
            await hre.Diamond.removePoolKrAssets([KreskoAsset.address]);
            const krAssets = await hre.Diamond.getPoolKrAssets();
            expect(krAssets).to.deep.equal([]);
            expect(await hre.Diamond.getSCDPAssetEnabled(KreskoAsset.address)).to.equal(false);
        });

        it("should be able to enable and disable swap pairs", async () => {
            const swapPairsEnabled: ISCDPConfigFacet.PairSetterStruct[] = [
                {
                    assetIn: CollateralAsset.address,
                    assetOut: KreskoAsset.address,
                    enabled: true,
                },
            ];
            await hre.Diamond.setSwapPairs(swapPairsEnabled);
            expect(await hre.Diamond.getSCDPSwapEnabled(CollateralAsset.address, KreskoAsset.address)).to.equal(true);
            expect(await hre.Diamond.getSCDPSwapEnabled(KreskoAsset.address, CollateralAsset.address)).to.equal(true);

            const swapPairsDisabled: ISCDPConfigFacet.PairSetterStruct[] = [
                {
                    assetIn: CollateralAsset.address,
                    assetOut: KreskoAsset.address,
                    enabled: false,
                },
            ];
            await hre.Diamond.setSwapPairs(swapPairsDisabled);
            expect(await hre.Diamond.getSCDPSwapEnabled(CollateralAsset.address, KreskoAsset.address)).to.equal(false);
            expect(await hre.Diamond.getSCDPSwapEnabled(KreskoAsset.address, CollateralAsset.address)).to.equal(false);
        });
    });

    describe("#Deposit", async () => {
        beforeEach(async () => {
            await Promise.all([
                await hre.Diamond.enablePoolCollaterals(
                    [CollateralAsset.address, CollateralAsset8Dec.address],
                    [
                        {
                            decimals: 18,
                            liquidationIncentive: toBig(1.1),
                            depositLimit: ethers.constants.MaxUint256,
                            liquidityIndex: RAY,
                        },
                        {
                            decimals: 8,
                            liquidationIncentive: toBig(1.05),
                            depositLimit: ethers.constants.MaxUint256,
                            liquidityIndex: RAY,
                        },
                    ],
                ),
                await hre.Diamond.enablePoolKrAssets(
                    [KreskoAsset.address],
                    [
                        {
                            openFee: toBig(0.01),
                            closeFee: toBig(0.01),
                            protocolFee: toBig(0.25),
                            supplyLimit: toBig(1000000),
                        },
                    ],
                ),
            ]);
        });
        it("should be able to deposit collateral, calculate correct deposit values, not touching individual deposits", async () => {
            const expectedValueUnadjusted = toBig(collateralPrice * depositAmount, 8);
            const expectedValueAdjusted = toBig((collateralPrice / 1) * depositAmount, 8); // cfactor = 1
            const WITH_FACTORS = false;
            const WITHOUT_FACTORS = true;

            for (const user of users) {
                const Kresko = wrapContractWithSigner(hre.Diamond, user);
                await Kresko.poolDeposit(user.address, CollateralAsset.address, depositAmount18Dec);
                expect(await CollateralAsset.contract.balanceOf(user.address)).to.equal(0);
                expect(await Kresko.getPoolAccountDepositsWithFees(user.address, CollateralAsset.address)).to.equal(
                    depositAmount18Dec,
                );
                expect(await Kresko.getPoolAccountPrincipalDeposits(user.address, CollateralAsset.address)).to.equal(
                    depositAmount18Dec,
                );

                // Unadjusted
                expect(
                    await Kresko.getPoolAccountDepositsValue(user.address, CollateralAsset.address, WITHOUT_FACTORS),
                ).to.equal(expectedValueUnadjusted);

                expect(await Kresko.getPoolAccountTotalDepositsValue(user.address, WITHOUT_FACTORS)).to.equal(
                    expectedValueUnadjusted,
                );

                // Adjusted
                expect(await Kresko.getPoolAccountTotalDepositsValue(user.address, WITH_FACTORS)).to.equal(
                    expectedValueAdjusted,
                );
                expect(
                    await Kresko.getPoolAccountDepositsValue(user.address, CollateralAsset.address, WITH_FACTORS),
                ).to.equal(expectedValueAdjusted);

                // regular collateral deposits should be 0
                expect(await Kresko.collateralDeposits(user.address, CollateralAsset.address)).to.equal(0);
            }
            expect(await CollateralAsset.contract.balanceOf(hre.Diamond.address)).to.equal(
                depositAmount18Dec.mul(users.length),
            );
            expect(await hre.Diamond.getPoolDeposits(CollateralAsset.address)).to.equal(
                depositAmount18Dec.mul(users.length),
            );

            // Unadjusted
            const globalUnadjusted = await hre.Diamond.getPoolStats(WITHOUT_FACTORS);
            expect(await hre.Diamond.getPoolDepositsValue(CollateralAsset.address, WITHOUT_FACTORS)).to.equal(
                expectedValueUnadjusted.mul(users.length),
            );
            expect(globalUnadjusted.collateralValue).to.equal(expectedValueUnadjusted.mul(users.length));
            expect(globalUnadjusted.debtValue).to.equal(0);
            expect(globalUnadjusted.cr).to.equal(0);

            // Adjusted
            const globalAdjusted = await hre.Diamond.getPoolStats(WITH_FACTORS);
            expect(await hre.Diamond.getPoolDepositsValue(CollateralAsset.address, WITH_FACTORS)).to.equal(
                expectedValueAdjusted.mul(users.length),
            );
            expect(globalAdjusted.collateralValue).to.equal(expectedValueUnadjusted.mul(users.length));
            expect(globalAdjusted.debtValue).to.equal(0);
            expect(globalAdjusted.cr).to.equal(0);
        });

        it("should be able to deposit multiple collaterals, calculate correct deposit values, not touching individual deposits", async () => {
            const expectedValueUnadjusted = toBig(collateralPrice * depositAmount, 8);
            const expectedValueAdjusted = toBig((collateralPrice / 1) * depositAmount, 8); // cfactor = 1

            const expectedValueUnadjusted8Dec = toBig(collateralPrice * depositAmount, 8);
            const expectedValueAdjusted8Dec = toBig(collateralPrice * 0.8 * depositAmount, 8); // cfactor = 0.8

            const WITH_FACTORS = false;
            const WITHOUT_FACTORS = true;

            for (const user of users) {
                const Kresko = wrapContractWithSigner(hre.Diamond, user);
                await Kresko.poolDeposit(user.address, CollateralAsset.address, depositAmount18Dec);
                await Kresko.poolDeposit(user.address, CollateralAsset8Dec.address, depositAmount8Dec);

                expect(await Kresko.getPoolAccountDepositsWithFees(user.address, CollateralAsset.address)).to.equal(
                    depositAmount18Dec,
                );
                expect(await Kresko.getPoolAccountDepositsWithFees(user.address, CollateralAsset8Dec.address)).to.equal(
                    depositAmount8Dec,
                );
                // WITHOUT_FACTORS
                expect(
                    await Kresko.getPoolAccountDepositsValue(user.address, CollateralAsset.address, WITHOUT_FACTORS),
                ).to.equal(expectedValueUnadjusted);
                expect(
                    await Kresko.getPoolAccountDepositsValue(
                        user.address,
                        CollateralAsset8Dec.address,
                        WITHOUT_FACTORS,
                    ),
                ).to.equal(expectedValueUnadjusted8Dec);

                expect(await Kresko.getPoolAccountTotalDepositsValue(user.address, WITHOUT_FACTORS)).to.equal(
                    expectedValueUnadjusted.add(expectedValueUnadjusted8Dec),
                );

                // WITH_FACTORS
                expect(
                    await Kresko.getPoolAccountDepositsValue(user.address, CollateralAsset.address, WITH_FACTORS),
                ).to.equal(expectedValueAdjusted);
                expect(
                    await Kresko.getPoolAccountDepositsValue(user.address, CollateralAsset8Dec.address, WITH_FACTORS),
                ).to.equal(expectedValueAdjusted8Dec);

                expect(await Kresko.getPoolAccountTotalDepositsValue(user.address, WITH_FACTORS)).to.equal(
                    expectedValueAdjusted.add(expectedValueAdjusted8Dec),
                );

                // regular collateral deposits should be 0
                expect(await Kresko.collateralDeposits(user.address, CollateralAsset.address)).to.equal(0);
                expect(await Kresko.collateralDeposits(user.address, CollateralAsset8Dec.address)).to.equal(0);
            }

            expect(await hre.Diamond.getPoolDeposits(CollateralAsset.address)).to.equal(
                depositAmount18Dec.mul(users.length),
            );
            expect(await hre.Diamond.getPoolDeposits(CollateralAsset8Dec.address)).to.equal(
                depositAmount8Dec.mul(users.length),
            );

            // WITH_FACTORS global
            const valueTotalAdjusted = expectedValueAdjusted.mul(users.length);
            const valueTotalAdjusted8Dec = expectedValueAdjusted8Dec.mul(users.length);
            const valueAdjusted = valueTotalAdjusted.add(valueTotalAdjusted8Dec);

            expect(await hre.Diamond.getPoolDepositsValue(CollateralAsset.address, WITH_FACTORS)).to.equal(
                valueTotalAdjusted,
            );
            expect(await hre.Diamond.getPoolDepositsValue(CollateralAsset8Dec.address, WITH_FACTORS)).to.equal(
                valueTotalAdjusted8Dec,
            );

            const globalAdjusted = await hre.Diamond.getPoolStats(WITH_FACTORS);
            expect(globalAdjusted.collateralValue).to.equal(valueAdjusted);
            expect(globalAdjusted.debtValue).to.equal(0);
            expect(globalAdjusted.cr).to.equal(0);

            // WITHOUT_FACTORS global
            const valueTotalUnadjusted = expectedValueUnadjusted.mul(users.length);
            const valueTotalUnadjusted8Dec = expectedValueUnadjusted8Dec.mul(users.length);
            const valueUnadjusted = valueTotalUnadjusted.add(valueTotalUnadjusted8Dec);

            expect(await hre.Diamond.getPoolDepositsValue(CollateralAsset.address, WITHOUT_FACTORS)).to.equal(
                valueTotalUnadjusted,
            );
            expect(await hre.Diamond.getPoolDepositsValue(CollateralAsset8Dec.address, WITHOUT_FACTORS)).to.equal(
                valueTotalUnadjusted8Dec,
            );

            const globalUnadjusted = await hre.Diamond.getPoolStats(WITHOUT_FACTORS);
            expect(globalUnadjusted.collateralValue).to.equal(valueUnadjusted);
            expect(globalUnadjusted.debtValue).to.equal(0);
            expect(globalUnadjusted.cr).to.equal(0);
        });
    });

    describe("#Withdraw", async () => {
        beforeEach(async () => {
            await Promise.all([
                await hre.Diamond.enablePoolCollaterals(
                    [CollateralAsset.address, CollateralAsset8Dec.address],
                    [
                        {
                            decimals: 18,
                            liquidationIncentive: toBig(1.1),
                            depositLimit: ethers.constants.MaxUint256,
                            liquidityIndex: RAY,
                        },
                        {
                            decimals: 18,
                            liquidationIncentive: toBig(1.05),
                            depositLimit: ethers.constants.MaxUint256,
                            liquidityIndex: RAY,
                        },
                    ],
                ),
                await hre.Diamond.enablePoolKrAssets(
                    [KreskoAsset.address],
                    [
                        {
                            openFee: toBig(0.01),
                            closeFee: toBig(0.01),
                            protocolFee: toBig(0.25),
                            supplyLimit: toBig(1000000),
                        },
                    ],
                ),
            ]);
        });
        it("should be able to withdraw full collateral of multiple assets", async () => {
            for (const user of users) {
                const Kresko = wrapContractWithSigner(hre.Diamond, user);
                await Kresko.poolDeposit(user.address, CollateralAsset.address, depositAmount18Dec);
                await Kresko.poolDeposit(user.address, CollateralAsset8Dec.address, depositAmount8Dec);
                expect(await Kresko.getPoolAccountDepositsWithFees(user.address, CollateralAsset.address)).to.equal(
                    depositAmount18Dec,
                );

                await Kresko.poolWithdraw(user.address, CollateralAsset.address, depositAmount18Dec);
                await Kresko.poolWithdraw(user.address, CollateralAsset8Dec.address, depositAmount8Dec);

                expect(await CollateralAsset.contract.balanceOf(Kresko.address)).to.equal(0);
                expect(await CollateralAsset.contract.balanceOf(user.address)).to.equal(depositAmount18Dec);

                expect(await Kresko.getPoolAccountDepositsWithFees(user.address, CollateralAsset.address)).to.equal(0);
                expect(await Kresko.getPoolAccountPrincipalDeposits(user.address, CollateralAsset.address)).to.equal(0);

                expect(await Kresko.getPoolAccountDepositsWithFees(user.address, CollateralAsset8Dec.address)).to.equal(
                    0,
                );
                expect(
                    await Kresko.getPoolAccountPrincipalDeposits(user.address, CollateralAsset8Dec.address),
                ).to.equal(0);

                expect(await hre.Diamond.getPoolAccountTotalDepositsValue(user.address, false)).to.equal(0);
                expect(await hre.Diamond.getPoolAccountTotalDepositsValue(user.address, true)).to.equal(0);
            }

            expect(await hre.Diamond.getPoolDeposits(CollateralAsset.address)).to.equal(0);
            expect(await hre.Diamond.getPoolDeposits(CollateralAsset8Dec.address)).to.equal(0);
            expect(await hre.Diamond.getPoolDepositsValue(CollateralAsset.address, true)).to.equal(0);
            expect(await hre.Diamond.getPoolDepositsValue(CollateralAsset.address, false)).to.equal(0);
            expect(await hre.Diamond.getPoolDepositsValue(CollateralAsset8Dec.address, true)).to.equal(0);
            expect(await hre.Diamond.getPoolDepositsValue(CollateralAsset8Dec.address, false)).to.equal(0);
            const globals = await hre.Diamond.getPoolStats(true);
            expect(globals.collateralValue).to.equal(0);
            expect(globals.debtValue).to.equal(0);
            expect(globals.cr).to.equal(0);
        });
        it("should be able to withdraw partial collateral of multiple assets", async () => {
            const partialWithdraw = depositAmount18Dec.div(users.length);
            const partialWithdraw8Dec = depositAmount8Dec.div(users.length);

            const expectedValueUnadjusted = toBig(collateralPrice * depositAmount, 8)
                .mul(200)
                .div(300);
            const expectedValueAdjusted = toBig(collateralPrice * 1 * depositAmount, 8)
                .mul(200)
                .div(300); // cfactor = 1

            const expectedValueUnadjusted8Dec = toBig(collateralPrice * depositAmount, 8)
                .mul(200)
                .div(300);
            const expectedValueAdjusted8Dec = toBig(collateralPrice * 0.8 * depositAmount, 8)
                .mul(200)
                .div(300); // cfactor = 0.8

            for (const user of users) {
                const Kresko = wrapContractWithSigner(hre.Diamond, user);
                await Kresko.poolDeposit(user.address, CollateralAsset.address, depositAmount18Dec);
                await Kresko.poolDeposit(user.address, CollateralAsset8Dec.address, depositAmount8Dec);

                expect(await Kresko.getPoolAccountDepositsWithFees(user.address, CollateralAsset.address)).to.equal(
                    depositAmount18Dec,
                );
                await Kresko.poolWithdraw(user.address, CollateralAsset.address, partialWithdraw);
                await Kresko.poolWithdraw(user.address, CollateralAsset8Dec.address, partialWithdraw8Dec);

                expect(await CollateralAsset.contract.balanceOf(user.address)).to.equal(partialWithdraw);
                expect(await CollateralAsset8Dec.contract.balanceOf(user.address)).to.equal(partialWithdraw8Dec);

                expect(await Kresko.getPoolAccountDepositsWithFees(user.address, CollateralAsset.address)).to.equal(
                    depositAmount18Dec.sub(partialWithdraw),
                );
                expect(await Kresko.getPoolAccountPrincipalDeposits(user.address, CollateralAsset.address)).to.equal(
                    depositAmount18Dec.sub(partialWithdraw),
                );

                expect(await Kresko.getPoolAccountDepositsWithFees(user.address, CollateralAsset8Dec.address)).to.equal(
                    depositAmount8Dec.sub(partialWithdraw8Dec),
                );
                expect(
                    await Kresko.getPoolAccountPrincipalDeposits(user.address, CollateralAsset8Dec.address),
                ).to.equal(depositAmount8Dec.sub(partialWithdraw8Dec));

                expect(await hre.Diamond.getPoolAccountTotalDepositsValue(user.address, false)).to.closeTo(
                    expectedValueAdjusted.add(expectedValueAdjusted8Dec),
                    toBig(0.00001, 8),
                );

                expect(await hre.Diamond.getPoolAccountTotalDepositsValue(user.address, true)).to.closeTo(
                    expectedValueUnadjusted.add(expectedValueUnadjusted8Dec),
                    toBig(0.00001, 8),
                );
            }

            expect(await CollateralAsset.contract.balanceOf(hre.Diamond.address)).to.closeTo(toBig(2000), 1);
            expect(await CollateralAsset8Dec.contract.balanceOf(hre.Diamond.address)).to.closeTo(toBig(2000, 8), 1);

            expect(await hre.Diamond.getPoolDeposits(CollateralAsset.address)).to.closeTo(toBig(2000), 1);
            expect(await hre.Diamond.getPoolDeposits(CollateralAsset8Dec.address)).to.closeTo(toBig(2000, 8), 1);

            expect(await hre.Diamond.getPoolDepositsValue(CollateralAsset.address, true)).to.closeTo(
                expectedValueUnadjusted.mul(users.length),
                20,
            );
            expect(await hre.Diamond.getPoolDepositsValue(CollateralAsset.address, false)).to.closeTo(
                expectedValueAdjusted.mul(users.length),
                20,
            );

            expect(await hre.Diamond.getPoolDepositsValue(CollateralAsset8Dec.address, true)).to.closeTo(
                expectedValueUnadjusted8Dec.mul(users.length),
                20,
            );
            expect(await hre.Diamond.getPoolDepositsValue(CollateralAsset8Dec.address, false)).to.closeTo(
                expectedValueAdjusted8Dec.mul(users.length),
                20,
            );
            const totalValueRemaining = expectedValueUnadjusted8Dec
                .mul(users.length)
                .add(expectedValueUnadjusted.mul(users.length));
            const globals = await hre.Diamond.getPoolStats(true);

            expect(globals.collateralValue).to.closeTo(totalValueRemaining, 20);
            expect(globals.debtValue).to.equal(0);
            expect(globals.cr).to.equal(0);
        });
    });

    describe("#Fee Distribution", () => {
        let incomeCumulator: SignerWithAddress;
        beforeEach(async () => {
            incomeCumulator = hre.users.admin;
            await CollateralAsset.setBalance(incomeCumulator, depositAmount18Dec.mul(users.length));
            await CollateralAsset.contract
                .connect(incomeCumulator)
                .approve(hre.Diamond.address, hre.ethers.constants.MaxUint256);
            await Promise.all([
                await hre.Diamond.enablePoolCollaterals(
                    [CollateralAsset.address, CollateralAsset8Dec.address],
                    [
                        {
                            decimals: 18,
                            liquidationIncentive: toBig(1.1),
                            depositLimit: ethers.constants.MaxUint256,
                            liquidityIndex: RAY,
                        },
                        {
                            decimals: 8,
                            liquidationIncentive: toBig(1.05),
                            depositLimit: ethers.constants.MaxUint256,
                            liquidityIndex: RAY,
                        },
                    ],
                ),
                await hre.Diamond.enablePoolKrAssets(
                    [KreskoAsset.address],
                    [
                        {
                            openFee: toBig(0.01),
                            closeFee: toBig(0.01),
                            protocolFee: toBig(0.25),
                            supplyLimit: toBig(1000000),
                        },
                    ],
                ),
            ]);
        });
        it("should be able to cumulate fees into deposits", async () => {
            const fees = depositAmount18Dec.mul(users.length);
            const expectedValueNoFees = toBig(collateralPrice * depositAmount, 8);
            const expectedValueFees = expectedValueNoFees.mul(2);

            for (const user of users) {
                const Kresko = wrapContractWithSigner(hre.Diamond, user);
                await Kresko.poolDeposit(user.address, CollateralAsset.address, depositAmount18Dec);
            }
            await wrapContractWithSigner(hre.Diamond, incomeCumulator).cumulateIncome(CollateralAsset.address, fees);

            for (const user of users) {
                const Kresko = wrapContractWithSigner(hre.Diamond, user);

                expect(await Kresko.getPoolAccountDepositsValue(user.address, CollateralAsset.address, true)).to.equal(
                    expectedValueNoFees, // fees are not collateralized
                );

                expect(
                    await Kresko.getPoolAccountDepositsValueWithFees(user.address, CollateralAsset.address),
                ).to.equal(expectedValueFees); // fees for single asset

                expect(await Kresko.getPoolAccountTotalDepositsValue(user.address, true)).to.equal(expectedValueNoFees); // fees
                expect(await Kresko.getPoolAccountTotalDepositsValueWithFees(user.address)).to.equal(expectedValueFees); // fees

                // withdraw principal
                await Kresko.poolWithdraw(user.address, CollateralAsset.address, depositAmount18Dec);

                expect(await Kresko.getPoolAccountDepositsValue(user.address, CollateralAsset.address, true)).to.equal(
                    0,
                );
                expect(
                    await Kresko.getPoolAccountDepositsValueWithFees(user.address, CollateralAsset.address),
                ).to.equal(expectedValueFees.sub(expectedValueNoFees));

                expect(await Kresko.getPoolAccountTotalDepositsValueWithFees(user.address)).to.equal(
                    expectedValueFees.sub(expectedValueNoFees),
                );
                expect(await Kresko.getPoolAccountTotalDepositsValue(user.address, true)).to.equal(0);
                expect(await CollateralAsset.contract.balanceOf(user.address)).to.equal(depositAmount18Dec);
            }

            // expect protocol to have no collateral here, only fees left.
            expect(await CollateralAsset.contract.balanceOf(hre.Diamond.address)).to.equal(fees);
            expect(await hre.Diamond.getPoolDeposits(CollateralAsset.address)).to.equal(0);
            expect(await hre.Diamond.getPoolDepositsValue(CollateralAsset.address, true)).to.equal(0);
            expect(await hre.Diamond.getPoolDepositsValue(CollateralAsset.address, false)).to.equal(0);
            const global = await hre.Diamond.getPoolStats(true);
            expect(global.collateralValue).to.equal(0);

            // withdraw fees
            for (const user of users) {
                const Kresko = wrapContractWithSigner(hre.Diamond, user);
                await Kresko.poolWithdraw(user.address, CollateralAsset.address, depositAmount18Dec);
                // fees in user wallet
                expect(await CollateralAsset.contract.balanceOf(user.address)).to.equal(
                    depositAmount18Dec.add(depositAmount18Dec),
                );
                // nothing left in protocol for user
                expect(await Kresko.getPoolAccountDepositsValue(user.address, CollateralAsset.address, true)).to.equal(
                    0,
                );
                expect(
                    await Kresko.getPoolAccountDepositsValueWithFees(user.address, CollateralAsset.address),
                ).to.equal(0);

                expect(await Kresko.getPoolAccountTotalDepositsValueWithFees(user.address)).to.equal(0);
                expect(await Kresko.getPoolAccountTotalDepositsValue(user.address, true)).to.equal(0);
            }

            // nothing left in protocol.
            expect(await CollateralAsset.contract.balanceOf(hre.Diamond.address)).to.equal(0);
            expect(await hre.Diamond.getPoolDeposits(CollateralAsset.address)).to.equal(0);
            expect(await hre.Diamond.getPoolDepositsValue(CollateralAsset.address, true)).to.equal(0);
            expect(await hre.Diamond.getPoolDepositsValue(CollateralAsset.address, false)).to.equal(0);
        });
    });
    describe("#Swap", () => {
        it("should have collateral in pool", async () => {
            const value = await hre.Diamond.getPoolStats(false);
            expect(value.collateralValue).to.equal(toBig(10000, 8));
            expect(value.debtValue).to.equal(0);
            expect(value.cr).to.equal(0);
        });

        it("should be able to preview a swap", async () => {
            const swapAmount = toBig(ONE_USD);
            const assetInPrice = toBig(ONE_USD, 8);
            const assetOutPrice = toBig(KreskoAsset2Price, 8);

            const feePercentage = toBig(0.015 + 0.025);
            const feePercentageProtocol = toBig(0.5);

            const expectedTotalFee = swapAmount.wadMul(feePercentage);
            const expectedProtocolFee = expectedTotalFee.wadMul(feePercentageProtocol);
            const expectedFee = expectedTotalFee.sub(expectedProtocolFee);
            const amountInAfterFees = swapAmount.sub(expectedTotalFee);

            const expectedAmountOut = amountInAfterFees.wadMul(assetInPrice).wadDiv(assetOutPrice);

            const [amountOut, feeAmount, feeAmountProtocol] = await hre.Diamond.previewSwap(
                KISS.address,
                KreskoAsset2.address,
                toBig(1),
            );
            expect(amountOut).to.equal(expectedAmountOut);
            expect(feeAmount).to.equal(expectedFee);
            expect(feeAmountProtocol).to.equal(expectedProtocolFee);
        });

        it("should be able to swap, shared debt == 0 | swap collateral == 0", async () => {
            const swapAmount = toBig(ONE_USD); // $1
            const expectedAmountOut = toBig(0.0096); // $100 * 0.0096 = $0.96

            const Kresko = wrapContractWithSigner(hre.Diamond, swapper);
            const tx = await Kresko.swap(swapper.address, KISS.address, KreskoAsset2.address, swapAmount, 0);
            const event = await getNamedEvent<SwapEvent>(tx, "Swap");
            expect(event.args.who).to.equal(swapper.address);
            expect(event.args.assetIn).to.equal(KISS.address);
            expect(event.args.assetOut).to.equal(KreskoAsset2.address);
            expect(event.args.amountIn).to.equal(swapAmount);
            expect(event.args.amountOut).to.equal(expectedAmountOut);
            expect(await KreskoAsset2.contract.balanceOf(swapper.address)).to.equal(expectedAmountOut);
            expect(await KISS.contract.balanceOf(swapper.address)).to.equal(toBig(10_000).sub(swapAmount));

            expect(await Kresko.getPoolAccountDepositsValue(swapper.address, KreskoAsset2.address, true)).to.equal(0);
            expect(await Kresko.getPoolAccountDepositsValue(swapper.address, KISS.address, true)).to.equal(0);

            expect(await Kresko.getPoolSwapDeposits(KISS.address)).to.equal(toBig(0.96));
            expect(await Kresko.getPoolDepositsValue(KISS.address, true)).to.equal(toBig(0.96, 8));

            expect(await Kresko.getPoolKrAssetDebtValue(KreskoAsset2.address, true)).to.equal(toBig(0.96, 8));
            expect(await Kresko.getPoolKrAssetDebt(KreskoAsset2.address)).to.equal(toBig(0.0096));

            const global = await hre.Diamond.getPoolStats(true);
            expect(global.collateralValue).to.equal(toBig(10000.96, 8));
            expect(global.debtValue).to.equal(toBig(0.96, 8));
            expect(global.cr).to.equal(toBig(10000.96, 8).wadDiv(toBig(0.96, 8)));
        });

        it("should be able to swap, shared debt == assetsIn | swap collateral == assetsOut", async () => {
            const swapAmount = toBig(ONE_USD).mul(100); // $100
            const swapAmountAsset = toBig(1); // $100
            const expectedKissOut = toBig(96); // $100 * 0.96 = $96
            // deposit some to kresko for minting first
            await depositCollateral({
                user: swapper,
                asset: KISS,
                amount: toBig(100),
            });

            await mintKrAsset({
                user: swapper,
                asset: KreskoAsset2,
                amount: toBig(0.1), // min allowed
            });

            const Kresko = wrapContractWithSigner(hre.Diamond, swapper);
            await Kresko.swap(swapper.address, KISS.address, KreskoAsset2.address, swapAmount, 0);

            // the swap that clears debt
            const tx = await Kresko.swap(swapper.address, KreskoAsset2.address, KISS.address, swapAmountAsset, 0);

            const event = await getNamedEvent<SwapEvent>(tx, "Swap");

            expect(event.args.who).to.equal(swapper.address);
            expect(event.args.assetIn).to.equal(KreskoAsset2.address);
            expect(event.args.assetOut).to.equal(KISS.address);
            expect(event.args.amountIn).to.equal(swapAmountAsset);
            expect(event.args.amountOut).to.equal(expectedKissOut);

            expect(await Kresko.getPoolSwapDeposits(KISS.address)).to.equal(0);
            expect(await Kresko.getPoolDepositsValue(KISS.address, true)).to.equal(0);

            expect(await Kresko.getPoolKrAssetDebtValue(KreskoAsset2.address, true)).to.equal(0);
            expect(await Kresko.getPoolKrAssetDebt(KreskoAsset2.address)).to.equal(0);

            const global = await hre.Diamond.getPoolStats(true);
            // back to starting point
            expect(global.collateralValue).to.equal(toBig(10000, 8));
            expect(global.debtValue).to.equal(0);
            expect(global.cr).to.equal(0);
        });

        it("should be able to swap, shared debt > assetsIn | swap collateral > assetsOut", async () => {
            const swapAmount = toBig(ONE_USD); // $1
            const expectedAmountOutAsset = toBig(0.0096); // $100 * 0.0096 = $0.96
            const expectedSecondFeeValue = toBig(0.96, 8).wadMul(toBig(0.04)); // $0.96 * 4% = $0.0384
            const expectedSecondFeeKISS = toBig(0.96).wadMul(toBig(0.04)); // 0.96 * 4% = 0.0384
            const expectedAmountOutKISS = toBig(0.96).sub(expectedSecondFeeKISS); // = 0.9216

            const Kresko = wrapContractWithSigner(hre.Diamond, swapper);
            await Kresko.swap(swapper.address, KISS.address, KreskoAsset2.address, swapAmount, 0);

            const tx = await Kresko.swap(
                swapper.address,
                KreskoAsset2.address,
                KISS.address,
                expectedAmountOutAsset,
                0,
            );

            const event = await getNamedEvent<SwapEvent>(tx, "Swap");

            expect(event.args.who).to.equal(swapper.address);
            expect(event.args.assetIn).to.equal(KreskoAsset2.address);
            expect(event.args.assetOut).to.equal(KISS.address);
            expect(event.args.amountIn).to.equal(expectedAmountOutAsset);
            expect(event.args.amountOut).to.equal(expectedAmountOutKISS);

            expect(await Kresko.getPoolAccountDepositsValue(swapper.address, KreskoAsset2.address, true)).to.equal(0);
            expect(await Kresko.getPoolAccountDepositsValue(swapper.address, KISS.address, true)).to.equal(0);

            expect(await Kresko.getPoolSwapDeposits(KISS.address)).to.equal(expectedSecondFeeKISS);
            expect(await Kresko.getPoolDepositsValue(KISS.address, true)).to.equal(expectedSecondFeeValue);

            expect(await Kresko.getPoolKrAssetDebtValue(KreskoAsset2.address, true)).to.equal(expectedSecondFeeValue);
            expect(await Kresko.getPoolKrAssetDebt(KreskoAsset2.address)).to.equal(
                expectedSecondFeeKISS.wadDiv(toBig(KreskoAsset2Price)),
            );

            const global = await hre.Diamond.getPoolStats(true);
            const expectedCollateralValue = toBig(10000, 8).add(expectedSecondFeeValue);
            const expectedDebtValue = expectedSecondFeeValue;
            expect(global.collateralValue).to.equal(expectedCollateralValue);
            expect(global.debtValue).to.equal(expectedDebtValue);
            expect(global.cr).to.equal(expectedCollateralValue.wadDiv(expectedDebtValue));
        });

        it("should be able to swap, shared debt < assetsIn | swap collateral < assetsOut", async () => {
            const swapAmountKiss = toBig(ONE_USD).mul(100); // $100
            const swapAmountKrAsset = toBig(2); // $200
            const expectedKissOut = toBig(192); // $200 * 0.96 = $192

            const expectedDebtKiss = toBig(96); // 192 required out - 96 in collateral from first swap = 96 new debt
            const expectedDebtValueKiss = toBig(96, 8); // $192 - $96 = $96

            const expectedCollateralKrAssetValue = toBig(96, 8); // $192 swapped in after fees, $96 in debt = $96 to swap owned collateral
            const expectedCollateralKrAsset = toBig(0.96); // $192 swapped in after fees, $96 in debt = $96 to swap owned collateral

            // deposit some to kresko for minting first
            await depositCollateral({
                user: swapper,
                asset: KISS,
                amount: toBig(400),
            });

            await mintKrAsset({
                user: swapper,
                asset: KreskoAsset2,
                amount: toBig(1.04), // 0.96 + 1.04 = 2.
            });

            const Kresko = wrapContractWithSigner(hre.Diamond, swapper);
            await Kresko.swap(swapper.address, KISS.address, KreskoAsset2.address, swapAmountKiss, 0);

            const stats = await hre.Diamond.getPoolStats(true);
            expect(stats.collateralValue).to.be.gt(toBig(10000, 8));
            // the swap that matters, here user has 0.96 krAsset in wallet, 1.04 minted. swaps expecting 192 kiss after fees.
            const tx = await Kresko.swap(swapper.address, KreskoAsset2.address, KISS.address, swapAmountKrAsset, 0);

            const event = await getNamedEvent<SwapEvent>(tx, "Swap");

            expect(event.args.who).to.equal(swapper.address);
            expect(event.args.assetIn).to.equal(KreskoAsset2.address);
            expect(event.args.assetOut).to.equal(KISS.address);
            expect(event.args.amountIn).to.equal(swapAmountKrAsset);
            expect(event.args.amountOut).to.equal(expectedKissOut);

            // KISS deposits sent in swap
            expect(await Kresko.getPoolSwapDeposits(KISS.address)).to.equal(0);
            expect(await Kresko.getPoolDepositsValue(KISS.address, true)).to.equal(0);
            // KrAsset debt is cleared
            expect(await Kresko.getPoolKrAssetDebtValue(KreskoAsset2.address, true)).to.equal(0);
            expect(await Kresko.getPoolKrAssetDebt(KreskoAsset2.address)).to.equal(0);
            // KISS debt is issued
            expect(await Kresko.getPoolKrAssetDebtValue(KISS.address, true)).to.equal(expectedDebtValueKiss);
            expect(await Kresko.getPoolKrAssetDebt(KISS.address)).to.equal(expectedDebtKiss);

            // krAsset collateral deposits added after debt cleared in swap
            expect(await Kresko.getPoolSwapDeposits(KreskoAsset2.address)).to.equal(expectedCollateralKrAsset);
            expect(await Kresko.getPoolDepositsValue(KreskoAsset2.address, true)).to.equal(
                expectedCollateralKrAssetValue,
            );

            const global = await hre.Diamond.getPoolStats(true);
            const expectedCollateralValue = toBig(10000, 8).add(expectedCollateralKrAssetValue);
            expect(global.collateralValue).to.equal(expectedCollateralValue);
            expect(global.debtValue).to.equal(expectedDebtValueKiss);
            expect(global.cr).to.equal(expectedCollateralValue.wadDiv(expectedDebtValueKiss));
        });

        let swapper: SignerWithAddress;
        let depositor: SignerWithAddress;
        let KreskoAsset2: Awaited<ReturnType<typeof addMockKreskoAsset>>;
        let KISS: Awaited<ReturnType<typeof addMockKreskoAsset>>;
        const KreskoAsset2Price = 100;
        const ONE_USD = 1;
        beforeEach(async () => {
            swapper = users[0];
            depositor = users[1];
            [KreskoAsset2, KISS] = await Promise.all([
                addMockKreskoAsset(
                    {
                        name: "KreskoAssetPrice100USD",
                        price: KreskoAsset2Price,
                        symbol: "KreskoAssetPrice100USD",
                        closeFee: 0.05,
                        openFee: 0.05,
                        marketOpen: true,
                        factor: 1,
                        supplyLimit: 1_000,
                    },
                    true,
                ),
                addMockKreskoAsset(
                    {
                        name: "KISS",
                        price: ONE_USD,
                        symbol: "KISS",
                        closeFee: 0.025,
                        openFee: 0.025,
                        marketOpen: true,
                        factor: 1,
                        supplyLimit: 1_000_000,
                    },
                    true,
                ),
            ]);

            // setup collaterals and krAssets in shared pool
            const collateralConfig = {
                decimals: 18,
                liquidationIncentive: toBig(1.05),
                depositLimit: ethers.constants.MaxUint256,
                liquidityIndex: RAY,
            };
            const krAssetConfig = {
                openFee: toBig(0.015),
                closeFee: toBig(0.015),
                protocolFee: toBig(0.25),
                supplyLimit: toBig(1000000),
            };
            const KISSConfig = {
                openFee: toBig(0.025),
                closeFee: toBig(0.025),
                protocolFee: toBig(0.25),
                supplyLimit: toBig(1000000),
            };
            await Promise.all([
                await hre.Diamond.enablePoolCollaterals(
                    [
                        CollateralAsset.address,
                        CollateralAsset8Dec.address,
                        KISS.address,
                        KreskoAsset.address,
                        KreskoAsset2.address,
                    ],
                    [collateralConfig, collateralConfig, collateralConfig, collateralConfig, collateralConfig],
                ),
                await hre.Diamond.enablePoolKrAssets(
                    [KreskoAsset.address, KreskoAsset2.address, KISS.address],
                    [krAssetConfig, krAssetConfig, KISSConfig],
                ),
                await hre.Diamond.setSwapPairs([
                    {
                        assetIn: KreskoAsset2.address,
                        assetOut: KreskoAsset.address,
                        enabled: true,
                    },
                    {
                        assetIn: KISS.address,
                        assetOut: KreskoAsset2.address,
                        enabled: true,
                    },
                    {
                        assetIn: KreskoAsset.address,
                        assetOut: KISS.address,
                        enabled: true,
                    },
                ]),
            ]);

            // mint some KISS for users
            for (const user of users) {
                await CollateralAsset.setBalance(user, toBig(1_000_000));
                await CollateralAsset.contract
                    .connect(user)
                    .approve(hre.Diamond.address, hre.ethers.constants.MaxUint256);
                await KISS.contract.connect(user).approve(hre.Diamond.address, hre.ethers.constants.MaxUint256);
                await KreskoAsset2.contract.connect(user).approve(hre.Diamond.address, hre.ethers.constants.MaxUint256);
                await KISS.setBalance(swapper, toBig(10_000));
            }

            await wrapContractWithSigner(hre.Diamond, depositor).poolDeposit(
                depositor.address,
                CollateralAsset.address,
                depositAmount18Dec, // $10k
            );
        });
    });
    describe("#Liquidations", () => {
        it("should identify if the pool is not underwater", async () => {
            const swapAmount = toBig(ONE_USD * 2600); // $1

            const Kresko = wrapContractWithSigner(hre.Diamond, swapper);
            await Kresko.swap(swapper.address, KISS.address, KreskoAsset2.address, swapAmount, 0);
            expect(await hre.Diamond.poolIsLiquidatable()).to.be.false;
        });
        it("should revert liquidations if the pool is not underwater", async () => {
            const swapAmount = toBig(ONE_USD * 2600); // $1

            const Kresko = wrapContractWithSigner(hre.Diamond, swapper);
            await Kresko.swap(swapper.address, KISS.address, KreskoAsset2.address, swapAmount, 0);
            expect(await hre.Diamond.poolIsLiquidatable()).to.be.false;

            const KreskoLiquidator = wrapContractWithSigner(hre.Diamond, hre.users.liquidator);
            await KreskoAsset2.setBalance(hre.users.liquidator, toBig(1_000_000));

            await expect(
                KreskoLiquidator.poolLiquidate(KreskoAsset2.address, toBig(7.7), CollateralAsset8Dec.address),
            ).to.be.revertedWith("not-liquidatable");
        });
        it("should identify if the pool is underwater", async () => {
            const swapAmount = toBig(ONE_USD * 2600); // $1

            const Kresko = wrapContractWithSigner(hre.Diamond, swapper);
            await Kresko.swap(swapper.address, KISS.address, KreskoAsset2.address, swapAmount, 0);
            CollateralAsset.setPrice(collateralPrice / 1000);
            CollateralAsset8Dec.setPrice(collateralPrice / 1000);

            expect((await hre.Diamond.getPoolStats(true)).cr).to.be.lt((await hre.Diamond.getSCDPConfig()).lt);
            expect(await hre.Diamond.poolIsLiquidatable()).to.be.true;
        });
        it("should allow liquidating the underwater pool", async () => {
            const swapAmount = toBig(ONE_USD * 2600); // $1

            const Kresko = wrapContractWithSigner(hre.Diamond, swapper);
            await Kresko.swap(swapper.address, KISS.address, KreskoAsset2.address, swapAmount, 0);

            const newKreskoAssetPrice = 500;
            KreskoAsset2.setPrice(newKreskoAssetPrice);
            const KreskoLiquidator = wrapContractWithSigner(hre.Diamond, hre.users.liquidator);

            const repayAmount = (
                await hre.Diamond.getMaxLiquidation(
                    hre.ethers.constants.AddressZero,
                    KreskoAsset2.address,
                    CollateralAsset.address,
                )
            ).wadDiv(await KreskoAsset2.getPrice());

            await KreskoAsset2.setBalance(hre.users.liquidator, repayAmount.add((1e18).toString()));

            const tx = await KreskoLiquidator.poolLiquidate(KreskoAsset2.address, repayAmount, CollateralAsset.address);

            expect((await hre.Diamond.getPoolStats(true)).cr).to.gt((await hre.Diamond.getSCDPConfig()).lt);

            expect(await KreskoLiquidator.poolIsLiquidatable()).to.equal(false);
            await expect(
                KreskoLiquidator.poolLiquidate(KreskoAsset2.address, repayAmount, CollateralAsset8Dec.address),
            ).to.be.revertedWith("not-liquidatable");

            const event = await getNamedEvent<CollateralPoolLiquidationOccuredEvent>(
                tx,
                "CollateralPoolLiquidationOccured",
            );

            const expectedSeizeAmount = repayAmount
                .wadMul(toBig(newKreskoAssetPrice, 8))
                .wadMul(toBig(1.05))
                .wadDiv(toBig(collateralPrice, 8));

            expect(event.args.liquidator).to.eq(hre.users.liquidator.address);
            expect(event.args.seizeAmount).to.eq(expectedSeizeAmount);
            expect(event.args.repayAmount).to.eq(repayAmount);
            expect(event.args.seizeCollateral).to.eq(CollateralAsset.address);
            expect(event.args.repayKreskoAsset).to.eq(KreskoAsset2.address);

            const expectedDepositsAfter = depositAmount18Dec.sub(event.args.seizeAmount);
            expect(await hre.Diamond.getPoolAccountPrincipalDeposits(depositor.address, CollateralAsset.address)).to.eq(
                expectedDepositsAfter,
            );
            expect(await hre.Diamond.getPoolAccountDepositsWithFees(depositor.address, CollateralAsset.address)).to.eq(
                expectedDepositsAfter,
            );

            await wrapContractWithSigner(hre.Diamond, users[2]).poolDeposit(
                users[2].address,
                CollateralAsset.address,
                depositAmount18Dec.mul(10),
            );
            expect((await hre.Diamond.getPoolStats(true)).cr).to.gt((await hre.Diamond.getSCDPConfig()).mcr);
            await expect(
                wrapContractWithSigner(hre.Diamond, depositor).poolWithdraw(
                    depositor.address,
                    CollateralAsset.address,
                    expectedDepositsAfter,
                ),
            ).to.not.be.reverted;

            expect(await hre.Diamond.getPoolAccountPrincipalDeposits(depositor.address, CollateralAsset.address)).to.eq(
                0,
            );
            expect(await hre.Diamond.getPoolAccountDepositsWithFees(depositor.address, CollateralAsset.address)).to.eq(
                0,
            );
        });

        let swapper: SignerWithAddress;
        let depositor: SignerWithAddress;
        let KreskoAsset2: Awaited<ReturnType<typeof addMockKreskoAsset>>;
        let KISS: Awaited<ReturnType<typeof addMockKreskoAsset>>;
        const KreskoAsset2Price = 100;
        const ONE_USD = 1;
        beforeEach(async () => {
            swapper = users[0];
            depositor = users[1];
            [KreskoAsset2, KISS] = await Promise.all([
                addMockKreskoAsset(
                    {
                        name: "KreskoAssetPrice100USD",
                        price: KreskoAsset2Price,
                        symbol: "KreskoAssetPrice100USD",
                        closeFee: 0.05,
                        openFee: 0.05,
                        marketOpen: true,
                        factor: 1,
                        supplyLimit: 1_000,
                    },
                    true,
                ),
                addMockKreskoAsset(
                    {
                        name: "KISS",
                        price: ONE_USD,
                        symbol: "KISS",
                        closeFee: 0.025,
                        openFee: 0.025,
                        marketOpen: true,
                        factor: 1,
                        supplyLimit: 1_000_000,
                    },
                    true,
                ),
            ]);

            // setup collaterals and krAssets in shared pool
            const collateralConfig = {
                decimals: 18,
                liquidationIncentive: toBig(1.05),
                depositLimit: ethers.constants.MaxUint256,
                liquidityIndex: RAY,
            };
            const krAssetConfig = {
                openFee: toBig(0.015),
                closeFee: toBig(0.015),
                protocolFee: toBig(0.25),
                supplyLimit: toBig(1000000),
            };
            const KISSConfig = {
                openFee: toBig(0.025),
                closeFee: toBig(0.025),
                protocolFee: toBig(0.25),
                supplyLimit: toBig(1000000),
            };
            await Promise.all([
                await hre.Diamond.enablePoolCollaterals(
                    [
                        CollateralAsset.address,
                        CollateralAsset8Dec.address,
                        KISS.address,
                        KreskoAsset.address,
                        KreskoAsset2.address,
                    ],
                    [collateralConfig, collateralConfig, collateralConfig, collateralConfig, collateralConfig],
                ),
                await hre.Diamond.enablePoolKrAssets(
                    [KreskoAsset.address, KreskoAsset2.address, KISS.address],
                    [krAssetConfig, krAssetConfig, KISSConfig],
                ),
                await hre.Diamond.setSwapPairs([
                    {
                        assetIn: KreskoAsset2.address,
                        assetOut: KreskoAsset.address,
                        enabled: true,
                    },
                    {
                        assetIn: KISS.address,
                        assetOut: KreskoAsset2.address,
                        enabled: true,
                    },
                    {
                        assetIn: KreskoAsset.address,
                        assetOut: KISS.address,
                        enabled: true,
                    },
                ]),
            ]);

            // mint some KISS for users
            for (const user of users) {
                await Promise.all([
                    await CollateralAsset.setBalance(user, toBig(1_000_000)),
                    await CollateralAsset.contract
                        .connect(user)
                        .approve(hre.Diamond.address, hre.ethers.constants.MaxUint256),
                    await KISS.contract.connect(user).approve(hre.Diamond.address, hre.ethers.constants.MaxUint256),
                    KreskoAsset2.contract.connect(user).approve(hre.Diamond.address, hre.ethers.constants.MaxUint256),
                ]);
            }

            await KISS.setBalance(swapper, toBig(10_000));
            await Promise.all([
                wrapContractWithSigner(hre.Diamond, depositor).poolDeposit(
                    depositor.address,
                    CollateralAsset.address,
                    depositAmount18Dec, // $10k
                ),
                wrapContractWithSigner(hre.Diamond, depositor).poolDeposit(
                    depositor.address,
                    CollateralAsset8Dec.address,
                    depositAmount8Dec, // $8k
                ),
            ]);
            CollateralAsset.setPrice(collateralPrice);
        });
    });
    describe("#Error", () => {
        it("should revert depositing unsupported tokens", async () => {
            const [UnsupportedToken] = await hre.deploy("MockERC20", {
                args: ["UnsupportedToken", "UnsupportedToken", 18, toBig(1)],
            });
            await UnsupportedToken.approve(hre.Diamond.address, hre.ethers.constants.MaxUint256);
            const { deployer } = await hre.getNamedAccounts();
            await expect(hre.Diamond.poolDeposit(deployer, UnsupportedToken.address, 1)).to.be.revertedWith(
                "asset-disabled",
            );
        });
        it("should revert withdrawing without deposits", async () => {
            const KreskoUserNoDeposits = wrapContractWithSigner(hre.Diamond, swapper);
            await expect(
                KreskoUserNoDeposits.poolWithdraw(depositor.address, CollateralAsset.address, 1),
            ).to.be.revertedWith("withdrawal-violation");
        });

        it("should revert withdrawals below MCR", async () => {
            const swapAmount = toBig(ONE_USD).mul(1000); // $1000

            const Kresko = wrapContractWithSigner(hre.Diamond, swapper);
            await Kresko.swap(swapper.address, KISS.address, KreskoAsset2.address, swapAmount, 0); // generate debt
            const deposits = await Kresko.getPoolAccountPrincipalDeposits(depositor.address, CollateralAsset.address);
            await expect(
                wrapContractWithSigner(hre.Diamond, depositor).poolWithdraw(
                    depositor.address,
                    CollateralAsset.address,
                    deposits,
                ),
            ).to.be.revertedWith("withdraw-mcr-violation");
        });

        it("should revert withdrawals of swap owned collateral deposits", async () => {
            const swapAmount = toBig(1);
            await KreskoAsset2.setBalance(swapper, swapAmount);

            const Kresko = wrapContractWithSigner(hre.Diamond, swapper);
            await Kresko.swap(swapper.address, KreskoAsset2.address, KISS.address, swapAmount, 0);
            const deposits = await Kresko.getPoolSwapDeposits(KreskoAsset2.address);
            expect(deposits).to.be.gt(0);
            await expect(Kresko.poolWithdraw(swapper.address, KreskoAsset2.address, deposits)).to.be.revertedWith(
                "withdrawal-violation",
            );
        });

        it("should revert swapping with price below minAmountOut", async () => {
            const swapAmount = toBig(1);
            await KreskoAsset2.setBalance(swapper, swapAmount);
            const Kresko = wrapContractWithSigner(hre.Diamond, swapper);
            const [amountOut] = await Kresko.previewSwap(KreskoAsset2.address, KISS.address, swapAmount);
            await expect(
                Kresko.swap(swapper.address, KreskoAsset2.address, KISS.address, swapAmount, amountOut.add(1)),
            ).to.be.revertedWith("swap-slippage");
        });

        it("should revert swapping unsupported route", async () => {
            const swapAmount = toBig(1);
            await KreskoAsset2.setBalance(swapper, swapAmount);

            const Kresko = wrapContractWithSigner(hre.Diamond, swapper);
            await expect(
                Kresko.swap(swapper.address, KreskoAsset2.address, CollateralAsset.address, swapAmount, 0),
            ).to.be.revertedWith("swap-disabled");
        });
        it("should revert swapping if asset in is disabled", async () => {
            const swapAmount = toBig(1);
            await KreskoAsset2.setBalance(swapper, swapAmount);

            const Kresko = wrapContractWithSigner(hre.Diamond, swapper);
            await hre.Diamond.disablePoolKrAssets([KreskoAsset2.address]);
            await expect(
                Kresko.swap(swapper.address, KreskoAsset2.address, KISS.address, swapAmount, 0),
            ).to.be.revertedWith("asset-in-disabled");
        });
        it("should revert swapping if asset out is disabled", async () => {
            const swapAmount = toBig(1);
            await KreskoAsset2.setBalance(swapper, swapAmount);

            const Kresko = wrapContractWithSigner(hre.Diamond, swapper);
            await hre.Diamond.disablePoolKrAssets([KreskoAsset2.address]);
            await expect(
                Kresko.swap(swapper.address, KISS.address, KreskoAsset2.address, swapAmount, 0),
            ).to.be.revertedWith("asset-out-disabled");
        });
        it("should revert swapping causes CDP to go below MCR", async () => {
            const swapAmount = toBig(1_000_000);
            await KreskoAsset2.setBalance(swapper, swapAmount);

            const Kresko = wrapContractWithSigner(hre.Diamond, swapper);
            await expect(
                Kresko.swap(swapper.address, KreskoAsset2.address, KISS.address, swapAmount, 0),
            ).to.be.revertedWith("swap-mcr-violation");
        });

        let swapper: SignerWithAddress;
        let depositor: SignerWithAddress;
        let KreskoAsset2: Awaited<ReturnType<typeof addMockKreskoAsset>>;
        let KISS: Awaited<ReturnType<typeof addMockKreskoAsset>>;
        const KreskoAsset2Price = 100;
        const ONE_USD = 1;
        beforeEach(async () => {
            swapper = users[0];
            depositor = users[1];
            [KreskoAsset2, KISS] = await Promise.all([
                addMockKreskoAsset(
                    {
                        name: "KreskoAssetPrice100USD",
                        price: KreskoAsset2Price,
                        symbol: "KreskoAssetPrice100USD",
                        closeFee: 0.05,
                        openFee: 0.05,
                        marketOpen: true,
                        factor: 1,
                        supplyLimit: 1_000,
                    },
                    true,
                ),
                addMockKreskoAsset(
                    {
                        name: "KISS",
                        price: ONE_USD,
                        symbol: "KISS",
                        closeFee: 0.025,
                        openFee: 0.025,
                        marketOpen: true,
                        factor: 1,
                        supplyLimit: 1_000_000,
                    },
                    true,
                ),
            ]);

            // setup collaterals and krAssets in shared pool
            const collateralConfig = {
                decimals: 18,
                liquidationIncentive: toBig(1.05),
                depositLimit: ethers.constants.MaxUint256,
                liquidityIndex: RAY,
            };
            const krAssetConfig = {
                openFee: toBig(0.015),
                closeFee: toBig(0.015),
                protocolFee: toBig(0.25),
                supplyLimit: toBig(1000000),
            };
            const KISSConfig = {
                openFee: toBig(0.025),
                closeFee: toBig(0.025),
                protocolFee: toBig(0.25),
                supplyLimit: toBig(1000000),
            };
            await Promise.all([
                await hre.Diamond.enablePoolCollaterals(
                    [
                        CollateralAsset.address,
                        CollateralAsset8Dec.address,
                        KISS.address,
                        KreskoAsset.address,
                        KreskoAsset2.address,
                    ],
                    [collateralConfig, collateralConfig, collateralConfig, collateralConfig, collateralConfig],
                ),
                await hre.Diamond.enablePoolKrAssets(
                    [KreskoAsset.address, KreskoAsset2.address, KISS.address],
                    [krAssetConfig, krAssetConfig, KISSConfig],
                ),
                await hre.Diamond.setSwapPairs([
                    {
                        assetIn: KreskoAsset2.address,
                        assetOut: KreskoAsset.address,
                        enabled: true,
                    },
                    {
                        assetIn: KISS.address,
                        assetOut: KreskoAsset2.address,
                        enabled: true,
                    },
                    {
                        assetIn: KreskoAsset.address,
                        assetOut: KISS.address,
                        enabled: true,
                    },
                ]),
            ]);

            // mint some KISS for users
            for (const user of users) {
                await CollateralAsset.setBalance(user, toBig(1_000_000));
                await CollateralAsset.contract
                    .connect(user)
                    .approve(hre.Diamond.address, hre.ethers.constants.MaxUint256);
                await KISS.contract.connect(user).approve(hre.Diamond.address, hre.ethers.constants.MaxUint256);
                await KreskoAsset2.contract.connect(user).approve(hre.Diamond.address, hre.ethers.constants.MaxUint256);
                await KISS.setBalance(swapper, toBig(10_000));
            }

            await wrapContractWithSigner(hre.Diamond, depositor).poolDeposit(
                depositor.address,
                CollateralAsset.address,
                depositAmount18Dec, // $10k
            );
        });
    });

    withFixture(["minter-init"]);

    let KreskoAsset: Awaited<ReturnType<typeof addMockKreskoAsset>>;

    let CollateralAsset: Awaited<ReturnType<typeof addMockCollateralAsset>>;
    let CollateralAsset8Dec: Awaited<ReturnType<typeof addMockCollateralAsset>>;
    const collateralPrice = 10;
    // const kreskoAssetPrice = 10;

    let users: SignerWithAddress[];
    const depositAmount = 1000;
    const depositAmount18Dec = toBig(depositAmount);
    const depositAmount8Dec = toBig(depositAmount, 8);
    beforeEach(async () => {
        users = [hre.users.testUserFive, hre.users.testUserSix, hre.users.testUserSeven];

        [KreskoAsset, CollateralAsset, CollateralAsset8Dec] = await Promise.all([
            addMockKreskoAsset(
                {
                    name: "KreskoAssetPrice10USD",
                    price: collateralPrice,
                    symbol: "KreskoAssetPrice10USD",
                    closeFee: 0.1,
                    openFee: 0.1,
                    marketOpen: true,
                    factor: 1.25,
                    supplyLimit: 100_000,
                },
                true,
            ),
            addMockCollateralAsset({
                name: "Collateral18Dec",
                price: collateralPrice,
                factor: 1,
                decimals: 18,
            }),
            addMockCollateralAsset({
                name: "Collateral8Dec",
                price: collateralPrice,
                factor: 0.8,
                decimals: 8, // eg USDT
            }),
        ]);

        for (const user of users) {
            await Promise.all([
                await CollateralAsset.setBalance(user, depositAmount18Dec),
                await CollateralAsset8Dec.setBalance(user, depositAmount8Dec),
                await CollateralAsset.contract
                    .connect(user)
                    .approve(hre.Diamond.address, hre.ethers.constants.MaxUint256),
                await CollateralAsset8Dec.contract
                    .connect(user)
                    .approve(hre.Diamond.address, hre.ethers.constants.MaxUint256),
            ]);
        }
    });
});
