import { getSCDPInitializer } from '@config/deploy';
import { CError } from '@utils/errors';
import { getNamedEvent } from '@utils/events';
import { wrapKresko } from '@utils/redstone';
import { SCDPFixture, scdpFixture } from '@utils/test/fixtures';
import { addMockExtAsset, depositCollateral } from '@utils/test/helpers/collaterals';
import { wrapContractWithSigner } from '@utils/test/helpers/general';
import { addMockKreskoAsset, mintKrAsset } from '@utils/test/helpers/krassets';
import { defaultSupplyLimit, testCollateralConfig } from '@utils/test/mocks';
import { MaxUint128, RAY, toBig } from '@utils/values';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { SCDPDepositAssetConfig, SCDPKrAssetConfig } from 'types';
import {
  AssetStruct,
  Kresko,
  PairSetterStruct,
  SCDPLiquidationOccuredEvent,
  SwapEvent,
} from 'types/typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko';

const scdpKrAssetConfig: SCDPKrAssetConfig = {
  swapInFeeSCDP: 0.015e4,
  swapOutFeeSCDP: 0.015e4,
  protocolFeeShareSCDP: 0.25e4,
  liqIncentiveSCDP: 1.05e4,
};

const scdpCollateralConfig: SCDPDepositAssetConfig = {
  depositLimitSCDP: MaxUint128,
};

const scdpKISSConfig = {
  swapInFeeSCDP: 0.025e4,
  swapOutFeeSCDP: 0.025e4,
  liqIncentiveSCDP: 1.05e4,
  protocolFeeShareSCDP: 0.25e4,
};

const FEE_KISS_KRASSET = Number(scdpKISSConfig.swapOutFeeSCDP) + Number(scdpKrAssetConfig.swapInFeeSCDP);
const FEE_KRASSET_KRASSET = Number(scdpKrAssetConfig.swapOutFeeSCDP) + Number(scdpKrAssetConfig.swapInFeeSCDP);
const ONE_USD = 1;

const collateralPrice = 10;
const KreskoAsset2Price = 100;
const depositAmount = 1000;
const depositValue = depositAmount.ebn(8);
const initialDepositValue = toBig(depositAmount, 8);

const createAssets = () => [
  addMockKreskoAsset({
    underlyingId: 'KrAsset3',
    price: collateralPrice,
    symbol: 'KrAsset3',
    krAssetConfig: {
      anchor: null,
      openFee: 0.01e4,
      closeFee: 0.01e4,
      kFactor: 1.25e4,
      supplyLimit: defaultSupplyLimit,
    },
    collateralConfig: {
      cFactor: 1e4,
      liqIncentive: 1.1e4,
    },
    scdpKrAssetConfig,
    marketOpen: true,
  }),
  addMockKreskoAsset({
    underlyingId: 'KrAsset4',
    price: KreskoAsset2Price,
    symbol: 'KrAsset4',
    krAssetConfig: {
      anchor: null,
      closeFee: 0.015e4,
      openFee: 0.015e4,
      supplyLimit: defaultSupplyLimit,
      kFactor: 1e4,
    },
    collateralConfig: {
      cFactor: 1e4,
      liqIncentive: 1.1e4,
    },
    scdpKrAssetConfig,
    marketOpen: true,
  }),
  addMockKreskoAsset({
    underlyingId: 'KISS',
    price: ONE_USD,
    symbol: 'KISS',
    krAssetConfig: {
      anchor: null,
      closeFee: 0.025e4,
      openFee: 0.025e4,
      kFactor: 1e4,
      supplyLimit: defaultSupplyLimit,
    },
    collateralConfig: {
      cFactor: 1e4,
      liqIncentive: 1.1e4,
    },
    scdpKrAssetConfig: scdpKISSConfig,
    scdpDepositConfig: scdpCollateralConfig,
    marketOpen: true,
  }),
];

const createCollaterals = () => [
  addMockExtAsset({
    ...testCollateralConfig,
    underlyingId: 'Collateral3',
    name: 'Collateral3',
    symbol: 'Collateral3',
    price: collateralPrice,
    decimals: 18,
    scdpDepositConfig: {
      depositLimitSCDP: toBig(100000000),
    },
  }),
  addMockExtAsset({
    ...testCollateralConfig,
    underlyingId: 'Collateral4',
    symbol: 'Collateral4',
    price: collateralPrice,
    scdpDepositConfig: {
      depositLimitSCDP: toBig(100000000),
    },
    collateralConfig: { ...testCollateralConfig.collateralConfig!, cFactor: 0.8e4 },
    decimals: 8, // eg USDT
  }),
];

