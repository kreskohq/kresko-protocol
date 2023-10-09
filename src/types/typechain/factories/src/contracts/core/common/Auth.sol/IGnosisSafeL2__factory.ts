/* Autogenerated file. Do not edit manually. */
// @ts-nocheck
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer, utils } from 'ethers';
import type { Provider } from '@ethersproject/providers';
import type {
  IGnosisSafeL2,
  IGnosisSafeL2Interface,
} from '../../../../../../src/contracts/core/common/Auth.sol/IGnosisSafeL2';

const _abi = [
  {
    inputs: [],
    name: 'getOwners',
    outputs: [
      {
        internalType: 'address[]',
        name: '',
        type: 'address[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
    ],
    name: 'isOwner',
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

export class IGnosisSafeL2__factory {
  static readonly abi = _abi;
  static createInterface(): IGnosisSafeL2Interface {
    return new utils.Interface(_abi) as IGnosisSafeL2Interface;
  }
  static connect(address: string, signerOrProvider: Signer | Provider): IGnosisSafeL2 {
    return new Contract(address, _abi, signerOrProvider) as IGnosisSafeL2;
  }
}
