import { ZERO_ADDRESS } from '@kreskolabs/lib';
import { getNamedEvent } from '@utils/events';
import { getLogger } from '@utils/logging';
import type { DeployFunction } from 'hardhat-deploy/dist/types';
import type { HardhatRuntimeEnvironment } from 'hardhat/types';

// import { executeContractCallWithSigners } from "@utils/gnosis";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const logger = getLogger('multisig');

  // Multisig signers
  const { deployer, userOne, userTwo, devOne, extOne, extTwo } = await hre.ethers.getNamedSigners();

  // Get the factory
  const FactoryDeployment = await hre.deployments.get('GnosisSafeProxyFactory');
  const Factory = await hre.ethers.getContractAt(FactoryDeployment.abi, FactoryDeployment.address);

  // Local mastercopy
  const MasterCopyDeployment = await hre.deployments.get('GnosisSafeL2');

  const MasterCopy = await hre.ethers.getContractAt(MasterCopyDeployment.abi, MasterCopyDeployment.address);
  // TODO: bring ReentrancyGuard back into this deployment
  // const ReentrancyGuard = await hre.getContractOrFork("ReentrancyTransactionGuard");
  // Multisig users
  const safeUsers = [deployer, userOne, userTwo, devOne, extOne, extTwo];

  const creationArgs = [
    safeUsers.map(user => user.address),
    3,
    ZERO_ADDRESS,
    '0x',
    ZERO_ADDRESS,
    ZERO_ADDRESS,
    0,
    ZERO_ADDRESS,
  ] as const;

  // Encoded params for setup
  const creationTx = await MasterCopy.populateTransaction.setup(...creationArgs);

  if (!creationTx.data) throw new Error('No data found in gnosis creationTx');
  const tx = await Factory.createProxy(MasterCopy.address, creationTx.data);

  const creationEvent = await getNamedEvent<any>(tx, 'ProxyCreation');

  const receipt = await tx.wait();

  const SafeDeployment = await hre.deployments.get('GnosisSafeL2');
  const SafeProxy = await hre.ethers.getContractAt(SafeDeployment.abi, creationEvent.args.proxy);
  await hre.deployments.save('GnosisSafeL2', {
    abi: SafeDeployment.abi,
    address: creationEvent.args.proxy,
    args: [...creationArgs],
    receipt: receipt,
  });

  // Test utility to execute the multisig upgrade
  // await executeContractCallWithSigners(
  //     SafeProxy,
  //     SafeProxy,
  //     "setGuard",
  //     [ReentrancyGuard.address],
  //     [deployer, devOne, extOne],
  // );

  logger.success('Multisig succesfully deployed through proxyFactory @', SafeProxy.address);
  hre.Multisig = SafeProxy;
};

deploy.tags = ['all', 'local', 'safe'];
// deploy.skip = async hre => hre.network.live;

export default deploy;
