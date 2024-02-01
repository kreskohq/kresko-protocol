import { expect } from '@test/chai'
import { type DefaultFixture, defaultFixture } from '@utils/test/fixtures'

import type { KrAssetConfig } from '@/types'
import type { AssetStruct } from '@/types/typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko'
import { addMockExtAsset } from '@utils/test/helpers/collaterals'
import { getAssetConfig } from '@utils/test/helpers/general'
import { addMockKreskoAsset } from '@utils/test/helpers/krassets'
import { createOracles } from '@utils/test/helpers/oracle'
import { testCollateralConfig, testKrAssetConfig, testMinterParams } from '@utils/test/mocks'
import { fromBig, toBig } from '@utils/values'

describe('Minter - Configuration', function () {
  let f: DefaultFixture
  this.slow(1000)

  this.beforeEach(async function () {
    f = await defaultFixture()
  })

  describe('#configuration', () => {
    it('can modify all parameters', async function () {
      const update = testMinterParams(hre.users.treasury.address)
      await expect(hre.Diamond.setMinCollateralRatioMinter(update.minCollateralRatio)).to.not.be.reverted
      await expect(hre.Diamond.setLiquidationThresholdMinter(update.liquidationThreshold)).to.not.be.reverted
      await expect(hre.Diamond.setMaxLiquidationRatioMinter(update.maxLiquidationRatio)).to.not.be.reverted

      const params = await hre.Diamond.getParametersMinter()

      expect(update.minCollateralRatio).to.equal(params.minCollateralRatio)
      expect(update.maxLiquidationRatio).to.equal(params.maxLiquidationRatio)
      expect(update.liquidationThreshold).to.equal(params.liquidationThreshold)
    })

    it('can add a collateral asset', async function () {
      const { contract } = await addMockExtAsset(testCollateralConfig)
      expect(await hre.Diamond.getCollateralExists(contract.address)).to.equal(true)
      const priceOfOne = await hre.Diamond.getValue(contract.address, toBig(1))
      expect(Number(priceOfOne)).to.equal(toBig(testCollateralConfig.price!, 8))
    })

    it('can add a kresko asset', async function () {
      const { contract, assetInfo } = await addMockKreskoAsset({
        ...testKrAssetConfig,
        name: 'Kresko Asset: 5',
        symbol: 'KrAsset5',
        ticker: 'KrAsset5',
      })

      const values = await assetInfo()
      const kreskoPriceAnswer = fromBig(await hre.Diamond.getValue(contract.address, toBig(1)), 8)
      const config = testKrAssetConfig.krAssetConfig!

      expect(values.isMinterMintable).to.equal(true)
      expect(values.kFactor).to.equal(config.kFactor)
      expect(kreskoPriceAnswer).to.equal(testKrAssetConfig.price)
      expect(values.maxDebtMinter).to.equal(config.maxDebtMinter)
      expect(values.closeFee).to.equal(config.closeFee)
      expect(values.openFee).to.equal(config.openFee)
    })

    it('can update default oracle precision decimals', async function () {
      const decimals = 8
      await hre.Diamond.setDefaultOraclePrecision(decimals)
      expect(await hre.Diamond.getDefaultOraclePrecision()).to.equal(decimals)
    })

    it('can update minter max liquidation ratio', async function () {
      const currentMLM = await hre.Diamond.getMaxLiquidationRatioMinter()
      const newMLR = 1.42e4

      expect(currentMLM).to.not.eq(newMLR)

      await expect(hre.Diamond.setMaxLiquidationRatioMinter(newMLR)).to.not.be.reverted
      expect(await hre.Diamond.getMaxLiquidationRatioMinter()).to.eq(newMLR)
    })

    it('can update global oracle deviation pct', async function () {
      const currentDeviationPct = await hre.Diamond.getOracleDeviationPct()
      const newDeviationPct = 0.03e4

      expect(currentDeviationPct).to.not.equal(newDeviationPct)

      await expect(hre.Diamond.setMaxPriceDeviationPct(newDeviationPct)).to.not.be.reverted
      expect(await hre.Diamond.getOracleDeviationPct()).to.equal(newDeviationPct)
    })

    it('can update kFactor of a kresko asset', async function () {
      const oldRatio = (await hre.Diamond.getAsset(f.KrAsset.address)).kFactor
      const newRatio = 1.2e4

      expect(oldRatio === newRatio).to.be.false

      await expect(hre.Diamond.setAssetKFactor(f.KrAsset.address, newRatio)).to.not.be.reverted
      expect((await hre.Diamond.getAsset(f.KrAsset.address)).kFactor === newRatio).to.be.true
    })
    it('can update cFactor of a collateral asset', async function () {
      const oldRatio = (await hre.Diamond.getAsset(f.Collateral.address)).factor
      const newRatio = 0.9e4
      expect(oldRatio === newRatio).to.be.false
      await expect(hre.Diamond.setAssetCFactor(f.Collateral.address, newRatio)).to.not.be.reverted
      expect((await hre.Diamond.getAsset(f.Collateral.address)).factor === newRatio).to.be.true
    })

    it('can update configuration of an asset', async function () {
      const oracleAnswer = fromBig((await f.KrAsset.priceFeed.latestRoundData())[1], 8)
      const priceOfOne = fromBig(await hre.Diamond.getValue(f.KrAsset.address, toBig(1)), 8)

      expect(oracleAnswer).to.equal(priceOfOne)
      expect(oracleAnswer).to.equal(testKrAssetConfig.price)

      const update: KrAssetConfig = {
        kFactor: 1.2e4,
        maxDebtMinter: toBig(12000),
        closeFee: 0.03e4,
        openFee: 0.03e4,
        anchor: f.KrAsset.anchor.address,
      }
      const FakeFeed = await createOracles(hre, f.KrAsset.pythId.toString(), 20)
      const newConfig = await getAssetConfig(f.KrAsset.contract, {
        ...testKrAssetConfig,
        feed: FakeFeed.address,
        price: 20,
        krAssetConfig: update,
      })

      await hre.Diamond.setFeedsForTicker(newConfig.assetStruct.ticker, newConfig.feedConfig)
      await hre.Diamond.connect(hre.users.deployer).updateAsset(f.KrAsset.address, newConfig.assetStruct)

      const newValues = await hre.Diamond.getAsset(f.KrAsset.address)
      const updatedOracleAnswer = fromBig((await FakeFeed.latestRoundData())[1], 8)
      const newPriceOfOne = fromBig(await hre.Diamond.getValue(f.KrAsset.address, toBig(1)), 8)

      expect(newValues.isMinterMintable).to.equal(true)
      expect(newValues.isMinterCollateral).to.equal(false)
      expect(newValues.kFactor).to.equal(update.kFactor)
      expect(newValues.maxDebtMinter).to.equal(update.maxDebtMinter)

      expect(updatedOracleAnswer).to.equal(newPriceOfOne)
      expect(updatedOracleAnswer).to.equal(20)

      const update2: AssetStruct = {
        ...(await hre.Diamond.getAsset(f.KrAsset.address)),
        kFactor: 1.75e4,
        maxDebtMinter: toBig(12000),
        closeFee: 0.052e4,
        openFee: 0.052e4,
        isSwapMintable: true,
        swapInFeeSCDP: 0.052e4,
        liqIncentiveSCDP: 1.1e4,
        anchor: f.KrAsset.anchor.address,
      }

      await hre.Diamond.updateAsset(f.KrAsset.address, update2)

      const newValues2 = await hre.Diamond.getAsset(f.KrAsset.address)
      expect(newValues2.isMinterMintable).to.equal(true)
      expect(newValues2.isSharedOrSwappedCollateral).to.equal(true)
      expect(newValues2.isSwapMintable).to.equal(true)
      expect(newValues2.isMinterCollateral).to.equal(false)
      expect(newValues2.isSharedCollateral).to.equal(false)
      expect(newValues2.isCoverAsset).to.equal(false)
      expect(newValues2.kFactor).to.equal(update2.kFactor)
      expect(newValues2.openFee).to.equal(update2.closeFee)
      expect(newValues2.closeFee).to.equal(update2.openFee)
      expect(newValues2.swapInFeeSCDP).to.equal(update2.swapInFeeSCDP)
      expect(newValues2.maxDebtMinter).to.equal(update2.maxDebtMinter)
    })
  })
})
