/* Autogenerated file. Do not edit manually. */
// @ts-nocheck
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer, utils } from 'ethers';
import type { Provider } from '@ethersproject/providers';
import type {
  IERC165Facet,
  IERC165FacetInterface,
} from '../../../../../../src/contracts/core/diamond/interfaces/IERC165Facet';

const _abi = [
  {
    inputs: [
      {
        internalType: 'bytes4[]',
        name: 'interfaceIds',
        type: 'bytes4[]',
      },
      {
        internalType: 'bytes4[]',
        name: 'interfaceIdsToRemove',
        type: 'bytes4[]',
      },
    ],
    name: 'setERC165',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes4',
        name: 'interfaceId',
        type: 'bytes4',
      },
    ],
    name: 'supportsInterface',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export class IERC165Facet__factory {
  static readonly abi = _abi;
  static createInterface(): IERC165FacetInterface {
    return new utils.Interface(_abi) as IERC165FacetInterface;
  }
  static connect(address: string, signerOrProvider: Signer | Provider): IERC165Facet {
    return new Contract(address, _abi, signerOrProvider) as IERC165Facet;
  }
}
