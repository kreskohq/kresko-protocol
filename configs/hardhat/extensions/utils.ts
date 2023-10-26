import type { FuncNames } from '@/types';
import type { CreateOpts, PrepareProxyFunction, PreparedProxy } from '@/types/functions';
import { getLogger } from '@utils/logging';
import { fromBig } from '@utils/values';
import { Contract, type ContractReceipt, type ContractTransaction } from 'ethers';
import { BigNumber, Overrides } from 'ethers/lib/ethers';
import type { Receipt } from 'hardhat-deploy/types';

const getFactoryAndDeployBytes = async <ContractName extends keyof TC>(
  name: ContractName,
  options: { deploymentName?: string; constructorArgs?: any[] },
) => {
  const factory = await hre.ethers.getContractFactory(name);
  const deploymentId = options?.deploymentName ?? name;
  const deployTx = options.constructorArgs?.length
    ? factory.getDeployTransaction(...options.constructorArgs)
    : factory.getDeployTransaction();

  if (!deployTx.data) throw new Error(`No deployment data: ${name}`);
  return {
    factory,
    deploymentId,
    iface: factory.interface,
    creationCode: deployTx.data,
    deployTx,
  };
};

const prepareProxyDeploy = async <
  ContractName extends keyof TC,
  InitFunction extends FuncNames<ContractName>,
  DeterministicType extends CreateOpts,
>(
  preparedProxies: PreparedProxy<ContractName, InitFunction, DeterministicType>[],
  options?: {
    from?: string;
    log?: boolean;
  },
) => {
  if (!hre.DeploymentFactory?.address) throw new Error('DeploymentFactory not deployed');
  const txData = preparedProxies.map(d => d.calldata);

  const isBatch = txData.length > 1;
  const isSingle = txData.length === 1;
  if (!isSingle && !isBatch) throw new Error('Invalid data length');

  const logger = getLogger('deploy-proxy-batch', options?.log);

  const count = txData.length;

  const preparedTx = await commonUtils.prepareTx(hre.DeploymentFactory, {
    logger,
    action: isBatch ? `deploy ${count} proxies (batch)` : `deploy ${preparedProxies[0].name} proxy`,
    name: 'DeploymentFactory',
    txGasEstimator: () =>
      !isBatch ? preparedProxies[0].estimateGas() : hre.DeploymentFactory.estimateGas.batch(txData),
    ...options,
  });

  return {
    logger,
    startTime: Date.now(),
    isBatch,
    onlyDeterministic: preparedProxies.every(d => d.args.type !== undefined),
    count,
    batchCalldata: txData,
    from: preparedTx.from,
    proxies: preparedProxies,
    preparedTx,
  };
};

