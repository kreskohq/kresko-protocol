import { getLogger } from '@utils/logging'
import { task } from 'hardhat/config'
import { TASK_DEPLOY_CONTRACT } from './names'

const logger = getLogger(TASK_DEPLOY_CONTRACT)

task(TASK_DEPLOY_CONTRACT, 'deploy something', async (_, _hre) => {
  logger.log(`Deploying contract...`)
  // const { deployer } = await hre.ethers.getNamedSigners();
  // const { admin } = await getDeploymentUsers(hre);

  // const name = 'Ether';
  // const symbol = 'krETH';
  // const Kresko = { address: '0x7366d18831e535f3Ab0b804C01d454DaD72B4c36' };
  // const underlyingToken = zeroAddress;
  // const feeRecipient = '0xC4489F3A82079C5a7b0b610Fc85952B6E585E697';
  // const openFee = 0;
  // const closeFee = 0;
  // const decimals = 18;

  // logger.log('Deployer: ', deployer.address);
  // logger.log('Deployer balance: ', fromBig((await deployer.getBalance()).toString()));
  // if (!hre.DeploymentFactory) {
  //   [hre.DeploymentFactory] = await hre.deploy('DeploymentFactory', {
  //     args: [deployer.address],
  //     from: deployer.address,
  //   });
  // }

  // const { anchorName, anchorSymbol } = getAnchorNameAndSymbol(symbol, name);

  // SHOULD NOT COMPLAIN

  // const erc165Facet2 = await hre.prepareProxy('ERC165Facet', {
  //   deploymentName: symbol,
  // });
  // const erc165Facet3 = await hre.prepareProxy('ERC165Facet', {
  //   deploymentName: symbol,
  //   initializerArgs: ['0x01ffc9a7'],
  //   type: 'create2',
  //   salt: 'salt3',
  // });
  // const erc165Facet4 = await hre.prepareProxy('ERC165Facet', {
  //   deploymentName: symbol,
  //   initializer: 'setERC165',
  //   initializerArgs: [['0x01ffc9a7']],
  // });

  // const erc165Facet1 = await hre.prepareProxy('DiamondStateFacet', {
  //   deploymentName: symbol,
  //   initializer: 'owner',
  //   type: 'create2',
  //   salt: 'erc165Facet1',
  // });

  // const preparedKrAsset = await hre.prepareProxy('KreskoAsset', {
  //   deploymentName: symbol,
  //   initializer: 'initialize',
  //   initializerArgs: [name, symbol, decimals, admin, Kresko.address, underlyingToken, feeRecipient, openFee, closeFee],
  //   type: 'create3',
  //   salt: symbol + anchorSymbol,
  // });
  // preparedKrAsset.proxyAddress;
  // const preparedAnchor = await hre.prepareProxy('KreskoAssetAnchor', {
  //   deploymentName: anchorSymbol,
  //   constructorArgs: [preparedKrAsset.proxyAddress],
  //   initializer: 'initialize',
  //   initializerArgs: [preparedKrAsset.proxyAddress, anchorName, anchorSymbol, admin],
  //   type: 'create2',
  //   salt: anchorSymbol + symbol,
  // });

  // const proxies = [preparedKrAsset, preparedAnchor, preparedKrAsset, erc165Facet1, erc165Facet2] as const;

  // // const result = await hre.DeploymentFactory.batch([preparedKrAsset.calldata, preparedAnchor.calldata]);
  // const result = await hre.deployProxyBatch(proxies, {
  //   log: true,
  // });

  // const first = result[4];

  // // const [[KreskoAssetAnchor]] = await hre.deployProxyBatch([preparedAnchor] as const, {
  // //   log: true,
  // // });

  // return {
  //   KreskoAsset: result[0][0],
  //   KreskoAssetAnchor: result[1][0],
  // };
})
