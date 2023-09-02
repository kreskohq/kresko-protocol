import { getSCDPInitializer } from "@deploy-config/shared";
import { RAY, getNamedEvent, toBig } from "@kreskolabs/lib";
import { expect } from "@test/chai";
import { withSCDPFixture, wrapContractWithSigner } from "@utils/test";
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

const defaultKrAssetConfig: PoolKrAssetStruct = {
    openFee: toBig(0.01),
    closeFee: toBig(0.01),
    protocolFee: toBig(0.25),
    liquidationIncentive: toBig(1.05),
    supplyLimit: toBig(1000000),
};

const defaultCollateralConfig: PoolCollateralStruct = {
    decimals: 0,
    depositLimit: ethers.constants.MaxUint256,
    liquidityIndex: RAY,
};

const ONE_USD = 1;

const KreskoAsset2Price = 100;
const collateralPrice = 10;
const depositAmount = 1000;
const initialDepositValue = toBig(depositAmount, 8);
let CollateralAsset: Awaited<ReturnType<typeof addMockCollateralAsset>>;
let CollateralAsset8Dec: Awaited<ReturnType<typeof addMockCollateralAsset>>;

let KreskoAsset: Awaited<ReturnType<typeof addMockKreskoAsset>>;
let KreskoAsset2: Awaited<ReturnType<typeof addMockKreskoAsset>>;
let KISS: Awaited<ReturnType<typeof addMockKreskoAsset>>;

const depositAmount18Dec = toBig(depositAmount);
const depositAmount8Dec = toBig(depositAmount, 8);

let swapper: SignerWithAddress;
let depositor: SignerWithAddress;
let depositor2: SignerWithAddress;
let liquidator: SignerWithAddress;

let KreskoSwapper: typeof hre.Diamond;
let KreskoDepositor: typeof hre.Diamond;
let KreskoDepositor2: typeof hre.Diamond;
let KreskoLiquidator: typeof hre.Diamond;

