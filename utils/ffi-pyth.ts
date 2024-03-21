import { encodeAbiParameters, parseAbiParameters } from 'viem'
import { error } from './ffi-shared'
import PYTH_STABLE from './pyth_stable_ids.json'

type PYTH_IDS = keyof typeof PYTH_STABLE
const outputParams = parseAbiParameters([
  'bytes32[] ids, bytes[] updatedatas, Price[] prices',
  'struct Price { int64 price; uint64 conf; int32 exp; uint256 timestamp; }',
])

export async function getPythPrices(assets?: any[], isString?: boolean) {
  const items = process.argv[3]
  const isPythIds = items.startsWith('0x')
  isString = isString || !isPythIds

  if (!assets?.length) {
    assets = isPythIds ? process.argv.slice(3) : items.split(',')
    if (assets.length === 0) error('You have to provide at least one feed')
  }
  console.log('assets', assets)
  const query = assets.reduce((res, asset: PYTH_IDS) => {
    const id = !isString ? asset : PYTH_STABLE[asset]
    if (!id) error(`Asset ${asset} not found`)

    return res.concat(`&ids[]=${id}`)
  }, '')

  const data: any = await fetch(
    `https://hermes.pyth.network/v2/updates/price/latest?${query.slice(1)}&binary=true`,
  ).then(r => r.json())

  return encodeAbiParameters(outputParams, [
    data.parsed.map(({ id }: any) => `0x${id}`),
    data.binary.data.map((d: any) => `0x${d}`),
    data.parsed.map(({ price }: any) => Object.values(price)),
  ])
}

export async function getPayloadHardhat(assets: any[]) {
  if (assets.length === 0) {
    error('You have to provide at least one asset from hardhat config')
  }
  const ids = assets.filter(a => a.pyth.id).map(a => a.pyth.id)

  // const assetPrices = testnetConfigs[hre.network.name].assets.map(a => a?.price || 1e8)
  const query = ids.reduce((res, pythId) => {
    if (!pythId) error(`Asset not found: ${pythId}`)

    return res.concat(`&ids[]=${pythId}`)
  }, '')

  const response = await fetch(`https://hermes.pyth.network/api/latest_price_feeds?${query.slice(1)}&binary=true`)
  const data = await response.json()
  return data.map(({ vaa }: any) => `0x${Buffer.from(vaa, 'base64').toString('hex')}`)
}
