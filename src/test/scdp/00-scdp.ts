import { getSCDPInitializer } from "@deploy-config/shared";
import { RAY, getNamedEvent, toBig } from "@kreskolabs/lib";
import { expect } from "@test/chai";
import { wrapKresko } from "@utils/redstone";
import { scdpFixture, wrapContractWithSigner } from "@utils/test";
import { addMockCollateralAsset, depositCollateral } from "@utils/test/helpers/collaterals";
import { addMockKreskoAsset, mintKrAsset } from "@utils/test/helpers/krassets";
import hre, { ethers } from "hardhat";
import {
    SCDPCollateralStruct,
    SCDPKrAssetStruct,
    PairSetterStruct,
    SwapEvent,
    SCDPLiquidationOccuredEvent,
} from "types/typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko";

const defaultKrAssetConfig: SCDPKrAssetStruct = {
    openFee: toBig(0.01),
    closeFee: toBig(0.01),
    protocolFee: toBig(0.25),
    liquidationIncentive: toBig(1.05),
    supplyLimit: toBig(1000000),
};

const defaultCollateralConfig: SCDPCollateralStruct = {
    decimals: 0,
    depositLimit: ethers.constants.MaxUint256,
    liquidityIndex: RAY,
};

const ONE_USD = 1;

const collateralPrice = 10;
const KreskoAsset2Price = 100;
const depositAmount = 1000;
const initialDepositValue = toBig(depositAmount, 8);

const createAssets = () => [
    addMockKreskoAsset(
        {
            name: "MockKreskoAssetSCDP1",
            redstoneId: "MockKreskoAssetSCDP1",
            price: collateralPrice,
            symbol: "MockKreskoAssetSCDP1",
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
            name: "MockKreskoAssetSCDP2",
            redstoneId: "MockKreskoAssetSCDP2",
            price: KreskoAsset2Price,
            symbol: "MockKreskoAssetSCDP2",
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
            redstoneId: "KISS",
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
        name: "MockCollateralSCDP1",
        symbol: "MockCollateralSCDP1",
        redstoneId: "MockCollateralSCDP1",
        price: collateralPrice,
        factor: 1,
        decimals: 18,
    }),
    addMockCollateralAsset({
        name: "MockCollateralSCDP2",
        symbol: "MockCollateralSCDP2",
        redstoneId: "MockCollateralSCDP2",
        price: collateralPrice,
        factor: 0.8,
        decimals: 8, // eg USDT
    }),
];
const swapKrAssetConfig = {
    openFee: toBig(0.015),
    closeFee: toBig(0.015),
    liquidationIncentive: toBig(1.05),
    protocolFee: toBig(0.25),
    supplyLimit: toBig(1000000),
};
const swapKISSConfig = {
    openFee: toBig(0.025),
    closeFee: toBig(0.025),
    liquidationIncentive: toBig(1.05),
    protocolFee: toBig(0.25),
    supplyLimit: toBig(1000000),
};

