/* Autogenerated file. Do not edit manually. */
// @ts-nocheck
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer, utils } from 'ethers';
import type { Provider } from '@ethersproject/providers';
import type {
  IStateFacet,
  IStateFacetInterface,
} from '../../../../../../src/contracts/core/minter/interfaces/IStateFacet';

const _abi = [
  {
    inputs: [
      {
        internalType: 'address',
        name: '_collateralAsset',
        type: 'address',
      },
    ],
    name: 'getCollateralExists',
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
  {
    inputs: [
      {
        internalType: 'address',
        name: '_collateralAsset',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '_amount',
        type: 'uint256',
      },
    ],
    name: 'getCollateralValueWithPrice',
    outputs: [
      {
        internalType: 'uint256',
        name: 'value',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'adjustedValue',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'price',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_kreskoAsset',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '_amount',
        type: 'uint256',
      },
    ],
    name: 'getDebtValueWithPrice',
    outputs: [
      {
        internalType: 'uint256',
        name: 'value',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'adjustedValue',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'price',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_krAsset',
        type: 'address',
      },
    ],
    name: 'getKrAssetExists',
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
  {
    inputs: [],
    name: 'getLiquidationThreshold',
    outputs: [
      {
        internalType: 'uint32',
        name: '',
        type: 'uint32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getMaxLiquidationRatio',
    outputs: [
      {
        internalType: 'uint32',
        name: '',
        type: 'uint32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getMinCollateralRatio',
    outputs: [
      {
        internalType: 'uint32',
        name: '',
        type: 'uint32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getMinterParameters',
    outputs: [
      {
        components: [
          {
            internalType: 'uint32',
            name: 'minCollateralRatio',
            type: 'uint32',
          },
          {
            internalType: 'uint32',
            name: 'liquidationThreshold',
            type: 'uint32',
          },
          {
            internalType: 'uint32',
            name: 'maxLiquidationRatio',
            type: 'uint32',
          },
        ],
        internalType: 'struct MinterParams',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export class IStateFacet__factory {
  static readonly abi = _abi;
  static createInterface(): IStateFacetInterface {
    return new utils.Interface(_abi) as IStateFacetInterface;
  }
  static connect(address: string, signerOrProvider: Signer | Provider): IStateFacet {
    return new Contract(address, _abi, signerOrProvider) as IStateFacet;
  }
}
