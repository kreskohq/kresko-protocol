import { getPublicClientRs } from '@kreskolabs/viem-redstone-connector'
import { http } from 'viem'
import { arbitrumSepolia } from 'viem/chains'

const success = str => {
  process.stdout.write(Buffer.from(str).toString('utf-8'))
  process.exit(0)
}

const error = str => {
  process.stderr.write(Buffer.from(str).toString('utf-8'))
  process.exit(1)
}

const demoDataServiceConfig = {
  dataServiceId: 'redstone-main-demo',
  uniqueSignersCount: 1, // 1 for demo purposes
  urls: ['https://d33trozg86ya9x.cloudfront.net'],
  dataFeeds: ['DAI', 'USDC', 'BTC', 'ETH', 'ARB', 'SPY'],
}

const client = getPublicClientRs(
  {
    chain: arbitrumSepolia,
    transport: http('https://arbitrum-goerli.public.blastapi.io'),
  },
  demoDataServiceConfig,
)

const payload = await client.rs.getPayload()

success(payload)
