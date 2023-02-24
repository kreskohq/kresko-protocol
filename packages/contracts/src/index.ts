import { Contract } from '@ethersproject/contracts'
import { Signer } from '@ethersproject/abstract-signer'
import { Provider } from '@ethersproject/abstract-provider'
import { deployments, opgoerli, oracles, MultiExport, DeployedChains, DeploymentNames, ContractExport } from './deployments/index';
export { deployments, oracles, MultiExport, DeployedChains, DeploymentNames, ContractExport };
import * as Typechain from './typechain';
import { GetContractTypes } from './types';
export type TC = GetContractTypes<typeof Typechain>;
export type ContractNames = keyof TC;
export const getContract = <T extends keyof TC> ( name: T, signerOrProvider: Signer | Provider ): TC[ T ] => {
  // @ts-expect-error
  return new Contract( opgoerli[ name ].address, signerOrProvider );
}

export { Error } from './errors';
