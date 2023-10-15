import type { KreskoAssetAnchor } from '@/types/typechain';
import { getDeploymentUsers, type AllTokenSymbols } from '@config/deploy';
import { getAnchorNameAndSymbol } from '@utils/strings';

export async function createKrAsset<T extends AllTokenSymbols>(
  symbol: T,
  name: string,
  decimals = 18,
  underlyingToken: string,
  feeRecipient = hre.users.treasury.address,
  openFee = 0,
  closeFee = 0,
): Promise<{ KreskoAsset: KreskoAsset; KreskoAssetAnchor: KreskoAssetAnchor }> {
  const { deployer } = await hre.ethers.getNamedSigners();
  const { admin } = await getDeploymentUsers(hre);

  const { anchorName, anchorSymbol } = getAnchorNameAndSymbol(symbol, name);

  const Kresko = await hre.getContractOrFork('Kresko');
  const kreskoAssetInitArgs = [
    name,
    symbol,
    decimals,
    admin,
    Kresko.address,
    underlyingToken,
    feeRecipient,
    openFee,
    closeFee,
  ];

  const [KreskoAsset] = await hre.deploy('KreskoAsset', {
    from: deployer.address,
    log: true,
    deploymentName: symbol,
    proxy: {
      owner: deployer.address,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: kreskoAssetInitArgs,
      },
    },
  });

  const kreskoAssetAnchorInitArgs = [KreskoAsset.address, anchorName, anchorSymbol, admin];

  const [KreskoAssetAnchor] = await hre.deploy('KreskoAssetAnchor', {
    from: deployer.address,
    log: true,
    deploymentName: anchorSymbol,
    args: [KreskoAsset.address],
    proxy: {
      owner: deployer.address,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: kreskoAssetAnchorInitArgs,
      },
    },
  });

  return {
    KreskoAsset,
    KreskoAssetAnchor,
  };
}
