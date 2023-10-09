import { Role } from '@utils/test/roles';
import { AllTokenSymbols, getDeploymentUsers } from '@config/deploy';
import { getAnchorNameAndSymbol } from '@utils/strings';
import { KreskoAssetAnchor } from '@/types/typechain';
import { ZERO_ADDRESS } from '@kreskolabs/lib';

export async function createKrAsset<T extends AllTokenSymbols>(
  symbol: T,
  name: string,
  decimals = 18,
  underlying: string,
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
    underlying,
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

  await KreskoAsset.grantRole(Role.OPERATOR, KreskoAssetAnchor.address);
  await KreskoAsset.setAnchorToken(KreskoAssetAnchor.address);

  return {
    KreskoAsset,
    KreskoAssetAnchor,
  };
}
