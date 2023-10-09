/* Autogenerated file. Do not edit manually. */
// @ts-nocheck
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer, utils } from 'ethers';
import type { Provider } from '@ethersproject/providers';
import type {
  IAssetConfigurationFacet,
  IAssetConfigurationFacetInterface,
} from '../../../../../../src/contracts/core/common/interfaces/IAssetConfigurationFacet';

const _abi = [
  {
    inputs: [
      {
        internalType: 'address',
        name: '_assetAddr',
        type: 'address',
      },
      {
        components: [
          {
            internalType: 'bytes12',
            name: 'underlyingId',
            type: 'bytes12',
          },
          {
            internalType: 'address',
            name: 'anchor',
            type: 'address',
          },
          {
            internalType: 'enum OracleType[2]',
            name: 'oracles',
            type: 'uint8[2]',
          },
          {
            internalType: 'uint16',
            name: 'factor',
            type: 'uint16',
          },
          {
            internalType: 'uint16',
            name: 'kFactor',
            type: 'uint16',
          },
          {
            internalType: 'uint16',
            name: 'openFee',
            type: 'uint16',
          },
          {
            internalType: 'uint16',
            name: 'closeFee',
            type: 'uint16',
          },
          {
            internalType: 'uint16',
            name: 'liqIncentive',
            type: 'uint16',
          },
          {
            internalType: 'uint128',
            name: 'supplyLimit',
            type: 'uint128',
          },
          {
            internalType: 'uint128',
            name: 'depositLimitSCDP',
            type: 'uint128',
          },
          {
            internalType: 'uint128',
            name: 'liquidityIndexSCDP',
            type: 'uint128',
          },
          {
            internalType: 'uint16',
            name: 'swapInFeeSCDP',
            type: 'uint16',
          },
          {
            internalType: 'uint16',
            name: 'swapOutFeeSCDP',
            type: 'uint16',
          },
          {
            internalType: 'uint16',
            name: 'protocolFeeShareSCDP',
            type: 'uint16',
          },
          {
            internalType: 'uint16',
            name: 'liqIncentiveSCDP',
            type: 'uint16',
          },
          {
            internalType: 'uint8',
            name: 'decimals',
            type: 'uint8',
          },
          {
            internalType: 'bool',
            name: 'isCollateral',
            type: 'bool',
          },
          {
            internalType: 'bool',
            name: 'isKrAsset',
            type: 'bool',
          },
          {
            internalType: 'bool',
            name: 'isSCDPDepositAsset',
            type: 'bool',
          },
          {
            internalType: 'bool',
            name: 'isSCDPKrAsset',
            type: 'bool',
          },
          {
            internalType: 'bool',
            name: 'isSCDPCollateral',
            type: 'bool',
          },
          {
            internalType: 'bool',
            name: 'isSCDPCoverAsset',
            type: 'bool',
          },
        ],
        internalType: 'struct Asset',
        name: '_config',
        type: 'tuple',
      },
      {
        components: [
          {
            internalType: 'enum OracleType[2]',
            name: 'oracleIds',
            type: 'uint8[2]',
          },
          {
            internalType: 'address[2]',
            name: 'feeds',
            type: 'address[2]',
          },
        ],
        internalType: 'struct FeedConfiguration',
        name: '_feedConfig',
        type: 'tuple',
      },
      {
        internalType: 'bool',
        name: '_setFeeds',
        type: 'bool',
      },
    ],
    name: 'addAsset',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes12',
        name: '_assetId',
        type: 'bytes12',
      },
      {
        internalType: 'address',
        name: '_feedAddr',
        type: 'address',
      },
    ],
    name: 'setApi3Feed',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes12[]',
        name: '_assetIds',
        type: 'bytes12[]',
      },
      {
        internalType: 'address[]',
        name: '_feeds',
        type: 'address[]',
      },
    ],
    name: 'setApi3Feeds',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes12',
        name: '_assetId',
        type: 'bytes12',
      },
      {
        internalType: 'address',
        name: '_feedAddr',
        type: 'address',
      },
    ],
    name: 'setChainLinkFeed',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes12[]',
        name: '_assetIds',
        type: 'bytes12[]',
      },
      {
        internalType: 'address[]',
        name: '_feeds',
        type: 'address[]',
      },
    ],
    name: 'setChainlinkFeeds',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_assetAddr',
        type: 'address',
      },
      {
        components: [
          {
            internalType: 'bytes12',
            name: 'underlyingId',
            type: 'bytes12',
          },
          {
            internalType: 'address',
            name: 'anchor',
            type: 'address',
          },
          {
            internalType: 'enum OracleType[2]',
            name: 'oracles',
            type: 'uint8[2]',
          },
          {
            internalType: 'uint16',
            name: 'factor',
            type: 'uint16',
          },
          {
            internalType: 'uint16',
            name: 'kFactor',
            type: 'uint16',
          },
          {
            internalType: 'uint16',
            name: 'openFee',
            type: 'uint16',
          },
          {
            internalType: 'uint16',
            name: 'closeFee',
            type: 'uint16',
          },
          {
            internalType: 'uint16',
            name: 'liqIncentive',
            type: 'uint16',
          },
          {
            internalType: 'uint128',
            name: 'supplyLimit',
            type: 'uint128',
          },
          {
            internalType: 'uint128',
            name: 'depositLimitSCDP',
            type: 'uint128',
          },
          {
            internalType: 'uint128',
            name: 'liquidityIndexSCDP',
            type: 'uint128',
          },
          {
            internalType: 'uint16',
            name: 'swapInFeeSCDP',
            type: 'uint16',
          },
          {
            internalType: 'uint16',
            name: 'swapOutFeeSCDP',
            type: 'uint16',
          },
          {
            internalType: 'uint16',
            name: 'protocolFeeShareSCDP',
            type: 'uint16',
          },
          {
            internalType: 'uint16',
            name: 'liqIncentiveSCDP',
            type: 'uint16',
          },
          {
            internalType: 'uint8',
            name: 'decimals',
            type: 'uint8',
          },
          {
            internalType: 'bool',
            name: 'isCollateral',
            type: 'bool',
          },
          {
            internalType: 'bool',
            name: 'isKrAsset',
            type: 'bool',
          },
          {
            internalType: 'bool',
            name: 'isSCDPDepositAsset',
            type: 'bool',
          },
          {
            internalType: 'bool',
            name: 'isSCDPKrAsset',
            type: 'bool',
          },
          {
            internalType: 'bool',
            name: 'isSCDPCollateral',
            type: 'bool',
          },
          {
            internalType: 'bool',
            name: 'isSCDPCoverAsset',
            type: 'bool',
          },
        ],
        internalType: 'struct Asset',
        name: '_config',
        type: 'tuple',
      },
    ],
    name: 'updateAsset',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes12',
        name: '_assetId',
        type: 'bytes12',
      },
      {
        components: [
          {
            internalType: 'enum OracleType[2]',
            name: 'oracleIds',
            type: 'uint8[2]',
          },
          {
            internalType: 'address[2]',
            name: 'feeds',
            type: 'address[2]',
          },
        ],
        internalType: 'struct FeedConfiguration',
        name: '_feedConfig',
        type: 'tuple',
      },
    ],
    name: 'updateFeeds',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_assetAddr',
        type: 'address',
      },
      {
        internalType: 'enum OracleType[2]',
        name: '_newOracleOrder',
        type: 'uint8[2]',
      },
    ],
    name: 'updateOracleOrder',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_assetAddr',
        type: 'address',
      },
      {
        components: [
          {
            internalType: 'bytes12',
            name: 'underlyingId',
            type: 'bytes12',
          },
          {
            internalType: 'address',
            name: 'anchor',
            type: 'address',
          },
          {
            internalType: 'enum OracleType[2]',
            name: 'oracles',
            type: 'uint8[2]',
          },
          {
            internalType: 'uint16',
            name: 'factor',
            type: 'uint16',
          },
          {
            internalType: 'uint16',
            name: 'kFactor',
            type: 'uint16',
          },
          {
            internalType: 'uint16',
            name: 'openFee',
            type: 'uint16',
          },
          {
            internalType: 'uint16',
            name: 'closeFee',
            type: 'uint16',
          },
          {
            internalType: 'uint16',
            name: 'liqIncentive',
            type: 'uint16',
          },
          {
            internalType: 'uint128',
            name: 'supplyLimit',
            type: 'uint128',
          },
          {
            internalType: 'uint128',
            name: 'depositLimitSCDP',
            type: 'uint128',
          },
          {
            internalType: 'uint128',
            name: 'liquidityIndexSCDP',
            type: 'uint128',
          },
          {
            internalType: 'uint16',
            name: 'swapInFeeSCDP',
            type: 'uint16',
          },
          {
            internalType: 'uint16',
            name: 'swapOutFeeSCDP',
            type: 'uint16',
          },
          {
            internalType: 'uint16',
            name: 'protocolFeeShareSCDP',
            type: 'uint16',
          },
          {
            internalType: 'uint16',
            name: 'liqIncentiveSCDP',
            type: 'uint16',
          },
          {
            internalType: 'uint8',
            name: 'decimals',
            type: 'uint8',
          },
          {
            internalType: 'bool',
            name: 'isCollateral',
            type: 'bool',
          },
          {
            internalType: 'bool',
            name: 'isKrAsset',
            type: 'bool',
          },
          {
            internalType: 'bool',
            name: 'isSCDPDepositAsset',
            type: 'bool',
          },
          {
            internalType: 'bool',
            name: 'isSCDPKrAsset',
            type: 'bool',
          },
          {
            internalType: 'bool',
            name: 'isSCDPCollateral',
            type: 'bool',
          },
          {
            internalType: 'bool',
            name: 'isSCDPCoverAsset',
            type: 'bool',
          },
        ],
        internalType: 'struct Asset',
        name: '_config',
        type: 'tuple',
      },
    ],
    name: 'validateAssetConfig',
    outputs: [],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export class IAssetConfigurationFacet__factory {
  static readonly abi = _abi;
  static createInterface(): IAssetConfigurationFacetInterface {
    return new utils.Interface(_abi) as IAssetConfigurationFacetInterface;
  }
  static connect(address: string, signerOrProvider: Signer | Provider): IAssetConfigurationFacet {
    return new Contract(address, _abi, signerOrProvider) as IAssetConfigurationFacet;
  }
}
