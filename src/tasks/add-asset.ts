import { getLogger } from '@utils/logging'
import { getAnchorNameAndSymbol } from '@utils/strings'
import { getAssetConfig } from '@utils/test/helpers/general'
import { task, types } from 'hardhat/config'

import type { AssetArgs } from '@/types'
import type { KISS, MockERC20 } from '@/types/typechain'
import { TestTickers } from '@utils/test/helpers/oracle'
import { zeroAddress } from 'viem'
import { TASK_ADD_ASSET } from './names'

type AddAssetArgs = {
  address: string
  assetConfig: AssetArgs
  log: boolean
}

const logger = getLogger(TASK_ADD_ASSET)
task(TASK_ADD_ASSET)
  .addParam('address', 'address of the asset', zeroAddress, types.string)
  .addParam('assetConfig', 'configuration for the asset', '', types.json)
  .setAction(async function (taskArgs: AddAssetArgs, hre) {
    const { address } = taskArgs
    if (!taskArgs.assetConfig?.feed) throw new Error('Asset config is empty')

    const config = taskArgs.assetConfig
    if (!config.feed || config.feed === zeroAddress) {
      throw new Error(`Invalid feed address: ${config.feed}, Asset: ${config.symbol}`)
    }
    if (address == zeroAddress) {
      throw new Error(`Invalid address: ${address}, Asset: ${config.symbol}`)
    }
    const isMinterMintable = config.krAssetConfig || config.scdpKrAssetConfig
    const isMinterCollateral = config.collateralConfig
    const isSCDPDepositable = config.scdpDepositConfig
    const isKISS = config.symbol === 'KISS'

    if (isKISS && hre.KISS?.address != null) {
      throw new Error('Adding KISS but it exists')
    }

    if (!isMinterMintable && !isMinterCollateral && !isSCDPDepositable) {
      throw new Error(`Asset has no identity: ${config.symbol}`)
    }
    if (isMinterMintable && hre.krAssets.find(c => c.address === address)?.address) {
      throw new Error(`Adding an asset that is KrAsset but it already exists: ${config.symbol}`)
    }

    if (isMinterCollateral && hre.extAssets.find(c => c.address === address)?.address) {
      throw new Error(`Adding asset that is collateral but it already exists: ${config.symbol}`)
    }

    if (isMinterMintable && config.krAssetConfig?.kFactor === 0) {
      throw new Error(`Invalid kFactor for ${config.symbol}`)
    }
    if (isMinterCollateral && config.collateralConfig?.cFactor === 0) {
      throw new Error(`Invalid cFactor for ${config.symbol}`)
    }
    const pythId = TestTickers[config.ticker as keyof typeof TestTickers]
    if (!pythId) throw new Error(`Pyth id not found for: ${config.symbol}`)

    const Kresko = await hre.getContractOrFork('Kresko')
    const Asset = isKISS
      ? await hre.getContractOrFork('KISS')
      : isMinterMintable
      ? await hre.getContractOrFork('KreskoAsset', config.symbol)
      : await hre.getContractOrFork('MockERC20', config.symbol)

    const assetInfo = await Kresko.getAsset(Asset.address)
    const exists = assetInfo.decimals != 0
    const asset: TestAsset<typeof Asset> = {
      ticker: config.ticker,
      address: Asset.address,
      isMocked: false,
      // @ts-expect-error
      config: {
        args: config,
      },
      balanceOf: acc => Asset.balanceOf(typeof acc === 'string' ? acc : acc.address),
      contract: Asset,
      assetInfo: () => Kresko.getAsset(Asset.address),
      priceFeed: await hre.ethers.getContractAt('MockOracle', config.feed),
    }

    const { anchorSymbol } = getAnchorNameAndSymbol(config.symbol, config.name)
    if (exists) {
      logger.warn(`Asset ${config.symbol} already exists, skipping..`)
    } else {
      const anchor = isKISS
        ? await hre.ethers.getContractAt('KreskoAssetAnchor', Asset.address)
        : await hre.getContractOrNull('KreskoAssetAnchor', anchorSymbol)

      if (config.krAssetConfig) {
        if (!anchor) {
          throw new Error(`Add asset failed because no anchor exist (${config.symbol})`)
        }
        config.krAssetConfig!.anchor = anchor.address
        asset.anchor = anchor
        asset.isMinterMintable = true
      }

      if (config.scdpKrAssetConfig) {
        if (!anchor) {
          throw new Error(`Add asset failed because no anchor exist (${config.symbol})`)
        }
        config.krAssetConfig!.anchor = anchor.address
        asset.anchor = anchor
        asset.isMinterMintable = true
      }

      logger.log(`Adding asset to protocol ${config.symbol}`)

      const parsedConfig = await getAssetConfig(Asset, config)

      asset.config.assetStruct = parsedConfig.assetStruct
      asset.config.feedConfig = parsedConfig.feedConfig
      asset.config.extendedInfo = parsedConfig.extendedInfo
      const tx = await Kresko.addAsset(Asset.address, parsedConfig.assetStruct, parsedConfig.feedConfig)
      logger.success('Transaction hash: ', tx.hash)
      logger.success(`Succesfully added asset: ${config.symbol}`)
    }

    if (isKISS) {
      hre.KISS = asset as TestAsset<KISS>
      return asset
    }
    if (asset.anchor != null) {
      hre.krAssets.push(asset as TestAsset<KreskoAsset, any>)
    } else if (asset.config.assetStruct.isMinterCollateral) {
      hre.extAssets.push(asset as TestAsset<MockERC20, any>)
    }
    return asset
  })