const prepareProxy: PrepareProxyFunction = async (name, options) => {
  if (!hre.DeploymentFactory) throw new Error('DeploymentFactory not deployed');
  const { factory, creationCode, iface, deploymentId } = await proxyUtils.getFactory(name, options);

  const initializerCalldata = options.initializer
    ? iface.encodeFunctionData(String(options.initializer), options.initializerArgs ?? [])
    : '0x';

  const salt =
    options.salt && !hre.ethers.utils.isBytesLike(options.salt)
      ? hre.ethers.utils.formatBytes32String(options.salt)
      : options.salt;

  let calldata = '0x';
  let create: (overrides?: Overrides) => Promise<ContractTransaction>;
  let estimateGas: () => Promise<BigNumber>;

  const commonData = {
    deploymentId,
    name,
    initializerCalldata,
    factory: {
      bytecode: factory.bytecode,
      abi: factory.interface.format('full') as any,
    },
    deployedImplementationBytecode: creationCode,
  } as const;
  if (!options.type) {
    calldata = hre.DeploymentFactory.interface.encodeFunctionData('createProxyAndLogic', [
      creationCode,
      initializerCalldata,
    ]);

    estimateGas = () => hre.DeploymentFactory.estimateGas.createProxyAndLogic(creationCode, initializerCalldata);
    create = overrides => hre.DeploymentFactory.createProxyAndLogic(creationCode, initializerCalldata, overrides);

    return {
      ...commonData,
      create,
      estimateGas,
      calldata,
      saltBytes32: salt,
      args: options,
    };
  } else if (options.type === 'create2') {
    if (!salt) throw new Error('create2 needs a salt value');

    calldata = hre.DeploymentFactory.interface.encodeFunctionData('create2ProxyAndLogic', [
      creationCode,
      initializerCalldata,
      salt,
    ]);

    estimateGas = () => hre.DeploymentFactory.estimateGas.create2ProxyAndLogic(creationCode, initializerCalldata, salt);
    create = overrides =>
      hre.DeploymentFactory.create2ProxyAndLogic(creationCode, initializerCalldata, salt, overrides);

    const [proxyAddress, implementationAddress] = await hre.DeploymentFactory.previewCreate2ProxyAndLogic(
      creationCode,
      initializerCalldata,
      salt,
    );
    return {
      ...commonData,
      create,
      estimateGas,
      calldata,
      proxyAddress,
      implementationAddress,
      saltBytes32: salt,
      args: options,
    };
  } else if (options.type === 'create3') {
    if (!salt) throw new Error('create3 needs a salt value');

    calldata = hre.DeploymentFactory.interface.encodeFunctionData('create3ProxyAndLogic', [
      creationCode,
      initializerCalldata,
      salt,
    ]);

    estimateGas = () => hre.DeploymentFactory.estimateGas.create3ProxyAndLogic(creationCode, initializerCalldata, salt);
    create = overrides =>
      hre.DeploymentFactory.create3ProxyAndLogic(creationCode, initializerCalldata, salt, overrides);

    const [proxyAddress, implementationAddress] = await hre.DeploymentFactory.previewCreate3ProxyAndLogic(salt);

    return {
      ...commonData,
      create,
      estimateGas,
      calldata,
      proxyAddress,
      implementationAddress,
      saltBytes32: salt,
      args: options,
    };
  } else throw new Error('Invalid proxy type');
};

const saveProxyDeployment = async <
  ContractName extends keyof TC,
  InitFunction extends FuncNames<ContractName>,
  DeterministicType extends CreateOpts,
>(
  receipt: Receipt,
  prepared: PreparedProxy<ContractName, InitFunction, DeterministicType>,
  proxy: { proxy: string; implementation: string },
  context?: { logger: ReturnType<typeof getLogger>; log?: boolean },
  abi?: any[],
) => {
  const deployed = parseDeployedProxy(receipt, prepared, proxy, abi);
  if (!deployed.proxyStruct.proxy || !deployed.proxyStruct.implementation)
    throw new Error('Missing proxy or implementation address');
  const logger = context?.logger ?? getLogger('deploy-proxy', context?.log);

  await hre.deployments.save(deployed.deploymentId, {
    receipt: deployed.receipt,
    abi: deployed.abi,
    args: prepared.args.constructorArgs ?? [],
    address: deployed.proxyAddress,
    implementation: deployed.implementationAddress,
    execute: deployed.initializer
      ? {
          methodName: String(deployed.initializer),
          args: deployed.initializerArgs?.length ? deployed.initializerArgs.slice() : [],
        }
      : undefined,
    bytecode: deployed.bytecode,
    deployedBytecode: deployed.deployedBytecode,
    transactionHash: deployed.receipt.transactionHash,
  });

  const logResult = [
    `\n******** Deployment Saved ✅ *******`,
    `Contract: ${deployed.name}`,
    `Deployment ID: ${deployed.deploymentId}`,
    `---------------------------------------`,
    `Proxy: ${deployed.proxyAddress}`,
    `Implementation: ${deployed.implementationAddress}`,
    `---------------------------------------`,
    `Constructor: ${deployed.constructorArgs ?? 'none'}`,
    `Initializer: ${String(deployed.initializer) || 'none'}`,
    `Args: ${deployed.initializerArgs ?? 'none'}`,
  ];
  if (deployed.deterministic)
    logResult.push(
      `---------------------------------------`,
      `Salt: ${deployed.deterministic.saltBytes32} (bytes32)`,
      `Salt: ${deployed.deterministic.saltString} (string)`,
      `Type: ${deployed.deterministic.type}`,
    );

  logResult.push(`***************************************`);
  logger.log(logResult.join('\n'));
  return await hre.deployments.get(deployed.deploymentId);
};

