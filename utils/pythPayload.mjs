import { encodeAbiParameters, parseAbiParameters } from 'viem'

const ids = process.argv.slice(2)

if (ids.length === 0) {
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

const params = parseAbiParameters([
  'bytes32[] ids, Price[] prices',
  'struct Price { int64 price; uint64 conf; int32 exp; uint256 timestamp; }',
])

const getPrices = async () => {
  const query = ids.reduce((res, f) => res.concat(`&ids[]=${f}`), '')
  const response = await fetch(`https://hermes.pyth.network/api/latest_price_feeds?${query.slice(1)}`)
  const data = await response.json()

  return encodeAbiParameters(params, [data.map(({ id }) => `0x${id}`), data.map(({ price }) => Object.values(price))])
}

getPrices()
  .then(res => {
    success(res)
  })
  .catch(e => {
    error(e.message)
  })
