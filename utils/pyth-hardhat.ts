

export async function getPayloadHardhat(assets: any[]) {
  if (assets.length === 0) {
    throw new Error('You have to provide at least one asset from hardhat config')
  }
  const ids = assets.filter(a => a.pyth.id).map(a => a.pyth.id)

  // const assetPrices = testnetConfigs[hre.network.name].assets.map(a => a?.price || 1e8)
  const query = ids.reduce((res, pythId) => {
    if (!pythId) throw new Error(`Asset not found: ${pythId}`)

    return res.concat(`&ids[]=${pythId}`)
  }, '')

  const response = await fetch(`https://hermes.pyth.network/api/latest_price_feeds?${query.slice(1)}&binary=true`)
  const data = await response.json()
  return data.map(({ vaa }: any) => `0x${Buffer.from(vaa, 'base64').toString('hex')}`)
}