const parseDeployedProxy = <
  ContractName extends keyof TC,
  InitFunction extends FuncNames<ContractName>,
  DeterministicType extends CreateOpts,
>(
  receipt: Receipt,
  prepared: PreparedProxy<ContractName, InitFunction, DeterministicType>,
  proxy: { proxy: string; implementation: string },
  abi?: any[],
) => ({
  deploymentId: prepared.deploymentId,
  name: prepared.name,
  proxyAddress: proxy.proxy,
  constructorArgs: prepared.args.constructorArgs,
  initializer: prepared.args.initializer,
  initializerArgs: prepared.args.initializerArgs,
  implementationAddress: proxy.implementation,
  deployedBytecode: prepared.deployedImplementationBytecode.toString(),
  bytecode: prepared.factory.bytecode,
  abi: abi ?? prepared.factory.abi,
  receipt,
  proxyStruct: proxy,
  deterministic: prepared.saltBytes32
    ? {
        saltBytes32: prepared.saltBytes32,
        saltString: prepared.args.salt,
        type: prepared.args.type,
      }
    : undefined,
  options: {
    ...prepared.args,
    from: receipt.from,
  },
});
/* ************* Transaction 🟠 ************* */
const prepareTx = async (
  target: Contract,
  options: {
    bal?: boolean;
    action?: string;
    name?: keyof TC;
    from?: string;
    log?: boolean;
    logger?: ReturnType<typeof getLogger>;
    txGasEstimator?: (...args: any | any[]) => Promise<BigNumber>;
    gasUsed?: BigNumber;
    gasPrice?: BigNumber;
  },
) => {
  const { deployer } = await hre.getNamedAccounts();
  const from = options?.from ?? deployer;
  const logger = options.logger ? options.logger : getLogger('tx-info', options?.log);

  let gasUsedEstimate = options.gasUsed || BigNumber.from(0);
  let gasPriceEstimate = options.gasPrice || BigNumber.from(0);
  let senderBalanceBig = options.bal ? BigNumber.from(0) : BigNumber.from(1);

  const promises = [];
  if (gasUsedEstimate.eq(0) && options.txGasEstimator) promises.push(options.txGasEstimator());
  else promises.push(new Promise<BigNumber>(rs => rs(gasUsedEstimate)));

  if (senderBalanceBig.eq(0)) promises.push(hre.ethers.provider.getBalance(from));
  else promises.push(new Promise<BigNumber>(rs => rs(BigNumber.from(0))));

  if (gasPriceEstimate.eq(0)) promises.push(hre.ethers.provider.getGasPrice());
  else promises.push(new Promise<BigNumber>(rs => rs(gasPriceEstimate)));
  [gasUsedEstimate, senderBalanceBig, gasPriceEstimate] = await Promise.all(promises);

  const senderBalance = fromBig(senderBalanceBig).toFixed(5);
  const gasPriceEstimateGwei = fromBig(gasPriceEstimate, 9);
  const gasLimit = gasUsedEstimate.mul(1020).div(1000);
  const txCostEstimate = fromBig(gasUsedEstimate.mul(gasPriceEstimate)).toFixed(5);

  logger.log(
    [
      `\n********** Transaction 🟠 **********`,
      `${options.name ? `To: ${options.name} @ ${target.address}` : `To: ${target.address}`}`,
      `---------------------------------------`,
      options.action ? `Action: ${options.action}` : '',
      `Sender: ${from}`,
      `Balance: ${senderBalance} ETH`,
      `---------------------------------------`,
      `Gas price: ${gasPriceEstimateGwei} gwei (provider)`,
      `Gas limit: ${gasLimit.toString()}`,
      `---------------------------------------`,
      `Cost estimate: ${txCostEstimate} ETH`,
      `Gas estimate: ${gasUsedEstimate.toString()}`,
      `***************************************`,
    ]
      .filter(Boolean)
      .join('\n'),
  );

  return {
    name: options.name,
    senderBalanceBig,
    senderBalance,
    startTime: Date.now(),
    gasPriceEstimateGwei,
    gasUsedEstimate,
    gasPriceEstimate,
    gasLimit,
    txCostEstimate,
    from,
    logger,
    log: options.log,
  };
};

