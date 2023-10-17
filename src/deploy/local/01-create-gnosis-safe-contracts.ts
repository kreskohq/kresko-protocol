import { testnetConfigs } from '@config/deploy/arbitrumGoerli';
import { getLogger } from '@utils/logging';
import type { DeployFunction } from 'hardhat-deploy/dist/types';

const logger = getLogger('gnosis-safe-contracts-for-tests');

const deploy: DeployFunction = async function (hre) {
  switch (hre.network.name) {
    // For public chains we use the pre-deployed contracts
    case 'opgoerli': {
      const config = testnetConfigs[hre.network.name];
      const gnosisSafeDeployments = config.gnosisSafeDeployments;
      if (!gnosisSafeDeployments) {
        throw new Error('No gnosis safe deployments found');
      }

      const simulateTxAccesorInfo = gnosisSafeDeployments.find(i => i.contractName === 'SimulateTxAccesor')!;
      await hre.deployments.save('SimulateTxAccessor', {
        abi: simulateTxAccesorInfo!.abi,
        address: simulateTxAccesorInfo!.networkAddresses.opgoerli,
      });

      const gnosisSafeProxyFactoryInfo = gnosisSafeDeployments.find(i => i.contractName === 'GnosisSafeProxyFactory')!;
      await hre.deployments.save('GnosisSafeProxyFactory', {
        abi: gnosisSafeProxyFactoryInfo.abi,
        address: gnosisSafeProxyFactoryInfo.networkAddresses.opgoerli,
      });

      const compatibilityFallbackHandlerInfo = gnosisSafeDeployments.find(
        i => i.contractName === 'CompatibilityFallbackHandler',
      )!;
      await hre.deployments.save('CompatibilityFallbackHandler', {
        abi: compatibilityFallbackHandlerInfo.abi,
        address: compatibilityFallbackHandlerInfo.networkAddresses.opgoerli,
      });

      const createCallInfo = gnosisSafeDeployments!.find(i => i.contractName === 'CreateCall')!;
      await hre.deployments.save('CreateCall', {
        abi: createCallInfo.abi,
        address: createCallInfo.networkAddresses.opgoerli,
      });

      const multiSendInfo = gnosisSafeDeployments!.find(i => i.contractName === 'MultiSend')!;
      await hre.deployments.save('MultiSend', {
        abi: multiSendInfo.abi,
        address: multiSendInfo.networkAddresses.opgoerli,
      });

      const multiSendCallOnlyInfo = gnosisSafeDeployments!.find(i => i.contractName === 'MultiSendCallOnly')!;
      await hre.deployments.save('MultiSendCallOnly', {
        abi: multiSendCallOnlyInfo.abi,
        address: multiSendCallOnlyInfo.networkAddresses.opgoerli,
      });

      const signMessageLibInfo = gnosisSafeDeployments!.find(i => i.contractName === 'SignMessageLib')!;
      await hre.deployments.save('SignMessageLib', {
        abi: signMessageLibInfo.abi,
        address: signMessageLibInfo.networkAddresses.opgoerli,
      });

      const gnosisSafeL2Info = gnosisSafeDeployments!.find(i => i.contractName === 'GnosisSafeL2')!;
      await hre.deployments.save('GnosisSafeL2', {
        abi: gnosisSafeL2Info.abi,
        address: gnosisSafeL2Info.networkAddresses.opgoerli,
      });

      // // No ReentrancyTransactionGuard contract so we'll deploy it manually
      // const reentrancyTransactionGuardName = "ReentrancyGuard"
      // const ReentrancyTransactionGuardArtifact = await hre.deployments.getOrNull(reentrancyTransactionGuardName);
      // let ReentrancyTransactionGuardContract: Contract;
      // // Deploy the ReentrancyTransactionGuard contract if it does not exist
      // if (!ReentrancyTransactionGuardArtifact) {
      //     await deployments.save("ReentrancyTransactionGuard", {
      //         abi: ReentrancyTransactionGuardArtifact.abi,
      //         address:   ReentrancyTransactionGuardContract.address,
      //     });
      // }

      break;
    }
    case 'arbitrumGoerli':
    case 'hardhat': {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const safeProxyFactoryArtifact = require('../../utils/gnosis/json/GnosisSafeProxyFactory2.json');
      const safeProxyFactoryFactory = await hre.ethers.getContractFactoryFromArtifact(safeProxyFactoryArtifact);
      const proxyFactory = await safeProxyFactoryFactory.deploy();
      await hre.deployments.save('GnosisSafeProxyFactory', {
        abi: safeProxyFactoryArtifact.abi,
        address: proxyFactory.address,
        args: [],
      });

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const safeProxyArtifact = require('../../utils/gnosis/json/GnosisSafe.json');
      const safeProxyFactory = await hre.ethers.getContractFactoryFromArtifact(safeProxyArtifact);
      const safeProxy = await safeProxyFactory.deploy();
      await hre.deployments.save('GnosisSafe', {
        abi: safeProxyArtifact.abi,
        address: safeProxy.address,
        args: [],
      });
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const safeProxyL2Artifact = require('../../utils/gnosis/json/GnosisSafeL2.json');
      const safeProxyL2Factory = await hre.ethers.getContractFactoryFromArtifact(safeProxyL2Artifact);
      const safeProxyL2 = await safeProxyL2Factory.deploy();
      await hre.deployments.save('GnosisSafeL2', {
        abi: safeProxyL2Artifact.abi,
        deployedBytecode: safeProxyL2.deployedBytecode,
        address: safeProxyL2.address,
        args: [],
      });

      break;
    }
    default: {
      throw new Error('Invalid network for gnosis safe contract deployment');
    }
  }
  logger.success('safe contracts succesfully deployed');
};

deploy.tags = ['all', 'local', 'safe'];
// deploy.skip = async hre => hre.network.live;
export default deploy;