const createAssets = () => [
    addMockKreskoAsset(
        {
            name: "KreskoAsset1",
            price: collateralPrice,
            symbol: "KreskoAsset1",
            closeFee: 0.1,
            openFee: 0.1,
            marketOpen: true,
            factor: 1.25,
            supplyLimit: 100_000,
        },
        true,
    ),
    addMockKreskoAsset(
        {
            name: "KreskoAsset2",
            price: KreskoAsset2Price,
            symbol: "KreskoAsset2",
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
];

const createCollaterals = () => [
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
];

describe("SCDP", async function () {
    withSCDPFixture({
        krAssets: createAssets,
        collaterals: createCollaterals,
    });

    describe("#Test", async () => {
        beforeEach(async function () {
            [CollateralAsset, CollateralAsset8Dec] = this.collaterals;
            [KreskoAsset, KreskoAsset2, KISS] = this.krAssets;
            [swapper, depositor, depositor2] = this.usersArr;
            liquidator = hre.users.liquidator;
            KreskoSwapper = wrapContractWithSigner(hre.Diamond, swapper);
            KreskoDepositor = wrapContractWithSigner(hre.Diamond, depositor);
            KreskoDepositor2 = wrapContractWithSigner(hre.Diamond, depositor2);
            KreskoLiquidator = wrapContractWithSigner(hre.Diamond, liquidator);
            for (const user of this.usersArr) {
                await CollateralAsset.setBalance(user, depositAmount18Dec);
                await CollateralAsset8Dec.setBalance(user, depositAmount8Dec);
            }
        });

        describe("#Configuration", async () => {
            it("should be initialized with correct params", async () => {
                const { args } = await getSCDPInitializer(hre);

                const configuration = await hre.Diamond.getSCDPConfig();
                expect(configuration.swapFeeRecipient).to.equal(args.swapFeeRecipient);
                expect(configuration.lt).to.equal(args.lt);
                expect(configuration.mcr).to.equal(args.mcr);
            });
            it("should be able to add whitelisted collateral", async () => {
                await hre.Diamond.enablePoolCollaterals([CollateralAsset.address], [defaultCollateralConfig]);
                const collateral = await hre.Diamond.getPoolCollateral(CollateralAsset.address);
                expect(collateral.decimals).to.equal(await CollateralAsset.contract.decimals());

                expect(collateral.liquidityIndex).to.equal(RAY);
                expect(collateral.depositLimit).to.equal(defaultCollateralConfig.depositLimit);

                const collaterals = await hre.Diamond.getPoolCollateralAssets();
                expect(collaterals).to.deep.equal([CollateralAsset.address]);
                expect(await hre.Diamond.getSCDPAssetEnabled(CollateralAsset.address)).to.equal(true);
            });

            it("should be able to update a whitelisted collateral", async () => {
                await hre.Diamond.enablePoolCollaterals([CollateralAsset.address], [defaultCollateralConfig]);
                await hre.Diamond.updatePoolCollateral(CollateralAsset.address, 1);

                const collateral = await hre.Diamond.getPoolCollateral(CollateralAsset.address);
                expect(collateral.decimals).to.equal(await CollateralAsset.contract.decimals());
                expect(collateral.liquidityIndex).to.equal(RAY);
                expect(collateral.depositLimit).to.equal(1);
            });

            it("should be able to disable a whitelisted collateral asset", async () => {
                await hre.Diamond.enablePoolCollaterals([CollateralAsset.address], [defaultCollateralConfig]);
                await hre.Diamond.disablePoolCollaterals([CollateralAsset.address]);
                const collaterals = await hre.Diamond.getPoolCollateralAssets();
                expect(collaterals).to.deep.equal([CollateralAsset.address]);
                expect(await hre.Diamond.getSCDPAssetEnabled(CollateralAsset.address)).to.equal(false);
            });

            it("should be able to remove a collateral asset", async () => {
                await hre.Diamond.enablePoolCollaterals([CollateralAsset.address], [defaultCollateralConfig]);
                await hre.Diamond.removePoolCollaterals([CollateralAsset.address]);
                const collaterals = await hre.Diamond.getPoolCollateralAssets();
                expect(collaterals).to.deep.equal([]);
                expect(await hre.Diamond.getSCDPAssetEnabled(CollateralAsset.address)).to.equal(false);
            });

            it("should be able to add whitelisted kresko asset", async () => {
                await hre.Diamond.enablePoolKrAssets([KreskoAsset.address], [defaultKrAssetConfig]);
                const kreskoAsset = await hre.Diamond.getPoolKrAsset(KreskoAsset.address);
                expect(kreskoAsset.openFee).to.equal(defaultKrAssetConfig.openFee);
                expect(kreskoAsset.closeFee).to.equal(defaultKrAssetConfig.closeFee);
                expect(kreskoAsset.liquidationIncentive).to.equal(defaultKrAssetConfig.liquidationIncentive);
                expect(kreskoAsset.protocolFee).to.equal(defaultKrAssetConfig.protocolFee);
                expect(kreskoAsset.supplyLimit).to.equal(defaultKrAssetConfig.supplyLimit);

                const krAssets = await hre.Diamond.getPoolKrAssets();
                expect(krAssets).to.deep.equal([KreskoAsset.address]);
                expect(await hre.Diamond.getSCDPAssetEnabled(KreskoAsset.address)).to.equal(true);
            });

            it("should be able to update a whitelisted kresko asset", async () => {
                await hre.Diamond.enablePoolKrAssets([KreskoAsset.address], [defaultKrAssetConfig]);
                const update: PoolKrAssetStruct = {
                    openFee: toBig(0.05),
                    closeFee: toBig(0.05),
                    liquidationIncentive: toBig(1.06),
                    protocolFee: toBig(0.4),
                    supplyLimit: toBig(50000),
                };
                await hre.Diamond.updatePoolKrAsset(KreskoAsset.address, update);
                const kreskoAsset = await hre.Diamond.getPoolKrAsset(KreskoAsset.address);
                expect(kreskoAsset.openFee).to.equal(update.openFee);
                expect(kreskoAsset.closeFee).to.equal(update.closeFee);
                expect(kreskoAsset.protocolFee).to.equal(update.protocolFee);
                expect(kreskoAsset.liquidationIncentive).to.equal(update.liquidationIncentive);
                expect(kreskoAsset.supplyLimit).to.equal(update.supplyLimit);

                const krAssets = await hre.Diamond.getPoolKrAssets();
                expect(krAssets).to.deep.equal([KreskoAsset.address]);
                expect(await hre.Diamond.getSCDPAssetEnabled(KreskoAsset.address)).to.equal(true);
            });
            it("should be able to disable a whitelisted kresko asset", async () => {
                await hre.Diamond.enablePoolKrAssets([KreskoAsset.address], [defaultKrAssetConfig]);
                await hre.Diamond.disablePoolKrAssets([KreskoAsset.address]);
                const krAssets = await hre.Diamond.getPoolKrAssets();
                expect(krAssets).to.deep.equal([KreskoAsset.address]);
                expect(await hre.Diamond.getSCDPAssetEnabled(KreskoAsset.address)).to.equal(false);
            });
            it("should be able to remove a whitelisted kresko asset", async () => {
                await hre.Diamond.enablePoolKrAssets([KreskoAsset.address], [defaultKrAssetConfig]);
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
                expect(await hre.Diamond.getSCDPSwapEnabled(CollateralAsset.address, KreskoAsset.address)).to.equal(
                    true,
                );
                expect(await hre.Diamond.getSCDPSwapEnabled(KreskoAsset.address, CollateralAsset.address)).to.equal(
                    true,
                );

                const swapPairsDisabled: ISCDPConfigFacet.PairSetterStruct[] = [
                    {
                        assetIn: CollateralAsset.address,
                        assetOut: KreskoAsset.address,
                        enabled: false,
                    },
                ];
                await hre.Diamond.setSwapPairs(swapPairsDisabled);
                expect(await hre.Diamond.getSCDPSwapEnabled(CollateralAsset.address, KreskoAsset.address)).to.equal(
                    false,
                );
                expect(await hre.Diamond.getSCDPSwapEnabled(KreskoAsset.address, CollateralAsset.address)).to.equal(
                    false,
                );
            });
        });

        describe("#Deposit", async function () {
            beforeEach(async () => {
                await Promise.all([
                    await hre.Diamond.enablePoolCollaterals(
                        [CollateralAsset.address, CollateralAsset8Dec.address],
                        [defaultCollateralConfig, defaultCollateralConfig],
                    ),
                    await hre.Diamond.enablePoolKrAssets([KreskoAsset.address], [defaultKrAssetConfig]),
                ]);
            });
            it("should be able to deposit collateral, calculate correct deposit values, not touching individual deposits", async function () {
                const expectedValueUnadjusted = toBig(collateralPrice * depositAmount, 8);
                const expectedValueAdjusted = toBig((collateralPrice / 1) * depositAmount, 8); // cfactor = 1
                const WITH_FACTORS = false;
                const WITHOUT_FACTORS = true;

                for (const signer of this.usersArr) {
                    const User = wrapContractWithSigner(hre.Diamond, signer);
                    await User.poolDeposit(signer.address, CollateralAsset.address, depositAmount18Dec);
                    const [
                        balance,
                        depositsWithFee,
                        principalDeposits,
                        depositValueWithoutFactors,
                        totalDepositsValueWithoutFactors,
                        totalDepositsValueWithFactors,
                        depositValueWithFactors,
                        totalDeposits,
                    ] = await Promise.all([
                        CollateralAsset.contract.balanceOf(signer.address),
                        User.getPoolAccountDepositsWithFees(signer.address, CollateralAsset.address),
                        User.getPoolAccountPrincipalDeposits(signer.address, CollateralAsset.address),
                        User.getPoolAccountDepositsValue(signer.address, CollateralAsset.address, WITHOUT_FACTORS),
                        User.getPoolAccountTotalDepositsValue(signer.address, WITHOUT_FACTORS),
                        User.getPoolAccountTotalDepositsValue(signer.address, WITH_FACTORS),
                        User.getPoolAccountDepositsValue(signer.address, CollateralAsset.address, WITH_FACTORS),
                        User.collateralDeposits(signer.address, CollateralAsset.address),
                    ]);
                    expect(balance).to.equal(0);
                    expect(depositsWithFee).to.equal(depositAmount18Dec);
                    expect(principalDeposits).to.equal(depositAmount18Dec);
                    expect(depositValueWithoutFactors).to.equal(expectedValueUnadjusted);
                    expect(totalDepositsValueWithoutFactors).to.equal(expectedValueUnadjusted);
                    expect(totalDepositsValueWithFactors).to.equal(expectedValueAdjusted);
                    expect(depositValueWithFactors).to.equal(expectedValueAdjusted);

                    // regular collateral deposits should be 0
                    expect(totalDeposits).to.equal(0);
                }
                expect(await CollateralAsset.contract.balanceOf(hre.Diamond.address)).to.equal(
                    depositAmount18Dec.mul(this.usersArr.length),
                );
                expect(await hre.Diamond.getPoolDeposits(CollateralAsset.address)).to.equal(
                    depositAmount18Dec.mul(this.usersArr.length),
                );

                // Unadjusted
                const globalUnadjusted = await hre.Diamond.getPoolStats(WITHOUT_FACTORS);
                expect(await hre.Diamond.getPoolDepositsValue(CollateralAsset.address, WITHOUT_FACTORS)).to.equal(
                    expectedValueUnadjusted.mul(this.usersArr.length),
                );
                expect(globalUnadjusted.collateralValue).to.equal(expectedValueUnadjusted.mul(this.usersArr.length));
                expect(globalUnadjusted.debtValue).to.equal(0);
                expect(globalUnadjusted.cr).to.equal(0);

                // Adjusted
                const globalAdjusted = await hre.Diamond.getPoolStats(WITH_FACTORS);
                expect(await hre.Diamond.getPoolDepositsValue(CollateralAsset.address, WITH_FACTORS)).to.equal(
                    expectedValueAdjusted.mul(this.usersArr.length),
                );
                expect(globalAdjusted.collateralValue).to.equal(expectedValueUnadjusted.mul(this.usersArr.length));
                expect(globalAdjusted.debtValue).to.equal(0);
                expect(globalAdjusted.cr).to.equal(0);
            });

            it("should be able to deposit multiple collaterals, calculate correct deposit values, not touching individual deposits", async function () {
                const expectedValueUnadjusted = toBig(collateralPrice * depositAmount, 8);
                const expectedValueAdjusted = toBig((collateralPrice / 1) * depositAmount, 8); // cfactor = 1

                const expectedValueUnadjusted8Dec = toBig(collateralPrice * depositAmount, 8);
                const expectedValueAdjusted8Dec = toBig(collateralPrice * 0.8 * depositAmount, 8); // cfactor = 0.8

                const WITH_FACTORS = false;
                const WITHOUT_FACTORS = true;

                for (const sig of this.usersArr) {
                    const User = wrapContractWithSigner(hre.Diamond, sig);
                    await Promise.all([
                        User.poolDeposit(sig.address, CollateralAsset.address, depositAmount18Dec),
                        User.poolDeposit(sig.address, CollateralAsset8Dec.address, depositAmount8Dec),
                    ]);

                    const [
                        depositsWithFees18Dec,
                        depositsWithFees8Dec,
                        depositValue18DecUnadjusted,
                        depositValue8DecUnadjusted,
                        totalDepositValueUnadjusted,
                        depositValue18DecAdjusted,
                        depositValue8DecAdjusted,
                        totalValueAdjusted,
                        depositsAfter18Dec,
                        depositsAfter8Dec,
                    ] = await Promise.all([
                        User.getPoolAccountDepositsWithFees(sig.address, CollateralAsset.address),
                        User.getPoolAccountDepositsWithFees(sig.address, CollateralAsset8Dec.address),
                        User.getPoolAccountDepositsValue(sig.address, CollateralAsset.address, WITHOUT_FACTORS),
                        User.getPoolAccountDepositsValue(sig.address, CollateralAsset8Dec.address, WITHOUT_FACTORS),
                        User.getPoolAccountTotalDepositsValue(sig.address, WITHOUT_FACTORS),
                        User.getPoolAccountDepositsValue(sig.address, CollateralAsset.address, WITH_FACTORS),
                        User.getPoolAccountDepositsValue(sig.address, CollateralAsset8Dec.address, WITH_FACTORS),
                        User.getPoolAccountTotalDepositsValue(sig.address, WITH_FACTORS),
                        User.collateralDeposits(sig.address, CollateralAsset.address),
                        User.collateralDeposits(sig.address, CollateralAsset8Dec.address),
                    ]);

                    expect(depositsWithFees18Dec).to.equal(depositAmount18Dec);
                    expect(depositsWithFees8Dec).to.equal(depositAmount8Dec);
                    // WITHOUT_FACTORS
                    expect(depositValue18DecUnadjusted).to.equal(expectedValueUnadjusted);
                    expect(depositValue8DecUnadjusted).to.equal(expectedValueUnadjusted8Dec);

                    expect(totalDepositValueUnadjusted).to.equal(
                        expectedValueUnadjusted.add(expectedValueUnadjusted8Dec),
                    );

                    // WITH_FACTORS
                    expect(depositValue18DecAdjusted).to.equal(expectedValueAdjusted);
                    expect(depositValue8DecAdjusted).to.equal(expectedValueAdjusted8Dec);

                    expect(totalValueAdjusted).to.equal(expectedValueAdjusted.add(expectedValueAdjusted8Dec));

                    // regular collateral deposits should be 0
                    expect(depositsAfter18Dec).to.equal(0);
                    expect(depositsAfter8Dec).to.equal(0);
                }

                expect(await hre.Diamond.getPoolDeposits(CollateralAsset.address)).to.equal(
                    depositAmount18Dec.mul(this.usersArr.length),
                );
                expect(await hre.Diamond.getPoolDeposits(CollateralAsset8Dec.address)).to.equal(
                    depositAmount8Dec.mul(this.usersArr.length),
                );

                // WITH_FACTORS global
                const valueTotalAdjusted = expectedValueAdjusted.mul(this.usersArr.length);
                const valueTotalAdjusted8Dec = expectedValueAdjusted8Dec.mul(this.usersArr.length);
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
                const valueTotalUnadjusted = expectedValueUnadjusted.mul(this.usersArr.length);
                const valueTotalUnadjusted8Dec = expectedValueUnadjusted8Dec.mul(this.usersArr.length);
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
                        [defaultCollateralConfig, defaultCollateralConfig],
                    ),
                    await hre.Diamond.enablePoolKrAssets([KreskoAsset.address], [defaultKrAssetConfig]),
                ]);
            });
            it("should be able to withdraw full collateral of multiple assets", async function () {
                for (const sig of this.usersArr) {
                    const User = wrapContractWithSigner(hre.Diamond, sig);
                    await Promise.all([
                        User.poolDeposit(sig.address, CollateralAsset.address, depositAmount18Dec),
                        User.poolDeposit(sig.address, CollateralAsset8Dec.address, depositAmount8Dec),
                    ]);
                    expect(await User.getPoolAccountDepositsWithFees(sig.address, CollateralAsset.address)).to.equal(
                        depositAmount18Dec,
                    );
                    await Promise.all([
                        User.poolWithdraw(sig.address, CollateralAsset.address, depositAmount18Dec),
                        User.poolWithdraw(sig.address, CollateralAsset8Dec.address, depositAmount8Dec),
                    ]);

                    expect(await CollateralAsset.contract.balanceOf(User.address)).to.equal(0);
                    expect(await CollateralAsset.contract.balanceOf(sig.address)).to.equal(depositAmount18Dec);

                    const [
                        depositsWithFees18Dec,
                        depositsWithFees8Dec,
                        depositsPrincipal18Dec,
                        depositsPrincipal8Dec,
                        totalDepositsAdjusted,
                        totalDepositsUnadjusted,
                    ] = await Promise.all([
                        User.getPoolAccountDepositsWithFees(sig.address, CollateralAsset.address),
                        User.getPoolAccountDepositsWithFees(sig.address, CollateralAsset8Dec.address),
                        User.getPoolAccountPrincipalDeposits(sig.address, CollateralAsset.address),
                        User.getPoolAccountPrincipalDeposits(sig.address, CollateralAsset8Dec.address),
                        hre.Diamond.getPoolAccountTotalDepositsValue(sig.address, false),
                        hre.Diamond.getPoolAccountTotalDepositsValue(sig.address, true),
                    ]);

                    expect(depositsWithFees18Dec).to.equal(0);
                    expect(depositsPrincipal18Dec).to.equal(0);

                    expect(depositsWithFees8Dec).to.equal(0);
                    expect(depositsPrincipal8Dec).to.equal(0);

                    expect(totalDepositsAdjusted).to.equal(0);
                    expect(totalDepositsUnadjusted).to.equal(0);
                }
                const results = await Promise.all([
                    hre.Diamond.getPoolDeposits(CollateralAsset.address),
                    hre.Diamond.getPoolDeposits(CollateralAsset8Dec.address),
                    hre.Diamond.getPoolDepositsValue(CollateralAsset.address, true),
                    hre.Diamond.getPoolDepositsValue(CollateralAsset.address, false),
                    hre.Diamond.getPoolDepositsValue(CollateralAsset8Dec.address, true),
                    hre.Diamond.getPoolDepositsValue(CollateralAsset8Dec.address, false),
                ]);
                expect(results.reduce((a, v) => a.add(v))).to.equal(0);

                const globals = await hre.Diamond.getPoolStats(true);
                expect(globals.collateralValue).to.equal(0);
                expect(globals.debtValue).to.equal(0);
                expect(globals.cr).to.equal(0);
            });
            it("should be able to withdraw partial collateral of multiple assets", async function () {
                const partialWithdraw = depositAmount18Dec.div(this.usersArr.length);
                const partialWithdraw8Dec = depositAmount8Dec.div(this.usersArr.length);

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

                for (const sig of this.usersArr) {
                    const User = wrapContractWithSigner(hre.Diamond, sig);
                    await Promise.all([
                        User.poolDeposit(sig.address, CollateralAsset.address, depositAmount18Dec),
                        User.poolDeposit(sig.address, CollateralAsset8Dec.address, depositAmount8Dec),
                    ]);

                    expect(await User.getPoolAccountDepositsWithFees(sig.address, CollateralAsset.address)).to.equal(
                        depositAmount18Dec,
                    );

                    await Promise.all([
                        User.poolWithdraw(sig.address, CollateralAsset.address, partialWithdraw),
                        User.poolWithdraw(sig.address, CollateralAsset8Dec.address, partialWithdraw8Dec),
                    ]);
                    const [
                        balance18Dec,
                        balance8Dec,
                        deposits18DecFees,
                        deposits18DecPrincipal,
                        deposits8DecFees,
                        deposits8DecPrincipal,
                        totalDepositsAdjusted,
                        totalDepositsUndjusted,
                    ] = await Promise.all([
                        CollateralAsset.contract.balanceOf(sig.address),
                        CollateralAsset8Dec.contract.balanceOf(sig.address),
                        User.getPoolAccountDepositsWithFees(sig.address, CollateralAsset.address),
                        User.getPoolAccountPrincipalDeposits(sig.address, CollateralAsset.address),
                        User.getPoolAccountDepositsWithFees(sig.address, CollateralAsset8Dec.address),
                        User.getPoolAccountPrincipalDeposits(sig.address, CollateralAsset8Dec.address),
                        hre.Diamond.getPoolAccountTotalDepositsValue(sig.address, false),
                        hre.Diamond.getPoolAccountTotalDepositsValue(sig.address, true),
                    ]);
                    expect(balance18Dec).to.equal(partialWithdraw);
                    expect(balance8Dec).to.equal(partialWithdraw8Dec);

                    expect(deposits18DecFees).to.equal(depositAmount18Dec.sub(partialWithdraw));
                    expect(deposits18DecPrincipal).to.equal(depositAmount18Dec.sub(partialWithdraw));

                    expect(deposits8DecFees).to.equal(depositAmount8Dec.sub(partialWithdraw8Dec));
                    expect(deposits8DecPrincipal).to.equal(depositAmount8Dec.sub(partialWithdraw8Dec));

                    expect(totalDepositsAdjusted).to.closeTo(
                        expectedValueAdjusted.add(expectedValueAdjusted8Dec),
                        toBig(0.00001, 8),
                    );

                    expect(totalDepositsUndjusted).to.closeTo(
                        expectedValueUnadjusted.add(expectedValueUnadjusted8Dec),
                        toBig(0.00001, 8),
                    );
                }

                expect(await CollateralAsset.contract.balanceOf(hre.Diamond.address)).to.closeTo(toBig(2000), 1);
                expect(await CollateralAsset8Dec.contract.balanceOf(hre.Diamond.address)).to.closeTo(toBig(2000, 8), 1);

                expect(await hre.Diamond.getPoolDeposits(CollateralAsset.address)).to.closeTo(toBig(2000), 1);
                expect(await hre.Diamond.getPoolDeposits(CollateralAsset8Dec.address)).to.closeTo(toBig(2000, 8), 1);

                expect(await hre.Diamond.getPoolDepositsValue(CollateralAsset.address, true)).to.closeTo(
                    expectedValueUnadjusted.mul(this.usersArr.length),
                    20,
                );
                expect(await hre.Diamond.getPoolDepositsValue(CollateralAsset.address, false)).to.closeTo(
                    expectedValueAdjusted.mul(this.usersArr.length),
                    20,
                );

                expect(await hre.Diamond.getPoolDepositsValue(CollateralAsset8Dec.address, true)).to.closeTo(
                    expectedValueUnadjusted8Dec.mul(this.usersArr.length),
                    20,
                );
                expect(await hre.Diamond.getPoolDepositsValue(CollateralAsset8Dec.address, false)).to.closeTo(
                    expectedValueAdjusted8Dec.mul(this.usersArr.length),
                    20,
                );
                const totalValueRemaining = expectedValueUnadjusted8Dec
                    .mul(this.usersArr.length)
                    .add(expectedValueUnadjusted.mul(this.usersArr.length));
                const globals = await hre.Diamond.getPoolStats(true);

                expect(globals.collateralValue).to.closeTo(totalValueRemaining, 20);
                expect(globals.debtValue).to.equal(0);
                expect(globals.cr).to.equal(0);
            });
        });

        describe("#Fee Distribution", () => {
            let incomeCumulator: SignerWithAddress;
            beforeEach(async function () {
                incomeCumulator = hre.users.admin;
                await CollateralAsset.setBalance(incomeCumulator, depositAmount18Dec.mul(this.usersArr.length));
                await Promise.all([
                    CollateralAsset.contract
                        .connect(incomeCumulator)
                        .approve(hre.Diamond.address, hre.ethers.constants.MaxUint256),
                    hre.Diamond.enablePoolCollaterals(
                        [CollateralAsset.address, CollateralAsset8Dec.address],
                        [defaultCollateralConfig, defaultCollateralConfig],
                    ),
                    hre.Diamond.enablePoolKrAssets([KreskoAsset.address], [defaultKrAssetConfig]),
                ]);
            });
            it("should be able to cumulate fees into deposits", async function () {
                const fees = depositAmount18Dec.mul(this.usersArr.length);
                const expectedValueNoFees = toBig(collateralPrice * depositAmount, 8);
                const expectedValueFees = expectedValueNoFees.mul(2);

                for (const signer of this.usersArr) {
                    const User = wrapContractWithSigner(hre.Diamond, signer);
                    await User.poolDeposit(signer.address, CollateralAsset.address, depositAmount18Dec);
                }

                await wrapContractWithSigner(hre.Diamond, incomeCumulator).cumulateIncome(
                    CollateralAsset.address,
                    fees,
                );

                for (const signer of this.usersArr) {
                    const User = wrapContractWithSigner(hre.Diamond, signer);

                    const [depositValue, depositValueWithFees, totalDepositValueUnadjusted, totalDepositValueWithFees] =
                        await Promise.all([
                            User.getPoolAccountDepositsValue(signer.address, CollateralAsset.address, true),
                            User.getPoolAccountDepositsValueWithFees(signer.address, CollateralAsset.address),
                            User.getPoolAccountTotalDepositsValue(signer.address, true),
                            User.getPoolAccountTotalDepositsValueWithFees(signer.address),
                        ]);

                    expect(depositValue).to.equal(
                        expectedValueNoFees, // fees are not collateralized
                    );
                    expect(depositValueWithFees).to.equal(expectedValueFees); // fees for single asset
                    expect(totalDepositValueUnadjusted).to.equal(expectedValueNoFees);
                    expect(totalDepositValueWithFees).to.equal(expectedValueFees); // fees

                    // withdraw principal
                    await User.poolWithdraw(signer.address, CollateralAsset.address, depositAmount18Dec);

                    const [
                        depositValue2,
                        depositValueWithFees2,
                        totalDepositValueUnadjusted2,
                        totalDepositValueWithFees2,
                        balAfter,
                    ] = await Promise.all([
                        User.getPoolAccountDepositsValue(signer.address, CollateralAsset.address, true),
                        User.getPoolAccountDepositsValueWithFees(signer.address, CollateralAsset.address),
                        User.getPoolAccountTotalDepositsValue(signer.address, true),
                        User.getPoolAccountTotalDepositsValueWithFees(signer.address),
                        CollateralAsset.contract.balanceOf(signer.address),
                    ]);
                    expect(depositValue2).to.equal(0);
                    expect(depositValueWithFees2).to.equal(expectedValueFees.sub(expectedValueNoFees));
                    expect(totalDepositValueWithFees2).to.equal(expectedValueFees.sub(expectedValueNoFees));
                    expect(totalDepositValueUnadjusted2).to.equal(0);
                    expect(balAfter).to.equal(depositAmount18Dec);
                }

                // expect protocol to have no collateral here, only fees left.
                expect(await CollateralAsset.contract.balanceOf(hre.Diamond.address)).to.equal(fees);
                expect(await hre.Diamond.getPoolDeposits(CollateralAsset.address)).to.equal(0);
                expect(await hre.Diamond.getPoolDepositsValue(CollateralAsset.address, true)).to.equal(0);
                expect(await hre.Diamond.getPoolDepositsValue(CollateralAsset.address, false)).to.equal(0);
                const global = await hre.Diamond.getPoolStats(true);
                expect(global.collateralValue).to.equal(0);

                // withdraw fees
                for (const signer of this.usersArr) {
                    const User = wrapContractWithSigner(hre.Diamond, signer);
                    await User.poolWithdraw(signer.address, CollateralAsset.address, depositAmount18Dec);
                    // fees in signer wallet
                    expect(await CollateralAsset.contract.balanceOf(signer.address)).to.equal(
                        depositAmount18Dec.add(depositAmount18Dec),
                    );
                    // nothing left in protocol for signer
                    expect(
                        await User.getPoolAccountDepositsValue(signer.address, CollateralAsset.address, true),
                    ).to.equal(0);
                    expect(
                        await User.getPoolAccountDepositsValueWithFees(signer.address, CollateralAsset.address),
                    ).to.equal(0);

                    expect(await User.getPoolAccountTotalDepositsValueWithFees(signer.address)).to.equal(0);
                    expect(await User.getPoolAccountTotalDepositsValue(signer.address, true)).to.equal(0);
                }

                // nothing left in protocol.
                expect(await CollateralAsset.contract.balanceOf(hre.Diamond.address)).to.equal(0);
                expect(await hre.Diamond.getPoolDeposits(CollateralAsset.address)).to.equal(0);
                expect(await hre.Diamond.getPoolDepositsValue(CollateralAsset.address, true)).to.equal(0);
                expect(await hre.Diamond.getPoolDepositsValue(CollateralAsset.address, false)).to.equal(0);
            });
        });
        describe("#Swap", () => {
            beforeEach(async function () {
                const krAssetConfig = {
                    openFee: toBig(0.015),
                    closeFee: toBig(0.015),
                    liquidationIncentive: toBig(1.05),
                    protocolFee: toBig(0.25),
                    supplyLimit: toBig(1000000),
                };
                const KISSConfig = {
                    openFee: toBig(0.025),
                    closeFee: toBig(0.025),
                    liquidationIncentive: toBig(1.05),
                    protocolFee: toBig(0.25),
                    supplyLimit: toBig(1000000),
                };
                await Promise.all([
                    hre.Diamond.enablePoolCollaterals(
                        [
                            CollateralAsset.address,
                            CollateralAsset8Dec.address,
                            KISS.address,
                            KreskoAsset.address,
                            KreskoAsset2.address,
                        ],
                        [
                            defaultCollateralConfig,
                            defaultCollateralConfig,
                            defaultCollateralConfig,
                            defaultCollateralConfig,
                            defaultCollateralConfig,
                        ],
                    ),
                    hre.Diamond.enablePoolKrAssets(
                        [KreskoAsset.address, KreskoAsset2.address, KISS.address],
                        [krAssetConfig, krAssetConfig, KISSConfig],
                    ),
                    hre.Diamond.setSwapPairs([
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
                for (const signer of this.usersArr) {
                    await CollateralAsset.setBalance(signer, toBig(1_000_000));
                }

                await KISS.setBalance(swapper, toBig(10_000));
                await KISS.setBalance(depositor, toBig(10_000));
                await KreskoDepositor.poolDeposit(
                    depositor.address,
                    KISS.address,
                    depositAmount18Dec, // $10k
                );
            });
            it("should have collateral in pool", async function () {
                const value = await hre.Diamond.getPoolStats(false);
                expect(value.collateralValue).to.equal(toBig(depositAmount, 8));
                expect(value.debtValue).to.equal(0);
                expect(value.cr).to.equal(0);
            });

            it("should be able to preview a swap", async function () {
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

            it("should be able to swap, shared debt == 0 | swap collateral == 0", async function () {
                const swapAmount = toBig(ONE_USD); // $1
                const expectedAmountOut = toBig(0.0096); // $100 * 0.0096 = $0.96

                const tx = await KreskoSwapper.swap(swapper.address, KISS.address, KreskoAsset2.address, swapAmount, 0);
                const event = await getNamedEvent<SwapEvent>(tx, "Swap");
                expect(event.args.who).to.equal(swapper.address);
                expect(event.args.assetIn).to.equal(KISS.address);
                expect(event.args.assetOut).to.equal(KreskoAsset2.address);
                expect(event.args.amountIn).to.equal(swapAmount);
                expect(event.args.amountOut).to.equal(expectedAmountOut);
                expect(await KreskoAsset2.contract.balanceOf(swapper.address)).to.equal(expectedAmountOut);
                expect(await KISS.contract.balanceOf(swapper.address)).to.equal(toBig(10_000).sub(swapAmount));

                expect(
                    await KreskoSwapper.getPoolAccountDepositsValue(swapper.address, KreskoAsset2.address, true),
                ).to.equal(0);
                expect(await KreskoSwapper.getPoolAccountDepositsValue(swapper.address, KISS.address, true)).to.equal(
                    0,
                );

                expect(await KreskoSwapper.getPoolSwapDeposits(KISS.address)).to.equal(toBig(0.96));

                const expectedDepositValue = toBig(depositAmount + 0.96, 8);
                expect(await KreskoSwapper.getPoolDepositsValue(KISS.address, true)).to.equal(expectedDepositValue);

                expect(await KreskoSwapper.getPoolKrAssetDebtValue(KreskoAsset2.address, true)).to.equal(
                    toBig(0.96, 8),
                );
                expect(await KreskoSwapper.getPoolKrAssetDebt(KreskoAsset2.address)).to.equal(toBig(0.0096));

                const global = await hre.Diamond.getPoolStats(true);
                expect(global.collateralValue).to.equal(expectedDepositValue);
                expect(global.debtValue).to.equal(toBig(0.96, 8));
                expect(global.cr).to.equal(expectedDepositValue.wadDiv(toBig(0.96, 8)));
            });

            it("should be able to swap, shared debt == assetsIn | swap collateral == assetsOut", async function () {
                const swapAmount = toBig(ONE_USD).mul(100); // $100
                const swapAmountAsset = toBig(0.96); // $96
                const expectedKissOut = toBig(92.16); // $100 * 0.96 = $96
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

                const globalBefore = await hre.Diamond.getPoolStats(true);

                expect(globalBefore.collateralValue).to.equal(initialDepositValue);

                await KreskoSwapper.swap(swapper.address, KISS.address, KreskoAsset2.address, swapAmount, 0);

                // the swap that clears debt
                const tx = await KreskoSwapper.swap(
                    swapper.address,
                    KreskoAsset2.address,
                    KISS.address,
                    swapAmountAsset,
                    0,
                );

                const event = await getNamedEvent<SwapEvent>(tx, "Swap");

                expect(event.args.who).to.equal(swapper.address);
                expect(event.args.assetIn).to.equal(KreskoAsset2.address);
                expect(event.args.assetOut).to.equal(KISS.address);
                expect(event.args.amountIn).to.equal(swapAmountAsset);
                expect(event.args.amountOut).to.equal(expectedKissOut);

                await expect(KreskoSwapper.getPoolSwapDeposits(KISS.address)).to.become(0);
                expect(await KreskoSwapper.getPoolDepositsValue(KISS.address, true)).to.equal(initialDepositValue);

                expect(await KreskoSwapper.getPoolKrAssetDebtValue(KreskoAsset2.address, true)).to.equal(0);
                expect(await KreskoSwapper.getPoolKrAssetDebt(KreskoAsset2.address)).to.equal(0);

                const global = await hre.Diamond.getPoolStats(true);

                expect(global.collateralValue).to.equal(toBig(1000, 8));
                expect(global.debtValue).to.equal(0);
                expect(global.cr).to.equal(0);
            });

            it("should be able to swap, shared debt > assetsIn | swap collateral > assetsOut", async function () {
                const swapAmount = toBig(ONE_USD); // $1

                await KreskoSwapper.swap(swapper.address, KISS.address, KreskoAsset2.address, swapAmount, 0);
                expect(await KreskoSwapper.getPoolDepositsValue(KISS.address, false)).to.equal(
                    toBig(depositAmount + 0.96, 8),
                );

                const expectedSwapDeposits = toBig(0.96);
                expect(await KreskoSwapper.getPoolSwapDeposits(KISS.address)).to.equal(expectedSwapDeposits);

                const swapAmountSecond = toBig(0.009); // this is $0.90, so less than $0.96 since we want to ensure shared debt > assetsIn | swap collateral > assetsOut
                const expectedKissOut = toBig(0.864); // 0.9 - (0.9 * 0.04) = 0.864
                const tx = await KreskoSwapper.swap(
                    swapper.address,
                    KreskoAsset2.address,
                    KISS.address,
                    swapAmountSecond,
                    0,
                );

                const event = await getNamedEvent<SwapEvent>(tx, "Swap");

                expect(event.args.who).to.equal(swapper.address);
                expect(event.args.assetIn).to.equal(KreskoAsset2.address);
                expect(event.args.assetOut).to.equal(KISS.address);
                expect(event.args.amountIn).to.equal(swapAmountSecond);
                expect(event.args.amountOut).to.equal(expectedKissOut);

                expect(
                    await KreskoSwapper.getPoolAccountDepositsValue(swapper.address, KreskoAsset2.address, true),
                ).to.equal(0);
                expect(await KreskoSwapper.getPoolAccountDepositsValue(swapper.address, KISS.address, true)).to.equal(
                    0,
                );

                const expectedSwapDepositsAfter = expectedSwapDeposits.sub(toBig(0.9));
                const expectedSwapDepositsValue = expectedSwapDepositsAfter.wadMul(await KISS.getPrice());
                expect(await KreskoSwapper.getPoolSwapDeposits(KISS.address)).to.equal(expectedSwapDepositsAfter);

                // expect(await KreskoSwapper.getPoolSwapDeposits(KISS.address)).to.equal(0);
                expect(await KreskoSwapper.getPoolDepositsValue(KISS.address, true)).to.equal(
                    toBig(depositAmount, 8).add(expectedSwapDepositsValue),
                );

                expect(await KreskoSwapper.getPoolKrAssetDebtValue(KreskoAsset2.address, true)).to.equal(
                    expectedSwapDepositsValue,
                );

                const expectedDebtAfter = expectedSwapDepositsValue.wadDiv(await KreskoAsset2.getPrice());
                expect(await KreskoSwapper.getPoolKrAssetDebt(KreskoAsset2.address)).to.equal(expectedDebtAfter);
                expect(await KreskoSwapper.getPoolKrAssetDebt(KISS.address)).to.equal(0);

                const global = await hre.Diamond.getPoolStats(true);
                const expectedCollateralValue = toBig(depositAmount + 0.06, 8);
                expect(global.collateralValue).to.equal(expectedCollateralValue); // swap deposits + collateral deposited
                expect(global.debtValue).to.equal(0.06e8); //
                expect(global.cr).to.equal(expectedCollateralValue.wadDiv(toBig(0.06, 8)));
            });

            it("should be able to swap, shared debt < assetsIn | swap collateral < assetsOut", async function () {
                const swapAmountKiss = toBig(ONE_USD).mul(100); // $100
                const swapAmountKrAsset = toBig(2); // $200
                const swapValue = 200;
                const expectedKissOut = toBig(192); // $200 * 0.96 = $192

                // deposit some to kresko for minting first
                await depositCollateral({
                    user: swapper,
                    asset: KISS,
                    amount: toBig(400),
                });
                const ICDPMintAmount = toBig(1.04);
                await mintKrAsset({
                    user: swapper,
                    asset: KreskoAsset2,
                    amount: ICDPMintAmount,
                });

                await KreskoSwapper.swap(swapper.address, KISS.address, KreskoAsset2.address, swapAmountKiss, 0);

                const stats = await hre.Diamond.getPoolStats(true);
                expect(await KreskoSwapper.getPoolSwapDeposits(KISS.address)).to.equal(toBig(96));
                expect(stats.collateralValue).to.be.eq(toBig(depositAmount + 96, 8));

                // the swap that matters, here user has 0.96 (previous swap) + 1.04 (mint). expecting 192 kiss from swap.
                const [expectedAmountOut] = await KreskoSwapper.previewSwap(
                    KreskoAsset2.address,
                    KISS.address,
                    swapAmountKrAsset,
                );
                expect(expectedAmountOut).to.equal(expectedKissOut);
                const tx = await KreskoSwapper.swap(
                    swapper.address,
                    KreskoAsset2.address,
                    KISS.address,
                    swapAmountKrAsset,
                    0,
                );

                const event = await getNamedEvent<SwapEvent>(tx, "Swap");

                expect(event.args.who).to.equal(swapper.address);
                expect(event.args.assetIn).to.equal(KreskoAsset2.address);
                expect(event.args.assetOut).to.equal(KISS.address);
                expect(event.args.amountIn).to.equal(swapAmountKrAsset);
                expect(event.args.amountOut).to.equal(expectedKissOut);

                // KISS deposits sent in swap
                expect(await KreskoSwapper.getPoolSwapDeposits(KISS.address)).to.equal(0); // half of 2 krAsset
                expect(await KreskoSwapper.getPoolDeposits(KISS.address)).to.equal(
                    await KreskoSwapper.getPoolAccountPrincipalDeposits(depositor.address, KISS.address),
                );

                // KrAsset debt is cleared
                expect(await KreskoSwapper.getPoolKrAssetDebtValue(KreskoAsset2.address, true)).to.equal(0);
                expect(await KreskoSwapper.getPoolKrAssetDebt(KreskoAsset2.address)).to.equal(0);
                // KISS debt is issued
                // 10400000000
                const expectedKissDebtValue = toBig(swapValue - 96, 8);
                expect(await KreskoSwapper.getPoolKrAssetDebtValue(KISS.address, true)).to.equal(expectedKissDebtValue);
                expect(await KreskoSwapper.getPoolKrAssetDebt(KISS.address)).to.equal(toBig(swapValue - 96));

                // krAsset swap deposits
                const expectedSwapDepositValue = toBig(swapValue - 96, 8);
                expect(await KreskoSwapper.getPoolSwapDeposits(KreskoAsset2.address)).to.equal(toBig(2 - 0.96));
                expect(await KreskoSwapper.getPoolDepositsValue(KreskoAsset2.address, true)).to.equal(
                    expectedSwapDepositValue,
                ); // asset price is $100

                const global = await hre.Diamond.getPoolStats(true);
                const expectedCollateralValue = toBig(1000, 8).add(expectedSwapDepositValue);
                expect(global.collateralValue).to.equal(expectedCollateralValue);
                expect(global.debtValue).to.equal(expectedKissDebtValue);
                expect(global.cr).to.equal(expectedCollateralValue.wadDiv(expectedKissDebtValue));
            });

            it("cumulates fees on swap", async function () {
                const depositAmountNew = toBig(10000 - depositAmount);
                await KISS.setBalance(depositor, depositAmountNew);
                await KreskoDepositor.poolDeposit(
                    depositor.address,
                    KISS.address,
                    depositAmountNew, // $10k
                );

                const swapAmount = toBig(ONE_USD * 2600); // $1

                const balFeesBefore = await KreskoSwapper.getPoolAccountDepositsValueWithFees(
                    depositor.address,
                    KISS.address,
                );

                await KreskoSwapper.swap(swapper.address, KISS.address, KreskoAsset2.address, swapAmount, 0);

                const balFeesAfterFirst = await KreskoSwapper.getPoolAccountDepositsValueWithFees(
                    depositor.address,
                    KISS.address,
                );
                expect(balFeesAfterFirst).to.gt(balFeesBefore);

                await KreskoSwapper.swap(
                    swapper.address,
                    KreskoAsset2.address,
                    KISS.address,
                    KreskoAsset2.contract.balanceOf(swapper.address),
                    0,
                );
                const balFeesAfterSecond = await KreskoSwapper.getPoolAccountDepositsValueWithFees(
                    depositor.address,
                    KISS.address,
                );
                expect(balFeesAfterSecond).to.gt(balFeesAfterFirst);

                const fees = await KreskoSwapper.getPoolAccountFeesGained(depositor.address, KISS.address);

                await KreskoDepositor.poolWithdraw(
                    depositor.address,
                    KISS.address,
                    fees, // ~90 KISS
                );

                expect(await hre.Diamond.getPoolAccountFeesGained(depositor.address, KISS.address)).to.eq(fees);

                expect(await hre.Diamond.getPoolAccountDepositsValueWithFees(depositor.address, KISS.address)).to.eq(
                    10000e8,
                );

                await KreskoDepositor.poolWithdraw(
                    depositor.address,
                    KISS.address,
                    toBig(10000), // $10k KISS
                );

                expect(await hre.Diamond.getPoolAccountFeesGained(depositor.address, KISS.address)).to.eq(0);

                expect(await hre.Diamond.getPoolAccountDepositsValueWithFees(depositor.address, KISS.address)).to.eq(0);
            });
        });
        describe("#Liquidations", () => {
            it("should identify if the pool is not underwater", async function () {
                const swapAmount = toBig(ONE_USD * 2600); // $1

                await KreskoSwapper.swap(swapper.address, KISS.address, KreskoAsset2.address, swapAmount, 0);
                expect(await hre.Diamond.poolIsLiquidatable()).to.be.false;
            });
            it("should revert liquidations if the pool is not underwater", async function () {
                const swapAmount = toBig(ONE_USD * 2600); // $1

                await KreskoSwapper.swap(swapper.address, KISS.address, KreskoAsset2.address, swapAmount, 0);
                expect(await hre.Diamond.poolIsLiquidatable()).to.be.false;

                await KreskoAsset2.setBalance(hre.users.liquidator, toBig(1_000_000));

                await expect(
                    KreskoLiquidator.poolLiquidate(KreskoAsset2.address, toBig(7.7), CollateralAsset8Dec.address),
                ).to.be.revertedWith("not-liquidatable");
            });
            it("should identify if the pool is underwater", async function () {
                const swapAmount = toBig(ONE_USD * 2600);

                await KreskoSwapper.swap(swapper.address, KISS.address, KreskoAsset2.address, swapAmount, 0);
                CollateralAsset.setPrice(collateralPrice / 1000);
                CollateralAsset8Dec.setPrice(collateralPrice / 1000);

                expect((await hre.Diamond.getPoolStats(true)).cr).to.be.lt((await hre.Diamond.getSCDPConfig()).lt);
                expect(await hre.Diamond.poolIsLiquidatable()).to.be.true;
            });
            it("should allow liquidating the underwater pool", async function () {
                const swapAmount = toBig(ONE_USD * 2600);

                await KreskoSwapper.swap(swapper.address, KISS.address, KreskoAsset2.address, swapAmount, 0);
                const newKreskoAssetPrice = 500;
                KreskoAsset2.setPrice(newKreskoAssetPrice);

                const maxLiquidatable = await hre.Diamond.getMaxLiquidationSCDP(
                    KreskoAsset2.address,
                    CollateralAsset8Dec.address,
                );
                const repayAmount = maxLiquidatable.wadDiv(await KreskoAsset2.getPrice());

                await KreskoAsset2.setBalance(hre.users.liquidator, repayAmount.add((1e18).toString()));

                expect((await hre.Diamond.getPoolStats(true)).cr).to.lt((await hre.Diamond.getSCDPConfig()).lt);

                const tx = await KreskoLiquidator.poolLiquidate(
                    KreskoAsset2.address,
                    repayAmount,
                    CollateralAsset8Dec.address,
                );

                // console.log("liq", (await tx.wait()).gasUsed.toString());
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
                    .wadDiv(toBig(collateralPrice, 8))
                    .div(10 ** 10);

                expect(event.args.liquidator).to.eq(hre.users.liquidator.address);
                expect(event.args.seizeAmount).to.eq(expectedSeizeAmount);
                expect(event.args.repayAmount).to.eq(repayAmount);
                expect(event.args.seizeCollateral).to.eq(CollateralAsset8Dec.address);
                expect(event.args.repayKreskoAsset).to.eq(KreskoAsset2.address);

                const expectedDepositsAfter = depositAmount8Dec.sub(event.args.seizeAmount);
                expect(
                    await hre.Diamond.getPoolAccountPrincipalDeposits(depositor.address, CollateralAsset8Dec.address),
                ).to.eq(expectedDepositsAfter);
                expect(
                    await hre.Diamond.getPoolAccountDepositsWithFees(depositor.address, CollateralAsset8Dec.address),
                ).to.eq(expectedDepositsAfter);

                await KreskoDepositor.poolDeposit(
                    depositor.address,
                    CollateralAsset.address,
                    depositAmount18Dec.mul(10),
                );

                expect((await hre.Diamond.getPoolStats(true)).cr).to.gt((await hre.Diamond.getSCDPConfig()).mcr);
                await expect(
                    KreskoDepositor.poolWithdraw(depositor.address, CollateralAsset8Dec.address, expectedDepositsAfter),
                ).to.not.be.reverted;

                expect(
                    await hre.Diamond.getPoolAccountPrincipalDeposits(depositor.address, CollateralAsset8Dec.address),
                ).to.eq(0);
                expect(
                    await hre.Diamond.getPoolAccountDepositsWithFees(depositor.address, CollateralAsset8Dec.address),
                ).to.eq(0);
            });

            beforeEach(async function () {
                const krAssetConfig = {
                    openFee: toBig(0.015),
                    closeFee: toBig(0.015),
                    protocolFee: toBig(0.25),
                    liquidationIncentive: toBig(1.05),
                    supplyLimit: toBig(1000000),
                };
                const KISSConfig = {
                    openFee: toBig(0.025),
                    closeFee: toBig(0.025),
                    liquidationIncentive: toBig(1.05),
                    protocolFee: toBig(0.25),
                    supplyLimit: toBig(1000000),
                };

                await Promise.all([
                    hre.Diamond.enablePoolCollaterals(
                        [
                            CollateralAsset.address,
                            CollateralAsset8Dec.address,
                            KISS.address,
                            KreskoAsset.address,
                            KreskoAsset2.address,
                        ],
                        [
                            defaultCollateralConfig,
                            defaultCollateralConfig,
                            defaultCollateralConfig,
                            defaultCollateralConfig,
                            defaultCollateralConfig,
                        ],
                    ),
                    hre.Diamond.enablePoolKrAssets(
                        [KreskoAsset.address, KreskoAsset2.address, KISS.address],
                        [krAssetConfig, krAssetConfig, KISSConfig],
                    ),
                    hre.Diamond.setSwapPairs([
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

                for (const signer of this.usersArr) {
                    await CollateralAsset.setBalance(signer, toBig(1_000_000));
                }

                await KISS.setBalance(swapper, toBig(10_000));
                await KISS.setBalance(depositor2, toBig(10_000));
                await Promise.all([
                    KreskoDepositor.poolDeposit(
                        depositor.address,
                        CollateralAsset.address,
                        depositAmount18Dec, // $10k
                    ),
                    KreskoDepositor.poolDeposit(
                        depositor.address,
                        CollateralAsset8Dec.address,
                        depositAmount8Dec, // $8k
                    ),
                    KreskoDepositor2.poolDeposit(
                        depositor2.address,
                        KISS.address,
                        depositAmount18Dec, // $8k
                    ),
                ]);
                CollateralAsset.setPrice(collateralPrice);
            });
        });
        describe("#Error", () => {
            it("should revert depositing unsupported tokens", async function () {
                const [UnsupportedToken] = await hre.deploy("MockERC20", {
                    args: ["UnsupportedToken", "UnsupportedToken", 18, toBig(1)],
                });
                await UnsupportedToken.approve(hre.Diamond.address, hre.ethers.constants.MaxUint256);
                const { deployer } = await hre.getNamedAccounts();
                await expect(hre.Diamond.poolDeposit(deployer, UnsupportedToken.address, 1)).to.be.revertedWith(
                    "asset-disabled",
                );
            });
            it("should revert withdrawing without deposits", async function () {
                await expect(
                    KreskoSwapper.poolWithdraw(depositor.address, CollateralAsset.address, 1),
                ).to.be.revertedWith("withdrawal-violation");
            });

            it("should revert withdrawals below MCR", async function () {
                const swapAmount = toBig(ONE_USD).mul(1000); // $1000
                await KreskoSwapper.swap(swapper.address, KISS.address, KreskoAsset2.address, swapAmount, 0); // generate debt
                const deposits = await KreskoSwapper.getPoolAccountPrincipalDeposits(
                    depositor.address,
                    CollateralAsset.address,
                );
                await expect(
                    KreskoDepositor.poolWithdraw(depositor.address, CollateralAsset.address, deposits),
                ).to.be.revertedWith("withdraw-mcr-violation");
            });

            it("should revert withdrawals of swap owned collateral deposits", async function () {
                const swapAmount = toBig(1);
                await KreskoAsset2.setBalance(swapper, swapAmount);

                await KreskoSwapper.swap(swapper.address, KreskoAsset2.address, KISS.address, swapAmount, 0);
                const deposits = await KreskoSwapper.getPoolSwapDeposits(KreskoAsset2.address);
                expect(deposits).to.be.gt(0);
                await expect(
                    KreskoSwapper.poolWithdraw(swapper.address, KreskoAsset2.address, deposits),
                ).to.be.revertedWith("withdrawal-violation");
            });

            it("should revert swapping with price below minAmountOut", async function () {
                const swapAmount = toBig(1);
                await KreskoAsset2.setBalance(swapper, swapAmount);
                const [amountOut] = await KreskoSwapper.previewSwap(KreskoAsset2.address, KISS.address, swapAmount);
                await expect(
                    KreskoSwapper.swap(
                        swapper.address,
                        KreskoAsset2.address,
                        KISS.address,
                        swapAmount,
                        amountOut.add(1),
                    ),
                ).to.be.revertedWith("swap-slippage");
            });

            it("should revert swapping unsupported route", async function () {
                const swapAmount = toBig(1);
                await KreskoAsset2.setBalance(swapper, swapAmount);

                await expect(
                    KreskoSwapper.swap(swapper.address, KreskoAsset2.address, CollateralAsset.address, swapAmount, 0),
                ).to.be.revertedWith("swap-disabled");
            });
            it("should revert swapping if asset in is disabled", async function () {
                const swapAmount = toBig(1);
                await KreskoAsset2.setBalance(swapper, swapAmount);

                await hre.Diamond.disablePoolKrAssets([KreskoAsset2.address]);
                await expect(
                    KreskoSwapper.swap(swapper.address, KreskoAsset2.address, KISS.address, swapAmount, 0),
                ).to.be.revertedWith("asset-in-disabled");
            });
            it("should revert swapping if asset out is disabled", async function () {
                const swapAmount = toBig(1);
                await KreskoAsset2.setBalance(swapper, swapAmount);

                await hre.Diamond.disablePoolKrAssets([KreskoAsset2.address]);
                await expect(
                    KreskoSwapper.swap(swapper.address, KISS.address, KreskoAsset2.address, swapAmount, 0),
                ).to.be.revertedWith("asset-out-disabled");
            });
            it("should revert swapping causes CDP to go below MCR", async function () {
                const swapAmount = toBig(1_000_000);
                await KreskoAsset2.setBalance(swapper, swapAmount);

                await expect(
                    KreskoSwapper.swap(swapper.address, KreskoAsset2.address, KISS.address, swapAmount, 0),
                ).to.be.revertedWith("swap-mcr-violation");
            });

            beforeEach(async function () {
                const krAssetConfig = {
                    openFee: toBig(0.015),
                    closeFee: toBig(0.015),
                    liquidationIncentive: toBig(1.05),
                    protocolFee: toBig(0.25),
                    supplyLimit: toBig(1000000),
                };
                const KISSConfig = {
                    openFee: toBig(0.025),
                    closeFee: toBig(0.025),
                    liquidationIncentive: toBig(1.05),
                    protocolFee: toBig(0.25),
                    supplyLimit: toBig(1000000),
                };

                await Promise.all([
                    hre.Diamond.enablePoolCollaterals(
                        [
                            CollateralAsset.address,
                            CollateralAsset8Dec.address,
                            KISS.address,
                            KreskoAsset.address,
                            KreskoAsset2.address,
                        ],
                        [
                            defaultCollateralConfig,
                            defaultCollateralConfig,
                            defaultCollateralConfig,
                            defaultCollateralConfig,
                            defaultCollateralConfig,
                        ],
                    ),
                    hre.Diamond.enablePoolKrAssets(
                        [KreskoAsset.address, KreskoAsset2.address, KISS.address],
                        [krAssetConfig, krAssetConfig, KISSConfig],
                    ),
                    hre.Diamond.setSwapPairs([
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
                for (const signer of this.usersArr) {
                    await CollateralAsset.setBalance(signer, toBig(1_000_000));
                }

                await KISS.setBalance(swapper, toBig(10_000));
                await KISS.setBalance(depositor, ethers.BigNumber.from(1));

                await Promise.all([
                    KreskoDepositor.poolDeposit(depositor.address, KISS.address, 1),
                    KreskoDepositor.poolDeposit(
                        depositor.address,
                        CollateralAsset.address,
                        depositAmount18Dec, // $10k
                    ),
                ]);
            });
        });
    });
});