type TxSummary = {
  receipt: ContractReceipt;
  senderBalanceBig: BigNumber;
  senderBalance: string;
  startTime: number;
  gasPriceUsed: BigNumber;
  gasPriceUsedGwei: number;
  gasUsedEstimate: BigNumber;
  gasPriceEstimate: BigNumber;
  gasUsed: BigNumber;
  gasLimit: BigNumber;
  gasRemaining: BigNumber;
  gasRemainingPct: BigNumber;
  txCost: BigNumber;
  txCostEstimate: string;
  duration: number;
  from: string;
  name?: string;
  logger: ReturnType<typeof getLogger>;
  log?: boolean;
};

export const commonUtils = {
  prepareTx,
  sendPreparedTx: async (
    tx: Promise<ContractTransaction>,
    args: Awaited<ReturnType<typeof prepareTx>>,
  ): Promise<TxSummary> => {
    const txResult = await tx;
    args.logger.log([`\n******* Transaction Sent 🟡 ********`, `Hash: ${txResult.hash}`].join('\n'));

    const duration = Date.now() - args.startTime;
    const receipt = await txResult.wait();
    const txCost = receipt.gasUsed?.mul(receipt.effectiveGasPrice ?? 0);

    const gasRemaining = args.gasLimit.sub(receipt.gasUsed ?? 0);
    const gasRemainingPct = gasRemaining.mul(100).div(args.gasLimit);

    const gasPriceUsed = receipt.effectiveGasPrice ?? args.gasPriceEstimate;

    args.logger.log(
      [
        `\n\n******* Transaction mined 🟢 *******`,
        `Block: ${receipt.blockNumber}`,
        `Hash: ${receipt.transactionHash}`,
        `---------------------------------------`,
        `Gas price: ${fromBig(gasPriceUsed, 9)} gwei`,
        `(provider estimate: ${args.gasPriceEstimateGwei} gwei)`,
        `---------------------------------------`,
        `Cost: ${fromBig(txCost).toFixed(5)}`,
        `(provider estimate: ${args.txCostEstimate} ETH)`,
        `---------------------------------------`,
        `Gas used: ${receipt.gasUsed?.toString()}`,
        `Gas limit: ${args.gasLimit.toString()}`,
        `Gas not used:  ${gasRemaining} (${gasRemainingPct}%)`,
        `(provider estimate: ${args.gasUsedEstimate.toString()})`,
        `---------------------------------------`,
        `Script duration: ${duration}ms${duration > 1000 ? ` (${Math.floor(duration / 1000)}s)` : ''}`,
        `***************************************`,
      ].join('\n'),
    );

    return {
      receipt,
      duration,
      gasUsed: receipt.gasUsed,
      gasPriceUsedGwei: fromBig(gasPriceUsed, 9),
      gasPriceUsed,
      gasRemaining,
      gasRemainingPct,
      txCost,
      ...args,
    };
  },
};
export const proxyUtils = {
  getFactory: getFactoryAndDeployBytes,
  prepare: prepareProxy,
  prepareDeploy: prepareProxyDeploy,
  save: saveProxyDeployment,
  parseDeploy: parseDeployedProxy,
};
