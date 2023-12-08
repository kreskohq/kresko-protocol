import { type KreskoAssetAnchor } from '@/types/typechain'
import { type AllTokenSymbols, getDeploymentUsers } from '@config/hardhat/deploy'
import { getAnchorNameAndSymbol } from '@utils/strings'

export async function createKrAsset<T extends AllTokenSymbols>(
  symbol: T,
  name: string,
  decimals: number,
  underlyingToken: string,
  feeRecipient = hre.users.treasury.address,
  openFee = 0,
  closeFee = 0,
): Promise<{ KreskoAsset: KreskoAsset; KreskoAssetAnchor: KreskoAssetAnchor }> {
  const { deployer } = await hre.ethers.getNamedSigners()
  const { admin } = await getDeploymentUsers(hre)

  const Kresko = await hre.getContractOrFork('Kresko')

  if (symbol === 'KISS') throw new Error('KISS cannot be created through createKrAsset')

  if (!hre.DeploymentFactory) {
    ;[hre.DeploymentFactory] = await hre.deploy('DeploymentFactory', {
      args: [deployer.address],
    })
  }

  const { anchorName, anchorSymbol } = getAnchorNameAndSymbol(symbol, name)
  const exists = await hre.getContractOrNull('KreskoAsset', symbol)
  if (exists) {
    const anchor = await hre.getContractOrNull('KreskoAssetAnchor', anchorSymbol)
    if (anchor == null) new Error(`Anchor ${anchorSymbol} not found`)
    return {
      KreskoAsset: exists,
      KreskoAssetAnchor: anchor!,
    }
  }
  const preparedKrAsset = await hre.prepareProxy('KreskoAsset', {
    deploymentName: symbol,
    initializer: 'initialize',
    initializerArgs: [name, symbol, decimals, admin, Kresko.address, underlyingToken, feeRecipient, openFee, closeFee],
    type: 'create3',
    salt: symbol + anchorSymbol,
    from: deployer.address,
  })
  const preparedAnchor = await hre.prepareProxy('KreskoAssetAnchor', {
    initializer: 'initialize',
    deploymentName: anchorSymbol,
    constructorArgs: [preparedKrAsset.proxyAddress],
    initializerArgs: [preparedKrAsset.proxyAddress, anchorName, anchorSymbol, admin],
    type: 'create3',
    salt: anchorSymbol + symbol,
    from: deployer.address,
  })

  const [[KreskoAsset], [KreskoAssetAnchor]] = await hre.deployProxyBatch([preparedKrAsset, preparedAnchor] as const, {
    log: true,
  })

  return {
    KreskoAsset,
    KreskoAssetAnchor,
  }
}
