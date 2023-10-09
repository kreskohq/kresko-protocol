/* Autogenerated file. Do not edit manually. */
// @ts-nocheck
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer, utils } from 'ethers';
import type { Provider } from '@ethersproject/providers';
import type { ISCDPFacet, ISCDPFacetInterface } from '../../../../../../src/contracts/core/scdp/interfaces/ISCDPFacet';

const _abi = [
  {
    inputs: [
      {
        internalType: 'address',
        name: '_account',
        type: 'address',
      },
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
    name: 'depositSCDP',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getLiquidatableSCDP',
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
        name: '_repayAssetAddr',
        type: 'address',
      },
      {
        internalType: 'address',
        name: '_seizeAssetAddr',
        type: 'address',
      },
    ],
    name: 'getMaxLiqValueSCDP',
    outputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'account',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'seizeAssetAddr',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'repayAssetAddr',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'repayValue',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'repayAmount',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'seizeAmount',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'seizeValue',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'repayAssetPrice',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'repayAssetIndex',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'seizeAssetPrice',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'seizeAssetIndex',
            type: 'uint256',
          },
        ],
        internalType: 'struct MaxLiqInfo',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_repayAssetAddr',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '_repayAmount',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: '_seizeAssetAddr',
        type: 'address',
      },
    ],
    name: 'liquidateSCDP',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_repayAssetAddr',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '_repayAmount',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: '_seizeAssetAddr',
        type: 'address',
      },
    ],
    name: 'repaySCDP',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_account',
        type: 'address',
      },
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
    name: 'withdrawSCDP',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export class ISCDPFacet__factory {
  static readonly abi = _abi;
  static createInterface(): ISCDPFacetInterface {
    return new utils.Interface(_abi) as ISCDPFacetInterface;
  }
  static connect(address: string, signerOrProvider: Signer | Provider): ISCDPFacet {
    return new Contract(address, _abi, signerOrProvider) as ISCDPFacet;
  }
}