describe('SCDP', async function () {
  let swapper: SignerWithAddress;
  let depositor: SignerWithAddress;
  let depositor2: SignerWithAddress;

  let KreskoSwapper: typeof hre.Diamond;
  let KreskoDepositor: typeof hre.Diamond;
  let KreskoDepositor2: typeof hre.Diamond;
  let KreskoLiquidator: typeof hre.Diamond;

  const depositAmount18Dec = toBig(depositAmount);
  const depositAmount8Dec = toBig(depositAmount, 8);
  let f: SCDPFixture;
  this.slow(5000);

  beforeEach(async function () {
    f = await scdpFixture({
      krAssets: createAssets,
      collaterals: createCollaterals,
    });

    [[swapper, KreskoSwapper], [depositor, KreskoDepositor], [depositor2, KreskoDepositor2], [, KreskoLiquidator]] =
      f.users;
  });

  describe('#Test', async function () {
    beforeEach(async function () {
      await f.reset();
    });

    describe('#Configuration', async () => {
      it('should be initialized correctly', async () => {
        const { args } = await getSCDPInitializer(hre);

        const configuration = await hre.Diamond.getCurrentParametersSCDP();

        expect(configuration.swapFeeRecipient).to.equal(args.swapFeeRecipient);
        expect(configuration.liquidationThreshold).to.equal(args.liquidationThreshold);
        expect(configuration.minCollateralRatio).to.equal(args.minCollateralRatio);

        const collaterals = await hre.Diamond.getCollateralsSCDP();
        expect(collaterals).to.include.members([
          f.Collateral.address,
          f.Collateral8Dec.address,
          f.KrAsset.address,
          f.KrAsset2.address,
          f.KISS.address,
        ]);
        const krAssets = await hre.Diamond.getKreskoAssetsSCDP();
        expect(krAssets).to.include.members([f.KrAsset.address, f.KrAsset2.address, f.KISS.address]);

        const depositsEnabled = await Promise.all([
          hre.Diamond.getDepositEnabledSCDP(f.Collateral.address),
          hre.Diamond.getDepositEnabledSCDP(f.Collateral8Dec.address),
          hre.Diamond.getDepositEnabledSCDP(f.KrAsset.address),
          hre.Diamond.getDepositEnabledSCDP(f.KrAsset2.address),
          hre.Diamond.getDepositEnabledSCDP(f.KISS.address),
        ]);

        expect(depositsEnabled).to.deep.equal([true, true, false, false, true]);

        const depositAssets = await hre.Diamond.getDepositAssetsSCDP();

        expect(depositAssets).to.include.members([f.Collateral.address, f.Collateral8Dec.address, f.KISS.address]);
      });
      it('should be able to whitelist new deposit asset', async () => {
        const assetInfoBefore = await hre.Diamond.getAsset(f.KrAsset2.address);
        expect(assetInfoBefore.isSCDPDepositAsset).to.equal(false);
        await hre.Diamond.updateAsset(f.KrAsset2.address, {
          ...assetInfoBefore,
          isSCDPDepositAsset: true,
          depositLimitSCDP: 1,
        });
        const assetInfoAfter = await hre.Diamond.getAsset(f.KrAsset2.address);
        expect(assetInfoAfter.decimals).to.equal(await f.KISS.contract.decimals());

        expect(assetInfoAfter.liquidityIndexSCDP).to.equal(RAY);
        expect(assetInfoAfter.depositLimitSCDP).to.equal(1);

        expect(await hre.Diamond.getDepositEnabledSCDP(f.KrAsset2.address)).to.equal(true);
      });

      it('should be able to update deposit limit of asset', async () => {
        await hre.Diamond.updateDepositLimitSCDP(f.Collateral.address, 1);
        const collateral = await hre.Diamond.getAsset(f.Collateral.address);
        expect(collateral.decimals).to.equal(await f.Collateral.contract.decimals());
        expect(collateral.liquidityIndexSCDP).to.equal(RAY);
        expect(collateral.depositLimitSCDP).to.equal(1);
      });

      it('should be able to disable a deposit asset', async () => {
        await hre.Diamond.setDepositAssetSCDP(f.Collateral.address, false);
        const collaterals = await hre.Diamond.getCollateralsSCDP();
        expect(collaterals).to.include(f.Collateral.address);
        const depositAssets = await hre.Diamond.getDepositAssetsSCDP();
        expect(depositAssets).to.not.include(f.Collateral.address);
        expect(await hre.Diamond.getDepositEnabledSCDP(f.Collateral.address)).to.equal(false);
      });

      it('should be able to disable and enable a collateral asset', async () => {
        await hre.Diamond.setCollateralSCDP(f.Collateral.address, false);

        expect(await hre.Diamond.getCollateralsSCDP()).to.not.include(f.Collateral.address);
        expect(await hre.Diamond.getDepositAssetsSCDP()).to.not.include(f.Collateral.address);
        expect(await hre.Diamond.getDepositEnabledSCDP(f.Collateral.address)).to.equal(true);

        await hre.Diamond.setDepositAssetSCDP(f.Collateral.address, false);
        expect(await hre.Diamond.getDepositEnabledSCDP(f.Collateral.address)).to.equal(false);

        await hre.Diamond.setCollateralSCDP(f.Collateral.address, true);
        expect(await hre.Diamond.getCollateralsSCDP()).to.include(f.Collateral.address);
        expect(await hre.Diamond.getDepositAssetsSCDP()).to.not.include(f.Collateral.address);
        expect(await hre.Diamond.getDepositEnabledSCDP(f.Collateral.address)).to.equal(false);

        await hre.Diamond.setDepositAssetSCDP(f.Collateral.address, true);
        expect(await hre.Diamond.getDepositEnabledSCDP(f.Collateral.address)).to.equal(true);
        expect(await hre.Diamond.getDepositAssetsSCDP()).to.include(f.Collateral.address);
      });

      it('should be able to add whitelisted kresko asset', async () => {
        const assetInfo = await hre.Diamond.getAsset(f.KrAsset.address);
        expect(assetInfo.swapInFeeSCDP).to.equal(scdpKrAssetConfig.swapInFeeSCDP);
        expect(assetInfo.swapOutFeeSCDP).to.equal(scdpKrAssetConfig.swapOutFeeSCDP);
        expect(assetInfo.liqIncentiveSCDP).to.equal(scdpKrAssetConfig.liqIncentiveSCDP);
        expect(assetInfo.protocolFeeShareSCDP).to.equal(scdpKrAssetConfig.protocolFeeShareSCDP);
      });

      it('should be able to update a whitelisted kresko asset', async () => {
        const update: AssetStruct = {
          ...f.KrAsset.config.assetStruct,
          swapInFeeSCDP: 0.05e4,
          swapOutFeeSCDP: 0.05e4,
          liqIncentiveSCDP: 1.06e4,
          protocolFeeShareSCDP: 0.4e4,
        };
        await hre.Diamond.updateAsset(f.KrAsset.address, update);
        const assetInfo = await hre.Diamond.getAsset(f.KrAsset.address);
        expect(assetInfo.swapInFeeSCDP).to.equal(update.swapInFeeSCDP);
        expect(assetInfo.swapOutFeeSCDP).to.equal(update.swapOutFeeSCDP);
        expect(assetInfo.protocolFeeShareSCDP).to.equal(update.protocolFeeShareSCDP);
        expect(assetInfo.liqIncentiveSCDP).to.equal(update.liqIncentiveSCDP);

        const krAssets = await hre.Diamond.getKreskoAssetsSCDP();
        expect(krAssets).to.include(f.KrAsset.address);
        const collaterals = await hre.Diamond.getCollateralsSCDP();
        expect(collaterals).to.include(f.KrAsset.address);
        expect(await hre.Diamond.getDepositEnabledSCDP(f.KrAsset.address)).to.equal(false);
      });

      it('should be able to remove a whitelisted kresko asset', async () => {
        await hre.Diamond.setKrAssetSCDP(f.KrAsset.address, false);
        const krAssets = await hre.Diamond.getKreskoAssetsSCDP();
        expect(krAssets).to.not.include(f.KrAsset.address);
        expect(await hre.Diamond.getDepositEnabledSCDP(f.KrAsset.address)).to.equal(false);
      });

      it('should be able to enable and disable swap pairs', async () => {
        const swapPairsEnabled: PairSetterStruct[] = [
          {
            assetIn: f.Collateral.address,
            assetOut: f.KrAsset.address,
            enabled: true,
          },
        ];
        await hre.Diamond.setSwapPairs(swapPairsEnabled);
        expect(await hre.Diamond.getSwapEnabledSCDP(f.Collateral.address, f.KrAsset.address)).to.equal(true);
        expect(await hre.Diamond.getSwapEnabledSCDP(f.KrAsset.address, f.Collateral.address)).to.equal(true);

        const swapPairsDisabled: PairSetterStruct[] = [
          {
            assetIn: f.Collateral.address,
            assetOut: f.KrAsset.address,
            enabled: false,
          },
        ];
        await hre.Diamond.setSwapPairs(swapPairsDisabled);
        expect(await hre.Diamond.getSwapEnabledSCDP(f.Collateral.address, f.KrAsset.address)).to.equal(false);
        expect(await hre.Diamond.getSwapEnabledSCDP(f.KrAsset.address, f.Collateral.address)).to.equal(false);
      });
    });
    describe('#Deposit', async function () {
      it('should be able to deposit collateral, calculate correct deposit values', async function () {
        const expectedValueUnadjusted = toBig(collateralPrice * depositAmount, 8);
        const expectedValueAdjusted = (collateralPrice * depositAmount).ebn(8); // cfactor = 1

        await Promise.all(
          f.usersArr.map(user => {
            return wrapKresko(hre.Diamond, user).depositSCDP(user.address, f.Collateral.address, depositAmount18Dec);
          }),
        );

        const [userInfos, statistics, assetInfo] = await Promise.all([
          hre.Diamond.getAccountInfosSCDP(
            f.usersArr.map(user => user.address),
            [f.Collateral.address],
          ),
          hre.Diamond.getStatisticsSCDP(),
          hre.Diamond.getAssetInfoSCDP(f.Collateral.address),
        ]);
        for (const userInfo of userInfos) {
          const balance = await f.Collateral.balanceOf(userInfo.account);

          expect(balance).to.equal(0);
          expect(userInfo.deposits[0].scaledDepositAmount).to.equal(depositAmount18Dec);
          expect(userInfo.deposits[0].depositAmount).to.equal(depositAmount18Dec);
          expect(userInfo.totalDepositValue).to.equal(expectedValueUnadjusted);
          expect(userInfo.totalScaledDepositValue).to.equal(expectedValueUnadjusted);
          expect(userInfo.deposits[0].depositValue).to.equal(expectedValueUnadjusted);
          expect(userInfo.deposits[0].scaledDepositValue).to.equal(expectedValueUnadjusted);
        }

        expect(await f.Collateral.balanceOf(hre.Diamond.address)).to.equal(depositAmount18Dec.mul(f.usersArr.length));
        expect(assetInfo.depositAmount).to.equal(depositAmount18Dec.mul(f.usersArr.length));
        expect(assetInfo.depositValue).to.equal(expectedValueUnadjusted.mul(f.usersArr.length));
        expect(statistics.collateralValue).to.equal(expectedValueUnadjusted.mul(f.usersArr.length));
        expect(statistics.debtValue).to.equal(0);

        // Adjusted
        expect(assetInfo.depositValueAdjusted).to.equal(expectedValueAdjusted.mul(f.usersArr.length));
        expect(statistics.collateralValueAdjusted).to.equal(expectedValueUnadjusted.mul(f.usersArr.length));
        expect(statistics.debtValueAdjusted).to.equal(0);

        expect(statistics.effectiveDebtValue).to.equal(0);
        expect(statistics.crDebtValueAdjusted).to.equal(0);
        expect(statistics.crDebtValue).to.equal(0);
        expect(statistics.cr).to.equal(0);
      });
      it('should be able to deposit multiple collaterals, calculate correct deposit values', async function () {
        const expectedValueUnadjusted = toBig(collateralPrice * depositAmount, 8);
        const expectedValueAdjusted = toBig((collateralPrice / 1) * depositAmount, 8); // cfactor = 1

        const expectedValueUnadjusted8Dec = toBig(collateralPrice * depositAmount, 8);
        const expectedValueAdjusted8Dec = toBig(collateralPrice * 0.8 * depositAmount, 8); // cfactor = 0.8

        await Promise.all(
          f.usersArr.map(user => {
            const User = wrapContractWithSigner(hre.Diamond, user);
            return Promise.all([
              User.depositSCDP(user.address, f.Collateral.address, depositAmount18Dec),
              User.depositSCDP(user.address, f.Collateral8Dec.address, depositAmount8Dec),
            ]);
          }),
        );
        const [userInfos, assetInfos, globals] = await Promise.all([
          hre.Diamond.getAccountInfosSCDP(
            f.usersArr.map(u => u.address),
            [f.Collateral.address, f.Collateral8Dec.address],
          ),
          hre.Diamond.getAssetInfosSCDP([f.Collateral.address, f.Collateral8Dec.address]),
          hre.Diamond.getStatisticsSCDP(),
        ]);

        for (const userInfo of userInfos) {
          expect(userInfo.deposits[0].depositAmount).to.equal(depositAmount18Dec);
          expect(userInfo.deposits[0].depositValue).to.equal(expectedValueUnadjusted);
          expect(userInfo.deposits[1].depositAmount).to.equal(depositAmount8Dec);
          expect(userInfo.deposits[1].depositValue).to.equal(expectedValueUnadjusted8Dec);

          expect(userInfo.totalDepositValue).to.equal(expectedValueUnadjusted.add(expectedValueUnadjusted8Dec));
        }

        expect(assetInfos[0].depositAmount).to.equal(depositAmount18Dec.mul(f.usersArr.length));
        expect(assetInfos[1].depositAmount).to.equal(depositAmount8Dec.mul(f.usersArr.length));

        // WITH_FACTORS global
        const valueTotalAdjusted = expectedValueAdjusted.mul(f.usersArr.length);
        const valueTotalAdjusted8Dec = expectedValueAdjusted8Dec.mul(f.usersArr.length);
        const valueAdjusted = valueTotalAdjusted.add(valueTotalAdjusted8Dec);

        expect(assetInfos[0].depositValueAdjusted).to.equal(valueTotalAdjusted);
        expect(assetInfos[1].depositValueAdjusted).to.equal(valueTotalAdjusted8Dec);

        expect(globals.collateralValueAdjusted).to.equal(valueAdjusted);
        expect(globals.debtValue).to.equal(0);
        expect(globals.cr).to.equal(0);

        // WITHOUT_FACTORS global
        const valueTotalUnadjusted = expectedValueUnadjusted.mul(f.usersArr.length);
        const valueTotalUnadjusted8Dec = expectedValueUnadjusted8Dec.mul(f.usersArr.length);
        const valueUnadjusted = valueTotalUnadjusted.add(valueTotalUnadjusted8Dec);

        expect(assetInfos[0].depositValue).to.equal(valueTotalUnadjusted);
        expect(assetInfos[1].depositValue).to.equal(valueTotalUnadjusted8Dec);

        expect(globals.collateralValue).to.equal(valueUnadjusted);
        expect(globals.debtValue).to.equal(0);
        expect(globals.cr).to.equal(0);
      });
    });
    describe('#Withdraw', async () => {
      beforeEach(async function () {
        await Promise.all(
          f.usersArr.map(async user => {
            const UserKresko = wrapKresko(hre.Diamond, user);
            await Promise.all([
              UserKresko.depositSCDP(user.address, f.Collateral.address, depositAmount18Dec),
              UserKresko.depositSCDP(user.address, f.Collateral8Dec.address, depositAmount8Dec),
            ]);
          }),
        );
      });

      it('should be able to withdraw full collateral of multiple assets', async function () {
        await Promise.all(
          f.usersArr.map(async user => {
            const UserKresko = wrapKresko(hre.Diamond, user);
            return Promise.all([
              UserKresko.withdrawSCDP(user.address, f.Collateral.address, depositAmount18Dec),
              UserKresko.withdrawSCDP(user.address, f.Collateral8Dec.address, depositAmount8Dec),
            ]);
          }),
        );

        expect(await f.Collateral.balanceOf(hre.Diamond.address)).to.equal(0);
        const [userInfos, assetInfos, globals] = await Promise.all([
          hre.Diamond.getAccountInfosSCDP(
            f.usersArr.map(u => u.address),
            [f.Collateral.address, f.Collateral8Dec.address],
          ),
          hre.Diamond.getAssetInfosSCDP([f.Collateral.address, f.Collateral8Dec.address]),
          hre.Diamond.getStatisticsSCDP(),
        ]);

        for (const userInfo of userInfos) {
          expect(await f.Collateral.balanceOf(userInfo.account)).to.equal(depositAmount18Dec);
          expect(userInfo.deposits[0].depositAmount).to.equal(0);
          expect(userInfo.deposits[0].scaledDepositAmount).to.equal(0);
          expect(userInfo.deposits[1].depositAmount).to.equal(0);
          expect(userInfo.deposits[1].scaledDepositAmount).to.equal(0);
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

      it('should be able to withdraw partial collateral of multiple assets', async function () {
        const partialWithdraw = depositAmount18Dec.div(f.usersArr.length);
        const partialWithdraw8Dec = depositAmount8Dec.div(f.usersArr.length);

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
          f.usersArr.map(user => {
            const UserKresko = wrapKresko(hre.Diamond, user);
            return Promise.all([
              UserKresko.withdrawSCDP(user.address, f.Collateral.address, partialWithdraw),
              UserKresko.withdrawSCDP(user.address, f.Collateral8Dec.address, partialWithdraw8Dec),
            ]);
          }),
        );

        const [collateralBalanceAfter, collateral8DecBalanceAfter, globals, assetInfos, userInfos] = await Promise.all([
          f.Collateral.balanceOf(hre.Diamond.address),
          f.Collateral8Dec.balanceOf(hre.Diamond.address),
          hre.Diamond.getStatisticsSCDP(),
          hre.Diamond.getAssetInfosSCDP([f.Collateral.address, f.Collateral8Dec.address]),
          hre.Diamond.getAccountInfosSCDP(
            f.usersArr.map(u => u.address),
            [f.Collateral.address, f.Collateral8Dec.address],
          ),
        ]);
        for (const userInfo of userInfos) {
          const [balance18Dec, balance8Dec] = await Promise.all([
            f.Collateral.balanceOf(userInfo.account),
            f.Collateral8Dec.balanceOf(userInfo.account),
          ]);
          expect(balance18Dec).to.equal(partialWithdraw);
          expect(balance8Dec).to.equal(partialWithdraw8Dec);
          expect(userInfo.deposits[0].depositAmount).to.equal(depositAmount18Dec.sub(partialWithdraw));
          expect(userInfo.deposits[0].scaledDepositAmount).to.equal(depositAmount18Dec.sub(partialWithdraw));

          expect(userInfo.deposits[1].depositAmount).to.equal(depositAmount8Dec.sub(partialWithdraw8Dec));
          expect(userInfo.deposits[1].scaledDepositAmount).to.equal(depositAmount8Dec.sub(partialWithdraw8Dec));

          expect(userInfo.totalDepositValue).to.closeTo(
            expectedValueUnadjusted.add(expectedValueUnadjusted8Dec),
            toBig(0.00001, 8),
          );
        }

        expect(collateralBalanceAfter).to.closeTo(toBig(2000), 1);
        expect(collateral8DecBalanceAfter).to.closeTo(toBig(2000, 8), 1);

        expect(assetInfos[0].depositAmount).to.closeTo(toBig(2000), 1);
        expect(assetInfos[1].depositAmount).to.closeTo(toBig(2000, 8), 1);

        expect(assetInfos[0].depositValue).to.closeTo(expectedValueUnadjusted.mul(f.usersArr.length), 20);
        expect(assetInfos[0].depositValueAdjusted).to.closeTo(expectedValueAdjusted.mul(f.usersArr.length), 20);

        expect(assetInfos[1].depositValue).to.closeTo(expectedValueUnadjusted8Dec.mul(f.usersArr.length), 20);
        expect(assetInfos[1].depositValueAdjusted).to.closeTo(expectedValueAdjusted8Dec.mul(f.usersArr.length), 20);
        const totalValueRemaining = expectedValueUnadjusted8Dec
          .mul(f.usersArr.length)
          .add(expectedValueUnadjusted.mul(f.usersArr.length));

        expect(globals.collateralValue).to.closeTo(totalValueRemaining, 20);
        expect(globals.debtValue).to.equal(0);
        expect(globals.cr).to.equal(0);
      });
    });
    describe('#Fee Distribution', () => {
      let incomeCumulator: SignerWithAddress;
      let IncomeCumulator: Kresko;

      beforeEach(async function () {
        incomeCumulator = hre.users.admin;
        IncomeCumulator = wrapKresko(hre.Diamond, incomeCumulator);
        await f.Collateral.setBalance(incomeCumulator, depositAmount18Dec.mul(f.usersArr.length), hre.Diamond.address);
      });

      it('should be able to cumulate fees into deposits', async function () {
        const fees = depositAmount18Dec.mul(f.usersArr.length);
        const expectedValueNoFees = toBig(collateralPrice * depositAmount, 8);
        const expectedValueFees = expectedValueNoFees.mul(2);

        // deposit some
        await Promise.all(
          f.usersArr.map(signer =>
            wrapKresko(hre.Diamond, signer).depositSCDP(signer.address, f.Collateral.address, depositAmount18Dec),
          ),
        );

        // cumulate some income
        await IncomeCumulator.cumulateIncomeSCDP(f.Collateral.address, fees);

        // check that the fees are cumulated
        for (const data of await hre.Diamond.getAccountInfosSCDP(
          f.usersArr.map(u => u.address),
          [f.Collateral.address],
        )) {
          expect(data.deposits[0].depositValue).to.equal(expectedValueNoFees);
          expect(data.deposits[0].scaledDepositValue).to.equal(expectedValueFees);
          expect(data.totalDepositValue).to.equal(expectedValueNoFees);
          expect(data.totalScaledDepositValue).to.equal(expectedValueFees);
        }

        // withdraw principal
        await Promise.all(
          f.usersArr.map(signer =>
            wrapKresko(hre.Diamond, signer).withdrawSCDP(signer.address, f.Collateral.address, depositAmount18Dec),
          ),
        );

        for (const user of await hre.Diamond.getAccountInfosSCDP(
          f.usersArr.map(u => u.address),
          [f.Collateral.address],
        )) {
          const balance = await f.Collateral.balanceOf(user.account);
          expect(user.deposits[0].depositValue).to.equal(0);
          expect(user.deposits[0].scaledDepositValue).to.equal(expectedValueFees.sub(expectedValueNoFees));
          expect(user.totalScaledDepositValue).to.equal(expectedValueFees.sub(expectedValueNoFees));
          expect(user.totalDepositValue).to.equal(0);
          expect(balance).to.equal(depositAmount18Dec);
        }

        const [assetInfo, stats, balance] = await Promise.all([
          hre.Diamond.getAssetInfoSCDP(f.Collateral.address),
          hre.Diamond.getStatisticsSCDP(),
          f.Collateral.balanceOf(hre.Diamond.address),
        ]);

        expect(balance).to.equal(fees);
        expect(assetInfo.depositAmount).to.equal(0);
        expect(assetInfo.depositValue).to.equal(0);
        expect(assetInfo.depositValueAdjusted).to.equal(0);
        expect(stats.collateralValue).to.equal(0);

        // Withdraw fees
        await Promise.all(
          f.usersArr.map(signer => {
            return wrapKresko(hre.Diamond, signer).withdrawSCDP(
              signer.address,
              f.Collateral.address,
              depositAmount18Dec,
            );
          }),
        );

        for (const data of await hre.Diamond.getAccountInfosSCDP(
          f.usersArr.map(u => u.address),
          [f.Collateral.address],
        )) {
          const balance = await f.Collateral.balanceOf(data.account);
          expect(balance).to.equal(depositAmount18Dec.add(depositAmount18Dec));
          expect(data.deposits[0].depositValue).to.equal(0);
          expect(data.deposits[0].scaledDepositValue).to.equal(0);
          expect(data.totalDepositValue).to.equal(0);
          expect(data.totalScaledDepositValue).to.equal(0);
        }

        // nothing left in protocol.
        const [colalteralBalanceKresko, assetInfoFinal] = await Promise.all([
          f.Collateral.balanceOf(hre.Diamond.address),
          hre.Diamond.getAssetInfoSCDP(f.Collateral.address),
        ]);
        expect(colalteralBalanceKresko).to.equal(0);
        expect(assetInfoFinal.depositAmount).to.equal(0);
        expect(assetInfoFinal.depositValue).to.equal(0);
        expect(assetInfoFinal.depositValueAdjusted).to.equal(0);
      });
    });
    describe('#Swap', () => {
      beforeEach(async function () {
        await Promise.all(f.usersArr.map(signer => f.Collateral.setBalance(signer, toBig(1_000_000))));
        await f.KISS.setBalance(swapper, toBig(10_000));
        await f.KISS.setBalance(depositor, toBig(10_000));
        await KreskoDepositor.depositSCDP(
          depositor.address,
          f.KISS.address,
          depositAmount18Dec, // $10k
        );
      });
      it('should have collateral in pool', async function () {
        const value = await hre.Diamond.getStatisticsSCDP();
        expect(value.collateralValue).to.equal(toBig(depositAmount, 8));
        expect(value.debtValue).to.equal(0);
        expect(value.cr).to.equal(0);
      });

      it('should be able to preview a swap', async function () {
        const swapAmount = toBig(1);
        const assetInPrice = toBig(ONE_USD, 8);
        expect(await f.KrAsset2.getPrice()).to.equal(KreskoAsset2Price.ebn(8));
        const assetOutPrice = toBig(KreskoAsset2Price, 8);

        const feePercentage = FEE_KISS_KRASSET;
        const feePercentageProtocol = 0.5e4;

        const expectedTotalFee = swapAmount.percentMul(feePercentage);
        const expectedProtocolFee = expectedTotalFee.percentMul(feePercentageProtocol);
        const expectedFee = expectedTotalFee.sub(expectedProtocolFee);
        const amountInAfterFees = swapAmount.sub(expectedTotalFee);

        const expectedAmountOut = amountInAfterFees.wadMul(assetInPrice).wadDiv(assetOutPrice);
        const [amountOut, feeAmount, feeAmountProtocol] = await hre.Diamond.previewSwapSCDP(
          f.KISS.address,
          f.KrAsset2.address,
          swapAmount,
        );
        expect(amountOut).to.equal(expectedAmountOut);
        expect(feeAmount).to.equal(expectedFee);
        expect(feeAmountProtocol).to.equal(expectedProtocolFee);
      });

      it('should be able to swap, shared debt == 0 | swap collateral == 0', async function () {
        const swapAmount = toBig(ONE_USD); // $1
        const kissInAfterFees = swapAmount.sub(swapAmount.percentMul(FEE_KISS_KRASSET));
        const expectedAmountOut = kissInAfterFees.wadMul(ONE_USD.ebn(8)).wadDiv(KreskoAsset2Price.ebn(8));
        const tx = await KreskoSwapper.swapSCDP(swapper.address, f.KISS.address, f.KrAsset2.address, swapAmount, 0);
        const event = await getNamedEvent<SwapEvent>(tx, 'Swap');
        expect(event.args.who).to.equal(swapper.address);
        expect(event.args.assetIn).to.equal(f.KISS.address);
        expect(event.args.assetOut).to.equal(f.KrAsset2.address);
        expect(event.args.amountIn).to.equal(swapAmount);
        expect(event.args.amountOut).to.equal(expectedAmountOut);

        const [KR2Balance, KISSBalance, swapperInfo, assetInfos, global] = await Promise.all([
          f.KrAsset2.balanceOf(swapper.address),
          f.KISS.balanceOf(swapper.address),
          hre.Diamond.getAccountInfoSCDP(swapper.address, [f.KrAsset2.address, f.KISS.address]),
          hre.Diamond.getAssetInfosSCDP([f.KrAsset2.address, f.KISS.address]),
          hre.Diamond.getStatisticsSCDP(),
        ]);

        expect(KR2Balance).to.equal(expectedAmountOut);
        expect(KISSBalance).to.equal(toBig(10_000).sub(swapAmount));

        expect(swapperInfo.deposits[0].depositValue).to.equal(0);
        expect(swapperInfo.deposits[1].depositValue).to.equal(0);

        expect(assetInfos[0].debtAmount).to.equal(expectedAmountOut);
        expect(assetInfos[1].swapDeposits).to.equal(kissInAfterFees);

        const expectedDepositValue = toBig(depositAmount, 8).add(kissInAfterFees.wadMul(ONE_USD.ebn(8)));
        expect(assetInfos[1].depositValue).to.equal(expectedDepositValue);
        expect(assetInfos[0].debtValue).to.equal(expectedAmountOut.wadMul(KreskoAsset2Price.ebn(8)));

        expect(global.collateralValue).to.equal(expectedDepositValue);
        expect(global.debtValue).to.equal(expectedAmountOut.wadMul(KreskoAsset2Price.ebn(8)));
        expect(global.cr).to.equal(expectedDepositValue.percentDiv(expectedAmountOut.wadMul(KreskoAsset2Price.ebn(8))));
      });

      it('should be able to swap, shared debt == assetsIn | swap collateral == assetsOut', async function () {
        const swapAmount = toBig(ONE_USD).mul(100); // $100
        const swapAmountAsset = swapAmount
          .percentMul(1e4 - FEE_KISS_KRASSET)
          .wadMul(ONE_USD.ebn(8))
          .wadDiv(KreskoAsset2Price.ebn(8));
        const expectedKissOut = swapAmountAsset
          .percentMul(1e4 - FEE_KISS_KRASSET)
          .wadMul(KreskoAsset2Price.ebn(8))
          .wadDiv(ONE_USD.ebn(8));

        // deposit some to kresko for minting first
        await depositCollateral({
          user: swapper,
          asset: f.KISS,
          amount: toBig(100),
        });

        await mintKrAsset({
          user: swapper,
          asset: f.KrAsset2,
          amount: toBig(0.1), // min allowed
        });

        const globalBefore = await hre.Diamond.getStatisticsSCDP();

        expect(globalBefore.collateralValue).to.equal(initialDepositValue);

        await KreskoSwapper.swapSCDP(swapper.address, f.KISS.address, f.KrAsset2.address, swapAmount, 0);

        // the swap that clears debt
        const tx = await KreskoSwapper.swapSCDP(
          swapper.address,
          f.KrAsset2.address,
          f.KISS.address,
          swapAmountAsset,
          0,
        );

        const [event, assetInfos] = await Promise.all([
          getNamedEvent<SwapEvent>(tx, 'Swap'),
          hre.Diamond.getAssetInfosSCDP([f.KISS.address, f.KrAsset2.address]),
        ]);

        expect(event.args.who).to.equal(swapper.address);
        expect(event.args.assetIn).to.equal(f.KrAsset2.address);
        expect(event.args.assetOut).to.equal(f.KISS.address);
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

      it('should be able to swap, debt > assetsIn | swap deposits > assetsOut', async function () {
        const swapAmount = toBig(1); // $1
        const swapValue = toBig(1, 8);

        await KreskoSwapper.swapSCDP(swapper.address, f.KISS.address, f.KrAsset2.address, swapAmount, 0);

        const assetInfoKISS = await hre.Diamond.getAssetInfoSCDP(f.KISS.address);
        const feeValueFirstSwap = swapValue.percentMul(FEE_KISS_KRASSET);
        const valueInAfterFees = swapValue.sub(feeValueFirstSwap);
        expect(assetInfoKISS.depositValue).to.equal(depositValue.add(valueInAfterFees));

        const expectedSwapDeposits = valueInAfterFees.num(8).ebn(18);
        expect(assetInfoKISS.swapDeposits).to.equal(expectedSwapDeposits);

        const swapAmountSecond = toBig(0.009); // this is $0.90, so less than $0.96 since we want to ensure debt > assetsIn | swap deposits > assetsOut
        const swapValueSecond = swapAmountSecond.wadMul(KreskoAsset2Price.ebn(8));
        const feeValueSecondSwap = swapValueSecond.sub(swapValueSecond.percentMul(FEE_KISS_KRASSET));
        const expectedKissOut = feeValueSecondSwap.wadDiv(ONE_USD.ebn(8)); // 0.8685

        const tx = await KreskoSwapper.swapSCDP(
          swapper.address,
          f.KrAsset2.address,
          f.KISS.address,
          swapAmountSecond,
          0,
        );

        const event = await getNamedEvent<SwapEvent>(tx, 'Swap');

        expect(event.args.who).to.equal(swapper.address);
        expect(event.args.assetIn).to.equal(f.KrAsset2.address);
        expect(event.args.assetOut).to.equal(f.KISS.address);
        expect(event.args.amountIn).to.equal(swapAmountSecond);
        expect(event.args.amountOut).to.equal(expectedKissOut);

        const [depositValueKR2, depositValueKISS, assetInfos, globals] = await Promise.all([
          KreskoSwapper.getAccountDepositValueSCDP(swapper.address, f.KrAsset2.address),
          KreskoSwapper.getAccountDepositValueSCDP(swapper.address, f.KISS.address),
          hre.Diamond.getAssetInfosSCDP([f.KISS.address, f.KrAsset2.address]),
          hre.Diamond.getStatisticsSCDP(),
        ]);

        expect(depositValueKR2).to.equal(0);
        expect(depositValueKISS).to.equal(0);

        const expectedSwapDepositsAfter = expectedSwapDeposits.sub(toBig(0.9));
        const expectedSwapDepositsValue = expectedSwapDepositsAfter.wadMul(assetInfoKISS.assetPrice);

        expect(assetInfos[0].swapDeposits).to.equal(expectedSwapDepositsAfter);
        expect(assetInfos[0].depositValue).to.equal(toBig(depositAmount, 8).add(expectedSwapDepositsValue));
        expect(assetInfos[1].debtValue).to.equal(expectedSwapDepositsValue);

        const expectedDebtAfter = expectedSwapDepositsValue.wadDiv(await f.KrAsset2.getPrice());
        expect(assetInfos[0].debtAmount).to.equal(0);
        expect(assetInfos[1].debtAmount).to.equal(expectedDebtAfter);

        const expectedCollateralValue = expectedSwapDepositsValue.add(depositAmount.ebn(8));
        expect(globals.collateralValue).to.equal(expectedCollateralValue); // swap deposits + collateral deposited
        expect(globals.debtValue).to.equal(expectedSwapDepositsValue); //
        expect(globals.cr).to.equal(expectedCollateralValue.percentDiv(expectedSwapDepositsValue));
      });

      it('should be able to swap, debt < assetsIn | swap deposits < assetsOut', async function () {
        const swapAmountKiss = toBig(ONE_USD).mul(100); // $100
        const swapAmountKrAsset = toBig(2); // $200
        const swapValue = 200;
        const firstSwapFeeAmount = swapAmountKiss.percentMul(FEE_KISS_KRASSET);
        const expectedKissOutSecondSwap = swapAmountKrAsset
          .sub(swapAmountKrAsset.percentMul(FEE_KISS_KRASSET))
          .wadMul(KreskoAsset2Price.ebn(8))
          .wadDiv(ONE_USD.ebn(8));
        const krAssetOutFirstSwap = swapAmountKiss
          .sub(firstSwapFeeAmount)
          .wadMul(ONE_USD.ebn(8))
          .wadDiv(KreskoAsset2Price.ebn(8));

        const krAssetOutFirstSwapValue = krAssetOutFirstSwap.wadMul(KreskoAsset2Price.ebn(8));
        // deposit some to kresko for minting first
        await depositCollateral({
          user: swapper,
          asset: f.KISS,
          amount: toBig(400),
        });
        const ICDPMintAmount = toBig(1.04);
        await mintKrAsset({
          user: swapper,
          asset: f.KrAsset2,
          amount: ICDPMintAmount,
        });

        await KreskoSwapper.swapSCDP(swapper.address, f.KISS.address, f.KrAsset2.address, swapAmountKiss, 0);

        const expectedSwapDeposits = swapAmountKiss.sub(firstSwapFeeAmount);
        const stats = await hre.Diamond.getStatisticsSCDP();
        expect(await KreskoSwapper.getSwapDepositsSCDP(f.KISS.address)).to.equal(expectedSwapDeposits);
        expect(stats.collateralValue).to.be.eq(depositAmount.ebn().add(expectedSwapDeposits).wadMul(ONE_USD.ebn(8)));

        // the swap that matters, here user has 0.96 (previous swap) + 1.04 (mint). expecting 192 kiss from swap.
        const [expectedAmountOut] = await KreskoSwapper.previewSwapSCDP(
          f.KrAsset2.address,
          f.KISS.address,
          swapAmountKrAsset,
        );
        expect(expectedAmountOut).to.equal(expectedKissOutSecondSwap);
        const tx = await KreskoSwapper.swapSCDP(
          swapper.address,
          f.KrAsset2.address,
          f.KISS.address,
          swapAmountKrAsset,
          0,
        );

        const event = await getNamedEvent<SwapEvent>(tx, 'Swap');

        expect(event.args.who).to.equal(swapper.address);
        expect(event.args.assetIn).to.equal(f.KrAsset2.address);
        expect(event.args.assetOut).to.equal(f.KISS.address);
        expect(event.args.amountIn).to.equal(swapAmountKrAsset);
        expect(event.args.amountOut).to.equal(expectedKissOutSecondSwap);

        const assetInfos = await hre.Diamond.getAssetInfosSCDP([f.KISS.address, f.KrAsset2.address]);
        // f.KISS deposits sent in swap
        const acocuntPrincipalDepositsKISS = await KreskoSwapper.getAccountDepositSCDP(
          depositor.address,
          f.KISS.address,
        );

        expect(assetInfos[0].swapDeposits).to.equal(0); // half of 2 krAsset
        expect(assetInfos[0].depositAmount).to.equal(acocuntPrincipalDepositsKISS);

        // KrAsset debt is cleared
        expect(assetInfos[1].debtValue).to.equal(0);
        expect(assetInfos[1].debtAmount).to.equal(0);

        // KISS debt is issued
        const expectedKissDebtValue = toBig(swapValue, 8).sub(krAssetOutFirstSwapValue);
        expect(assetInfos[0].debtValue).to.equal(expectedKissDebtValue);

        expect(assetInfos[0].debtAmount).to.equal(expectedKissDebtValue.wadDiv(ONE_USD.ebn(8)));

        // krAsset swap deposits
        const expectedSwapDepositValue = toBig(swapValue, 8).sub(krAssetOutFirstSwapValue);
        expect(assetInfos[1].swapDeposits).to.equal(toBig(2).sub(krAssetOutFirstSwap));
        expect(assetInfos[1].depositValue).to.equal(expectedSwapDepositValue); // asset price is $100

        const global = await hre.Diamond.getStatisticsSCDP();
        const expectedCollateralValue = toBig(1000, 8).add(expectedSwapDepositValue);
        expect(global.collateralValue).to.equal(expectedCollateralValue);
        expect(global.debtValue).to.equal(expectedKissDebtValue);
        expect(global.cr).to.equal(expectedCollateralValue.percentDiv(expectedKissDebtValue));
      });

      it('cumulates fees on swap', async function () {
        const depositAmountNew = toBig(10000 - depositAmount);

        await f.KISS.setBalance(depositor, depositAmountNew);
        await KreskoDepositor.depositSCDP(
          depositor.address,
          f.KISS.address,
          depositAmountNew, // $10k
        );

        const swapAmount = toBig(ONE_USD * 2600); // $1

        const scaledDepositsStart = await KreskoSwapper.getAccountScaledDepositsSCDP(depositor.address, f.KISS.address);

        await KreskoSwapper.swapSCDP(swapper.address, f.KISS.address, f.KrAsset2.address, swapAmount, 0);

        const scaledDepositsAfterSwap = await KreskoSwapper.getAccountScaledDepositsSCDP(
          depositor.address,
          f.KISS.address,
        );
        expect(scaledDepositsAfterSwap).to.gt(scaledDepositsStart);

        await KreskoSwapper.swapSCDP(
          swapper.address,
          f.KrAsset2.address,
          f.KISS.address,
          f.KrAsset2.balanceOf(swapper.address),
          0,
        );
        const scaledDepositsAfterSecondSwap = await KreskoSwapper.getAccountScaledDepositsSCDP(
          depositor.address,
          f.KISS.address,
        );
        expect(scaledDepositsAfterSecondSwap).to.gt(scaledDepositsAfterSwap);

        const feesGained = await KreskoSwapper.getAccountDepositFeesGainedSCDP(depositor.address, f.KISS.address);

        await KreskoDepositor.withdrawSCDP(
          depositor.address,
          f.KISS.address,
          feesGained, // ~90 f.KISS
        );

        const [scaledDepositsAfter, feesAfter] = await Promise.all([
          KreskoSwapper.getAccountScaledDepositsSCDP(depositor.address, f.KISS.address),
          KreskoSwapper.getAccountDepositFeesGainedSCDP(depositor.address, f.KISS.address),
        ]);

        expect(feesGained).to.eq(feesAfter);

        expect(scaledDepositsAfter).to.eq(toBig(10000));

        await KreskoDepositor.withdrawSCDP(
          depositor.address,
          f.KISS.address,
          toBig(10000), // $10k f.KISS
        );

        const [depositsAfterFourth, feesAfterFourth] = await Promise.all([
          KreskoSwapper.getAccountDepositValueSCDP(depositor.address, f.KISS.address),
          KreskoSwapper.getAccountScaledDepositsSCDP(depositor.address, f.KISS.address),
        ]);

        expect(depositsAfterFourth).to.eq(0);

        expect(feesAfterFourth).to.eq(0);
      });
    });
    describe('#Liquidations', () => {
      beforeEach(async function () {
        for (const signer of f.usersArr) {
          await f.Collateral.setBalance(signer, toBig(1_000_000));
        }
        await f.KISS.setBalance(swapper, toBig(10_000));
        await f.KISS.setBalance(depositor2, toBig(10_000));
        await Promise.all([
          KreskoDepositor.depositSCDP(
            depositor.address,
            f.Collateral.address,
            depositAmount18Dec, // $10k
          ),
          KreskoDepositor.depositSCDP(
            depositor.address,
            f.Collateral8Dec.address,
            depositAmount8Dec, // $8k
          ),
          KreskoDepositor2.depositSCDP(
            depositor2.address,
            f.KISS.address,
            depositAmount18Dec, // $8k
          ),
        ]);
      });
      it('should identify if the pool is not underwater', async function () {
        const swapAmount = toBig(ONE_USD * 2600); // $1

        await KreskoSwapper.swapSCDP(swapper.address, f.KISS.address, f.KrAsset2.address, swapAmount, 0);

        expect(await hre.Diamond.getLiquidatableSCDP()).to.be.false;
      });

      //  test not passing
      it('should revert liquidations if the pool is not underwater', async function () {
        const swapAmount = toBig(ONE_USD * 2600); // $1

        await KreskoSwapper.swapSCDP(swapper.address, f.KISS.address, f.KrAsset2.address, swapAmount, 0);
        expect(await hre.Diamond.getLiquidatableSCDP()).to.be.false;

        await f.KrAsset2.setBalance(hre.users.liquidator, toBig(1_000_000));

        await expect(
          KreskoLiquidator.liquidateSCDP(f.KrAsset2.address, toBig(7.7), f.Collateral8Dec.address),
        ).to.be.revertedWithCustomError(CError(hre), 'CANNOT_LIQUIDATE');
      });
      //  test not passing
      it('should identify if the pool is underwater', async function () {
        const swapAmount = toBig(ONE_USD * 2600);

        await KreskoSwapper.swapSCDP(swapper.address, f.KISS.address, f.KrAsset2.address, swapAmount, 0);
        f.Collateral.setPrice(collateralPrice / 1000);
        f.Collateral8Dec.setPrice(collateralPrice / 1000);

        const [stats, params, liquidatable] = await Promise.all([
          hre.Diamond.getStatisticsSCDP(),
          hre.Diamond.getCurrentParametersSCDP(),
          hre.Diamond.getLiquidatableSCDP(),
        ]);

        expect(stats.cr).to.be.lt(params.liquidationThreshold);
        expect(liquidatable).to.be.true;
      });

      it('should allow liquidating the underwater pool', async function () {
        const swapAmount = toBig(ONE_USD * 2600);

        await KreskoSwapper.swapSCDP(swapper.address, f.KISS.address, f.KrAsset2.address, swapAmount, 0);
        const newKreskoAssetPrice = 500;
        f.KrAsset2.setPrice(newKreskoAssetPrice);

        const [scdpParams, maxLiquidatable, krAssetPrice, statsBefore] = await Promise.all([
          hre.Diamond.getCurrentParametersSCDP(),
          hre.Diamond.getMaxLiqValueSCDP(f.KrAsset2.address, f.Collateral8Dec.address),
          f.KrAsset2.getPrice(),
          hre.Diamond.getStatisticsSCDP(),
        ]);
        const repayAmount = maxLiquidatable.repayValue.wadDiv(krAssetPrice);

        await f.KrAsset2.setBalance(hre.users.liquidator, repayAmount.add((1e18).toString()));
        expect(statsBefore.cr).to.lt(scdpParams.liquidationThreshold);
        expect(statsBefore.cr).to.gt(1e4);
        const tx = await KreskoLiquidator.liquidateSCDP(f.KrAsset2.address, repayAmount, f.Collateral8Dec.address);
        const [statsAfter, liquidatableAfter] = await Promise.all([
          hre.Diamond.getStatisticsSCDP(),
          hre.Diamond.getLiquidatableSCDP(),
        ]);
        expect(statsAfter.cr).to.gt(scdpParams.liquidationThreshold);
        expect(statsAfter.crDebtValueAdjusted).to.eq(2.01e4);

        expect(liquidatableAfter).to.eq(false);
        await expect(
          KreskoLiquidator.liquidateSCDP(f.KrAsset2.address, repayAmount, f.Collateral8Dec.address),
        ).to.be.revertedWithCustomError(CError(hre), 'CANNOT_LIQUIDATE');

        const event = await getNamedEvent<SCDPLiquidationOccuredEvent>(tx, 'SCDPLiquidationOccured');

        const expectedSeizeAmount = repayAmount
          .wadMul(toBig(newKreskoAssetPrice, 8))
          .percentMul(1.05e4)
          .wadDiv(toBig(collateralPrice, 8))
          .div(10 ** 10);

        expect(event.args.liquidator).to.eq(hre.users.liquidator.address);
        expect(event.args.seizeAmount).to.eq(expectedSeizeAmount);
        expect(event.args.repayAmount).to.eq(repayAmount);
        expect(event.args.seizeCollateral).to.eq(f.Collateral8Dec.address);
        expect(event.args.repayKreskoAsset).to.eq(f.KrAsset2.address);

        const expectedDepositsAfter = depositAmount8Dec.sub(event.args.seizeAmount);

        expect(expectedDepositsAfter).to.be.lt(depositAmount8Dec);

        const [principalDeposits, depositsWithFees, params] = await Promise.all([
          hre.Diamond.getAccountDepositSCDP(depositor.address, f.Collateral8Dec.address),
          hre.Diamond.getAccountScaledDepositsSCDP(depositor.address, f.Collateral8Dec.address),
          hre.Diamond.getCurrentParametersSCDP(),
        ]);
        expect(principalDeposits).to.eq(expectedDepositsAfter);
        expect(depositsWithFees).to.eq(expectedDepositsAfter);

        await KreskoDepositor.depositSCDP(depositor.address, f.Collateral.address, depositAmount18Dec.mul(10));
        const stats = await hre.Diamond.getStatisticsSCDP();
        expect(stats.cr).to.gt(params.minCollateralRatio);
        await expect(KreskoDepositor.withdrawSCDP(depositor.address, f.Collateral8Dec.address, expectedDepositsAfter))
          .to.not.be.reverted;
        const [principalEnd, depositsWithFeesEnd] = await Promise.all([
          hre.Diamond.getAccountDepositSCDP(depositor.address, f.Collateral8Dec.address),
          hre.Diamond.getAccountScaledDepositsSCDP(depositor.address, f.Collateral8Dec.address),
        ]);
        expect(principalEnd).to.eq(0);
        expect(depositsWithFeesEnd).to.eq(0);
      });
    });
    describe('#Error', () => {
      beforeEach(async function () {
        await Promise.all(f.usersArr.map(signer => f.Collateral.setBalance(signer, toBig(1_000_000))));
        await f.KISS.setBalance(swapper, toBig(10_000));
        await f.KISS.setBalance(depositor, ethers.BigNumber.from(1));

        await Promise.all([
          KreskoDepositor.depositSCDP(depositor.address, f.KISS.address, 1),
          KreskoDepositor.depositSCDP(
            depositor.address,
            f.Collateral.address,
            depositAmount18Dec, // $10k
          ),
        ]);
      });
      it('should revert depositing unsupported tokens', async function () {
        const [UnsupportedToken] = await hre.deploy('MockERC20', {
          args: ['UnsupportedToken', 'UnsupportedToken', 18, toBig(1)],
        });
        await UnsupportedToken.approve(hre.Diamond.address, hre.ethers.constants.MaxUint256);
        const { deployer } = await hre.getNamedAccounts();
        await expect(hre.Diamond.depositSCDP(deployer, UnsupportedToken.address, 1))
          .to.be.revertedWithCustomError(CError(hre), 'INVALID_DEPOSIT_ASSET')
          .withArgs(UnsupportedToken.address);
      });
      it('should revert withdrawing without deposits', async function () {
        await expect(KreskoSwapper.withdrawSCDP(depositor.address, f.Collateral.address, 1))
          .to.be.revertedWithCustomError(CError(hre), 'SCDP_WITHDRAWAL_VIOLATION')
          .withArgs(f.Collateral.address, 1, 0, 0);
      });

      it('should revert withdrawals below MCR', async function () {
        const swapAmount = toBig(ONE_USD).mul(1000); // $1000
        await KreskoSwapper.swapSCDP(swapper.address, f.KISS.address, f.KrAsset2.address, swapAmount, 0); // generates the debt
        const deposits = await KreskoSwapper.getAccountDepositSCDP(depositor.address, f.Collateral.address);
        await expect(KreskoDepositor.withdrawSCDP(depositor.address, f.Collateral.address, deposits))
          .to.be.revertedWithCustomError(CError(hre), 'DEBT_EXCEEDS_COLLATERAL')
          .withArgs(960e8, 4800e8, 5e4);
      });

      it('should revert withdrawals of swap owned collateral deposits', async function () {
        const swapAmount = toBig(1);
        await f.KrAsset2.setBalance(swapper, swapAmount);

        await KreskoSwapper.swapSCDP(swapper.address, f.KrAsset2.address, f.KISS.address, swapAmount, 0);
        const deposits = await KreskoSwapper.getSwapDepositsSCDP(f.KrAsset2.address);
        expect(deposits).to.be.gt(0);
        await expect(KreskoSwapper.withdrawSCDP(swapper.address, f.KrAsset2.address, deposits))
          .to.be.revertedWithCustomError(CError(hre), 'SCDP_WITHDRAWAL_VIOLATION')
          .withArgs(f.KrAsset2.address, swapAmount, 0, 0);
      });

      it('should revert swapping with price below minAmountOut', async function () {
        const swapAmount = toBig(1);
        await f.KrAsset2.setBalance(swapper, swapAmount);
        const [amountOut] = await KreskoSwapper.previewSwapSCDP(f.KrAsset2.address, f.KISS.address, swapAmount);
        await expect(
          KreskoSwapper.swapSCDP(swapper.address, f.KrAsset2.address, f.KISS.address, swapAmount, amountOut.add(1)),
        )
          .to.be.revertedWithCustomError(CError(hre), 'SWAP_SLIPPAGE')
          .withArgs(amountOut, amountOut.add(1));
      });

      it('should revert swapping unsupported asset', async function () {
        const swapAmount = toBig(1);
        await f.KrAsset2.setBalance(swapper, swapAmount);

        await expect(KreskoSwapper.swapSCDP(swapper.address, f.KrAsset2.address, f.Collateral.address, swapAmount, 0))
          .to.be.revertedWithCustomError(CError(hre), 'INVALID_ASSET')
          .withArgs(f.Collateral.address);
      });
      it('should revert swapping a disabled route', async function () {
        const swapAmount = toBig(1);
        await f.KrAsset2.setBalance(swapper, swapAmount);

        await hre.Diamond.setSwapPairsSingle({
          assetIn: f.KrAsset2.address,
          assetOut: f.KISS.address,
          enabled: false,
        });
        await expect(KreskoSwapper.swapSCDP(swapper.address, f.KrAsset2.address, f.KISS.address, swapAmount, 0))
          .to.be.revertedWithCustomError(CError(hre), 'SWAP_NOT_ENABLED')
          .withArgs(f.KrAsset2.address, f.KISS.address);
      });
      it('should revert swapping causes CDP to go below MCR', async function () {
        const swapAmount = toBig(1_500_000);
        await f.KrAsset2.setBalance(swapper, swapAmount);
        const tx = KreskoSwapper.swapSCDP(swapper.address, f.KrAsset2.address, f.KISS.address, swapAmount, 0);
        await expect(tx)
          .to.be.revertedWithCustomError(CError(hre), 'DEBT_EXCEEDS_COLLATERAL')
          .withArgs('15001000000000000', '75000000000000000', 5e4);
      });
    });
  });
});
