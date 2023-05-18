import { getCollateralPoolInitializer } from "@deploy-config/shared";
import { RAY, fromBig, toBig } from "@kreskolabs/lib";
import { expect } from "@test/chai";
import { withFixture } from "@utils/test";
import { addMockCollateralAsset } from "@utils/test/helpers/collaterals";
import { addMockKreskoAsset } from "@utils/test/helpers/krassets";
import { getCR } from "@utils/test/helpers/liquidations";
import hre from "hardhat";
import { ICollateralPoolConfigFacet } from "types/typechain";
import {
    PoolCollateralStruct,
    PoolKrAssetStruct,
} from "types/typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko";

describe.only("Collateral Pool", function () {
    describe("#Configuration", async () => {
        it("should be initialized with correct params", async () => {
            const { args } = await getCollateralPoolInitializer(hre);

            const configuration = await hre.Diamond.getCollateralPoolConfig();
            expect(configuration.swapFeeRecipient).to.equal(args.swapFeeRecipient);
            expect(configuration.lt).to.equal(args.lt);
            expect(configuration.mcr).to.equal(args.mcr);
        });
        it("should be able to add whitelisted collateral", async () => {
            const configuration: PoolCollateralStruct = {
                decimals: 18,
                liquidationIncentive: toBig(1.1),
                liquidityIndex: RAY,
            };
            await hre.Diamond.enablePoolCollaterals([CollateralAsset.address], [configuration]);
            const collateral = await hre.Diamond.getPoolCollateral(CollateralAsset.address);
            expect(collateral.decimals).to.equal(configuration.decimals);
            expect(collateral.liquidationIncentive).to.equal(configuration.liquidationIncentive);
            expect(collateral.liquidityIndex).to.equal(RAY);

            const collaterals = await hre.Diamond.getPoolCollateralAssets();
            expect(collaterals).to.deep.equal([CollateralAsset.address]);
            expect(await hre.Diamond.getPoolAssetIsEnabled(CollateralAsset.address)).to.equal(true);
        });

        it("should be able to update a whitelisted collateral", async () => {
            const configuration: PoolCollateralStruct = {
                decimals: 18,
                liquidationIncentive: toBig(1.1),
                liquidityIndex: RAY,
            };
            await hre.Diamond.enablePoolCollaterals([CollateralAsset.address], [configuration]);
            await hre.Diamond.updatePoolCollateral(CollateralAsset.address, toBig(1.05));

            const collateral = await hre.Diamond.getPoolCollateral(CollateralAsset.address);
            expect(collateral.decimals).to.equal(configuration.decimals);
            expect(collateral.liquidationIncentive).to.equal(toBig(1.05));
            expect(collateral.liquidityIndex).to.equal(RAY);
        });

        it("should be able to disable a whitelisted collateral asset", async () => {
            const configuration: PoolCollateralStruct = {
                decimals: 18,
                liquidationIncentive: toBig(1.1),
                liquidityIndex: RAY,
            };
            await hre.Diamond.enablePoolCollaterals([CollateralAsset.address], [configuration]);
            await hre.Diamond.disablePoolCollaterals([CollateralAsset.address]);
            const collaterals = await hre.Diamond.getPoolCollateralAssets();
            expect(collaterals).to.deep.equal([CollateralAsset.address]);
            expect(await hre.Diamond.getPoolAssetIsEnabled(CollateralAsset.address)).to.equal(false);
        });

        it("should be able to remove a collateral asset", async () => {
            const configuration: PoolCollateralStruct = {
                decimals: 18,
                liquidationIncentive: toBig(1.1),
                liquidityIndex: RAY,
            };
            await hre.Diamond.enablePoolCollaterals([CollateralAsset.address], [configuration]);
            await hre.Diamond.removePoolCollaterals([CollateralAsset.address]);
            const collaterals = await hre.Diamond.getPoolCollateralAssets();
            expect(collaterals).to.deep.equal([]);
            expect(await hre.Diamond.getPoolAssetIsEnabled(CollateralAsset.address)).to.equal(false);
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
            expect(await hre.Diamond.getPoolAssetIsEnabled(KreskoAsset.address)).to.equal(true);
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
            expect(await hre.Diamond.getPoolAssetIsEnabled(KreskoAsset.address)).to.equal(true);
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
            expect(await hre.Diamond.getPoolAssetIsEnabled(KreskoAsset.address)).to.equal(false);
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
            expect(await hre.Diamond.getPoolAssetIsEnabled(KreskoAsset.address)).to.equal(false);
        });

        it("should be able to enable and disable swap pairs", async () => {
            const swapPairsEnabled: ICollateralPoolConfigFacet.PairSetterStruct[] = [
                {
                    assetIn: CollateralAsset.address,
                    assetOut: KreskoAsset.address,
                    enabled: true,
                },
            ];
            await hre.Diamond.setSwapPairs(swapPairsEnabled);
            expect(await hre.Diamond.getPoolIsSwapEnabled(CollateralAsset.address, KreskoAsset.address)).to.equal(true);
            expect(await hre.Diamond.getPoolIsSwapEnabled(KreskoAsset.address, CollateralAsset.address)).to.equal(true);

            const swapPairsDisabled: ICollateralPoolConfigFacet.PairSetterStruct[] = [
                {
                    assetIn: CollateralAsset.address,
                    assetOut: KreskoAsset.address,
                    enabled: false,
                },
            ];
            await hre.Diamond.setSwapPairs(swapPairsDisabled);
            expect(await hre.Diamond.getPoolIsSwapEnabled(CollateralAsset.address, KreskoAsset.address)).to.equal(
                false,
            );
            expect(await hre.Diamond.getPoolIsSwapEnabled(KreskoAsset.address, CollateralAsset.address)).to.equal(
                false,
            );
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
                            liquidityIndex: RAY,
                        },
                        {
                            decimals: 18,
                            liquidationIncentive: toBig(1.05),
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
                const Kresko = hre.Diamond.connect(user);
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
                const Kresko = hre.Diamond.connect(user);
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
                            liquidityIndex: RAY,
                        },
                        {
                            decimals: 18,
                            liquidationIncentive: toBig(1.05),
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
                const Kresko = hre.Diamond.connect(user);
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
            const partialWithdraw = depositAmount18Dec.div(2);
            const partialWithdraw8Dec = depositAmount8Dec.div(2);

            const expectedValueUnadjusted = toBig(collateralPrice * depositAmount, 8).div(2);
            const expectedValueAdjusted = toBig((collateralPrice / 1) * depositAmount, 8).div(2); // cfactor = 1

            const expectedValueUnadjusted8Dec = toBig(collateralPrice * depositAmount, 8).div(2);
            const expectedValueAdjusted8Dec = toBig(collateralPrice * 0.8 * depositAmount, 8).div(2); // cfactor = 0.8

            for (const user of users) {
                const Kresko = hre.Diamond.connect(user);
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
                    partialWithdraw,
                );
                expect(await Kresko.getPoolAccountPrincipalDeposits(user.address, CollateralAsset.address)).to.equal(
                    partialWithdraw,
                );

                expect(await Kresko.getPoolAccountDepositsWithFees(user.address, CollateralAsset8Dec.address)).to.equal(
                    partialWithdraw8Dec,
                );
                expect(
                    await Kresko.getPoolAccountPrincipalDeposits(user.address, CollateralAsset8Dec.address),
                ).to.equal(partialWithdraw8Dec);

                expect(await hre.Diamond.getPoolAccountTotalDepositsValue(user.address, false)).to.equal(
                    expectedValueAdjusted.add(expectedValueAdjusted8Dec),
                );

                expect(await hre.Diamond.getPoolAccountTotalDepositsValue(user.address, true)).to.equal(
                    expectedValueUnadjusted.add(expectedValueUnadjusted8Dec),
                );
            }

            expect(await CollateralAsset.contract.balanceOf(hre.Diamond.address)).to.equal(depositAmount18Dec);
            expect(await CollateralAsset8Dec.contract.balanceOf(hre.Diamond.address)).to.equal(depositAmount8Dec);

            expect(await hre.Diamond.getPoolDeposits(CollateralAsset.address)).to.equal(depositAmount18Dec);
            expect(await hre.Diamond.getPoolDeposits(CollateralAsset8Dec.address)).to.equal(depositAmount8Dec);

            expect(await hre.Diamond.getPoolDepositsValue(CollateralAsset.address, true)).to.equal(
                expectedValueUnadjusted.mul(users.length),
            );
            expect(await hre.Diamond.getPoolDepositsValue(CollateralAsset.address, false)).to.equal(
                expectedValueAdjusted.mul(users.length),
            );

            expect(await hre.Diamond.getPoolDepositsValue(CollateralAsset8Dec.address, true)).to.equal(
                expectedValueUnadjusted8Dec.mul(users.length),
            );
            expect(await hre.Diamond.getPoolDepositsValue(CollateralAsset8Dec.address, false)).to.equal(
                expectedValueAdjusted8Dec.mul(users.length),
            );
            const totalValueRemaining = expectedValueUnadjusted8Dec
                .mul(users.length)
                .add(expectedValueUnadjusted.mul(users.length));
            const globals = await hre.Diamond.getPoolStats(true);

            expect(globals.collateralValue).to.equal(totalValueRemaining);
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
                            liquidityIndex: RAY,
                        },
                        {
                            decimals: 18,
                            liquidationIncentive: toBig(1.05),
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
                const Kresko = hre.Diamond.connect(user);
                await Kresko.poolDeposit(user.address, CollateralAsset.address, depositAmount18Dec);
            }
            await hre.Diamond.connect(incomeCumulator).cumulateIncome(CollateralAsset.address, fees);

            for (const user of users) {
                const Kresko = hre.Diamond.connect(user);

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
                const Kresko = hre.Diamond.connect(user);
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

    withFixture(["minter-init"]);

    let KreskoAsset: Awaited<ReturnType<typeof addMockKreskoAsset>>;
    let CollateralAsset: Awaited<ReturnType<typeof addMockCollateralAsset>>;
    let CollateralAsset8Dec: Awaited<ReturnType<typeof addMockCollateralAsset>>;
    let CollateralAsset21Dec: Awaited<ReturnType<typeof addMockCollateralAsset>>;
    const collateralPrice = 10;
    const kreskoAssetPrice = 10;
    let oracleDecimals: number;

    let users: SignerWithAddress[];
    const depositAmount = 1000;
    const depositAmount18Dec = toBig(depositAmount);
    const depositAmount8Dec = toBig(depositAmount, 8);
    beforeEach(async () => {
        users = [hre.users.testUserFive, hre.users.testUserSix];
        oracleDecimals = await hre.Diamond.extOracleDecimals();

        [KreskoAsset, CollateralAsset, CollateralAsset8Dec, CollateralAsset21Dec] = await Promise.all([
            addMockKreskoAsset({
                name: "KreskoAssetPrice10USD",
                price: collateralPrice,
                symbol: "KreskoAssetPrice10USD",
                closeFee: 0.1,
                openFee: 0.1,
                marketOpen: true,
                factor: 2,
                supplyLimit: 10,
            }),
            addMockCollateralAsset({
                name: "Collateral18Dec",
                price: kreskoAssetPrice,
                factor: 1,
                decimals: 18,
            }),
            addMockCollateralAsset({
                name: "Collateral8Dec",
                price: kreskoAssetPrice,
                factor: 0.8,
                decimals: 8, // eg USDT
            }),
            await addMockCollateralAsset({
                name: "Collateral21Dec",
                price: kreskoAssetPrice,
                factor: 0.5,
                decimals: 21, // more
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
