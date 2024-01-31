import { encodeAbiParameters, parseAbiParameters } from 'viem'
import PYTH_STABLE from './pyth_stable_ids.json' assert { type: 'json' }

const isString = !process.argv[2].startsWith('0x')
const assets = isString ? process.argv[2].split(',') : process.argv.slice(2)

if (assets.length === 0) {
  error('You have to provide at least one feed')
}

const success = str => {
  process.stdout.write(Buffer.from(str).toString('utf-8'))
  process.exit(0)
}

const error = str => {
  process.stderr.write(Buffer.from(str).toString('utf-8'))
  process.exit(1)
}

const outputParams = parseAbiParameters([
  'bytes32[] ids, bytes[] updatedatas, Price[] prices',
  'struct Price { int64 price; uint64 conf; int32 exp; uint256 timestamp; }',
])

const getPrices = async () => {
  const query = assets.reduce((res, asset) => {
    const id = !isString ? asset : PYTH_STABLE[asset.toUpperCase()]
    if (!id) error(`Asset ${asset} not found`)

    return res.concat(`&ids[]=${id}`)
  }, '')

  const response = await fetch(`https://hermes.pyth.network/api/latest_price_feeds?${query.slice(1)}&binary=true`)
  const data = await response.json()
  return encodeAbiParameters(outputParams, [
    data.map(({ id }) => `0x${id}`),
    data.map(({ vaa }) => `0x${Buffer.from(vaa, 'base64').toString('hex')}`),
    data.map(({ price }) => Object.values(price)),
  ])
}

getPrices()
  .then(res => {
    success(res)
  })
  .catch(e => {
    error(e.message)
  })