describe.only("SCDP", async function () {
    let swapper: SignerWithAddress;
    let depositor: SignerWithAddress;
    let depositor2: SignerWithAddress;
    let liquidator: SignerWithAddress;

    let KreskoSwapper: typeof hre.Diamond;
    let KreskoDepositor: typeof hre.Diamond;
    let KreskoDepositor2: typeof hre.Diamond;
    let KreskoLiquidator: typeof hre.Diamond;

    let CollateralAsset: Awaited<ReturnType<typeof addMockCollateralAsset>>;
    let CollateralAsset8Dec: Awaited<ReturnType<typeof addMockCollateralAsset>>;

    let KreskoAsset: Awaited<ReturnType<typeof addMockKreskoAsset>>;
    let KreskoAsset2: Awaited<ReturnType<typeof addMockKreskoAsset>>;
    let KISS: Awaited<ReturnType<typeof addMockKreskoAsset>>;

    const depositAmount18Dec = toBig(depositAmount);
    const depositAmount8Dec = toBig(depositAmount, 8);
    this.slow(5000);

    beforeEach(async function () {
        const fixture = await scdpFixture({
            krAssets: createAssets,
            collaterals: createCollaterals,
            swapKISSConfig,
            defaultCollateralConfig,
            defaultKrAssetConfig,
            swapKrAssetConfig,
        });
        this.collaterals = fixture.collaterals;
        this.krAssets = fixture.krAssets;
        [CollateralAsset, CollateralAsset8Dec] = this.collaterals;
        [KreskoAsset, KreskoAsset2, KISS] = this.krAssets;

        this.usersArr = fixture.users;
        liquidator = hre.users.liquidator;
        [swapper, depositor, depositor2] = this.usersArr;

        KreskoSwapper = wrapKresko(hre.Diamond, swapper);
        KreskoDepositor = wrapKresko(hre.Diamond, depositor);
        KreskoDepositor2 = wrapKresko(hre.Diamond, depositor2);
        KreskoLiquidator = wrapKresko(hre.Diamond, liquidator);
    });

    const reset = async (users: SignerWithAddress[]) => {
        CollateralAsset.setPrice(collateralPrice);
        CollateralAsset8Dec.setPrice(collateralPrice);
        KreskoAsset.setPrice(collateralPrice);
        KreskoAsset2.setPrice(KreskoAsset2Price);
        KISS.setPrice(ONE_USD);

        for (const user of users) {
            await CollateralAsset.setBalance(user, depositAmount18Dec);
            await CollateralAsset8Dec.setBalance(user, depositAmount8Dec);
        }
        console.debug("Reset!");
    };

    describe("#Test", async function () {
        beforeEach(async function () {
            await reset(this.usersArr);
        });

        describe("#Configuration", async () => {
            it("should be initialized correctly", async () => {
                const { args } = await getSCDPInitializer(hre);

                const configuration = await hre.Diamond.getCurrentParametersSCDP();

                expect(configuration.swapFeeRecipient).to.equal(args.swapFeeRecipient);
                expect(configuration.lt).to.equal(args.lt);
                expect(configuration.mcr).to.equal(args.mcr);

                const collaterals = await hre.Diamond.getCollateralsSCDP();
                expect(collaterals).to.deep.equal([
                    CollateralAsset.address,
                    CollateralAsset8Dec.address,
                    KreskoAsset.address,
                    KreskoAsset2.address,
                    KISS.address,
                ]);
                const krAssets = await hre.Diamond.getKreskoAssetsSCDP();
                expect(krAssets).to.deep.equal([KreskoAsset.address, KreskoAsset2.address, KISS.address]);

                const depositsEnabled = await Promise.all([
                    hre.Diamond.getDepositEnabledSCDP(CollateralAsset.address),
                    hre.Diamond.getDepositEnabledSCDP(CollateralAsset8Dec.address),
                    hre.Diamond.getDepositEnabledSCDP(KreskoAsset.address),
                    hre.Diamond.getDepositEnabledSCDP(KreskoAsset2.address),
                    hre.Diamond.getDepositEnabledSCDP(KISS.address),
                ]);

                expect(depositsEnabled).to.deep.equal([true, true, false, false, false]);

                const depositAssets = await hre.Diamond.getDepositAssetsSCDP();

                expect(depositAssets).to.deep.equal([CollateralAsset.address, CollateralAsset8Dec.address]);

                const assetsEnabled = await Promise.all([
                    hre.Diamond.getAssetEnabledSCDP(CollateralAsset.address),
                    hre.Diamond.getAssetEnabledSCDP(CollateralAsset8Dec.address),
                    hre.Diamond.getAssetEnabledSCDP(KreskoAsset.address),
                    hre.Diamond.getAssetEnabledSCDP(KreskoAsset2.address),
                    hre.Diamond.getAssetEnabledSCDP(KISS.address),
                ]);

                expect(assetsEnabled).to.deep.equal([true, true, true, true, true]);
            });
            it("should be able to whitelist new deposit asset", async () => {
                await hre.Diamond.addDepositAssetsSCDP([KISS.address], [defaultCollateralConfig]);
                const collateral = await hre.Diamond.getCollateralSCDP(KISS.address);
                expect(collateral.decimals).to.equal(await KISS.contract.decimals());

                expect(collateral.liquidityIndex).to.equal(RAY);
                expect(collateral.depositLimit).to.equal(defaultCollateralConfig.depositLimit);

                expect(await hre.Diamond.getDepositEnabledSCDP(KISS.address)).to.equal(true);
            });

            it("should be able to update deposit limit of asset", async () => {
                await hre.Diamond.updateDepositLimitSCDP(CollateralAsset.address, 1);

                const collateral = await hre.Diamond.getCollateralSCDP(CollateralAsset.address);
                expect(collateral.decimals).to.equal(await CollateralAsset.contract.decimals());
                expect(collateral.liquidityIndex).to.equal(RAY);
                expect(collateral.depositLimit).to.equal(1);
            });

            it("should be able to disable a deposit asset", async () => {
                await hre.Diamond.disableAssetsSCDP([CollateralAsset.address], true);
                const collaterals = await hre.Diamond.getCollateralsSCDP();
                expect(collaterals).to.include(CollateralAsset.address);
                const depositAssets = await hre.Diamond.getDepositAssetsSCDP();
                expect(depositAssets).to.not.include(CollateralAsset.address);
                expect(await hre.Diamond.getAssetEnabledSCDP(CollateralAsset.address)).to.equal(true);
                expect(await hre.Diamond.getDepositEnabledSCDP(CollateralAsset.address)).to.equal(false);
            });

            it("should be able to disable and enable a collateral asset", async () => {
                await hre.Diamond.disableAssetsSCDP([CollateralAsset.address], false);

                expect(await hre.Diamond.getCollateralsSCDP()).to.include(CollateralAsset.address);
                expect(await hre.Diamond.getDepositAssetsSCDP()).to.not.include(CollateralAsset.address);
                expect(await hre.Diamond.getAssetEnabledSCDP(CollateralAsset.address)).to.equal(false);
                expect(await hre.Diamond.getDepositEnabledSCDP(CollateralAsset.address)).to.equal(false);

                await hre.Diamond.enableAssetsSCDP([CollateralAsset.address], false);

                expect(await hre.Diamond.getCollateralsSCDP()).to.include(CollateralAsset.address);
                expect(await hre.Diamond.getDepositAssetsSCDP()).to.not.include(CollateralAsset.address);
                expect(await hre.Diamond.getAssetEnabledSCDP(CollateralAsset.address)).to.equal(true);
                expect(await hre.Diamond.getDepositEnabledSCDP(CollateralAsset.address)).to.equal(false);

                await hre.Diamond.enableAssetsSCDP([CollateralAsset.address], true);
                expect(await hre.Diamond.getDepositEnabledSCDP(CollateralAsset.address)).to.equal(true);
            });
            it("should be able to remove a collateral asset", async () => {
                await hre.Diamond.removeCollateralsSCDP([CollateralAsset.address]);
                const collaterals = await hre.Diamond.getDepositAssetsSCDP();
                expect(collaterals).to.not.include(CollateralAsset.address);
                expect(await hre.Diamond.getAssetEnabledSCDP(CollateralAsset.address)).to.equal(false);
                expect(await hre.Diamond.getDepositEnabledSCDP(CollateralAsset.address)).to.equal(false);
            });

            it("should be able to add whitelisted kresko asset", async () => {
                const assetInfo = await hre.Diamond.getKreskoAssetSCDP(KreskoAsset.address);
                expect(assetInfo.openFee).to.equal(swapKrAssetConfig.openFee);
                expect(assetInfo.closeFee).to.equal(swapKrAssetConfig.closeFee);
                expect(assetInfo.liquidationIncentive).to.equal(swapKrAssetConfig.liquidationIncentive);
                expect(assetInfo.protocolFee).to.equal(swapKrAssetConfig.protocolFee);
                expect(assetInfo.supplyLimit).to.equal(swapKrAssetConfig.supplyLimit);
                expect(await hre.Diamond.getAssetEnabledSCDP(KreskoAsset.address)).to.equal(true);
            });

            it("should be able to update a whitelisted kresko asset", async () => {
                const update: SCDPKrAssetStruct = {
                    openFee: toBig(0.05),
                    closeFee: toBig(0.05),
                    liquidationIncentive: toBig(1.06),
                    protocolFee: toBig(0.4),
                    supplyLimit: toBig(50000),
                };
                await hre.Diamond.updateKrAssetSCDP(KreskoAsset.address, update);
                const assetInfo = await hre.Diamond.getKreskoAssetSCDP(KreskoAsset.address);
                expect(assetInfo.openFee).to.equal(update.openFee);
                expect(assetInfo.closeFee).to.equal(update.closeFee);
                expect(assetInfo.protocolFee).to.equal(update.protocolFee);
                expect(assetInfo.liquidationIncentive).to.equal(update.liquidationIncentive);
                expect(assetInfo.supplyLimit).to.equal(update.supplyLimit);

                const krAssets = await hre.Diamond.getKreskoAssetsSCDP();
                expect(krAssets).to.include(KreskoAsset.address);
                const collaterals = await hre.Diamond.getCollateralsSCDP();
                expect(collaterals).to.include(KreskoAsset.address);
                expect(await hre.Diamond.getAssetEnabledSCDP(KreskoAsset.address)).to.equal(true);
                expect(await hre.Diamond.getDepositEnabledSCDP(KreskoAsset.address)).to.equal(false);
            });
            it("should be able to disable a whitelisted kresko asset", async () => {
                await hre.Diamond.disableAssetsSCDP([KreskoAsset.address], false);
                expect(await hre.Diamond.getKreskoAssetsSCDP()).to.include(KreskoAsset.address);
                expect(await hre.Diamond.getAssetEnabledSCDP(KreskoAsset.address)).to.equal(false);
            });
            it("should be able to remove a whitelisted kresko asset", async () => {
                await hre.Diamond.removeKrAssetsSCDP([KreskoAsset.address]);
                const krAssets = await hre.Diamond.getKreskoAssetsSCDP();
                expect(krAssets).to.not.include(KreskoAsset.address);
                expect(await hre.Diamond.getAssetEnabledSCDP(KreskoAsset.address)).to.equal(false);
                expect(await hre.Diamond.getDepositEnabledSCDP(KreskoAsset.address)).to.equal(false);
            });

            it("should be able to disable and enable a collateral asset that is also a kresko asset", async () => {
                await hre.Diamond.addDepositAssetsSCDP([KISS.address], [defaultCollateralConfig]);
                await hre.Diamond.disableAssetsSCDP([KISS.address], false);
                expect(await hre.Diamond.getCollateralsSCDP()).to.include(KISS.address);
                expect(await hre.Diamond.getDepositAssetsSCDP()).to.not.include(KISS.address);
                expect(await hre.Diamond.getAssetEnabledSCDP(KISS.address)).to.equal(false);
                expect(await hre.Diamond.getDepositEnabledSCDP(KISS.address)).to.equal(false);
                expect(await hre.Diamond.getKreskoAssetsSCDP()).to.include(KISS.address);

                await hre.Diamond.enableAssetsSCDP([KISS.address], true);

                expect(await hre.Diamond.getCollateralsSCDP()).to.include(KISS.address);
                expect(await hre.Diamond.getDepositAssetsSCDP()).to.include(KISS.address);
                expect(await hre.Diamond.getAssetEnabledSCDP(KISS.address)).to.equal(true);
                expect(await hre.Diamond.getDepositEnabledSCDP(KISS.address)).to.equal(true);
                expect(await hre.Diamond.getKreskoAssetsSCDP()).to.include(KISS.address);
            });

            it("should be able to enable and disable swap pairs", async () => {
                const swapPairsEnabled: PairSetterStruct[] = [
                    {
                        assetIn: CollateralAsset.address,
                        assetOut: KreskoAsset.address,
                        enabled: true,
                    },
                ];
                await hre.Diamond.setSwapPairs(swapPairsEnabled);
                expect(await hre.Diamond.getSwapEnabledSCDP(CollateralAsset.address, KreskoAsset.address)).to.equal(
                    true,
                );
                expect(await hre.Diamond.getSwapEnabledSCDP(KreskoAsset.address, CollateralAsset.address)).to.equal(
                    true,
                );

                const swapPairsDisabled: PairSetterStruct[] = [
                    {
                        assetIn: CollateralAsset.address,
                        assetOut: KreskoAsset.address,
                        enabled: false,
                    },
                ];
                await hre.Diamond.setSwapPairs(swapPairsDisabled);
                expect(await hre.Diamond.getSwapEnabledSCDP(CollateralAsset.address, KreskoAsset.address)).to.equal(
                    false,
                );
                expect(await hre.Diamond.getSwapEnabledSCDP(KreskoAsset.address, CollateralAsset.address)).to.equal(
                    false,
                );
            });
        });
        describe("#Deposit", async function () {
            it("should be able to deposit collateral, calculate correct deposit values, not touching individual deposits", async function () {
                const expectedValueUnadjusted = toBig(collateralPrice * depositAmount, 8);
                const expectedValueAdjusted = toBig((collateralPrice / 1) * depositAmount, 8); // cfactor = 1

                await Promise.all(
                    this.usersArr.map(user => {
                        return wrapKresko(hre.Diamond, user).depositSCDP(
                            user.address,
                            CollateralAsset.address,
                            depositAmount18Dec,
                        );
                    }),
                );

                const [userInfos, statistics, assetInfo] = await Promise.all([
                    hre.Diamond.getAccountInfosSCDP(
                        this.usersArr.map(user => user.address),
                        [CollateralAsset.address],
                    ),
                    hre.Diamond.getStatisticsSCDP(),
                    hre.Diamond.getAssetInfoSCDP(CollateralAsset.address),
                ]);
                for (const userInfo of userInfos) {
                    const balance = await CollateralAsset.contract.balanceOf(userInfo.account);

                    expect(balance).to.equal(0);
                    expect(userInfo.deposits[0].depositAmountWithFees).to.equal(depositAmount18Dec);
                    expect(userInfo.deposits[0].depositAmount).to.equal(depositAmount18Dec);
                    expect(userInfo.totalDepositValue).to.equal(expectedValueUnadjusted);
                    expect(userInfo.totalDepositValueWithFees).to.equal(expectedValueUnadjusted);
                    expect(userInfo.deposits[0].depositValue).to.equal(expectedValueUnadjusted);
                    expect(userInfo.deposits[0].depositValueWithFees).to.equal(expectedValueUnadjusted);
                }

                expect(await CollateralAsset.contract.balanceOf(hre.Diamond.address)).to.equal(
                    depositAmount18Dec.mul(this.usersArr.length),
                );
                expect(assetInfo.depositAmount).to.equal(depositAmount18Dec.mul(this.usersArr.length));
                expect(assetInfo.depositValue).to.equal(expectedValueUnadjusted.mul(this.usersArr.length));
                expect(statistics.collateralValue).to.equal(expectedValueUnadjusted.mul(this.usersArr.length));
                expect(statistics.debtValue).to.equal(0);

                // Adjusted
                expect(assetInfo.depositValueAdjusted).to.equal(expectedValueAdjusted.mul(this.usersArr.length));
                expect(statistics.collateralValueAdjusted).to.equal(expectedValueUnadjusted.mul(this.usersArr.length));
                expect(statistics.debtValueAdjusted).to.equal(0);

                expect(statistics.effectiveDebtValue).to.equal(0);
                expect(statistics.crDebtValueAdjusted).to.equal(0);
                expect(statistics.crDebtValue).to.equal(0);
                expect(statistics.cr).to.equal(0);
            });
            it("should be able to deposit multiple collaterals, calculate correct deposit values, not touching individual deposits", async function () {
                const expectedValueUnadjusted = toBig(collateralPrice * depositAmount, 8);
                const expectedValueAdjusted = toBig((collateralPrice / 1) * depositAmount, 8); // cfactor = 1

                const expectedValueUnadjusted8Dec = toBig(collateralPrice * depositAmount, 8);
                const expectedValueAdjusted8Dec = toBig(collateralPrice * 0.8 * depositAmount, 8); // cfactor = 0.8

                await Promise.all(
                    this.usersArr.map(user => {
                        const User = wrapContractWithSigner(hre.Diamond, user);
                        return Promise.all([
                            User.depositSCDP(user.address, CollateralAsset.address, depositAmount18Dec),
                            User.depositSCDP(user.address, CollateralAsset8Dec.address, depositAmount8Dec),
                        ]);
                    }),
                );
                const [userInfos, assetInfos, globals] = await Promise.all([
                    hre.Diamond.getAccountInfosSCDP(
                        this.usersArr.map(u => u.address),
                        [CollateralAsset.address, CollateralAsset8Dec.address],
                    ),
                    hre.Diamond.getAssetInfosSCDP([CollateralAsset.address, CollateralAsset8Dec.address]),
                    hre.Diamond.getStatisticsSCDP(),
                ]);

                for (const userInfo of userInfos) {
                    expect(userInfo.deposits[0].depositAmount).to.equal(depositAmount18Dec);
                    expect(userInfo.deposits[0].depositValue).to.equal(expectedValueUnadjusted);
                    expect(userInfo.deposits[1].depositAmount).to.equal(depositAmount8Dec);
                    expect(userInfo.deposits[1].depositValue).to.equal(expectedValueUnadjusted8Dec);

                    expect(userInfo.totalDepositValue).to.equal(
                        expectedValueUnadjusted.add(expectedValueUnadjusted8Dec),
                    );
                }

                expect(assetInfos[0].depositAmount).to.equal(depositAmount18Dec.mul(this.usersArr.length));
                expect(assetInfos[1].depositAmount).to.equal(depositAmount8Dec.mul(this.usersArr.length));

                // WITH_FACTORS global
                const valueTotalAdjusted = expectedValueAdjusted.mul(this.usersArr.length);
                const valueTotalAdjusted8Dec = expectedValueAdjusted8Dec.mul(this.usersArr.length);
                const valueAdjusted = valueTotalAdjusted.add(valueTotalAdjusted8Dec);

                expect(assetInfos[0].depositValueAdjusted).to.equal(valueTotalAdjusted);
                expect(assetInfos[1].depositValueAdjusted).to.equal(valueTotalAdjusted8Dec);

                expect(globals.collateralValueAdjusted).to.equal(valueAdjusted);
                expect(globals.debtValue).to.equal(0);
                expect(globals.cr).to.equal(0);

                // WITHOUT_FACTORS global
                const valueTotalUnadjusted = expectedValueUnadjusted.mul(this.usersArr.length);
                const valueTotalUnadjusted8Dec = expectedValueUnadjusted8Dec.mul(this.usersArr.length);
                const valueUnadjusted = valueTotalUnadjusted.add(valueTotalUnadjusted8Dec);

                expect(assetInfos[0].depositValue).to.equal(valueTotalUnadjusted);
                expect(assetInfos[1].depositValue).to.equal(valueTotalUnadjusted8Dec);

                expect(globals.collateralValue).to.equal(valueUnadjusted);
                expect(globals.debtValue).to.equal(0);
                expect(globals.cr).to.equal(0);
            });
        });
        describe("#Withdraw", async () => {
            beforeEach(async function () {
                await Promise.all(
                    this.usersArr.map(async user => {
                        const UserKresko = wrapKresko(hre.Diamond, user);
                        await Promise.all([
                            UserKresko.depositSCDP(user.address, CollateralAsset.address, depositAmount18Dec),
                            UserKresko.depositSCDP(user.address, CollateralAsset8Dec.address, depositAmount8Dec),
                        ]);
                    }),
                );
            });

            it("should be able to withdraw full collateral of multiple assets", async function () {
                await Promise.all(
                    this.usersArr.map(async user => {
                        const UserKresko = wrapKresko(hre.Diamond, user);
                        return Promise.all([
                            UserKresko.withdrawSCDP(user.address, CollateralAsset.address, depositAmount18Dec),
                            UserKresko.withdrawSCDP(user.address, CollateralAsset8Dec.address, depositAmount8Dec),
                        ]);
                    }),
                );

                expect(await CollateralAsset.contract.balanceOf(hre.Diamond.address)).to.equal(0);
                const [userInfos, assetInfos, globals] = await Promise.all([
                    hre.Diamond.getAccountInfosSCDP(
                        this.usersArr.map(u => u.address),
                        [CollateralAsset.address, CollateralAsset8Dec.address],
                    ),
                    hre.Diamond.getAssetInfosSCDP([CollateralAsset.address, CollateralAsset8Dec.address]),
                    hre.Diamond.getStatisticsSCDP(),
                ]);

                for (const userInfo of userInfos) {
                    expect(await CollateralAsset.contract.balanceOf(userInfo.account)).to.equal(depositAmount18Dec);
                    expect(userInfo.deposits[0].depositAmount).to.equal(0);
                    expect(userInfo.deposits[0].depositAmountWithFees).to.equal(0);
                    expect(userInfo.deposits[1].depositAmount).to.equal(0);
                    expect(userInfo.deposits[1].depositAmountWithFees).to.equal(0);
                    expect(userInfo.totalDepositValue).to.equal(0);
                }

                for (const assetInfo of assetInfos) {
                    expect(assetInfo.depositValue).to.equal(0);
                    expect(assetInfo.depositAmount).to.equal(0);
                    expect(assetInfo.swapDeposits).to.equal(0);
                }
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

                await Promise.all(
                    this.usersArr.map(user => {
                        const UserKresko = wrapKresko(hre.Diamond, user);
                        return Promise.all([
                            UserKresko.withdrawSCDP(user.address, CollateralAsset.address, partialWithdraw),
                            UserKresko.withdrawSCDP(user.address, CollateralAsset8Dec.address, partialWithdraw8Dec),
                        ]);
                    }),
                );

                const [collateralBalanceAfter, collateral8DecBalanceAfter, globals, assetInfos, userInfos] =
                    await Promise.all([
                        CollateralAsset.contract.balanceOf(hre.Diamond.address),
                        CollateralAsset8Dec.contract.balanceOf(hre.Diamond.address),
                        hre.Diamond.getStatisticsSCDP(),
                        hre.Diamond.getAssetInfosSCDP([CollateralAsset.address, CollateralAsset8Dec.address]),
                        hre.Diamond.getAccountInfosSCDP(
                            this.usersArr.map(u => u.address),
                            [CollateralAsset.address, CollateralAsset8Dec.address],
                        ),
                    ]);
                for (const userInfo of userInfos) {
                    const [balance18Dec, balance8Dec] = await Promise.all([
                        CollateralAsset.contract.balanceOf(userInfo.account),
                        CollateralAsset8Dec.contract.balanceOf(userInfo.account),
                    ]);
                    expect(balance18Dec).to.equal(partialWithdraw);
                    expect(balance8Dec).to.equal(partialWithdraw8Dec);
                    expect(userInfo.deposits[0].depositAmount).to.equal(depositAmount18Dec.sub(partialWithdraw));
                    expect(userInfo.deposits[0].depositAmountWithFees).to.equal(
                        depositAmount18Dec.sub(partialWithdraw),
                    );

                    expect(userInfo.deposits[1].depositAmount).to.equal(depositAmount8Dec.sub(partialWithdraw8Dec));
                    expect(userInfo.deposits[1].depositAmountWithFees).to.equal(
                        depositAmount8Dec.sub(partialWithdraw8Dec),
                    );

                    expect(userInfo.totalDepositValue).to.closeTo(
                        expectedValueUnadjusted.add(expectedValueUnadjusted8Dec),
                        toBig(0.00001, 8),
                    );
                }

                expect(collateralBalanceAfter).to.closeTo(toBig(2000), 1);
                expect(collateral8DecBalanceAfter).to.closeTo(toBig(2000, 8), 1);

                expect(assetInfos[0].depositAmount).to.closeTo(toBig(2000), 1);
                expect(assetInfos[1].depositAmount).to.closeTo(toBig(2000, 8), 1);

                expect(assetInfos[0].depositValue).to.closeTo(expectedValueUnadjusted.mul(this.usersArr.length), 20);
                expect(assetInfos[0].depositValueAdjusted).to.closeTo(
                    expectedValueAdjusted.mul(this.usersArr.length),
                    20,
                );

                expect(assetInfos[1].depositValue).to.closeTo(
                    expectedValueUnadjusted8Dec.mul(this.usersArr.length),
                    20,
                );
                expect(assetInfos[1].depositValueAdjusted).to.closeTo(
                    expectedValueAdjusted8Dec.mul(this.usersArr.length),
                    20,
                );
                const totalValueRemaining = expectedValueUnadjusted8Dec
                    .mul(this.usersArr.length)
                    .add(expectedValueUnadjusted.mul(this.usersArr.length));

                expect(globals.collateralValue).to.closeTo(totalValueRemaining, 20);
                expect(globals.debtValue).to.equal(0);
                expect(globals.cr).to.equal(0);
            });
        });
        describe("#Fee Distribution", () => {
            let incomeCumulator: SignerWithAddress;

            beforeEach(async function () {
                incomeCumulator = hre.users.admin;
                await Promise.all([
                    CollateralAsset.contract
                        .connect(incomeCumulator)
                        .approve(hre.Diamond.address, hre.ethers.constants.MaxUint256),
                    CollateralAsset.setBalance(incomeCumulator, depositAmount18Dec.mul(this.usersArr.length)),
                ]);
            });

            it("should be able to cumulate fees into deposits", async function () {
                const fees = depositAmount18Dec.mul(this.usersArr.length);
                const expectedValueNoFees = toBig(collateralPrice * depositAmount, 8);
                const expectedValueFees = expectedValueNoFees.mul(2);

                // deposit some
                await Promise.all(
                    this.usersArr.map(signer =>
                        wrapKresko(hre.Diamond, signer).depositSCDP(
                            signer.address,
                            CollateralAsset.address,
                            depositAmount18Dec,
                        ),
                    ),
                );

                // cumulate some income
                await wrapContractWithSigner(hre.Diamond, incomeCumulator).cumulateIncomeSCDP(
                    CollateralAsset.address,
                    fees,
                );

                // check that the fees are cumulated
                for (const data of await hre.Diamond.getAccountInfosSCDP(
                    this.usersArr.map(u => u.address),
                    [CollateralAsset.address],
                )) {
                    expect(data.deposits[0].depositValue).to.equal(expectedValueNoFees);
                    expect(data.deposits[0].depositValueWithFees).to.equal(expectedValueFees);
                    expect(data.totalDepositValue).to.equal(expectedValueNoFees);
                    expect(data.totalDepositValueWithFees).to.equal(expectedValueFees);
                }

                // withdraw principal
                await Promise.all(
                    this.usersArr.map(signer =>
                        wrapKresko(hre.Diamond, signer).withdrawSCDP(
                            signer.address,
                            CollateralAsset.address,
                            depositAmount18Dec,
                        ),
                    ),
                );

                for (const user of await hre.Diamond.getAccountInfosSCDP(
                    this.usersArr.map(u => u.address),
                    [CollateralAsset.address],
                )) {
                    const balance = await CollateralAsset.contract.balanceOf(user.account);
                    expect(user.deposits[0].depositValue).to.equal(0);
                    expect(user.deposits[0].depositValueWithFees).to.equal(expectedValueFees.sub(expectedValueNoFees));
                    expect(user.totalDepositValueWithFees).to.equal(expectedValueFees.sub(expectedValueNoFees));
                    expect(user.totalDepositValue).to.equal(0);
                    expect(balance).to.equal(depositAmount18Dec);
                }

                const [assetInfo, stats, balance] = await Promise.all([
                    hre.Diamond.getAssetInfoSCDP(CollateralAsset.address),
                    hre.Diamond.getStatisticsSCDP(),
                    CollateralAsset.contract.balanceOf(hre.Diamond.address),
                ]);

                expect(balance).to.equal(fees);
                expect(assetInfo.depositAmount).to.equal(0);
                expect(assetInfo.depositValue).to.equal(0);
                expect(assetInfo.depositValueAdjusted).to.equal(0);
                expect(stats.collateralValue).to.equal(0);

                // Withdraw fees
                await Promise.all(
                    this.usersArr.map(signer => {
                        return wrapKresko(hre.Diamond, signer).withdrawSCDP(
                            signer.address,
                            CollateralAsset.address,
                            depositAmount18Dec,
                        );
                    }),
                );

                for (const data of await hre.Diamond.getAccountInfosSCDP(
                    this.usersArr.map(u => u.address),
                    [CollateralAsset.address],
                )) {
                    const balance = await CollateralAsset.contract.balanceOf(data.account);
                    expect(balance).to.equal(depositAmount18Dec.add(depositAmount18Dec));
                    expect(data.deposits[0].depositValue).to.equal(0);
                    expect(data.deposits[0].depositValueWithFees).to.equal(0);
                    expect(data.totalDepositValue).to.equal(0);
                    expect(data.totalDepositValueWithFees).to.equal(0);
                }

                // nothing left in protocol.
                const [colalteralBalanceKresko, assetInfoFinal] = await Promise.all([
                    CollateralAsset.contract.balanceOf(hre.Diamond.address),
                    hre.Diamond.getAssetInfoSCDP(CollateralAsset.address),
                ]);
                expect(colalteralBalanceKresko).to.equal(0);
                expect(assetInfoFinal.depositAmount).to.equal(0);
                expect(assetInfoFinal.depositValue).to.equal(0);
                expect(assetInfoFinal.depositValueAdjusted).to.equal(0);
            });
        });
        describe("#Swap", () => {
            beforeEach(async function () {
                // mint some KISS for users
                await hre.Diamond.addDepositAssetsSCDP([KISS.address], [defaultCollateralConfig]);
                await Promise.all(this.usersArr.map(signer => CollateralAsset.setBalance(signer, toBig(1_000_000))));
                await KISS.setBalance(swapper, toBig(10_000));
                await KISS.setBalance(depositor, toBig(10_000));
                await KreskoDepositor.depositSCDP(
                    depositor.address,
                    KISS.address,
                    depositAmount18Dec, // $10k
                );
            });
            it("should have collateral in pool", async function () {
                const value = await hre.Diamond.getStatisticsSCDP();
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

                const [amountOut, feeAmount, feeAmountProtocol] = await hre.Diamond.previewSwapSCDP(
                    KISS.address,
                    KreskoAsset2.address,
                    toBig(1),
                );
                expect(amountOut).to.equal(expectedAmountOut);
                expect(feeAmount).to.equal(expectedFee);
                expect(feeAmountProtocol).to.equal(expectedProtocolFee);
            });

            it("should be able to swap, shared debt == 0 | swap collateral == 0 upgraded", async function () {
                const swapAmount = toBig(ONE_USD); // $1
                const expectedAmountOut = toBig(0.0096); // $100 * 0.0096 = $0.96

                const tx = await KreskoSwapper.swapSCDP(
                    swapper.address,
                    KISS.address,
                    KreskoAsset2.address,
                    swapAmount,
                    0,
                );
                const event = await getNamedEvent<SwapEvent>(tx, "Swap");
                expect(event.args.who).to.equal(swapper.address);
                expect(event.args.assetIn).to.equal(KISS.address);
                expect(event.args.assetOut).to.equal(KreskoAsset2.address);
                expect(event.args.amountIn).to.equal(swapAmount);
                expect(event.args.amountOut).to.equal(expectedAmountOut);

                const [KR2Balance, KISSBalance, swapperInfo, assetInfos, global] = await Promise.all([
                    KreskoAsset2.contract.balanceOf(swapper.address),
                    KISS.contract.balanceOf(swapper.address),
                    hre.Diamond.getAccountInfoSCDP(swapper.address, [KreskoAsset2.address, KISS.address]),
                    hre.Diamond.getAssetInfosSCDP([KreskoAsset2.address, KISS.address]),
                    hre.Diamond.getStatisticsSCDP(),
                ]);

                expect(KR2Balance).to.equal(expectedAmountOut);
                expect(KISSBalance).to.equal(toBig(10_000).sub(swapAmount));

                expect(swapperInfo.deposits[0].depositValue).to.equal(0);
                expect(swapperInfo.deposits[1].depositValue).to.equal(0);

                expect(assetInfos[1].swapDeposits).to.equal(toBig(0.96));
                expect(assetInfos[0].debtAmount).to.equal(toBig(0.0096));

                const expectedDepositValue = toBig(depositAmount + 0.96, 8);
                expect(assetInfos[1].depositValue).to.equal(expectedDepositValue);
                expect(assetInfos[0].debtValue).to.equal(toBig(0.96, 8));

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

                const globalBefore = await hre.Diamond.getStatisticsSCDP();

                expect(globalBefore.collateralValue).to.equal(initialDepositValue);

                await KreskoSwapper.swapSCDP(swapper.address, KISS.address, KreskoAsset2.address, swapAmount, 0);

                // the swap that clears debt
                const tx = await KreskoSwapper.swapSCDP(
                    swapper.address,
                    KreskoAsset2.address,
                    KISS.address,
                    swapAmountAsset,
                    0,
                );

                const [event, assetInfos] = await Promise.all([
                    getNamedEvent<SwapEvent>(tx, "Swap"),
                    hre.Diamond.getAssetInfosSCDP([KISS.address, KreskoAsset2.address]),
                ]);

                expect(event.args.who).to.equal(swapper.address);
                expect(event.args.assetIn).to.equal(KreskoAsset2.address);
                expect(event.args.assetOut).to.equal(KISS.address);
                expect(event.args.amountIn).to.equal(swapAmountAsset);
                expect(event.args.amountOut).to.equal(expectedKissOut);

                expect(assetInfos[0].swapDeposits).to.equal(0);
                expect(assetInfos[0].depositValue).to.equal(initialDepositValue);

                expect(assetInfos[1].debtValue).to.equal(0);
                expect(assetInfos[1].debtAmount).to.equal(0);

                const global = await hre.Diamond.getStatisticsSCDP();
                expect(global.collateralValue).to.equal(toBig(1000, 8));
                expect(global.debtValue).to.equal(0);
                expect(global.cr).to.equal(0);
            });

            it("should be able to swap, shared debt > assetsIn | swap collateral > assetsOut", async function () {
                const swapAmount = toBig(ONE_USD); // $1

                await KreskoSwapper.swapSCDP(swapper.address, KISS.address, KreskoAsset2.address, swapAmount, 0);

                const assetInfoKISS = await hre.Diamond.getAssetInfoSCDP(KISS.address);

                expect(assetInfoKISS.depositValue).to.equal(toBig(depositAmount + 0.96, 8));
                const expectedSwapDeposits = toBig(0.96);
                expect(assetInfoKISS.swapDeposits).to.equal(expectedSwapDeposits);

                const swapAmountSecond = toBig(0.009); // this is $0.90, so less than $0.96 since we want to ensure shared debt > assetsIn | swap collateral > assetsOut
                const expectedKissOut = toBig(0.864); // 0.9 - (0.9 * 0.04) = 0.864
                const tx = await KreskoSwapper.swapSCDP(
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

                const [depositValueKR2, depositValueKISS, assetInfos, globals] = await Promise.all([
                    KreskoSwapper.getAccountDepositValueSCDP(swapper.address, KreskoAsset2.address),
                    KreskoSwapper.getAccountDepositValueSCDP(swapper.address, KISS.address),
                    hre.Diamond.getAssetInfosSCDP([KISS.address, KreskoAsset2.address]),
                    hre.Diamond.getStatisticsSCDP(),
                ]);

                expect(depositValueKR2).to.equal(0);
                expect(depositValueKISS).to.equal(0);

                const expectedSwapDepositsAfter = expectedSwapDeposits.sub(toBig(0.9));
                const expectedSwapDepositsValue = expectedSwapDepositsAfter.wadMul(assetInfoKISS.assetPrice);

                expect(assetInfos[0].swapDeposits).to.equal(expectedSwapDepositsAfter);
                expect(assetInfos[0].depositValue).to.equal(toBig(depositAmount, 8).add(expectedSwapDepositsValue));
                expect(assetInfos[1].debtValue).to.equal(expectedSwapDepositsValue);

                const expectedDebtAfter = expectedSwapDepositsValue.wadDiv(await KreskoAsset2.getPrice());
                expect(assetInfos[0].debtAmount).to.equal(0);
                expect(assetInfos[1].debtAmount).to.equal(expectedDebtAfter);

                const expectedCollateralValue = toBig(depositAmount + 0.06, 8);
                expect(globals.collateralValue).to.equal(expectedCollateralValue); // swap deposits + collateral deposited
                expect(globals.debtValue).to.equal(0.06e8); //
                expect(globals.cr).to.equal(expectedCollateralValue.wadDiv(toBig(0.06, 8)));
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

                await KreskoSwapper.swapSCDP(swapper.address, KISS.address, KreskoAsset2.address, swapAmountKiss, 0);

                const stats = await hre.Diamond.getStatisticsSCDP();
                expect(await KreskoSwapper.getSwapDepositsSCDP(KISS.address)).to.equal(toBig(96));
                expect(stats.collateralValue).to.be.eq(toBig(depositAmount + 96, 8));

                // the swap that matters, here user has 0.96 (previous swap) + 1.04 (mint). expecting 192 kiss from swap.
                const [expectedAmountOut] = await KreskoSwapper.previewSwapSCDP(
                    KreskoAsset2.address,
                    KISS.address,
                    swapAmountKrAsset,
                );
                expect(expectedAmountOut).to.equal(expectedKissOut);
                const tx = await KreskoSwapper.swapSCDP(
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

                const assetInfos = await hre.Diamond.getAssetInfosSCDP([KISS.address, KreskoAsset2.address]);
                // KISS deposits sent in swap
                const acocuntPrincipalDepositsKISS = await KreskoSwapper.getAccountDepositSCDP(
                    depositor.address,
                    KISS.address,
                );

                expect(assetInfos[0].swapDeposits).to.equal(0); // half of 2 krAsset
                expect(assetInfos[0].depositAmount).to.equal(acocuntPrincipalDepositsKISS);

                // KrAsset debt is cleared
                expect(assetInfos[1].debtValue).to.equal(0);
                expect(assetInfos[1].debtAmount).to.equal(0);

                // KISS debt is issued
                const expectedKissDebtValue = toBig(swapValue - 96, 8);
                expect(assetInfos[0].debtValue).to.equal(expectedKissDebtValue);
                expect(assetInfos[0].debtAmount).to.equal(toBig(swapValue - 96));

                // krAsset swap deposits
                const expectedSwapDepositValue = toBig(swapValue - 96, 8);
                expect(assetInfos[1].swapDeposits).to.equal(toBig(2 - 0.96));
                expect(assetInfos[1].depositValue).to.equal(expectedSwapDepositValue); // asset price is $100

                const global = await hre.Diamond.getStatisticsSCDP();
                const expectedCollateralValue = toBig(1000, 8).add(expectedSwapDepositValue);
                expect(global.collateralValue).to.equal(expectedCollateralValue);
                expect(global.debtValue).to.equal(expectedKissDebtValue);
                expect(global.cr).to.equal(expectedCollateralValue.wadDiv(expectedKissDebtValue));
            });

            it("cumulates fees on swap", async function () {
                const depositAmountNew = toBig(10000 - depositAmount);

                await KISS.setBalance(depositor, depositAmountNew);
                await KreskoDepositor.depositSCDP(
                    depositor.address,
                    KISS.address,
                    depositAmountNew, // $10k
                );

                const swapAmount = toBig(ONE_USD * 2600); // $1

                const balFeesBefore = await KreskoSwapper.getAccountDepositValueWithFeesSCDP(
                    depositor.address,
                    KISS.address,
                );

                await KreskoSwapper.swapSCDP(swapper.address, KISS.address, KreskoAsset2.address, swapAmount, 0);

                const balFeesAfterFirst = await KreskoSwapper.getAccountDepositValueWithFeesSCDP(
                    depositor.address,
                    KISS.address,
                );
                expect(balFeesAfterFirst).to.gt(balFeesBefore);

                await KreskoSwapper.swapSCDP(
                    swapper.address,
                    KreskoAsset2.address,
                    KISS.address,
                    KreskoAsset2.contract.balanceOf(swapper.address),
                    0,
                );
                const balFeesAfterSecond = await KreskoSwapper.getAccountDepositValueWithFeesSCDP(
                    depositor.address,
                    KISS.address,
                );
                expect(balFeesAfterSecond).to.gt(balFeesAfterFirst);

                const feesBefore = await KreskoSwapper.getAccountDepositFeesGainedSCDP(depositor.address, KISS.address);

                await KreskoDepositor.withdrawSCDP(
                    depositor.address,
                    KISS.address,
                    feesBefore, // ~90 KISS
                );

                const [feesAfterThird, feesAfter] = await Promise.all([
                    KreskoSwapper.getAccountDepositValueWithFeesSCDP(depositor.address, KISS.address),
                    KreskoSwapper.getAccountDepositFeesGainedSCDP(depositor.address, KISS.address),
                ]);

                expect(feesBefore).to.eq(feesAfter);

                expect(feesAfterThird).to.eq(10000e8);

                await KreskoDepositor.withdrawSCDP(
                    depositor.address,
                    KISS.address,
                    toBig(10000), // $10k KISS
                );

                const [depositsAfterFourth, feesAfterFourth] = await Promise.all([
                    KreskoSwapper.getAccountDepositValueSCDP(depositor.address, KISS.address),
                    KreskoSwapper.getAccountDepositValueWithFeesSCDP(depositor.address, KISS.address),
                ]);

                expect(depositsAfterFourth).to.eq(0);

                expect(feesAfterFourth).to.eq(0);
            });
        });
        describe("#Liquidations", () => {
            beforeEach(async function () {
                await hre.Diamond.addDepositAssetsSCDP(
                    [KISS.address, KreskoAsset2.address],
                    [defaultCollateralConfig, defaultCollateralConfig],
                );
                for (const signer of this.usersArr) {
                    await CollateralAsset.setBalance(signer, toBig(1_000_000));
                }
                await KISS.setBalance(swapper, toBig(10_000));
                await KISS.setBalance(depositor2, toBig(10_000));
                await Promise.all([
                    KreskoDepositor.depositSCDP(
                        depositor.address,
                        CollateralAsset.address,
                        depositAmount18Dec, // $10k
                    ),
                    KreskoDepositor.depositSCDP(
                        depositor.address,
                        CollateralAsset8Dec.address,
                        depositAmount8Dec, // $8k
                    ),
                    KreskoDepositor2.depositSCDP(
                        depositor2.address,
                        KISS.address,
                        depositAmount18Dec, // $8k
                    ),
                ]);
            });
            it("should identify if the pool is not underwater", async function () {
                const swapAmount = toBig(ONE_USD * 2600); // $1

                await KreskoSwapper.swapSCDP(swapper.address, KISS.address, KreskoAsset2.address, swapAmount, 0);

                expect(await hre.Diamond.getLiquidatableSCDP()).to.be.false;
            });

            //  test not passing
            it("should revert liquidations if the pool is not underwater", async function () {
                const swapAmount = toBig(ONE_USD * 2600); // $1

                await KreskoSwapper.swapSCDP(swapper.address, KISS.address, KreskoAsset2.address, swapAmount, 0);
                expect(await hre.Diamond.getLiquidatableSCDP()).to.be.false;

                await KreskoAsset2.setBalance(hre.users.liquidator, toBig(1_000_000));

                await expect(
                    KreskoLiquidator.liquidateSCDP(KreskoAsset2.address, toBig(7.7), CollateralAsset8Dec.address),
                ).to.be.revertedWith("not-liquidatable");
            });
            //  test not passing
            it("should identify if the pool is underwater", async function () {
                const swapAmount = toBig(ONE_USD * 2600);

                await KreskoSwapper.swapSCDP(swapper.address, KISS.address, KreskoAsset2.address, swapAmount, 0);
                CollateralAsset.setPrice(collateralPrice / 1000);
                CollateralAsset8Dec.setPrice(collateralPrice / 1000);

                const [stats, params, liquidatable] = await Promise.all([
                    hre.Diamond.getStatisticsSCDP(),
                    hre.Diamond.getCurrentParametersSCDP(),
                    hre.Diamond.getLiquidatableSCDP(),
                ]);

                expect(stats.cr).to.be.lt(params.lt);
                expect(liquidatable).to.be.true;
            });

            it("should allow liquidating the underwater pool", async function () {
                const swapAmount = toBig(ONE_USD * 2600);

                await KreskoSwapper.swapSCDP(swapper.address, KISS.address, KreskoAsset2.address, swapAmount, 0);
                const newKreskoAssetPrice = 500;
                KreskoAsset2.setPrice(newKreskoAssetPrice);

                const [scdpParams, maxLiquidatable, krAssetPrice, statsBefore] = await Promise.all([
                    hre.Diamond.getCurrentParametersSCDP(),
                    hre.Diamond.getMaxLiqValueSCDP(KreskoAsset2.address, CollateralAsset8Dec.address),
                    KreskoAsset2.getPrice(),
                    hre.Diamond.getStatisticsSCDP(),
                ]);
                const repayAmount = maxLiquidatable.wadDiv(krAssetPrice);

                await KreskoAsset2.setBalance(hre.users.liquidator, repayAmount.add((1e18).toString()));
                expect(statsBefore.cr).to.lt(scdpParams.lt);

                const tx = await KreskoLiquidator.liquidateSCDP(
                    KreskoAsset2.address,
                    repayAmount,
                    CollateralAsset8Dec.address,
                );

                const [statsAfter, liquidatableAfter] = await Promise.all([
                    hre.Diamond.getStatisticsSCDP(),
                    hre.Diamond.getLiquidatableSCDP(),
                ]);
                // console.log("liq", (await tx.wait()).gasUsed.toString());
                expect(statsAfter.cr).to.gt(scdpParams.lt);

                expect(liquidatableAfter).to.equal(false);
                await expect(
                    KreskoLiquidator.liquidateSCDP(KreskoAsset2.address, repayAmount, CollateralAsset8Dec.address),
                ).to.be.revertedWith("not-liquidatable");

                const event = await getNamedEvent<SCDPLiquidationOccuredEvent>(tx, "SCDPLiquidationOccured");

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

                expect(expectedDepositsAfter).to.be.lt(depositAmount8Dec);

                const [principalDeposits, depositsWithFees, params] = await Promise.all([
                    hre.Diamond.getAccountDepositSCDP(depositor.address, CollateralAsset8Dec.address),
                    hre.Diamond.getAccountDepositWithFeesSCDP(depositor.address, CollateralAsset8Dec.address),
                    hre.Diamond.getCurrentParametersSCDP(),
                ]);
                expect(principalDeposits).to.eq(expectedDepositsAfter);
                expect(depositsWithFees).to.eq(expectedDepositsAfter);

                await KreskoDepositor.depositSCDP(
                    depositor.address,
                    CollateralAsset.address,
                    depositAmount18Dec.mul(10),
                );
                const stats = await hre.Diamond.getStatisticsSCDP();
                expect(stats.cr).to.gt(params.mcr);
                await expect(
                    KreskoDepositor.withdrawSCDP(depositor.address, CollateralAsset8Dec.address, expectedDepositsAfter),
                ).to.not.be.reverted;
                const [principalEnd, depositsWithFeesEnd] = await Promise.all([
                    hre.Diamond.getAccountDepositSCDP(depositor.address, CollateralAsset8Dec.address),
                    hre.Diamond.getAccountDepositWithFeesSCDP(depositor.address, CollateralAsset8Dec.address),
                ]);
                expect(principalEnd).to.eq(0);
                expect(depositsWithFeesEnd).to.eq(0);
            });
        });
        describe.only("#Error", () => {
            beforeEach(async function () {
                await Promise.all(this.usersArr.map(signer => CollateralAsset.setBalance(signer, toBig(1_000_000))));
                await KISS.setBalance(swapper, toBig(10_000));
                await KISS.setBalance(depositor, ethers.BigNumber.from(1));
                await hre.Diamond.addDepositAssetsSCDP([KISS.address], [defaultCollateralConfig]);
                await Promise.all([
                    KreskoDepositor.depositSCDP(depositor.address, KISS.address, 1),
                    KreskoDepositor.depositSCDP(
                        depositor.address,
                        CollateralAsset.address,
                        depositAmount18Dec, // $10k
                    ),
                ]);
            });
            it("should revert depositing unsupported tokens", async function () {
                const [UnsupportedToken] = await hre.deploy("MockERC20", {
                    args: ["UnsupportedToken", "UnsupportedToken", 18, toBig(1)],
                });
                await UnsupportedToken.approve(hre.Diamond.address, hre.ethers.constants.MaxUint256);
                const { deployer } = await hre.getNamedAccounts();
                await expect(hre.Diamond.depositSCDP(deployer, UnsupportedToken.address, 1)).to.be.revertedWith(
                    "deposit-not-enabled",
                );
            });
            it("should revert withdrawing without deposits", async function () {
                await expect(
                    KreskoSwapper.withdrawSCDP(depositor.address, CollateralAsset.address, 1),
                ).to.be.revertedWith("withdrawal-violation");
            });

            it("should revert withdrawals below MCR", async function () {
                const swapAmount = toBig(ONE_USD).mul(1000); // $1000
                await KreskoSwapper.swapSCDP(swapper.address, KISS.address, KreskoAsset2.address, swapAmount, 0); // generate debt
                const deposits = await KreskoSwapper.getAccountDepositSCDP(depositor.address, CollateralAsset.address);
                await expect(
                    KreskoDepositor.withdrawSCDP(depositor.address, CollateralAsset.address, deposits),
                ).to.be.revertedWith("withdraw-mcr-violation");
            });

            it("should revert withdrawals of swap owned collateral deposits", async function () {
                const swapAmount = toBig(1);
                await KreskoAsset2.setBalance(swapper, swapAmount);

                await KreskoSwapper.swapSCDP(swapper.address, KreskoAsset2.address, KISS.address, swapAmount, 0);
                const deposits = await KreskoSwapper.getSwapDepositsSCDP(KreskoAsset2.address);
                expect(deposits).to.be.gt(0);
                await expect(
                    KreskoSwapper.withdrawSCDP(swapper.address, KreskoAsset2.address, deposits),
                ).to.be.revertedWith("withdrawal-violation");
            });

            it("should revert swapping with price below minAmountOut", async function () {
                const swapAmount = toBig(1);
                await KreskoAsset2.setBalance(swapper, swapAmount);
                const [amountOut] = await KreskoSwapper.previewSwapSCDP(KreskoAsset2.address, KISS.address, swapAmount);
                await expect(
                    KreskoSwapper.swapSCDP(
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
                    KreskoSwapper.swapSCDP(
                        swapper.address,
                        KreskoAsset2.address,
                        CollateralAsset.address,
                        swapAmount,
                        0,
                    ),
                ).to.be.revertedWith("swap-disabled");
            });
            it("should revert swapping if asset in is disabled", async function () {
                const swapAmount = toBig(1);
                await KreskoAsset2.setBalance(swapper, swapAmount);

                await hre.Diamond.disableAssetsSCDP([KreskoAsset2.address], false);
                await expect(
                    KreskoSwapper.swapSCDP(swapper.address, KreskoAsset2.address, KISS.address, swapAmount, 0),
                ).to.be.revertedWith("asset-in-disabled");
            });
            it("should revert swapping if asset out is disabled", async function () {
                const swapAmount = toBig(1);
                await KreskoAsset2.setBalance(swapper, swapAmount);

                await hre.Diamond.disableAssetsSCDP([KreskoAsset2.address], false);
                await expect(
                    KreskoSwapper.swapSCDP(swapper.address, KISS.address, KreskoAsset2.address, swapAmount, 0),
                ).to.be.revertedWith("asset-out-disabled");
            });
            it("should revert swapping causes CDP to go below MCR", async function () {
                const swapAmount = toBig(1_500_000);
                await KreskoAsset2.setBalance(swapper, swapAmount);
                const tx = KreskoSwapper.swapSCDP(swapper.address, KreskoAsset2.address, KISS.address, swapAmount, 0);
                await expect(tx).to.be.revertedWith("swap-mcr-violation");
            });
        });
    });
});
