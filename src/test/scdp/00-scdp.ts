import type {
  AssetStruct,
  Kresko,
  SCDPLiquidationOccuredEvent,
  SwapEvent,
  SwapRouteSetterStruct,
} from '@/types/typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko'
import { getSCDPInitializer } from '@config/hardhat/deploy'
import { Errors } from '@utils/errors'
import { getNamedEvent } from '@utils/events'
import { type SCDPFixture, scdpFixture } from '@utils/test/fixtures'
import { depositCollateral } from '@utils/test/helpers/collaterals'
import { mintKrAsset } from '@utils/test/helpers/krassets'
import { RAY, toBig } from '@utils/values'
import { expect } from 'chai'
import { maxUint256 } from 'viem'

const depositAmount = 1000
const depositValue = depositAmount.ebn(8)
const initialDepositValue = depositAmount.ebn(8)
const depositAmount18Dec = depositAmount.ebn()
const depositAmount8Dec = depositAmount.ebn(8)

describe('SCDP', async function () {
  let f: SCDPFixture
  this.slow(5000)

  beforeEach(async function () {
    f = await scdpFixture()
    await f.reset()
  })

  describe('#Configuration', async () => {
    it('should be initialized correctly', async () => {
      const { args } = await getSCDPInitializer(hre)

      const configuration = await hre.Diamond.getParametersSCDP()
      expect(configuration.liquidationThreshold).to.equal(args.liquidationThreshold)
      expect(configuration.minCollateralRatio).to.equal(args.minCollateralRatio)
      expect(configuration.maxLiquidationRatio).to.equal(Number(args.liquidationThreshold) + 0.01e4)

      const collaterals = await hre.Diamond.getCollateralsSCDP()
      expect(collaterals).to.include.members([
        f.Collateral.address,
        f.Collateral8Dec.address,
        f.KrAsset.address,
        f.KrAsset2.address,
        f.KISS.address,
      ])
      const krAssets = await hre.Diamond.getKreskoAssetsSCDP()
      expect(krAssets).to.include.members([f.KrAsset.address, f.KrAsset2.address, f.KISS.address])

      const depositsEnabled = await Promise.all([
        hre.Diamond.getDepositEnabledSCDP(f.Collateral.address),
        hre.Diamond.getDepositEnabledSCDP(f.Collateral8Dec.address),
        hre.Diamond.getDepositEnabledSCDP(f.KrAsset.address),
        hre.Diamond.getDepositEnabledSCDP(f.KrAsset2.address),
        hre.Diamond.getDepositEnabledSCDP(f.KISS.address),
      ])

      expect(depositsEnabled).to.deep.equal([true, true, false, false, true])

      const depositAssets = await hre.Diamond.viewSCDPDepositAssets()

      expect(depositAssets).to.include.members([f.Collateral.address, f.Collateral8Dec.address, f.KISS.address])
    })
    it('should be able to whitelist new deposit asset', async () => {
      const assetInfoBefore = await hre.Diamond.getAsset(f.KrAsset2.address)
      expect(assetInfoBefore.isSharedCollateral).to.equal(false)
      await hre.Diamond.updateAsset(f.KrAsset2.address, {
        ...assetInfoBefore,
        isSharedCollateral: true,
        depositLimitSCDP: 1,
      })
      const assetInfoAfter = await hre.Diamond.getAsset(f.KrAsset2.address)
      expect(assetInfoAfter.decimals).to.equal(await f.KrAsset2.contract.decimals())

      expect(assetInfoAfter.depositLimitSCDP).to.equal(1)

      const indicesAfter = await hre.Diamond.getAssetIndexesSCDP(f.KrAsset2.address)
      expect(indicesAfter.currLiqIndex).to.equal(RAY)
      expect(indicesAfter.currFeeIndex).to.equal(RAY)

      expect(await hre.Diamond.getDepositEnabledSCDP(f.KrAsset2.address)).to.equal(true)
    })

    it('should be able to update deposit limit of asset', async () => {
      await hre.Diamond.setDepositLimitSCDP(f.Collateral.address, 1)
      const collateral = await hre.Diamond.getAsset(f.Collateral.address)
      expect(collateral.decimals).to.equal(await f.Collateral.contract.decimals())
      expect(collateral.depositLimitSCDP).to.equal(1)

      const indicesAfter = await hre.Diamond.getAssetIndexesSCDP(f.Collateral.address)
      expect(indicesAfter.currLiqIndex).to.equal(RAY)
      expect(indicesAfter.currFeeIndex).to.equal(RAY)
    })

    it('should be able to disable a deposit asset', async () => {
      await hre.Diamond.setAssetIsSharedCollateralSCDP(f.Collateral.address, false)
      const collaterals = await hre.Diamond.getCollateralsSCDP()
      expect(collaterals).to.include(f.Collateral.address)
      const depositAssets = await hre.Diamond.viewSCDPDepositAssets()
      expect(depositAssets).to.not.include(f.Collateral.address)
      expect(await hre.Diamond.getDepositEnabledSCDP(f.Collateral.address)).to.equal(false)
    })

    it('should be able to disable and enable a collateral asset', async () => {
      await hre.Diamond.setAssetIsSharedOrSwappedCollateralSCDP(f.Collateral.address, false)

      expect(await hre.Diamond.getCollateralsSCDP()).to.not.include(f.Collateral.address)
      expect(await hre.Diamond.viewSCDPDepositAssets()).to.not.include(f.Collateral.address)
      expect(await hre.Diamond.getDepositEnabledSCDP(f.Collateral.address)).to.equal(true)

      await hre.Diamond.setAssetIsSharedCollateralSCDP(f.Collateral.address, false)
      expect(await hre.Diamond.getDepositEnabledSCDP(f.Collateral.address)).to.equal(false)

      await hre.Diamond.setAssetIsSharedOrSwappedCollateralSCDP(f.Collateral.address, true)
      expect(await hre.Diamond.getCollateralsSCDP()).to.include(f.Collateral.address)
      expect(await hre.Diamond.viewSCDPDepositAssets()).to.not.include(f.Collateral.address)
      expect(await hre.Diamond.getDepositEnabledSCDP(f.Collateral.address)).to.equal(false)

      await hre.Diamond.setAssetIsSharedCollateralSCDP(f.Collateral.address, true)
      expect(await hre.Diamond.getDepositEnabledSCDP(f.Collateral.address)).to.equal(true)
      expect(await hre.Diamond.viewSCDPDepositAssets()).to.include(f.Collateral.address)
    })

    it('should be able to add whitelisted kresko asset', async () => {
      const assetInfo = await hre.Diamond.getAsset(f.KrAsset.address)
      expect(assetInfo.swapInFeeSCDP).to.equal(f.swapKrAssetConfig.swapInFeeSCDP)
      expect(assetInfo.swapOutFeeSCDP).to.equal(f.swapKrAssetConfig.swapOutFeeSCDP)
      expect(assetInfo.liqIncentiveSCDP).to.equal(f.swapKrAssetConfig.liqIncentiveSCDP)
      expect(assetInfo.protocolFeeShareSCDP).to.equal(f.swapKrAssetConfig.protocolFeeShareSCDP)
    })

    it('should be able to update a whitelisted kresko asset', async () => {
      const update: AssetStruct = {
        ...f.KrAsset.config.assetStruct,
        swapInFeeSCDP: 0.05e4,
        swapOutFeeSCDP: 0.05e4,
        liqIncentiveSCDP: 1.06e4,
        protocolFeeShareSCDP: 0.4e4,
      }

      await hre.Diamond.updateAsset(f.KrAsset.address, update)
      const assetInfo = await hre.Diamond.getAsset(f.KrAsset.address)
      expect(assetInfo.swapInFeeSCDP).to.equal(update.swapInFeeSCDP)
      expect(assetInfo.swapOutFeeSCDP).to.equal(update.swapOutFeeSCDP)
      expect(assetInfo.protocolFeeShareSCDP).to.equal(update.protocolFeeShareSCDP)
      expect(assetInfo.liqIncentiveSCDP).to.equal(update.liqIncentiveSCDP)

      const krAssets = await hre.Diamond.getKreskoAssetsSCDP()
      expect(krAssets).to.include(f.KrAsset.address)
      const collaterals = await hre.Diamond.getCollateralsSCDP()
      expect(collaterals).to.include(f.KrAsset.address)
      expect(await hre.Diamond.getDepositEnabledSCDP(f.KrAsset.address)).to.equal(false)
    })

    it('should be able to remove a whitelisted kresko asset', async () => {
      await hre.Diamond.setAssetIsSwapMintableSCDP(f.KrAsset.address, false)
      const krAssets = await hre.Diamond.getKreskoAssetsSCDP()
      expect(krAssets).to.not.include(f.KrAsset.address)
      expect(await hre.Diamond.getDepositEnabledSCDP(f.KrAsset.address)).to.equal(false)
    })

    it('should be able to enable and disable swap pairs', async () => {
      const swapPairsEnabled: SwapRouteSetterStruct[] = [
        {
          assetIn: f.Collateral.address,
          assetOut: f.KrAsset.address,
          enabled: true,
        },
      ]
      await hre.Diamond.setSwapRoutesSCDP(swapPairsEnabled)
      expect(await hre.Diamond.getSwapEnabledSCDP(f.Collateral.address, f.KrAsset.address)).to.equal(true)
      expect(await hre.Diamond.getSwapEnabledSCDP(f.KrAsset.address, f.Collateral.address)).to.equal(true)

      const swapPairsDisabled: SwapRouteSetterStruct[] = [
        {
          assetIn: f.Collateral.address,
          assetOut: f.KrAsset.address,
          enabled: false,
        },
      ]
      await hre.Diamond.setSwapRoutesSCDP(swapPairsDisabled)
      expect(await hre.Diamond.getSwapEnabledSCDP(f.Collateral.address, f.KrAsset.address)).to.equal(false)
      expect(await hre.Diamond.getSwapEnabledSCDP(f.KrAsset.address, f.Collateral.address)).to.equal(false)
    })
  })

  describe('#Deposit', async function () {
    it('should be able to deposit collateral, calculate correct deposit values', async function () {
      const expectedValueUnadjusted = toBig(f.CollateralPrice.num(8) * depositAmount, 8)
      const expectedValueAdjusted = (f.CollateralPrice.num(8) * depositAmount).ebn(8) // cfactor = 1

      await hre.Diamond.setFeeAssetSCDP(f.Collateral.address)

      await Promise.all(
        f.usersArr.map(user => {
          return hre.Diamond.connect(user).depositSCDP(user.address, f.Collateral.address, depositAmount18Dec)
        }),
      )

      const prices = hre.viewData()

      const [userInfos, { scdp }, [assetInfo]] = await Promise.all([
        hre.Diamond.viewSCDPAccounts(
          prices,
          f.usersArr.map(user => user.address),
          [f.Collateral.address],
        ),
        hre.Diamond.viewProtocolData(prices),
        hre.Diamond.viewSCDPAssets(prices, [f.Collateral.address]),
      ])

      for (const userInfo of userInfos) {
        const balance = await f.Collateral.balanceOf(userInfo.addr)

        expect(balance).to.equal(0)
        expect(userInfo.deposits[0].amountFees).to.equal(0)
        expect(userInfo.deposits[0].amount).to.equal(depositAmount18Dec)
        expect(userInfo.totals.valColl).to.equal(expectedValueUnadjusted)
        expect(userInfo.totals.valFees).to.equal(0)
        expect(userInfo.deposits[0].val).to.equal(expectedValueUnadjusted)
        expect(userInfo.deposits[0].valFees).to.equal(0)
      }

      expect(await f.Collateral.balanceOf(hre.Diamond.address)).to.equal(depositAmount18Dec.mul(f.usersArr.length))
      expect(assetInfo.amountColl).to.equal(depositAmount18Dec.mul(f.usersArr.length))
      expect(assetInfo.valColl).to.equal(expectedValueUnadjusted.mul(f.usersArr.length))
      expect(scdp.totals.valColl).to.equal(expectedValueUnadjusted.mul(f.usersArr.length))
      expect(scdp.totals.valDebt).to.equal(0)

      // Adjusted
      expect(assetInfo.valCollAdj).to.equal(expectedValueAdjusted.mul(f.usersArr.length))
      expect(scdp.totals.valCollAdj).to.equal(expectedValueUnadjusted.mul(f.usersArr.length))
      expect(scdp.totals.valDebtOgAdj).to.equal(0)

      expect(scdp.totals.valDebt).to.equal(0)
      expect(scdp.totals.crOgAdj).to.equal(maxUint256)
      expect(scdp.totals.crOg).to.equal(maxUint256)
      expect(scdp.totals.cr).to.equal(maxUint256)
    })

    it('should be able to deposit multiple collaterals, calculate correct deposit values', async function () {
      const expectedValueUnadjusted = toBig(f.CollateralPrice.num(8) * depositAmount, 8)
      const expectedValueAdjusted = toBig((f.CollateralPrice.num(8) / 1) * depositAmount, 8) // cfactor = 1

      const expectedValueUnadjusted8Dec = toBig(f.CollateralPrice.num(8) * depositAmount, 8)
      const expectedValueAdjusted8Dec = toBig(f.CollateralPrice.num(8) * 0.8 * depositAmount, 8) // cfactor = 0.8

      await Promise.all(
        f.usersArr.map(async user => {
          const User = hre.Diamond.connect(user)
          await hre.Diamond.setFeeAssetSCDP(f.Collateral.address)
          await User.depositSCDP(user.address, f.Collateral.address, depositAmount18Dec)
          await hre.Diamond.setFeeAssetSCDP(f.Collateral8Dec.address)
          await User.depositSCDP(user.address, f.Collateral8Dec.address, depositAmount8Dec)
        }),
      )
      const prices = hre.viewData()
      const [userInfos, assetInfos, { scdp }] = await Promise.all([
        hre.Diamond.viewSCDPAccounts(
          prices,
          f.usersArr.map(u => u.address),
          [f.Collateral.address, f.Collateral8Dec.address],
        ),
        hre.Diamond.viewSCDPAssets(prices, [f.Collateral.address, f.Collateral8Dec.address]),
        hre.Diamond.viewProtocolData(prices),
      ])

      for (const userInfo of userInfos) {
        expect(userInfo.deposits[0].amount).to.equal(depositAmount18Dec)
        expect(userInfo.deposits[0].val).to.equal(expectedValueUnadjusted)
        expect(userInfo.deposits[1].amount).to.equal(depositAmount8Dec)
        expect(userInfo.deposits[1].val).to.equal(expectedValueUnadjusted8Dec)

        expect(userInfo.totals.valColl).to.equal(expectedValueUnadjusted.add(expectedValueUnadjusted8Dec))
      }

      expect(assetInfos[0].amountColl).to.equal(depositAmount18Dec.mul(f.usersArr.length))
      expect(assetInfos[1].amountColl).to.equal(depositAmount8Dec.mul(f.usersArr.length))

      // WITH_FACTORS global
      const valueTotalAdjusted = expectedValueAdjusted.mul(f.usersArr.length)
      const valueTotalAdjusted8Dec = expectedValueAdjusted8Dec.mul(f.usersArr.length)
      const valueAdjusted = valueTotalAdjusted.add(valueTotalAdjusted8Dec)

      expect(assetInfos[0].valColl).to.equal(valueTotalAdjusted)
      expect(assetInfos[1].valCollAdj).to.equal(valueTotalAdjusted8Dec)

      expect(scdp.totals.valCollAdj).to.equal(valueAdjusted)
      expect(scdp.totals.valDebt).to.equal(0)
      expect(scdp.totals.cr).to.equal(maxUint256)

      // WITHOUT_FACTORS global
      const valueTotalUnadjusted = expectedValueUnadjusted.mul(f.usersArr.length)
      const valueTotalUnadjusted8Dec = expectedValueUnadjusted8Dec.mul(f.usersArr.length)
      const valueUnadjusted = valueTotalUnadjusted.add(valueTotalUnadjusted8Dec)

      expect(assetInfos[0].valColl).to.equal(valueTotalUnadjusted)
      expect(assetInfos[1].valColl).to.equal(valueTotalUnadjusted8Dec)

      expect(scdp.totals.valColl).to.equal(valueUnadjusted)
      expect(scdp.totals.valDebt).to.equal(0)
      expect(scdp.totals.cr).to.equal(maxUint256)
    })
  })
  describe('#Withdraw', async () => {
    beforeEach(async function () {
      await Promise.all(
        f.usersArr.map(async user => {
          const UserKresko = hre.Diamond.connect(user)
          await hre.Diamond.setFeeAssetSCDP(f.Collateral.address)
          await UserKresko.depositSCDP(user.address, f.Collateral.address, depositAmount18Dec)
          await hre.Diamond.setFeeAssetSCDP(f.Collateral8Dec.address)
          await UserKresko.depositSCDP(user.address, f.Collateral8Dec.address, depositAmount8Dec)
        }),
      )
    })

    it('should be able to withdraw full collateral of multiple assets', async function () {
      await Promise.all(
        f.usersArr.map(async user => {
          const UserKresko = hre.Diamond.connect(user)
          return Promise.all([
            UserKresko.withdrawSCDP(
              {
                account: user.address,
                asset: f.Collateral.address,
                amount: depositAmount18Dec,
                receiver: user.address,
              },
              await hre.updateData(),
            ),
            UserKresko.withdrawSCDP(
              {
                account: user.address,
                asset: f.Collateral8Dec.address,
                amount: depositAmount8Dec,
                receiver: user.address,
              },
              await hre.updateData(),
            ),
          ])
        }),
      )

      expect(await f.Collateral.balanceOf(hre.Diamond.address)).to.equal(0)

      const prices = hre.viewData()
      const [userInfos, assetInfos, { scdp }] = await Promise.all([
        hre.Diamond.viewSCDPAccounts(
          prices,
          f.usersArr.map(u => u.address),
          [f.Collateral.address, f.Collateral8Dec.address],
        ),
        hre.Diamond.viewSCDPAssets(prices, [f.Collateral.address, f.Collateral8Dec.address]),
        hre.Diamond.viewProtocolData(prices),
      ])

      for (const userInfo of userInfos) {
        expect(await f.Collateral.balanceOf(userInfo.addr)).to.equal(depositAmount18Dec)
        expect(userInfo.deposits[0].amount).to.equal(0)
        expect(userInfo.deposits[0].amountFees).to.equal(0)
        expect(userInfo.deposits[1].amount).to.equal(0)
        expect(userInfo.deposits[1].amountFees).to.equal(0)
        expect(userInfo.totals.valColl).to.equal(0)
      }

      for (const assetInfo of assetInfos) {
        expect(assetInfo.valColl).to.equal(0)
        expect(assetInfo.amountColl).to.equal(0)
        expect(assetInfo.amountSwapDeposit).to.equal(0)
      }
      expect(scdp.totals.valColl).to.equal(0)
      expect(scdp.totals.valDebt).to.equal(0)
      expect(scdp.totals.cr).to.equal(0)
    })

    it('should be able to withdraw partial collateral of multiple assets', async function () {
      const partialWithdraw = depositAmount18Dec.div(f.usersArr.length)
      const partialWithdraw8Dec = depositAmount8Dec.div(f.usersArr.length)

      const expectedValueUnadjusted = toBig(f.CollateralPrice.num(8) * depositAmount, 8)
        .mul(200)
        .div(300)
      const expectedValueAdjusted = toBig(f.CollateralPrice.num(8) * 1 * depositAmount, 8)
        .mul(200)
        .div(300) // cfactor = 1

      const expectedValueUnadjusted8Dec = toBig(f.CollateralPrice.num(8) * depositAmount, 8)
        .mul(200)
        .div(300)
      const expectedValueAdjusted8Dec = toBig(f.CollateralPrice.num(8) * 0.8 * depositAmount, 8)
        .mul(200)
        .div(300) // cfactor = 0.8

      await Promise.all(
        f.usersArr.map(async user => {
          const UserKresko = hre.Diamond.connect(user)
          return Promise.all([
            UserKresko.withdrawSCDP(
              { account: user.address, asset: f.Collateral.address, amount: partialWithdraw, receiver: user.address },
              await hre.updateData(),
            ),
            UserKresko.withdrawSCDP(
              {
                account: user.address,
                asset: f.Collateral8Dec.address,
                amount: partialWithdraw8Dec,
                receiver: user.address,
              },
              await hre.updateData(),
            ),
          ])
        }),
      )

      const [collateralBalanceAfter, collateral8DecBalanceAfter, { scdp }, assetInfos, userInfos] = await Promise.all([
        f.Collateral.balanceOf(hre.Diamond.address),
        f.Collateral8Dec.balanceOf(hre.Diamond.address),
        hre.Diamond.viewProtocolData(hre.viewData()),
        hre.Diamond.viewSCDPAssets(hre.viewData(), [f.Collateral.address, f.Collateral8Dec.address]),
        hre.Diamond.viewSCDPAccounts(
          hre.viewData(),
          f.usersArr.map(u => u.address),
          [f.Collateral.address, f.Collateral8Dec.address],
        ),
      ])
      for (const userInfo of userInfos) {
        const [balance18Dec, balance8Dec] = await Promise.all([
          f.Collateral.balanceOf(userInfo.addr),
          f.Collateral8Dec.balanceOf(userInfo.addr),
        ])

        expect(balance18Dec).to.equal(partialWithdraw)
        expect(balance8Dec).to.equal(partialWithdraw8Dec)
        expect(userInfo.deposits[0].amount).to.equal(depositAmount18Dec.sub(partialWithdraw))
        expect(userInfo.deposits[0].amountFees).to.equal(0)

        expect(userInfo.deposits[1].amount).to.equal(depositAmount8Dec.sub(partialWithdraw8Dec))
        expect(userInfo.deposits[1].amountFees).to.equal(0)

        expect(userInfo.totals.valColl).to.closeTo(
          expectedValueUnadjusted.add(expectedValueUnadjusted8Dec),
          toBig(0.00001, 8),
        )
      }

      expect(collateralBalanceAfter).to.closeTo(toBig(2000), 1)
      expect(collateral8DecBalanceAfter).to.closeTo(toBig(2000, 8), 1)

      expect(assetInfos[0].amountColl).to.closeTo(toBig(2000), 1)
      expect(assetInfos[1].amountColl).to.closeTo(toBig(2000, 8), 1)

      expect(assetInfos[0].valColl).to.closeTo(expectedValueUnadjusted.mul(f.usersArr.length), 20)
      expect(assetInfos[0].valCollAdj).to.closeTo(expectedValueAdjusted.mul(f.usersArr.length), 20)

      expect(assetInfos[1].valColl).to.closeTo(expectedValueUnadjusted8Dec.mul(f.usersArr.length), 20)
      expect(assetInfos[1].valCollAdj).to.closeTo(expectedValueAdjusted8Dec.mul(f.usersArr.length), 20)
      const totalValueRemaining = expectedValueUnadjusted8Dec
        .mul(f.usersArr.length)
        .add(expectedValueUnadjusted.mul(f.usersArr.length))

      expect(scdp.totals.valColl).to.closeTo(totalValueRemaining, 20)
      expect(scdp.totals.valDebt).to.equal(0)
      expect(scdp.totals.cr).to.equal(maxUint256)
    })
  })
  describe('#Fee Distribution', () => {
    let incomeCumulator: SignerWithAddress
    let IncomeCumulator: Kresko

    beforeEach(async function () {
      incomeCumulator = hre.users.deployer
      IncomeCumulator = hre.Diamond.connect(incomeCumulator)
      await f.Collateral.setBalance(incomeCumulator, depositAmount18Dec.mul(f.usersArr.length), hre.Diamond.address)
    })

    it('should be able to cumulate fees into deposits', async function () {
      await hre.Diamond.setFeeAssetSCDP(f.Collateral.address)
      const feePerUser = depositAmount18Dec
      const feesToCumulate = feePerUser.mul(f.usersArr.length)
      const feePerUserValue = toBig(f.CollateralPrice.num(8) * depositAmount, 8)
      const expectedDepositValue = toBig(f.CollateralPrice.num(8) * depositAmount, 8)

      // deposit some
      await Promise.all(
        f.usersArr.map(signer =>
          hre.Diamond.connect(signer).depositSCDP(signer.address, f.Collateral.address, depositAmount18Dec),
        ),
      )

      // cumulate some income
      await IncomeCumulator.cumulateIncomeSCDP(f.Collateral.address, feesToCumulate)

      // check that the fees are cumulated
      for (const data of await hre.Diamond.viewSCDPAccounts(
        hre.viewData(),
        f.usersArr.map(u => u.address),
        [f.Collateral.address],
      )) {
        expect(data.deposits[0].val).to.equal(expectedDepositValue)
        expect(data.deposits[0].valFees).to.equal(feePerUserValue)
        expect(data.totals.valColl).to.equal(expectedDepositValue)
        expect(data.totals.valFees).to.equal(feePerUserValue)
      }

      // withdraw principal
      await Promise.all(
        f.usersArr.map(async signer =>
          hre.Diamond.connect(signer).withdrawSCDP(
            {
              account: signer.address,
              asset: f.Collateral.address,
              amount: depositAmount18Dec,
              receiver: signer.address,
            },
            await hre.updateData(),
          ),
        ),
      )

      const prices = hre.viewData()

      for (const user of await hre.Diamond.viewSCDPAccounts(
        prices,
        f.usersArr.map(u => u.address),
        [f.Collateral.address],
      )) {
        const balance = await f.Collateral.balanceOf(user.addr)
        expect(user.deposits[0].val).to.equal(0)
        expect(user.deposits[0].valFees).to.equal(0)
        expect(user.totals.valFees).to.equal(0)
        expect(user.totals.valColl).to.equal(0)
        expect(balance).to.equal(depositAmount18Dec.add(feePerUser))
      }

      const [[assetInfo], { scdp }, balance] = await Promise.all([
        hre.Diamond.viewSCDPAssets(prices, [f.Collateral.address]),
        hre.Diamond.viewProtocolData(prices),
        f.Collateral.balanceOf(hre.Diamond.address),
      ])

      expect(balance).to.equal(0)
      expect(assetInfo.amountColl).to.equal(0)
      expect(assetInfo.valColl).to.equal(0)
      expect(assetInfo.valCollAdj).to.equal(0)
      expect(scdp.totals.valColl).to.equal(0)

      // nothing left in protocol.
      const [colalteralBalanceKresko, [assetInfoFinal]] = await Promise.all([
        f.Collateral.balanceOf(hre.Diamond.address),
        hre.Diamond.viewSCDPAssets(prices, [f.Collateral.address]),
      ])
      expect(colalteralBalanceKresko).to.equal(0)
      expect(assetInfoFinal.amountColl).to.equal(0)
      expect(assetInfoFinal.valColl).to.equal(0)
      expect(assetInfoFinal.valCollAdj).to.equal(0)
    })
  })
  describe('#Swap', () => {
    beforeEach(async function () {
      await Promise.all(f.usersArr.map(signer => f.Collateral.setBalance(signer, toBig(1_000_000))))
      await f.KISS.setBalance(f.swapper, toBig(10_000))
      await f.KISS.setBalance(f.depositor, toBig(10_000))
      await f.KreskoDepositor.depositSCDP(
        f.depositor.address,
        f.KISS.address,
        depositAmount18Dec, // $10k
      )
    })
    it('should have collateral in pool', async function () {
      const { scdp } = await hre.Diamond.viewProtocolData(hre.viewData())
      expect(scdp.totals.valColl).to.equal(toBig(depositAmount, 8))
      expect(scdp.totals.valDebt).to.equal(0)
      expect(scdp.totals.cr).to.equal(maxUint256)
    })

    it('should be able to preview a swap', async function () {
      const swapAmount = toBig(1)

      expect((await f.KrAsset2.getPrice()).pyth).to.equal(f.KrAsset2Price)

      const feePercentageProtocol =
        Number(f.KISS.config.assetStruct.protocolFeeShareSCDP) +
        Number(f.KrAsset2.config.assetStruct.protocolFeeShareSCDP)

      const expectedTotalFee = swapAmount.percentMul(f.KRASSET_KISS_ROUTE_FEE)
      const expectedProtocolFee = expectedTotalFee.percentMul(feePercentageProtocol)
      const expectedFee = expectedTotalFee.sub(expectedProtocolFee)
      const amountInAfterFees = swapAmount.sub(expectedTotalFee)

      const expectedAmountOut = amountInAfterFees.wadMul(f.KISSPrice).wadDiv(f.KrAsset2Price)
      const [amountOut, feeAmount, feeAmountProtocol] = await hre.Diamond.previewSwapSCDP(
        f.KISS.address,
        f.KrAsset2.address,
        swapAmount,
      )
      expect(amountOut).to.equal(expectedAmountOut)
      expect(feeAmount).to.equal(expectedFee)
      expect(feeAmountProtocol).to.equal(expectedProtocolFee)
    })

    it('should be able to swap, shared debt == 0 | swap collateral == 0', async function () {
      const swapAmount = toBig(1) // $1
      const kissInAfterFees = swapAmount.sub(swapAmount.percentMul(f.KRASSET_KISS_ROUTE_FEE))

      const expectedAmountOut = kissInAfterFees.wadMul(f.KISSPrice).wadDiv(f.KrAsset2Price)
      const tx = await f.KreskoSwapper.swapSCDP({
        receiver: f.swapper.address,
        assetIn: f.KISS.address,
        assetOut: f.KrAsset2.address,
        amountIn: swapAmount,
        amountOutMin: 0,
        prices: await hre.updateData(),
      })
      const event = await getNamedEvent<SwapEvent>(tx, 'Swap')
      expect(event.args.who).to.equal(f.swapper.address)
      expect(event.args.assetIn).to.equal(f.KISS.address)
      expect(event.args.assetOut).to.equal(f.KrAsset2.address)
      expect(event.args.amountIn).to.equal(swapAmount)
      expect(event.args.amountOut).to.equal(expectedAmountOut)

      const prices = hre.viewData()
      const [KR2Balance, KISSBalance, swapperInfos, assetInfos, { scdp }] = await Promise.all([
        f.KrAsset2.balanceOf(f.swapper.address),
        f.KISS.balanceOf(f.swapper.address),
        hre.Diamond.viewSCDPAccounts(prices, [f.swapper.address], [f.KrAsset2.address, f.KISS.address]),
        hre.Diamond.viewSCDPAssets(prices, [f.KrAsset2.address, f.KISS.address]),
        hre.Diamond.viewProtocolData(prices),
      ])
      const swapperInfo = swapperInfos[0]
      expect(KR2Balance).to.equal(expectedAmountOut)
      expect(KISSBalance).to.equal(toBig(10_000).sub(swapAmount))

      expect(swapperInfo.deposits[0].val).to.equal(0)
      expect(swapperInfo.deposits[1].val).to.equal(0)

      expect(assetInfos[0].amountDebt).to.equal(expectedAmountOut)
      expect(assetInfos[1].amountSwapDeposit).to.equal(kissInAfterFees)

      const expectedDepositValue = toBig(depositAmount, 8).add(kissInAfterFees.wadMul(f.KISSPrice))
      expect(assetInfos[1].valColl).to.equal(expectedDepositValue)
      expect(assetInfos[0].valDebt).to.equal(expectedAmountOut.wadMul(f.KrAsset2Price))

      expect(scdp.totals.valColl).to.equal(expectedDepositValue)
      expect(scdp.totals.valDebt).to.equal(expectedAmountOut.wadMul(f.KrAsset2Price))
      expect(scdp.totals.cr).to.equal(expectedDepositValue.percentDiv(expectedAmountOut.wadMul(f.KrAsset2Price)))
    })

    it('should be able to swap, shared debt == assetsIn | swap collateral == assetsOut', async function () {
      const swapAmount = toBig(100) // $100
      const swapAmountAsset = swapAmount
        .percentMul(1e4 - Number(f.KRASSET_KISS_ROUTE_FEE))
        .wadMul(f.KISSPrice.wadDiv(f.KrAsset2Price))
      const expectedKissOut = swapAmountAsset
        .percentMul(1e4 - f.KRASSET_KISS_ROUTE_FEE)
        .wadMul(f.KrAsset2Price)
        .wadDiv(f.KISSPrice)

      // deposit some to kresko for minting first
      await depositCollateral({
        user: f.swapper,
        asset: f.KISS,
        amount: toBig(100),
      })

      await mintKrAsset({
        user: f.swapper,
        asset: f.KrAsset2,
        amount: toBig(0.1), // min allowed
      })

      const { scdp } = await hre.Diamond.viewProtocolData(hre.viewData())

      expect(scdp.totals.valColl).to.equal(initialDepositValue)

      await f.KreskoSwapper.swapSCDP({
        receiver: f.swapper.address,
        assetIn: f.KISS.address,
        assetOut: f.KrAsset2.address,
        amountIn: swapAmount,
        amountOutMin: 0,
        prices: await hre.updateData(),
      })

      // the swap that clears debt
      const tx = await f.KreskoSwapper.swapSCDP({
        receiver: f.swapper.address,
        assetIn: f.KrAsset2.address,
        assetOut: f.KISS.address,
        amountIn: swapAmountAsset,
        amountOutMin: 0,
        prices: await hre.updateData(),
      })

      const [event, assetInfos] = await Promise.all([
        getNamedEvent<SwapEvent>(tx, 'Swap'),
        hre.Diamond.viewSCDPAssets(hre.viewData(), [f.KISS.address, f.KrAsset2.address]),
      ])

      expect(event.args.who).to.equal(f.swapper.address)
      expect(event.args.assetIn).to.equal(f.KrAsset2.address)
      expect(event.args.assetOut).to.equal(f.KISS.address)
      expect(event.args.amountIn).to.equal(swapAmountAsset)
      expect(event.args.amountOut).to.equal(expectedKissOut)

      expect(assetInfos[0].amountSwapDeposit).to.equal(0)
      expect(assetInfos[0].valColl).to.equal(initialDepositValue)

      expect(assetInfos[1].valDebt).to.equal(0)
      expect(assetInfos[1].amountDebt).to.equal(0)

      const { scdp: scdpAfter } = await hre.Diamond.viewProtocolData(hre.viewData())
      expect(scdpAfter.totals.valColl).to.equal(toBig(1000, 8))
      expect(scdpAfter.totals.valDebt).to.equal(0)
      expect(scdpAfter.totals.cr).to.equal(maxUint256)
    })

    it('should be able to swap, debt > assetsIn | swap deposits > assetsOut', async function () {
      const swapAmount = toBig(1) // $1
      const swapValue = toBig(1, 8)

      await f.KreskoSwapper.swapSCDP({
        receiver: f.swapper.address,
        assetIn: f.KISS.address,
        assetOut: f.KrAsset2.address,
        amountIn: swapAmount,
        amountOutMin: 0,
        prices: await hre.updateData(),
      })

      const [assetInfoKISS] = await hre.Diamond.viewSCDPAssets(hre.viewData(), [f.KISS.address])
      const feeValueFirstSwap = swapValue.percentMul(f.KRASSET_KISS_ROUTE_FEE)
      const valueInAfterFees = swapValue.sub(feeValueFirstSwap)
      expect(assetInfoKISS.valColl).to.equal(depositValue.add(valueInAfterFees))

      const expectedSwapDeposits = valueInAfterFees.num(8).ebn(18)
      expect(assetInfoKISS.amountSwapDeposit).to.equal(expectedSwapDeposits)

      const swapAmountSecond = toBig(0.009) // this is $0.90, so less than $0.96 since we want to ensure debt > assetsIn | swap deposits > assetsOut
      const swapValueSecond = swapAmountSecond.wadMul(f.KrAsset2Price)
      const feeValueSecondSwap = swapValueSecond.sub(swapValueSecond.percentMul(f.KRASSET_KISS_ROUTE_FEE))
      const expectedKissOut = feeValueSecondSwap.wadDiv(f.KISSPrice) // 0.8685

      const tx = await f.KreskoSwapper.swapSCDP({
        receiver: f.swapper.address,
        assetIn: f.KrAsset2.address,
        assetOut: f.KISS.address,
        amountIn: swapAmountSecond,
        amountOutMin: 0,
        prices: await hre.updateData(),
      })

      const event = await getNamedEvent<SwapEvent>(tx, 'Swap')

      expect(event.args.who).to.equal(f.swapper.address)
      expect(event.args.assetIn).to.equal(f.KrAsset2.address)
      expect(event.args.assetOut).to.equal(f.KISS.address)
      expect(event.args.amountIn).to.equal(swapAmountSecond)
      expect(event.args.amountOut).to.equal(expectedKissOut)

      const [depositValueKR2, depositValueKISS, assetInfos, { scdp }] = await Promise.all([
        f.KreskoSwapper.getAccountDepositValueSCDP(f.swapper.address, f.KrAsset2.address),
        f.KreskoSwapper.getAccountDepositValueSCDP(f.swapper.address, f.KISS.address),
        hre.Diamond.viewSCDPAssets(hre.viewData(), [f.KISS.address, f.KrAsset2.address]),
        hre.Diamond.viewProtocolData(hre.viewData()),
      ])

      expect(depositValueKR2).to.equal(0)
      expect(depositValueKISS).to.equal(0)

      const expectedSwapDepositsAfter = expectedSwapDeposits.sub(toBig(0.9))
      const expectedSwapDepositsValue = expectedSwapDepositsAfter.wadMul(assetInfoKISS.price)

      expect(assetInfos[0].amountSwapDeposit).to.equal(expectedSwapDepositsAfter)
      expect(assetInfos[0].valColl).to.equal(toBig(depositAmount, 8).add(expectedSwapDepositsValue))
      expect(assetInfos[1].valDebt).to.equal(expectedSwapDepositsValue)

      const expectedDebtAfter = expectedSwapDepositsValue.wadDiv((await f.KrAsset2.getPrice()).pyth)
      expect(assetInfos[0].amountDebt).to.equal(0)
      expect(assetInfos[1].amountDebt).to.equal(expectedDebtAfter)

      const expectedCollateralValue = expectedSwapDepositsValue.add(depositAmount.ebn(8))
      expect(scdp.totals.valColl).to.equal(expectedCollateralValue) // swap deposits + collateral deposited
      expect(scdp.totals.valDebt).to.equal(expectedSwapDepositsValue) //
      expect(scdp.totals.cr).to.equal(expectedCollateralValue.percentDiv(expectedSwapDepositsValue))
    })

    it('should be able to swap, debt < assetsIn | swap deposits < assetsOut', async function () {
      const swapAmountKiss = toBig(100) // $100
      const swapAmountKrAsset = toBig(2) // $200
      const swapValue = 200
      const firstSwapFeeAmount = swapAmountKiss.percentMul(f.KRASSET_KISS_ROUTE_FEE)
      const expectedKissOutSecondSwap = swapAmountKrAsset
        .sub(swapAmountKrAsset.percentMul(f.KRASSET_KISS_ROUTE_FEE))
        .wadMul(f.KrAsset2Price)
        .wadDiv(f.KISSPrice)
      const krAssetOutFirstSwap = swapAmountKiss.sub(firstSwapFeeAmount).wadMul(f.KISSPrice).wadDiv(f.KrAsset2Price)

      const krAssetOutFirstSwapValue = krAssetOutFirstSwap.wadMul(f.KrAsset2Price)
      // deposit some to kresko for minting first
      await depositCollateral({
        user: f.swapper,
        asset: f.KISS,
        amount: toBig(400),
      })
      const ICDPMintAmount = toBig(1.04)
      await mintKrAsset({
        user: f.swapper,
        asset: f.KrAsset2,
        amount: ICDPMintAmount,
      })

      await f.KreskoSwapper.swapSCDP({
        receiver: f.swapper.address,
        assetIn: f.KISS.address,
        assetOut: f.KrAsset2.address,
        amountIn: swapAmountKiss,
        amountOutMin: 0,
        prices: await hre.updateData(),
      })

      const expectedSwapDeposits = swapAmountKiss.sub(firstSwapFeeAmount)
      const { scdp } = await hre.Diamond.viewProtocolData(hre.viewData())
      expect(await f.KreskoSwapper.getSwapDepositsSCDP(f.KISS.address)).to.equal(expectedSwapDeposits)
      expect(scdp.totals.valColl).to.be.eq(depositAmount.ebn().add(expectedSwapDeposits).wadMul(f.KISSPrice))

      // the swap that matters, here user has 0.96 (previous swap) + 1.04 (mint). expecting 192 kiss from swap.
      const [expectedAmountOut] = await f.KreskoSwapper.previewSwapSCDP(
        f.KrAsset2.address,
        f.KISS.address,
        swapAmountKrAsset,
      )
      expect(expectedAmountOut).to.equal(expectedKissOutSecondSwap)
      const tx = await f.KreskoSwapper.swapSCDP({
        receiver: f.swapper.address,
        assetIn: f.KrAsset2.address,
        assetOut: f.KISS.address,
        amountIn: swapAmountKrAsset,
        amountOutMin: 0,
        prices: await hre.updateData(),
      })

      const event = await getNamedEvent<SwapEvent>(tx, 'Swap')

      expect(event.args.who).to.equal(f.swapper.address)
      expect(event.args.assetIn).to.equal(f.KrAsset2.address)
      expect(event.args.assetOut).to.equal(f.KISS.address)
      expect(event.args.amountIn).to.equal(swapAmountKrAsset)
      expect(event.args.amountOut).to.equal(expectedKissOutSecondSwap)

      const assetInfos = await hre.Diamond.viewSCDPAssets(hre.viewData(), [f.KISS.address, f.KrAsset2.address])
      // f.KISS deposits sent in swap
      const acocuntPrincipalDepositsKISS = await f.KreskoSwapper.getAccountDepositSCDP(
        f.depositor.address,
        f.KISS.address,
      )

      expect(assetInfos[0].amountSwapDeposit).to.equal(0) // half of 2 krAsset
      expect(assetInfos[0].amountColl).to.equal(acocuntPrincipalDepositsKISS)

      // KrAsset debt is cleared
      expect(assetInfos[1].valDebt).to.equal(0)
      expect(assetInfos[1].amountDebt).to.equal(0)

      // KISS debt is issued
      const expectedKissDebtValue = toBig(swapValue, 8).sub(krAssetOutFirstSwapValue)
      expect(assetInfos[0].valDebt).to.equal(expectedKissDebtValue)

      expect(assetInfos[0].amountDebt).to.equal(expectedKissDebtValue.wadDiv(f.KISSPrice))

      // krAsset swap deposits
      const expectedSwapDepositValue = toBig(swapValue, 8).sub(krAssetOutFirstSwapValue)
      expect(assetInfos[1].amountSwapDeposit).to.equal(toBig(2).sub(krAssetOutFirstSwap))
      expect(assetInfos[1].valColl).to.equal(expectedSwapDepositValue) // asset price is $100

      const { scdp: scdpAfter } = await hre.Diamond.viewProtocolData(hre.viewData())
      const expectedCollateralValue = toBig(1000, 8).add(expectedSwapDepositValue)
      expect(scdpAfter.totals.valColl).to.equal(expectedCollateralValue)
      expect(scdpAfter.totals.valDebt).to.equal(expectedKissDebtValue)
      expect(scdpAfter.totals.cr).to.equal(expectedCollateralValue.percentDiv(expectedKissDebtValue))
    })

    it('cumulates fees on swap', async function () {
      const depositAmountNew = toBig(10000 - depositAmount)

      await f.KISS.setBalance(f.depositor, depositAmountNew)
      await f.KreskoDepositor.depositSCDP(
        f.depositor.address,
        f.KISS.address,
        depositAmountNew, // $10k
      )

      const swapAmount = toBig(2600)

      const feesBeforeSwap = await f.KreskoSwapper.getAccountFeesSCDP(f.depositor.address, f.KISS.address)

      await f.KreskoSwapper.swapSCDP({
        receiver: f.swapper.address,
        assetIn: f.KISS.address,
        assetOut: f.KrAsset2.address,
        amountIn: swapAmount,
        amountOutMin: 0,
        prices: await hre.updateData(),
      })

      const feesAfterSwap = await f.KreskoSwapper.getAccountFeesSCDP(f.depositor.address, f.KISS.address)
      expect(feesAfterSwap).to.gt(feesBeforeSwap)

      await f.KreskoSwapper.swapSCDP({
        receiver: f.swapper.address,
        assetIn: f.KrAsset2.address,
        assetOut: f.KISS.address,
        amountIn: f.KrAsset2.balanceOf(f.swapper.address),
        amountOutMin: 0,
        prices: await hre.updateData(),
      })
      const feesAfterSecondSwap = await f.KreskoSwapper.getAccountFeesSCDP(f.depositor.address, f.KISS.address)
      expect(feesAfterSecondSwap).to.gt(feesAfterSwap)

      await f.KreskoDepositor.claimFeesSCDP(f.depositor.address, f.KISS.address, f.depositor.address)

      const [depositsAfter, feesAfter] = await Promise.all([
        f.KreskoSwapper.getAccountDepositSCDP(f.depositor.address, f.KISS.address),
        f.KreskoSwapper.getAccountFeesSCDP(f.depositor.address, f.KISS.address),
      ])

      expect(feesAfter).to.eq(0)

      expect(depositsAfter).to.eq(toBig(10000))

      await f.KreskoDepositor.withdrawSCDP(
        {
          account: f.depositor.address,
          asset: f.KISS.address,
          amount: toBig(10000), // $10k f.KISS
          receiver: f.depositor.address,
        },
        await hre.updateData(),
      )

      const [depositsAfterWithdraw, feesAfterWithdraw] = await Promise.all([
        f.KreskoSwapper.getAccountDepositValueSCDP(f.depositor.address, f.KISS.address),
        f.KreskoSwapper.getAccountFeesSCDP(f.depositor.address, f.KISS.address),
      ])

      expect(depositsAfterWithdraw).to.eq(0)

      expect(feesAfterWithdraw).to.eq(0)
    })
  })
  describe('#Liquidations', () => {
    beforeEach(async function () {
      for (const signer of f.usersArr) {
        await f.Collateral.setBalance(signer, toBig(1_000_000))
      }
      await f.KISS.setBalance(f.swapper, toBig(10_000))
      await f.KISS.setBalance(f.depositor2, toBig(10_000))
      await hre.Diamond.setFeeAssetSCDP(f.Collateral.address)

      await f.KreskoDepositor.depositSCDP(
        f.depositor.address,
        f.Collateral.address,
        depositAmount18Dec, // $10k
      )

      await hre.Diamond.setFeeAssetSCDP(f.Collateral8Dec.address)
      await f.KreskoDepositor.depositSCDP(
        f.depositor.address,
        f.Collateral8Dec.address,
        depositAmount8Dec, // $8k
      )

      await hre.Diamond.setFeeAssetSCDP(f.KISS.address)
      f.KreskoDepositor2.depositSCDP(
        f.depositor2.address,
        f.KISS.address,
        depositAmount18Dec, // $8k
      )
    })
    it('should identify if the pool is not underwater', async function () {
      const swapAmount = toBig(2600) // $1

      await f.KreskoSwapper.swapSCDP({
        receiver: f.swapper.address,
        assetIn: f.KISS.address,
        assetOut: f.KrAsset2.address,
        amountIn: swapAmount,
        amountOutMin: 0,
        prices: await hre.updateData(),
      })

      expect(await hre.Diamond.getLiquidatableSCDP()).to.be.false
    })

    //  test not passing
    it('should revert liquidations if the pool is not underwater', async function () {
      const swapAmount = toBig(2600) // $1

      await f.KreskoSwapper.swapSCDP({
        receiver: f.swapper.address,
        assetIn: f.KISS.address,
        assetOut: f.KrAsset2.address,
        amountIn: swapAmount,
        amountOutMin: 0,
        prices: await hre.updateData(),
      })
      expect(await hre.Diamond.getLiquidatableSCDP()).to.be.false

      await f.KrAsset2.setBalance(hre.users.liquidator, toBig(1_000_000))

      await expect(
        f.KreskoLiquidator.liquidateSCDP(
          {
            repayAsset: f.KrAsset2.address,
            repayAmount: toBig(7.7),
            seizeAsset: f.Collateral8Dec.address,
          },
          await hre.updateData(),
        ),
      ).to.be.revertedWithCustomError(Errors(hre), 'COLLATERAL_VALUE_GREATER_THAN_REQUIRED')
    })

    it('should identify if the pool is underwater', async function () {
      const swapAmount = toBig(2600)

      await f.KreskoSwapper.swapSCDP({
        receiver: f.swapper.address,
        assetIn: f.KISS.address,
        assetOut: f.KrAsset2.address,
        amountIn: swapAmount,
        amountOutMin: 0,
        prices: await hre.updateData(),
      })
      await f.Collateral.setPrice(f.CollateralPrice.num(8) / 1000)
      await f.Collateral8Dec.setPrice(f.CollateralPrice.num(8) / 1000)

      const [{ scdp }, liquidatable] = await Promise.all([
        hre.Diamond.viewProtocolData(hre.viewData()),
        hre.Diamond.getLiquidatableSCDP(),
      ])

      expect(scdp.totals.cr).to.be.lt(scdp.LT)
      expect(liquidatable).to.be.true
    })

    it('should allow liquidating the underwater pool', async function () {
      const swapAmount = toBig(2600)

      await f.KreskoSwapper.swapSCDP({
        receiver: f.swapper.address,
        assetIn: f.KISS.address,
        assetOut: f.KrAsset2.address,
        amountIn: swapAmount,
        amountOutMin: 0,
        prices: await hre.updateData(),
      })
      const newKreskoAssetPrice = 500
      await f.KrAsset2.setPrice(newKreskoAssetPrice)

      const [scdpParams, maxLiquidatable, krAssetPrice, { scdp: scdpBefore }] = await Promise.all([
        hre.Diamond.getParametersSCDP(),
        hre.Diamond.getMaxLiqValueSCDP(f.KrAsset2.address, f.Collateral8Dec.address),
        f.KrAsset2.getPrice(),
        hre.Diamond.viewProtocolData(hre.viewData()),
      ])
      const repayAmount = maxLiquidatable.repayValue.wadDiv(krAssetPrice.pyth)

      await f.KrAsset2.setBalance(hre.users.liquidator, repayAmount.add((1e18).toString()))
      expect(scdpBefore.totals.cr).to.lt(scdpParams.liquidationThreshold)
      expect(scdpBefore.totals.cr).to.gt(1e4)

      // Liquidate the shared CDP
      const tx = await f.KreskoLiquidator.liquidateSCDP(
        {
          repayAsset: f.KrAsset2.address,
          repayAmount,
          seizeAsset: f.Collateral8Dec.address,
        },
        await hre.updateData(),
      )

      // Check the state after liquidation
      const [{ scdp: scdpAfter }, liquidatableAfter] = await Promise.all([
        hre.Diamond.viewProtocolData(hre.viewData()),
        hre.Diamond.getLiquidatableSCDP(),
      ])
      expect(scdpAfter.totals.cr).to.gt(scdpParams.liquidationThreshold)
      expect(scdpAfter.totals.crOgAdj).to.eq(2.01e4)

      expect(liquidatableAfter).to.eq(false)

      // Shared CDP should not be liquidatable since it is above the threshold
      await expect(
        f.KreskoLiquidator.liquidateSCDP(
          {
            repayAsset: f.KrAsset2.address,
            repayAmount,
            seizeAsset: f.Collateral8Dec.address,
          },
          await hre.updateData(),
        ),
      ).to.be.revertedWithCustomError(Errors(hre), 'COLLATERAL_VALUE_GREATER_THAN_REQUIRED')

      // Check what was emitted in the event
      const event = await getNamedEvent<SCDPLiquidationOccuredEvent>(tx, 'SCDPLiquidationOccured')
      const expectedSeizeAmount = repayAmount
        .wadMul(toBig(newKreskoAssetPrice, 8))
        .percentMul(1.05e4)
        .wadDiv(f.CollateralPrice)
        .div(10 ** 10)

      expect(event.args.liquidator).to.eq(hre.users.liquidator.address)
      expect(event.args.seizeAmount).to.eq(expectedSeizeAmount)
      expect(event.args.repayAmount).to.eq(repayAmount)
      expect(event.args.seizeCollateral).to.eq(f.Collateral8Dec.address)
      expect(event.args.repayKreskoAsset).to.eq(f.KrAsset2.address)

      // Check account state changes
      const expectedDepositsAfter = depositAmount8Dec.sub(event.args.seizeAmount)
      expect(expectedDepositsAfter).to.be.lt(depositAmount8Dec)

      const [principalDeposits, fees, params] = await Promise.all([
        hre.Diamond.getAccountDepositSCDP(f.depositor.address, f.Collateral8Dec.address),
        hre.Diamond.getAccountFeesSCDP(f.depositor.address, f.Collateral8Dec.address),
        hre.Diamond.getParametersSCDP(),
      ])
      expect(principalDeposits).to.eq(expectedDepositsAfter)
      expect(fees).to.eq(0)

      // Sanity checking that users should be able to withdraw what is left
      await hre.Diamond.setFeeAssetSCDP(f.Collateral.address)
      await f.KreskoDepositor.depositSCDP(f.depositor.address, f.Collateral.address, depositAmount18Dec.mul(10))
      const { scdp } = await hre.Diamond.viewProtocolData(hre.viewData())
      expect(scdp.totals.cr).to.gt(params.minCollateralRatio)
      await expect(
        f.KreskoDepositor.withdrawSCDP(
          {
            account: f.depositor.address,
            asset: f.Collateral8Dec.address,
            amount: expectedDepositsAfter,
            receiver: f.depositor.address,
          },
          await hre.updateData(),
        ),
      ).to.not.be.reverted
      const [principalEnd, feesAfter] = await Promise.all([
        hre.Diamond.getAccountDepositSCDP(f.depositor.address, f.Collateral8Dec.address),
        hre.Diamond.getAccountFeesSCDP(f.depositor.address, f.Collateral8Dec.address),
      ])
      expect(principalEnd).to.eq(0)
      expect(feesAfter).to.eq(0)
    })
  })
  describe('#Error', () => {
    beforeEach(async function () {
      await Promise.all(f.usersArr.map(signer => f.Collateral.setBalance(signer, toBig(1_000_000))))
      await f.KISS.setBalance(f.swapper, toBig(10_000))
      await f.KISS.setBalance(f.depositor, hre.ethers.BigNumber.from(1))

      await hre.Diamond.setFeeAssetSCDP(f.Collateral.address)
      await f.KreskoDepositor.depositSCDP(
        f.depositor.address,
        f.Collateral.address,
        depositAmount18Dec, // $10k
      )
      await hre.Diamond.setFeeAssetSCDP(f.KISS.address)
      await f.KreskoDepositor.depositSCDP(f.depositor.address, f.KISS.address, 1)
    })
    it('should revert depositing unsupported tokens', async function () {
      const [UnsupportedToken] = await hre.deploy('MockERC20', {
        args: ['UnsupportedToken', 'UnsupportedToken', 18, toBig(1)],
      })
      await UnsupportedToken.approve(hre.Diamond.address, hre.ethers.constants.MaxUint256)
      const { deployer } = await hre.getNamedAccounts()
      await expect(hre.Diamond.depositSCDP(deployer, UnsupportedToken.address, 1))
        .to.be.revertedWithCustomError(Errors(hre), 'ASSET_NOT_FEE_ACCUMULATING_ASSET')
        .withArgs(['UnsupportedToken', UnsupportedToken.address])
    })
    it('should revert withdrawing without deposits', async function () {
      const withdrawAmount = 1
      await expect(
        f.KreskoSwapper.withdrawSCDP(
          {
            account: f.swapper.address,
            asset: f.Collateral.address,
            amount: withdrawAmount,
            receiver: f.swapper.address,
          },
          await hre.updateData(),
        ),
      )
        .to.be.revertedWithCustomError(Errors(hre), 'ACCOUNT_HAS_NO_DEPOSITS')
        .withArgs(f.swapper.address, f.Collateral.errorId)
    })

    it('should revert withdrawals below MCR', async function () {
      const swapAmount = toBig(1000) // $1000
      await f.KreskoSwapper.swapSCDP({
        receiver: f.swapper.address,
        assetIn: f.KISS.address,
        assetOut: f.KrAsset2.address,
        amountIn: swapAmount,
        amountOutMin: 0,
        prices: await hre.updateData(),
      }) // generates the debt
      const deposits = await f.KreskoSwapper.getAccountDepositSCDP(f.depositor.address, f.Collateral.address)
      await expect(
        f.KreskoDepositor.withdrawSCDP(
          {
            account: f.depositor.address,
            asset: f.Collateral.address,
            amount: deposits,
            receiver: f.depositor.address,
          },
          await hre.updateData(),
        ),
      )
        .to.be.revertedWithCustomError(Errors(hre), 'COLLATERAL_VALUE_LESS_THAN_REQUIRED')
        .withArgs(960e8, 4800e8, 5e4)
    })

    it('should revert withdrawals of swap owned collateral deposits', async function () {
      const swapAmount = toBig(1)
      await f.KrAsset2.setBalance(f.swapper, swapAmount)

      await f.KreskoSwapper.swapSCDP({
        receiver: f.swapper.address,
        assetIn: f.KrAsset2.address,
        assetOut: f.KISS.address,
        amountIn: swapAmount,
        amountOutMin: 0,
        prices: await hre.updateData(),
      })
      const deposits = await f.KreskoSwapper.getSwapDepositsSCDP(f.KrAsset2.address)
      expect(deposits).to.be.gt(0)
      await expect(
        f.KreskoSwapper.withdrawSCDP(
          { account: f.swapper.address, asset: f.KrAsset2.address, amount: deposits, receiver: f.depositor.address },
          await hre.updateData(),
        ),
      )
        .to.be.revertedWithCustomError(Errors(hre), 'ASSET_DOES_NOT_HAVE_DEPOSITS')
        .withArgs(f.KrAsset2.errorId)
    })

    it('should revert swapping with price below minAmountOut', async function () {
      const swapAmount = toBig(1)
      await f.KrAsset2.setBalance(f.swapper, swapAmount)
      const [amountOut] = await f.KreskoSwapper.previewSwapSCDP(f.KrAsset2.address, f.KISS.address, swapAmount)
      await expect(
        f.KreskoSwapper.swapSCDP({
          receiver: f.swapper.address,
          assetIn: f.KrAsset2.address,
          assetOut: f.KISS.address,
          amountIn: swapAmount,
          amountOutMin: amountOut.add(1),
          prices: await hre.updateData(),
        }),
      )
        .to.be.revertedWithCustomError(Errors(hre), 'RECEIVED_LESS_THAN_DESIRED')
        .withArgs(f.KISS.errorId, amountOut, amountOut.add(1))
    })

    it('should revert swapping unsupported asset', async function () {
      const swapAmount = toBig(1)
      await f.KrAsset2.setBalance(f.swapper, swapAmount)

      await expect(
        f.KreskoSwapper.swapSCDP({
          receiver: f.swapper.address,
          assetIn: f.KrAsset2.address,
          assetOut: f.Collateral.address,
          amountIn: swapAmount,
          amountOutMin: 0,
          prices: await hre.updateData(),
        }),
      )
        .to.be.revertedWithCustomError(Errors(hre), 'SWAP_ROUTE_NOT_ENABLED')
        .withArgs(f.KrAsset2.errorId, f.Collateral.errorId)
    })
    it('should revert swapping a disabled route', async function () {
      const swapAmount = toBig(1)
      await f.KrAsset2.setBalance(f.swapper, swapAmount)

      await hre.Diamond.setSingleSwapRouteSCDP({
        assetIn: f.KrAsset2.address,
        assetOut: f.KISS.address,
        enabled: false,
      })
      await expect(
        f.KreskoSwapper.swapSCDP({
          receiver: f.swapper.address,
          assetIn: f.KrAsset2.address,
          assetOut: f.KISS.address,
          amountIn: swapAmount,
          amountOutMin: 0,
          prices: await hre.updateData(),
        }),
      )
        .to.be.revertedWithCustomError(Errors(hre), 'SWAP_ROUTE_NOT_ENABLED')
        .withArgs(f.KrAsset2.errorId, f.KISS.errorId)
    })
    it('should revert swapping causes CDP to go below MCR', async function () {
      const swapAmount = toBig(1_500_000)
      await f.KrAsset2.setBalance(f.swapper, swapAmount)
      const tx = f.KreskoSwapper.swapSCDP({
        receiver: f.swapper.address,
        assetIn: f.KrAsset2.address,
        assetOut: f.KISS.address,
        amountIn: swapAmount,
        amountOutMin: 0,
        prices: await hre.updateData(),
      })
      await expect(tx)
        .to.be.revertedWithCustomError(Errors(hre), 'COLLATERAL_VALUE_LESS_THAN_REQUIRED')
        .withArgs('15001000000000000', '75000000000000000', 5e4)
    })
  })
})
