const krAssetAbi = [
  {
    inputs: [],
    name: 'admin',
    outputs: [
      {
        internalType: 'address',
        name: 'admin_',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    stateMutability: 'payable',
    type: 'receive',
  },
  {
    inputs: [],
    name: 'DEFAULT_ADMIN_ROLE',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'DOMAIN_SEPARATOR',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_from',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '_amount',
        type: 'uint256',
      },
    ],
    name: 'burn',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: 'index',
        type: 'uint256',
      },
    ],
    name: 'getRoleMember',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'grantRole',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'hasRole',
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
    name: 'isRebased',
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
    name: 'kresko',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_to',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '_amount',
        type: 'uint256',
      },
    ],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'nonces',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
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
        name: 'owner',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'spender',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'value',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'deadline',
        type: 'uint256',
      },
      {
        internalType: 'uint8',
        name: 'v',
        type: 'uint8',
      },
      {
        internalType: 'bytes32',
        name: 'r',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: 's',
        type: 'bytes32',
      },
    ],
    name: 'permit',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_denominator',
        type: 'uint256',
      },
      {
        internalType: 'bool',
        name: '_positive',
        type: 'bool',
      },
      {
        internalType: 'address[]',
        name: '_pools',
        type: 'address[]',
      },
    ],
    name: 'rebase',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'rebaseInfo',
    outputs: [
      {
        components: [
          {
            internalType: 'bool',
            name: 'positive',
            type: 'bool',
          },
          {
            internalType: 'uint256',
            name: 'denominator',
            type: 'uint256',
          },
        ],
        internalType: 'struct IKreskoAsset.Rebase',
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
        internalType: 'string',
        name: '_name',
        type: 'string',
      },
      {
        internalType: 'string',
        name: '_symbol',
        type: 'string',
      },
      {
        internalType: 'uint8',
        name: '_version',
        type: 'uint8',
      },
    ],
    name: 'reinitializeERC20',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'renounceRole',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'revokeRole',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

const anchorAbi = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'caller',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'receiver',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'assets',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'shares',
        type: 'uint256',
      },
    ],
    name: 'Withdraw',
    type: 'event',
  },
  {
    inputs: [],
    name: 'DEFAULT_ADMIN_ROLE',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'DOMAIN_SEPARATOR',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'asset',
    outputs: [
      {
        internalType: 'contract IKreskoAsset',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'shares',
        type: 'uint256',
      },
    ],
    name: 'convertToAssets',
    outputs: [
      {
        internalType: 'uint256',
        name: 'assets',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'assets',
        type: 'uint256',
      },
    ],
    name: 'convertToShares',
    outputs: [
      {
        internalType: 'uint256',
        name: 'shares',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'deposit',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_assets',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: '_from',
        type: 'address',
      },
    ],
    name: 'destroy',
    outputs: [
      {
        internalType: 'uint256',
        name: 'shares',
        type: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'grantRole',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'hasRole',
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
        internalType: 'uint256',
        name: '_assets',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: '_to',
        type: 'address',
      },
    ],
    name: 'issue',
    outputs: [
      {
        internalType: 'uint256',
        name: 'shares',
        type: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'maxDeposit',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
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
        name: 'owner',
        type: 'address',
      },
    ],
    name: 'maxDestroy',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
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
        name: '',
        type: 'address',
      },
    ],
    name: 'maxIssue',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
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
        name: '',
        type: 'address',
      },
    ],
    name: 'maxMint',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
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
        name: 'owner',
        type: 'address',
      },
    ],
    name: 'maxRedeem',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
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
        name: 'owner',
        type: 'address',
      },
    ],
    name: 'maxWithdraw',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
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
        name: '',
        type: 'address',
      },
    ],
    name: 'nonces',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
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
        name: 'owner',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'spender',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'value',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'deadline',
        type: 'uint256',
      },
      {
        internalType: 'uint8',
        name: 'v',
        type: 'uint8',
      },
      {
        internalType: 'bytes32',
        name: 'r',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: 's',
        type: 'bytes32',
      },
    ],
    name: 'permit',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'assets',
        type: 'uint256',
      },
    ],
    name: 'previewDeposit',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'shares',
        type: 'uint256',
      },
    ],
    name: 'previewDestroy',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'assets',
        type: 'uint256',
      },
    ],
    name: 'previewIssue',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'shares',
        type: 'uint256',
      },
    ],
    name: 'previewMint',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'shares',
        type: 'uint256',
      },
    ],
    name: 'previewRedeem',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'assets',
        type: 'uint256',
      },
    ],
    name: 'previewWithdraw',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'redeem',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: '_name',
        type: 'string',
      },
      {
        internalType: 'string',
        name: '_symbol',
        type: 'string',
      },
      {
        internalType: 'uint8',
        name: '_version',
        type: 'uint8',
      },
    ],
    name: 'reinitializeERC20',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'renounceRole',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'revokeRole',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalAssets',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'withdraw',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'pure',
    type: 'function',
  },
] as const;

export const deployments = {
  421613: {
    DAI: {
      address: '0x04636F1e9e9B7F4d21310f0149b6f40458756c99',
      abi: [],
    },
    Diamond: {
      address: '0x0607e3b2a16048Fa3c77ec3A935ecEd978B5C7F3',
      abi: [
        {
          inputs: [
            {
              internalType: 'bytes32',
              name: 'role',
              type: 'bytes32',
            },
            {
              internalType: 'address',
              name: 'account',
              type: 'address',
            },
          ],
          name: 'grantRole',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'bytes32',
              name: 'role',
              type: 'bytes32',
            },
            {
              internalType: 'address',
              name: 'account',
              type: 'address',
            },
          ],
          name: 'hasRole',
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
              internalType: 'bytes32',
              name: 'role',
              type: 'bytes32',
            },
            {
              internalType: 'address',
              name: 'account',
              type: 'address',
            },
          ],
          name: 'renounceRole',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'bytes32',
              name: 'role',
              type: 'bytes32',
            },
            {
              internalType: 'address',
              name: 'account',
              type: 'address',
            },
          ],
          name: 'revokeRole',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              components: [
                {
                  internalType: 'address',
                  name: 'facetAddress',
                  type: 'address',
                },
                {
                  internalType: 'enum IDiamondCutFacet.FacetCutAction',
                  name: 'action',
                  type: 'uint8',
                },
                {
                  internalType: 'bytes4[]',
                  name: 'functionSelectors',
                  type: 'bytes4[]',
                },
              ],
              internalType: 'struct IDiamondCutFacet.FacetCut[]',
              name: '_diamondCut',
              type: 'tuple[]',
            },
            {
              internalType: 'address',
              name: '_init',
              type: 'address',
            },
            {
              internalType: 'bytes',
              name: '_calldata',
              type: 'bytes',
            },
          ],
          name: 'diamondCut',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: '_init',
              type: 'address',
            },
            {
              internalType: 'bytes',
              name: '_calldata',
              type: 'bytes',
            },
          ],
          name: 'upgradeState',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'bytes4',
              name: '_functionSelector',
              type: 'bytes4',
            },
          ],
          name: 'facetAddress',
          outputs: [
            {
              internalType: 'address',
              name: 'facetAddress_',
              type: 'address',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'facetAddresses',
          outputs: [
            {
              internalType: 'address[]',
              name: 'facetAddresses_',
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
              name: '_facet',
              type: 'address',
            },
          ],
          name: 'facetFunctionSelectors',
          outputs: [
            {
              internalType: 'bytes4[]',
              name: 'facetFunctionSelectors_',
              type: 'bytes4[]',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'facets',
          outputs: [
            {
              components: [
                {
                  internalType: 'address',
                  name: 'facetAddress',
                  type: 'address',
                },
                {
                  internalType: 'bytes4[]',
                  name: 'functionSelectors',
                  type: 'bytes4[]',
                },
              ],
              internalType: 'struct IDiamondLoupeFacet.Facet[]',
              name: 'facets_',
              type: 'tuple[]',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'acceptOwnership',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [],
          name: 'owner',
          outputs: [
            {
              internalType: 'address',
              name: 'owner_',
              type: 'address',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'pendingOwner',
          outputs: [
            {
              internalType: 'address',
              name: 'pendingOwner_',
              type: 'address',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: '_newOwner',
              type: 'address',
            },
          ],
          name: 'transferOwnership',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
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
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: 'address',
              name: 'account',
              type: 'address',
            },
            {
              indexed: true,
              internalType: 'address',
              name: 'liquidator',
              type: 'address',
            },
            {
              indexed: true,
              internalType: 'address',
              name: 'seizedCollateralAsset',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'repayUSD',
              type: 'uint256',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'collateralSent',
              type: 'uint256',
            },
          ],
          name: 'BatchInterestLiquidationOccurred',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: 'address',
              name: 'collateralAsset',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'cFactor',
              type: 'uint256',
            },
          ],
          name: 'CFactorUpdated',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: 'address',
              name: 'account',
              type: 'address',
            },
            {
              indexed: true,
              internalType: 'address',
              name: 'paymentCollateralAsset',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'paymentAmount',
              type: 'uint256',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'paymentValue',
              type: 'uint256',
            },
          ],
          name: 'CloseFeePaid',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: 'address',
              name: 'collateralAsset',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'factor',
              type: 'uint256',
            },
            {
              indexed: true,
              internalType: 'address',
              name: 'oracle',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'address',
              name: 'anchor',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'liqIncentive',
              type: 'uint256',
            },
          ],
          name: 'CollateralAssetAdded',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: 'address',
              name: 'collateralAsset',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'factor',
              type: 'uint256',
            },
            {
              indexed: true,
              internalType: 'address',
              name: 'oracle',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'address',
              name: 'anchor',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'liqIncentive',
              type: 'uint256',
            },
          ],
          name: 'CollateralAssetUpdated',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: 'address',
              name: 'account',
              type: 'address',
            },
            {
              indexed: true,
              internalType: 'address',
              name: 'collateralAsset',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'amount',
              type: 'uint256',
            },
          ],
          name: 'CollateralDeposited',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: 'address',
              name: 'account',
              type: 'address',
            },
            {
              indexed: true,
              internalType: 'address',
              name: 'collateralAsset',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'amount',
              type: 'uint256',
            },
          ],
          name: 'CollateralWithdrawn',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: 'address',
              name: 'account',
              type: 'address',
            },
            {
              indexed: true,
              internalType: 'address',
              name: 'kreskoAsset',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'amount',
              type: 'uint256',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'interestRepaid',
              type: 'uint256',
            },
          ],
          name: 'DebtPositionClosed',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: 'address',
              name: 'account',
              type: 'address',
            },
            {
              indexed: true,
              internalType: 'address',
              name: 'liquidator',
              type: 'address',
            },
            {
              indexed: true,
              internalType: 'address',
              name: 'repayKreskoAsset',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'repayUSD',
              type: 'uint256',
            },
            {
              indexed: false,
              internalType: 'address',
              name: 'seizedCollateralAsset',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'collateralSent',
              type: 'uint256',
            },
          ],
          name: 'InterestLiquidationOccurred',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: 'address',
              name: 'kreskoAsset',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'kFactor',
              type: 'uint256',
            },
          ],
          name: 'KFactorUpdated',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: 'address',
              name: 'kreskoAsset',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'address',
              name: 'anchor',
              type: 'address',
            },
            {
              indexed: true,
              internalType: 'address',
              name: 'oracle',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'kFactor',
              type: 'uint256',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'supplyLimit',
              type: 'uint256',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'closeFee',
              type: 'uint256',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'openFee',
              type: 'uint256',
            },
          ],
          name: 'KreskoAssetAdded',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: 'address',
              name: 'account',
              type: 'address',
            },
            {
              indexed: true,
              internalType: 'address',
              name: 'kreskoAsset',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'amount',
              type: 'uint256',
            },
          ],
          name: 'KreskoAssetBurned',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: 'address',
              name: 'account',
              type: 'address',
            },
            {
              indexed: true,
              internalType: 'address',
              name: 'kreskoAsset',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'amount',
              type: 'uint256',
            },
          ],
          name: 'KreskoAssetMinted',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: 'address',
              name: 'kreskoAsset',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'address',
              name: 'anchor',
              type: 'address',
            },
            {
              indexed: true,
              internalType: 'address',
              name: 'oracle',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'kFactor',
              type: 'uint256',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'supplyLimit',
              type: 'uint256',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'closeFee',
              type: 'uint256',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'openFee',
              type: 'uint256',
            },
          ],
          name: 'KreskoAssetUpdated',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: 'address',
              name: 'account',
              type: 'address',
            },
            {
              indexed: true,
              internalType: 'address',
              name: 'liquidator',
              type: 'address',
            },
            {
              indexed: true,
              internalType: 'address',
              name: 'repayKreskoAsset',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'repayAmount',
              type: 'uint256',
            },
            {
              indexed: false,
              internalType: 'address',
              name: 'seizedCollateralAsset',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'collateralSent',
              type: 'uint256',
            },
          ],
          name: 'LiquidationOccurred',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: false,
              internalType: 'uint256',
              name: 'liquidationThreshold',
              type: 'uint256',
            },
          ],
          name: 'LiquidationThresholdUpdated',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: false,
              internalType: 'uint256',
              name: 'minimumCollateralizationRatio',
              type: 'uint256',
            },
          ],
          name: 'MinimumCollateralizationRatioUpdated',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: 'address',
              name: 'account',
              type: 'address',
            },
            {
              indexed: true,
              internalType: 'address',
              name: 'paymentCollateralAsset',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'paymentAmount',
              type: 'uint256',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'paymentValue',
              type: 'uint256',
            },
          ],
          name: 'OpenFeePaid',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: 'enum Action',
              name: 'action',
              type: 'uint8',
            },
            {
              indexed: true,
              internalType: 'address',
              name: 'asset',
              type: 'address',
            },
            {
              indexed: true,
              internalType: 'string',
              name: 'description',
              type: 'string',
            },
          ],
          name: 'SafetyStateChange',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: 'address',
              name: 'account',
              type: 'address',
            },
            {
              indexed: true,
              internalType: 'address',
              name: 'collateralAsset',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'amount',
              type: 'uint256',
            },
          ],
          name: 'UncheckedCollateralWithdrawn',
          type: 'event',
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
              name: '_kreskoAsset',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: '_kreskoAssetAmount',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: '_feeType',
              type: 'uint256',
            },
          ],
          name: 'calcExpectedFee',
          outputs: [
            {
              internalType: 'address[]',
              name: '',
              type: 'address[]',
            },
            {
              internalType: 'uint256[]',
              name: '',
              type: 'uint256[]',
            },
          ],
          stateMutability: 'view',
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
              name: '_asset',
              type: 'address',
            },
          ],
          name: 'collateralDeposits',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
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
              name: '_account',
              type: 'address',
            },
          ],
          name: 'getAccountCollateralRatio',
          outputs: [
            {
              internalType: 'uint256',
              name: 'ratio',
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
              name: '_account',
              type: 'address',
            },
          ],
          name: 'accountCollateralValue',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
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
              name: '_account',
              type: 'address',
            },
          ],
          name: 'getAccountKrAssetValue',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
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
              name: '_account',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: '_ratio',
              type: 'uint256',
            },
          ],
          name: 'getAccountMinimumCollateralValueAtRatio',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
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
              name: '_account',
              type: 'address',
            },
            {
              internalType: 'address',
              name: '_asset',
              type: 'address',
            },
          ],
          name: 'getAccountCollateralValueOf',
          outputs: [
            {
              internalType: 'uint256',
              name: 'adjustedValue',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'realValue',
              type: 'uint256',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address[]',
              name: '_accounts',
              type: 'address[]',
            },
          ],
          name: 'getCollateralRatiosFor',
          outputs: [
            {
              internalType: 'uint256[]',
              name: '',
              type: 'uint256[]',
            },
          ],
          stateMutability: 'view',
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
          ],
          name: 'getAccountDepositIndex',
          outputs: [
            {
              internalType: 'uint256',
              name: 'i',
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
              name: '_account',
              type: 'address',
            },
          ],
          name: 'getAccountCollateralAssets',
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
              name: '_account',
              type: 'address',
            },
          ],
          name: 'getMintedKreskoAssets',
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
              name: '_account',
              type: 'address',
            },
            {
              internalType: 'address',
              name: '_kreskoAsset',
              type: 'address',
            },
          ],
          name: 'getMintedKreskoAssetsIndex',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
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
              name: '_account',
              type: 'address',
            },
            {
              internalType: 'address',
              name: '_asset',
              type: 'address',
            },
          ],
          name: 'kreskoAssetDebt',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
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
              name: '_account',
              type: 'address',
            },
            {
              internalType: 'address',
              name: '_asset',
              type: 'address',
            },
          ],
          name: 'kreskoAssetDebtInterest',
          outputs: [
            {
              internalType: 'uint256',
              name: 'assetAmount',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'kissAmount',
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
              name: '_account',
              type: 'address',
            },
          ],
          name: 'kreskoAssetDebtInterestTotal',
          outputs: [
            {
              internalType: 'uint256',
              name: 'kissAmount',
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
              name: '_account',
              type: 'address',
            },
            {
              internalType: 'address',
              name: '_asset',
              type: 'address',
            },
          ],
          name: 'kreskoAssetDebtPrincipal',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
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
              name: '_account',
              type: 'address',
            },
            {
              internalType: 'address',
              name: '_kreskoAsset',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: '_burnAmount',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: '_mintedKreskoAssetIndex',
              type: 'uint256',
            },
          ],
          name: 'burnKreskoAsset',
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
          ],
          name: 'batchCloseKrAssetDebtPositions',
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
              name: '_kreskoAsset',
              type: 'address',
            },
          ],
          name: 'closeKrAssetDebtPosition',
          outputs: [],
          stateMutability: 'nonpayable',
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
              components: [
                {
                  internalType: 'uint256',
                  name: 'factor',
                  type: 'uint256',
                },
                {
                  internalType: 'contract AggregatorV3Interface',
                  name: 'oracle',
                  type: 'address',
                },
                {
                  internalType: 'address',
                  name: 'anchor',
                  type: 'address',
                },
                {
                  internalType: 'uint8',
                  name: 'decimals',
                  type: 'uint8',
                },
                {
                  internalType: 'bool',
                  name: 'exists',
                  type: 'bool',
                },
                {
                  internalType: 'uint256',
                  name: 'liqIncentive',
                  type: 'uint256',
                },
                {
                  internalType: 'bytes32',
                  name: 'redstoneId',
                  type: 'bytes32',
                },
              ],
              internalType: 'struct CollateralAsset',
              name: '_config',
              type: 'tuple',
            },
          ],
          name: 'addCollateralAsset',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: '_krAsset',
              type: 'address',
            },
            {
              components: [
                {
                  internalType: 'uint256',
                  name: 'kFactor',
                  type: 'uint256',
                },
                {
                  internalType: 'contract AggregatorV3Interface',
                  name: 'oracle',
                  type: 'address',
                },
                {
                  internalType: 'uint256',
                  name: 'supplyLimit',
                  type: 'uint256',
                },
                {
                  internalType: 'address',
                  name: 'anchor',
                  type: 'address',
                },
                {
                  internalType: 'uint256',
                  name: 'closeFee',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'openFee',
                  type: 'uint256',
                },
                {
                  internalType: 'bool',
                  name: 'exists',
                  type: 'bool',
                },
                {
                  internalType: 'bytes32',
                  name: 'redstoneId',
                  type: 'bytes32',
                },
              ],
              internalType: 'struct KrAsset',
              name: '_config',
              type: 'tuple',
            },
          ],
          name: 'addKreskoAsset',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: '_ammOracle',
              type: 'address',
            },
          ],
          name: 'updateAMMOracle',
          outputs: [],
          stateMutability: 'nonpayable',
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
              name: '_cFactor',
              type: 'uint256',
            },
          ],
          name: 'updateCFactor',
          outputs: [],
          stateMutability: 'nonpayable',
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
              components: [
                {
                  internalType: 'uint256',
                  name: 'factor',
                  type: 'uint256',
                },
                {
                  internalType: 'contract AggregatorV3Interface',
                  name: 'oracle',
                  type: 'address',
                },
                {
                  internalType: 'address',
                  name: 'anchor',
                  type: 'address',
                },
                {
                  internalType: 'uint8',
                  name: 'decimals',
                  type: 'uint8',
                },
                {
                  internalType: 'bool',
                  name: 'exists',
                  type: 'bool',
                },
                {
                  internalType: 'uint256',
                  name: 'liqIncentive',
                  type: 'uint256',
                },
                {
                  internalType: 'bytes32',
                  name: 'redstoneId',
                  type: 'bytes32',
                },
              ],
              internalType: 'struct CollateralAsset',
              name: '_config',
              type: 'tuple',
            },
          ],
          name: 'updateCollateralAsset',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint8',
              name: '_decimals',
              type: 'uint8',
            },
          ],
          name: 'updateExtOracleDecimals',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: '_feeRecipient',
              type: 'address',
            },
          ],
          name: 'updateFeeRecipient',
          outputs: [],
          stateMutability: 'nonpayable',
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
              name: '_kFactor',
              type: 'uint256',
            },
          ],
          name: 'updateKFactor',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: '_krAsset',
              type: 'address',
            },
            {
              components: [
                {
                  internalType: 'uint256',
                  name: 'kFactor',
                  type: 'uint256',
                },
                {
                  internalType: 'contract AggregatorV3Interface',
                  name: 'oracle',
                  type: 'address',
                },
                {
                  internalType: 'uint256',
                  name: 'supplyLimit',
                  type: 'uint256',
                },
                {
                  internalType: 'address',
                  name: 'anchor',
                  type: 'address',
                },
                {
                  internalType: 'uint256',
                  name: 'closeFee',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'openFee',
                  type: 'uint256',
                },
                {
                  internalType: 'bool',
                  name: 'exists',
                  type: 'bool',
                },
                {
                  internalType: 'bytes32',
                  name: 'redstoneId',
                  type: 'bytes32',
                },
              ],
              internalType: 'struct KrAsset',
              name: '_config',
              type: 'tuple',
            },
          ],
          name: 'updateKreskoAsset',
          outputs: [],
          stateMutability: 'nonpayable',
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
              name: '_liqIncentiveMultiplier',
              type: 'uint256',
            },
          ],
          name: 'updateLiquidationIncentiveMultiplier',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: '_liquidationThreshold',
              type: 'uint256',
            },
          ],
          name: 'updateLiquidationThreshold',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: '_maxLiquidationMultiplier',
              type: 'uint256',
            },
          ],
          name: 'updateMaxLiquidationMultiplier',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: '_minimumCollateralizationRatio',
              type: 'uint256',
            },
          ],
          name: 'updateMinimumCollateralizationRatio',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: '_minimumDebtValue',
              type: 'uint256',
            },
          ],
          name: 'updateMinDebtValue',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: '_oracleDeviationPct',
              type: 'uint256',
            },
          ],
          name: 'updateOracleDeviationPct',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: '_oracleTimeout',
              type: 'uint256',
            },
          ],
          name: 'updateOracleTimeout',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: '_sequencerGracePeriodTime',
              type: 'uint256',
            },
          ],
          name: 'updateSequencerGracePeriodTime',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: '_sequencerUptimeFeed',
              type: 'address',
            },
          ],
          name: 'updateSequencerUptimeFeed',
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
              name: '_depositAmount',
              type: 'uint256',
            },
          ],
          name: 'depositCollateral',
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
              name: '_withdrawAmount',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: '_depositedCollateralAssetIndex',
              type: 'uint256',
            },
          ],
          name: 'withdrawCollateral',
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
              name: '_collateralAssetToSeize',
              type: 'address',
            },
            {
              internalType: 'bool',
              name: '_allowSeizeUnderflow',
              type: 'bool',
            },
          ],
          name: 'batchLiquidateInterest',
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
              name: '_repayKreskoAsset',
              type: 'address',
            },
            {
              internalType: 'address',
              name: '_collateralAssetToSeize',
              type: 'address',
            },
            {
              internalType: 'bool',
              name: '_allowSeizeUnderflow',
              type: 'bool',
            },
          ],
          name: 'liquidateInterest',
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
              name: '_repayKreskoAsset',
              type: 'address',
            },
            {
              internalType: 'address',
              name: '_collateralAssetToSeize',
              type: 'address',
            },
          ],
          name: 'getMaxLiquidation',
          outputs: [
            {
              internalType: 'uint256',
              name: 'maxLiquidatableUSD',
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
              name: '_account',
              type: 'address',
            },
          ],
          name: 'isAccountLiquidatable',
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
              name: '_account',
              type: 'address',
            },
            {
              internalType: 'address',
              name: '_repayAsset',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: '_repayAmount',
              type: 'uint256',
            },
            {
              internalType: 'address',
              name: '_seizeAsset',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: '_repayAssetIndex',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: '_seizeAssetIndex',
              type: 'uint256',
            },
            {
              internalType: 'bool',
              name: '_allowSeizeUnderflow',
              type: 'bool',
            },
          ],
          name: 'liquidate',
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
              name: '_kreskoAsset',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: '_mintAmount',
              type: 'uint256',
            },
          ],
          name: 'mintKreskoAsset',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'enum Action',
              name: '_action',
              type: 'uint8',
            },
            {
              internalType: 'address',
              name: '_asset',
              type: 'address',
            },
          ],
          name: 'assetActionPaused',
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
              name: '_asset',
              type: 'address',
            },
            {
              internalType: 'enum Action',
              name: '_action',
              type: 'uint8',
            },
          ],
          name: 'safetyStateFor',
          outputs: [
            {
              components: [
                {
                  components: [
                    {
                      internalType: 'bool',
                      name: 'enabled',
                      type: 'bool',
                    },
                    {
                      internalType: 'uint256',
                      name: 'timestamp0',
                      type: 'uint256',
                    },
                    {
                      internalType: 'uint256',
                      name: 'timestamp1',
                      type: 'uint256',
                    },
                  ],
                  internalType: 'struct Pause',
                  name: 'pause',
                  type: 'tuple',
                },
              ],
              internalType: 'struct SafetyState',
              name: '',
              type: 'tuple',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'safetyStateSet',
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
              internalType: 'bool',
              name: 'val',
              type: 'bool',
            },
          ],
          name: 'setSafetyStateSet',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address[]',
              name: '_assets',
              type: 'address[]',
            },
            {
              internalType: 'enum Action',
              name: '_action',
              type: 'uint8',
            },
            {
              internalType: 'bool',
              name: '_withDuration',
              type: 'bool',
            },
            {
              internalType: 'uint256',
              name: '_duration',
              type: 'uint256',
            },
          ],
          name: 'toggleAssetsPaused',
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
          ],
          name: 'batchRepayFullStabilityRateInterest',
          outputs: [
            {
              internalType: 'uint256',
              name: 'kissRepayAmount',
              type: 'uint256',
            },
          ],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: '_asset',
              type: 'address',
            },
          ],
          name: 'getDebtIndexForAsset',
          outputs: [
            {
              internalType: 'uint256',
              name: 'debtIndex',
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
              name: '_account',
              type: 'address',
            },
            {
              internalType: 'address',
              name: '_asset',
              type: 'address',
            },
          ],
          name: 'getLastDebtIndexForAccount',
          outputs: [
            {
              internalType: 'uint128',
              name: 'lastDebtIndex',
              type: 'uint128',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: '_asset',
              type: 'address',
            },
          ],
          name: 'getPriceRateForAsset',
          outputs: [
            {
              internalType: 'uint256',
              name: 'priceRate',
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
              name: '_asset',
              type: 'address',
            },
          ],
          name: 'getStabilityRateConfigurationForAsset',
          outputs: [
            {
              components: [
                {
                  internalType: 'uint128',
                  name: 'debtIndex',
                  type: 'uint128',
                },
                {
                  internalType: 'uint128',
                  name: 'optimalPriceRate',
                  type: 'uint128',
                },
                {
                  internalType: 'uint128',
                  name: 'rateSlope1',
                  type: 'uint128',
                },
                {
                  internalType: 'uint128',
                  name: 'rateSlope2',
                  type: 'uint128',
                },
                {
                  internalType: 'uint128',
                  name: 'priceRateDelta',
                  type: 'uint128',
                },
                {
                  internalType: 'uint128',
                  name: 'stabilityRate',
                  type: 'uint128',
                },
                {
                  internalType: 'uint128',
                  name: 'stabilityRateBase',
                  type: 'uint128',
                },
                {
                  internalType: 'address',
                  name: 'asset',
                  type: 'address',
                },
                {
                  internalType: 'uint40',
                  name: 'lastUpdateTimestamp',
                  type: 'uint40',
                },
              ],
              internalType: 'struct StabilityRateConfig',
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
              name: '_asset',
              type: 'address',
            },
          ],
          name: 'getStabilityRateForAsset',
          outputs: [
            {
              internalType: 'uint256',
              name: 'stabilityRate',
              type: 'uint256',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'kiss',
          outputs: [
            {
              internalType: 'address',
              name: '',
              type: 'address',
            },
          ],
          stateMutability: 'view',
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
              name: '_kreskoAsset',
              type: 'address',
            },
          ],
          name: 'repayFullStabilityRateInterest',
          outputs: [
            {
              internalType: 'uint256',
              name: 'kissRepayAmount',
              type: 'uint256',
            },
          ],
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
              name: '_kreskoAsset',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: '_kissRepayAmount',
              type: 'uint256',
            },
          ],
          name: 'repayStabilityRateInterestPartial',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: '_asset',
              type: 'address',
            },
            {
              components: [
                {
                  internalType: 'uint128',
                  name: 'stabilityRateBase',
                  type: 'uint128',
                },
                {
                  internalType: 'uint128',
                  name: 'rateSlope1',
                  type: 'uint128',
                },
                {
                  internalType: 'uint128',
                  name: 'rateSlope2',
                  type: 'uint128',
                },
                {
                  internalType: 'uint128',
                  name: 'optimalPriceRate',
                  type: 'uint128',
                },
                {
                  internalType: 'uint128',
                  name: 'priceRateDelta',
                  type: 'uint128',
                },
              ],
              internalType: 'struct StabilityRateParams',
              name: '_setup',
              type: 'tuple',
            },
          ],
          name: 'setupStabilityRateParams',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: '_kiss',
              type: 'address',
            },
          ],
          name: 'updateKiss',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: '_asset',
              type: 'address',
            },
          ],
          name: 'updateStabilityRateAndIndexForAsset',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: '_asset',
              type: 'address',
            },
            {
              components: [
                {
                  internalType: 'uint128',
                  name: 'stabilityRateBase',
                  type: 'uint128',
                },
                {
                  internalType: 'uint128',
                  name: 'rateSlope1',
                  type: 'uint128',
                },
                {
                  internalType: 'uint128',
                  name: 'rateSlope2',
                  type: 'uint128',
                },
                {
                  internalType: 'uint128',
                  name: 'optimalPriceRate',
                  type: 'uint128',
                },
                {
                  internalType: 'uint128',
                  name: 'priceRateDelta',
                  type: 'uint128',
                },
              ],
              internalType: 'struct StabilityRateParams',
              name: '_setup',
              type: 'tuple',
            },
          ],
          name: 'updateStabilityRateParams',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [],
          name: 'ammOracle',
          outputs: [
            {
              internalType: 'address',
              name: '',
              type: 'address',
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
          ],
          name: 'collateralAsset',
          outputs: [
            {
              components: [
                {
                  internalType: 'uint256',
                  name: 'factor',
                  type: 'uint256',
                },
                {
                  internalType: 'contract AggregatorV3Interface',
                  name: 'oracle',
                  type: 'address',
                },
                {
                  internalType: 'address',
                  name: 'anchor',
                  type: 'address',
                },
                {
                  internalType: 'uint8',
                  name: 'decimals',
                  type: 'uint8',
                },
                {
                  internalType: 'bool',
                  name: 'exists',
                  type: 'bool',
                },
                {
                  internalType: 'uint256',
                  name: 'liqIncentive',
                  type: 'uint256',
                },
                {
                  internalType: 'bytes32',
                  name: 'redstoneId',
                  type: 'bytes32',
                },
              ],
              internalType: 'struct CollateralAsset',
              name: 'asset',
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
              name: '_collateralAsset',
              type: 'address',
            },
          ],
          name: 'collateralExists',
          outputs: [
            {
              internalType: 'bool',
              name: 'exists',
              type: 'bool',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'domainSeparator',
          outputs: [
            {
              internalType: 'bytes32',
              name: '',
              type: 'bytes32',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'oracleDecimals',
          outputs: [
            {
              internalType: 'uint8',
              name: '',
              type: 'uint8',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'feeRecipient',
          outputs: [
            {
              internalType: 'address',
              name: '',
              type: 'address',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'getAllParams',
          outputs: [
            {
              components: [
                {
                  internalType: 'uint256',
                  name: 'minimumCollateralizationRatio',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'minimumDebtValue',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'liquidationThreshold',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'liquidationOverflowPercentage',
                  type: 'uint256',
                },
                {
                  internalType: 'address',
                  name: 'feeRecipient',
                  type: 'address',
                },
                {
                  internalType: 'uint8',
                  name: 'oracleDecimals',
                  type: 'uint8',
                },
                {
                  internalType: 'uint256',
                  name: 'oracleDeviationPct',
                  type: 'uint256',
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
            {
              internalType: 'bool',
              name: '_ignoreCollateralFactor',
              type: 'bool',
            },
          ],
          name: 'getCollateralAmountToValue',
          outputs: [
            {
              internalType: 'uint256',
              name: 'value',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'oraclePrice',
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
            {
              internalType: 'bool',
              name: '_ignoreKFactor',
              type: 'bool',
            },
          ],
          name: 'getKrAssetValue',
          outputs: [
            {
              internalType: 'uint256',
              name: 'value',
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
          ],
          name: 'krAssetExists',
          outputs: [
            {
              internalType: 'bool',
              name: 'exists',
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
              name: '_kreskoAsset',
              type: 'address',
            },
          ],
          name: 'kreskoAsset',
          outputs: [
            {
              components: [
                {
                  internalType: 'uint256',
                  name: 'kFactor',
                  type: 'uint256',
                },
                {
                  internalType: 'contract AggregatorV3Interface',
                  name: 'oracle',
                  type: 'address',
                },
                {
                  internalType: 'uint256',
                  name: 'supplyLimit',
                  type: 'uint256',
                },
                {
                  internalType: 'address',
                  name: 'anchor',
                  type: 'address',
                },
                {
                  internalType: 'uint256',
                  name: 'closeFee',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'openFee',
                  type: 'uint256',
                },
                {
                  internalType: 'bool',
                  name: 'exists',
                  type: 'bool',
                },
                {
                  internalType: 'bytes32',
                  name: 'redstoneId',
                  type: 'bytes32',
                },
              ],
              internalType: 'struct KrAsset',
              name: 'asset',
              type: 'tuple',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'liqIncentiveMultiplier',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'liquidationThreshold',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'maxLiquidationMultiplier',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'minimumCollateralizationRatio',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'minimumDebtValue',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'oracleDeviationPct',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address[]',
              name: '_assets',
              type: 'address[]',
            },
          ],
          name: 'batchOracleValues',
          outputs: [
            {
              components: [
                {
                  internalType: 'uint256',
                  name: 'price',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: '_redstonePrice',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'timestamp',
                  type: 'uint256',
                },
                {
                  internalType: 'address',
                  name: 'assetAddress',
                  type: 'address',
                },
                {
                  internalType: 'uint80',
                  name: 'roundId',
                  type: 'uint80',
                },
                {
                  internalType: 'bool',
                  name: 'marketOpen',
                  type: 'bool',
                },
              ],
              internalType: 'struct LibUI.Price[]',
              name: 'result',
              type: 'tuple[]',
            },
          ],
          stateMutability: 'view',
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
              internalType: 'address[]',
              name: '_tokens',
              type: 'address[]',
            },
            {
              internalType: 'address',
              name: '_staking',
              type: 'address',
            },
          ],
          name: 'getAccountData',
          outputs: [
            {
              components: [
                {
                  components: [
                    {
                      internalType: 'address',
                      name: 'assetAddress',
                      type: 'address',
                    },
                    {
                      internalType: 'address',
                      name: 'oracleAddress',
                      type: 'address',
                    },
                    {
                      internalType: 'uint256',
                      name: 'amount',
                      type: 'uint256',
                    },
                    {
                      internalType: 'uint256',
                      name: 'amountScaled',
                      type: 'uint256',
                    },
                    {
                      internalType: 'uint256',
                      name: 'priceRate',
                      type: 'uint256',
                    },
                    {
                      internalType: 'uint256',
                      name: 'stabilityRate',
                      type: 'uint256',
                    },
                    {
                      internalType: 'uint256',
                      name: 'amountUSD',
                      type: 'uint256',
                    },
                    {
                      internalType: 'uint256',
                      name: 'index',
                      type: 'uint256',
                    },
                    {
                      internalType: 'uint256',
                      name: 'kFactor',
                      type: 'uint256',
                    },
                    {
                      internalType: 'uint256',
                      name: 'price',
                      type: 'uint256',
                    },
                    {
                      internalType: 'uint256',
                      name: 'ammPrice',
                      type: 'uint256',
                    },
                    {
                      internalType: 'string',
                      name: 'symbol',
                      type: 'string',
                    },
                    {
                      internalType: 'string',
                      name: 'name',
                      type: 'string',
                    },
                    {
                      internalType: 'uint256',
                      name: 'openFee',
                      type: 'uint256',
                    },
                    {
                      internalType: 'uint256',
                      name: 'closeFee',
                      type: 'uint256',
                    },
                    {
                      internalType: 'bytes32',
                      name: 'redstoneId',
                      type: 'bytes32',
                    },
                  ],
                  internalType: 'struct LibUI.krAssetInfoUser[]',
                  name: 'krAssets',
                  type: 'tuple[]',
                },
                {
                  components: [
                    {
                      internalType: 'address',
                      name: 'assetAddress',
                      type: 'address',
                    },
                    {
                      internalType: 'address',
                      name: 'oracleAddress',
                      type: 'address',
                    },
                    {
                      internalType: 'uint256',
                      name: 'amount',
                      type: 'uint256',
                    },
                    {
                      internalType: 'uint256',
                      name: 'amountUSD',
                      type: 'uint256',
                    },
                    {
                      internalType: 'uint256',
                      name: 'cFactor',
                      type: 'uint256',
                    },
                    {
                      internalType: 'uint256',
                      name: 'liqIncentive',
                      type: 'uint256',
                    },
                    {
                      internalType: 'uint8',
                      name: 'decimals',
                      type: 'uint8',
                    },
                    {
                      internalType: 'uint256',
                      name: 'index',
                      type: 'uint256',
                    },
                    {
                      internalType: 'uint256',
                      name: 'price',
                      type: 'uint256',
                    },
                    {
                      internalType: 'string',
                      name: 'symbol',
                      type: 'string',
                    },
                    {
                      internalType: 'string',
                      name: 'name',
                      type: 'string',
                    },
                    {
                      internalType: 'bytes32',
                      name: 'redstoneId',
                      type: 'bytes32',
                    },
                  ],
                  internalType: 'struct LibUI.CollateralAssetInfoUser[]',
                  name: 'collateralAssets',
                  type: 'tuple[]',
                },
                {
                  internalType: 'bytes32[]',
                  name: 'redstoneIds',
                  type: 'bytes32[]',
                },
                {
                  internalType: 'uint256',
                  name: 'healthFactor',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'debtUSD',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'collateralUSD',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'minCollateralUSD',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'borrowingPowerUSD',
                  type: 'uint256',
                },
              ],
              internalType: 'struct LibUI.KreskoUser',
              name: 'user',
              type: 'tuple',
            },
            {
              components: [
                {
                  internalType: 'address',
                  name: 'token',
                  type: 'address',
                },
                {
                  internalType: 'uint256',
                  name: 'balance',
                  type: 'uint256',
                },
              ],
              internalType: 'struct LibUI.Balance[]',
              name: 'balances',
              type: 'tuple[]',
            },
            {
              components: [
                {
                  internalType: 'uint256',
                  name: 'pid',
                  type: 'uint256',
                },
                {
                  internalType: 'address',
                  name: 'depositToken',
                  type: 'address',
                },
                {
                  internalType: 'uint256',
                  name: 'totalDeposits',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'allocPoint',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'rewardPerBlocks',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'lastRewardBlock',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'depositAmount',
                  type: 'uint256',
                },
                {
                  internalType: 'address[]',
                  name: 'rewardTokens',
                  type: 'address[]',
                },
                {
                  internalType: 'uint256[]',
                  name: 'rewardAmounts',
                  type: 'uint256[]',
                },
              ],
              internalType: 'struct LibUI.StakingData[]',
              name: 'stakingData',
              type: 'tuple[]',
            },
            {
              internalType: 'uint256',
              name: 'ethBalance',
              type: 'uint256',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address[]',
              name: '_allTokens',
              type: 'address[]',
            },
            {
              internalType: 'address[]',
              name: '_assets',
              type: 'address[]',
            },
          ],
          name: 'getTokenData',
          outputs: [
            {
              components: [
                {
                  internalType: 'uint8',
                  name: 'decimals',
                  type: 'uint8',
                },
                {
                  internalType: 'string',
                  name: 'symbol',
                  type: 'string',
                },
                {
                  internalType: 'string',
                  name: 'name',
                  type: 'string',
                },
                {
                  internalType: 'uint256',
                  name: 'totalSupply',
                  type: 'uint256',
                },
              ],
              internalType: 'struct LibUI.TokenMetadata[]',
              name: 'metadatas',
              type: 'tuple[]',
            },
            {
              components: [
                {
                  internalType: 'uint256',
                  name: 'price',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: '_redstonePrice',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'timestamp',
                  type: 'uint256',
                },
                {
                  internalType: 'address',
                  name: 'assetAddress',
                  type: 'address',
                },
                {
                  internalType: 'uint80',
                  name: 'roundId',
                  type: 'uint80',
                },
                {
                  internalType: 'bool',
                  name: 'marketOpen',
                  type: 'bool',
                },
              ],
              internalType: 'struct LibUI.Price[]',
              name: 'prices',
              type: 'tuple[]',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address[]',
              name: '_collateralAssets',
              type: 'address[]',
            },
            {
              internalType: 'address[]',
              name: '_krAssets',
              type: 'address[]',
            },
          ],
          name: 'getGlobalData',
          outputs: [
            {
              components: [
                {
                  internalType: 'address',
                  name: 'assetAddress',
                  type: 'address',
                },
                {
                  internalType: 'address',
                  name: 'oracleAddress',
                  type: 'address',
                },
                {
                  internalType: 'uint256',
                  name: 'price',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'value',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'liqIncentive',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'cFactor',
                  type: 'uint256',
                },
                {
                  internalType: 'uint8',
                  name: 'decimals',
                  type: 'uint8',
                },
                {
                  internalType: 'string',
                  name: 'symbol',
                  type: 'string',
                },
                {
                  internalType: 'string',
                  name: 'name',
                  type: 'string',
                },
                {
                  internalType: 'bool',
                  name: 'marketOpen',
                  type: 'bool',
                },
                {
                  internalType: 'bytes32',
                  name: 'redstoneId',
                  type: 'bytes32',
                },
              ],
              internalType: 'struct LibUI.CollateralAssetInfo[]',
              name: 'collateralAssets',
              type: 'tuple[]',
            },
            {
              components: [
                {
                  internalType: 'address',
                  name: 'oracleAddress',
                  type: 'address',
                },
                {
                  internalType: 'address',
                  name: 'assetAddress',
                  type: 'address',
                },
                {
                  internalType: 'uint256',
                  name: 'price',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'ammPrice',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'priceRate',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'stabilityRate',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'value',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'openFee',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'closeFee',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'kFactor',
                  type: 'uint256',
                },
                {
                  internalType: 'string',
                  name: 'symbol',
                  type: 'string',
                },
                {
                  internalType: 'string',
                  name: 'name',
                  type: 'string',
                },
                {
                  internalType: 'bool',
                  name: 'marketOpen',
                  type: 'bool',
                },
                {
                  internalType: 'bytes32',
                  name: 'redstoneId',
                  type: 'bytes32',
                },
              ],
              internalType: 'struct LibUI.krAssetInfo[]',
              name: 'krAssets',
              type: 'tuple[]',
            },
            {
              components: [
                {
                  internalType: 'uint256',
                  name: 'minDebtValue',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'minCollateralRatio',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'liquidationThreshold',
                  type: 'uint256',
                },
              ],
              internalType: 'struct LibUI.ProtocolParams',
              name: 'protocolParams',
              type: 'tuple',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address[]',
              name: '_pairAddresses',
              type: 'address[]',
            },
          ],
          name: 'getPairsData',
          outputs: [
            {
              components: [
                {
                  internalType: 'uint8',
                  name: 'decimals0',
                  type: 'uint8',
                },
                {
                  internalType: 'uint8',
                  name: 'decimals1',
                  type: 'uint8',
                },
                {
                  internalType: 'uint256',
                  name: 'reserve0',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'reserve1',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'totalSupply',
                  type: 'uint256',
                },
              ],
              internalType: 'struct LibUI.PairData[]',
              name: 'result',
              type: 'tuple[]',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
      ],
    },
    FunderTestnetExtended: {
      address: '0x923066c1d74D4bb5b692dd2Ac6922Ac96c16a5f3',
      abi: [
        {
          inputs: [
            {
              internalType: 'address',
              name: '_kresko',
              type: 'address',
            },
            {
              internalType: 'address',
              name: '_tokenToFund',
              type: 'address',
            },
          ],
          stateMutability: 'nonpayable',
          type: 'constructor',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: 'address',
              name: 'account',
              type: 'address',
            },
          ],
          name: 'Funded',
          type: 'event',
        },
        {
          stateMutability: 'payable',
          type: 'fallback',
        },
        {
          inputs: [],
          name: 'distribute',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [],
          name: 'drain',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [],
          name: 'fundAmount',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
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
              name: '',
              type: 'address',
            },
          ],
          name: 'funded',
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
              name: 'account',
              type: 'address',
            },
          ],
          name: 'isEligible',
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
          name: 'kresko',
          outputs: [
            {
              internalType: 'contract IAccountStateFacet',
              name: '',
              type: 'address',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: '',
              type: 'address',
            },
          ],
          name: 'owners',
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
              internalType: 'uint256',
              name: 'amount',
              type: 'uint256',
            },
          ],
          name: 'setFundAmount',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address[]',
              name: 'accounts',
              type: 'address[]',
            },
          ],
          name: 'toggleOwners',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [],
          name: 'tokenToFund',
          outputs: [
            {
              internalType: 'contract MockERC20',
              name: '',
              type: 'address',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          stateMutability: 'payable',
          type: 'receive',
        },
      ],
    },
    GnosisSafeL2: {
      address: '0x592DF11FA740E796197Da85Ac5a875577d606440',
      abi: [],
    },
    KISS: {
      address: '0x8520C6452fc3ce680Bd1635D5B994cCE6b36D3Be',
      abi: [
        {
          stateMutability: 'payable',
          type: 'receive',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: false,
              internalType: 'address',
              name: 'account',
              type: 'address',
            },
          ],
          name: 'Unpaused',
          type: 'event',
        },
        {
          inputs: [],
          name: 'DOMAIN_SEPARATOR',
          outputs: [
            {
              internalType: 'bytes32',
              name: '',
              type: 'bytes32',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: 'shares',
              type: 'uint256',
            },
          ],
          name: 'convertToAssets',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          stateMutability: 'pure',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: 'assets',
              type: 'uint256',
            },
          ],
          name: 'convertToShares',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          stateMutability: 'pure',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: '',
              type: 'address',
            },
          ],
          name: 'nonces',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'paused',
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
              name: 'owner',
              type: 'address',
            },
            {
              internalType: 'address',
              name: 'spender',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'value',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'deadline',
              type: 'uint256',
            },
            {
              internalType: 'uint8',
              name: 'v',
              type: 'uint8',
            },
            {
              internalType: 'bytes32',
              name: 'r',
              type: 'bytes32',
            },
            {
              internalType: 'bytes32',
              name: 's',
              type: 'bytes32',
            },
          ],
          name: 'permit',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [],
          name: 'symbol',
          outputs: [
            {
              internalType: 'string',
              name: '',
              type: 'string',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
      ],
    },
    KISSFeed: {
      address: '0x1A604cF2957Abb03ce62a6642fd822EbcE15166b',
      abi: [
        {
          inputs: [],
          name: 'decimals',
          outputs: [
            {
              internalType: 'uint8',
              name: '',
              type: 'uint8',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'description',
          outputs: [
            {
              internalType: 'string',
              name: '',
              type: 'string',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint80',
              name: '_roundId',
              type: 'uint80',
            },
          ],
          name: 'getRoundData',
          outputs: [
            {
              internalType: 'uint80',
              name: 'roundId',
              type: 'uint80',
            },
            {
              internalType: 'int256',
              name: 'answer',
              type: 'int256',
            },
            {
              internalType: 'uint256',
              name: 'startedAt',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'updatedAt',
              type: 'uint256',
            },
            {
              internalType: 'uint80',
              name: 'answeredInRound',
              type: 'uint80',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'initialAnswer',
          outputs: [
            {
              internalType: 'int256',
              name: '',
              type: 'int256',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'latestRoundData',
          outputs: [
            {
              internalType: 'uint80',
              name: 'roundId',
              type: 'uint80',
            },
            {
              internalType: 'int256',
              name: 'answer',
              type: 'int256',
            },
            {
              internalType: 'uint256',
              name: 'startedAt',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'updatedAt',
              type: 'uint256',
            },
            {
              internalType: 'uint80',
              name: 'answeredInRound',
              type: 'uint80',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
      ],
    },
    KrStaking: {
      address: '0x98220ef713d394d7ffab7af93e52Ce94dbd312CC',
      abi: [
        {
          inputs: [
            {
              internalType: 'address',
              name: '_account',
              type: 'address',
            },
          ],
          name: 'allPendingRewards',
          outputs: [
            {
              components: [
                {
                  internalType: 'uint256',
                  name: 'pid',
                  type: 'uint256',
                },
                {
                  internalType: 'address[]',
                  name: 'tokens',
                  type: 'address[]',
                },
                {
                  internalType: 'uint256[]',
                  name: 'amounts',
                  type: 'uint256[]',
                },
              ],
              internalType: 'struct IKrStaking.Reward[]',
              name: 'allRewards',
              type: 'tuple[]',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: '_pid',
              type: 'uint256',
            },
            {
              internalType: 'address',
              name: '_rewardRecipient',
              type: 'address',
            },
          ],
          name: 'claim',
          outputs: [],
          stateMutability: 'payable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: '_to',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: '_pid',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: '_amount',
              type: 'uint256',
            },
          ],
          name: 'deposit',
          outputs: [],
          stateMutability: 'payable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: '_depositToken',
              type: 'address',
            },
          ],
          name: 'getPidFor',
          outputs: [
            {
              internalType: 'uint256',
              name: 'pid',
              type: 'uint256',
            },
            {
              internalType: 'bool',
              name: 'found',
              type: 'bool',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'massUpdatePools',
          outputs: [],
          stateMutability: 'payable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: '_pid',
              type: 'uint256',
            },
            {
              internalType: 'address',
              name: '_user',
              type: 'address',
            },
          ],
          name: 'pendingRewards',
          outputs: [
            {
              components: [
                {
                  internalType: 'uint256',
                  name: 'pid',
                  type: 'uint256',
                },
                {
                  internalType: 'address[]',
                  name: 'tokens',
                  type: 'address[]',
                },
                {
                  internalType: 'uint256[]',
                  name: 'amounts',
                  type: 'uint256[]',
                },
              ],
              internalType: 'struct IKrStaking.Reward',
              name: 'rewards',
              type: 'tuple',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: '_pid',
              type: 'uint256',
            },
          ],
          name: 'poolInfo',
          outputs: [
            {
              components: [
                {
                  internalType: 'contract IERC20',
                  name: 'depositToken',
                  type: 'address',
                },
                {
                  internalType: 'uint128',
                  name: 'allocPoint',
                  type: 'uint128',
                },
                {
                  internalType: 'uint128',
                  name: 'lastRewardBlock',
                  type: 'uint128',
                },
                {
                  internalType: 'uint256[]',
                  name: 'accRewardPerShares',
                  type: 'uint256[]',
                },
                {
                  internalType: 'address[]',
                  name: 'rewardTokens',
                  type: 'address[]',
                },
              ],
              internalType: 'struct IKrStaking.PoolInfo',
              name: '',
              type: 'tuple',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'poolLength',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
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
              name: '',
              type: 'address',
            },
          ],
          name: 'rewardPerBlockFor',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'totalAllocPoint',
          outputs: [
            {
              internalType: 'uint128',
              name: '',
              type: 'uint128',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: '_pid',
              type: 'uint256',
            },
            {
              internalType: 'address',
              name: '_account',
              type: 'address',
            },
          ],
          name: 'userInfo',
          outputs: [
            {
              components: [
                {
                  internalType: 'uint256',
                  name: 'amount',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256[]',
                  name: 'rewardDebts',
                  type: 'uint256[]',
                },
              ],
              internalType: 'struct IKrStaking.UserInfo',
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
              internalType: 'uint256',
              name: '_pid',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: '_amount',
              type: 'uint256',
            },
            {
              internalType: 'address',
              name: '_rewardRecipient',
              type: 'address',
            },
          ],
          name: 'withdraw',
          outputs: [],
          stateMutability: 'payable',
          type: 'function',
        },
      ],
    },
    KrStakingHelper: {
      address: '0xef65ED33bAeF1074346304f44dB22F6d03a3702f',
      abi: [
        {
          inputs: [
            {
              internalType: 'address',
              name: 'tokenA',
              type: 'address',
            },
            {
              internalType: 'address',
              name: 'tokenB',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'amountADesired',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'amountBDesired',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'amountAMin',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'amountBMin',
              type: 'uint256',
            },
            {
              internalType: 'address',
              name: 'to',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'deadline',
              type: 'uint256',
            },
          ],
          name: 'addLiquidityAndStake',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'to',
              type: 'address',
            },
          ],
          name: 'claimRewardsMulti',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'tokenA',
              type: 'address',
            },
            {
              internalType: 'address',
              name: 'tokenB',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'liquidity',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'amountAMin',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'amountBMin',
              type: 'uint256',
            },
            {
              internalType: 'address',
              name: 'to',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'deadline',
              type: 'uint256',
            },
          ],
          name: 'withdrawAndRemoveLiquidity',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
      ],
    },
    UniswapV2Factory: {
      address: '0x6af5142d9102De2C6c1A937f5F317f76598fB04E',
      abi: [
        {
          constant: true,
          inputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          name: 'allPairs',
          outputs: [
            {
              internalType: 'address',
              name: '',
              type: 'address',
            },
          ],
          payable: false,
          stateMutability: 'view',
          type: 'function',
        },
        {
          constant: true,
          inputs: [],
          name: 'allPairsLength',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          payable: false,
          stateMutability: 'view',
          type: 'function',
        },
        {
          constant: false,
          inputs: [
            {
              internalType: 'address',
              name: 'tokenA',
              type: 'address',
            },
            {
              internalType: 'address',
              name: 'tokenB',
              type: 'address',
            },
          ],
          name: 'createPair',
          outputs: [
            {
              internalType: 'address',
              name: 'pair',
              type: 'address',
            },
          ],
          payable: false,
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          constant: true,
          inputs: [
            {
              internalType: 'address',
              name: '',
              type: 'address',
            },
            {
              internalType: 'address',
              name: '',
              type: 'address',
            },
          ],
          name: 'getPair',
          outputs: [
            {
              internalType: 'address',
              name: '',
              type: 'address',
            },
          ],
          payable: false,
          stateMutability: 'view',
          type: 'function',
        },
        {
          constant: false,
          inputs: [
            {
              internalType: 'address',
              name: '_feeTo',
              type: 'address',
            },
          ],
          name: 'setFeeTo',
          outputs: [],
          payable: false,
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          constant: false,
          inputs: [
            {
              internalType: 'address',
              name: '_feeToSetter',
              type: 'address',
            },
          ],
          name: 'setFeeToSetter',
          outputs: [],
          payable: false,
          stateMutability: 'nonpayable',
          type: 'function',
        },
      ],
    },
    UniswapV2Oracle: {
      address: '0xDD2A261B01c2Bfe42d5d0D0a38758050aF083512',
      abi: [
        {
          inputs: [
            {
              internalType: 'address',
              name: '_pairAddress',
              type: 'address',
            },
            {
              internalType: 'address',
              name: '_token',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: '_amountIn',
              type: 'uint256',
            },
          ],
          name: 'consult',
          outputs: [
            {
              internalType: 'uint256',
              name: 'amountOut',
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
              name: '_amountIn',
              type: 'uint256',
            },
          ],
          name: 'consultKrAsset',
          outputs: [
            {
              internalType: 'uint256',
              name: 'amountOut',
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
          ],
          name: 'getKrAssetPair',
          outputs: [
            {
              components: [
                {
                  components: [
                    {
                      internalType: 'uint224',
                      name: '_x',
                      type: 'uint224',
                    },
                  ],
                  internalType: 'struct UQ.uq112x112',
                  name: 'price0Average',
                  type: 'tuple',
                },
                {
                  components: [
                    {
                      internalType: 'uint224',
                      name: '_x',
                      type: 'uint224',
                    },
                  ],
                  internalType: 'struct UQ.uq112x112',
                  name: 'price1Average',
                  type: 'tuple',
                },
                {
                  internalType: 'address',
                  name: 'token0',
                  type: 'address',
                },
                {
                  internalType: 'address',
                  name: 'token1',
                  type: 'address',
                },
                {
                  internalType: 'uint256',
                  name: 'price0CumulativeLast',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'price1CumulativeLast',
                  type: 'uint256',
                },
                {
                  internalType: 'uint32',
                  name: 'blockTimestampLast',
                  type: 'uint32',
                },
                {
                  internalType: 'uint256',
                  name: 'updatePeriod',
                  type: 'uint256',
                },
              ],
              internalType: 'struct IUniswapV2Oracle.PairData',
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
              name: '_pairAddress',
              type: 'address',
            },
          ],
          name: 'getPair',
          outputs: [
            {
              components: [
                {
                  components: [
                    {
                      internalType: 'uint224',
                      name: '_x',
                      type: 'uint224',
                    },
                  ],
                  internalType: 'struct UQ.uq112x112',
                  name: 'price0Average',
                  type: 'tuple',
                },
                {
                  components: [
                    {
                      internalType: 'uint224',
                      name: '_x',
                      type: 'uint224',
                    },
                  ],
                  internalType: 'struct UQ.uq112x112',
                  name: 'price1Average',
                  type: 'tuple',
                },
                {
                  internalType: 'address',
                  name: 'token0',
                  type: 'address',
                },
                {
                  internalType: 'address',
                  name: 'token1',
                  type: 'address',
                },
                {
                  internalType: 'uint256',
                  name: 'price0CumulativeLast',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'price1CumulativeLast',
                  type: 'uint256',
                },
                {
                  internalType: 'uint32',
                  name: 'blockTimestampLast',
                  type: 'uint32',
                },
                {
                  internalType: 'uint256',
                  name: 'updatePeriod',
                  type: 'uint256',
                },
              ],
              internalType: 'struct IUniswapV2Oracle.PairData',
              name: '',
              type: 'tuple',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'incentiveAmount',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'incentiveToken',
          outputs: [
            {
              internalType: 'contract IERC20Minimal',
              name: '',
              type: 'address',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: '',
              type: 'address',
            },
          ],
          name: 'krAssets',
          outputs: [
            {
              internalType: 'address',
              name: '',
              type: 'address',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'minUpdatePeriod',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
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
              name: '_pairAddress',
              type: 'address',
            },
          ],
          name: 'update',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: '_kreskoAsset',
              type: 'address',
            },
          ],
          name: 'updateWithIncentive',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
      ],
    },
    UniswapV2Router02: {
      address: '0xe17f98943882Fe46fBD282d2d6e35cE556Da0ef6',
      abi: [
        {
          inputs: [
            {
              internalType: 'address',
              name: 'tokenA',
              type: 'address',
            },
            {
              internalType: 'address',
              name: 'tokenB',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'amountADesired',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'amountBDesired',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'amountAMin',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'amountBMin',
              type: 'uint256',
            },
            {
              internalType: 'address',
              name: 'to',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'deadline',
              type: 'uint256',
            },
          ],
          name: 'addLiquidity',
          outputs: [
            {
              internalType: 'uint256',
              name: 'amountA',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'amountB',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'liquidity',
              type: 'uint256',
            },
          ],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'token',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'amountTokenDesired',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'amountTokenMin',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'amountETHMin',
              type: 'uint256',
            },
            {
              internalType: 'address',
              name: 'to',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'deadline',
              type: 'uint256',
            },
          ],
          name: 'addLiquidityETH',
          outputs: [
            {
              internalType: 'uint256',
              name: 'amountToken',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'amountETH',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'liquidity',
              type: 'uint256',
            },
          ],
          stateMutability: 'payable',
          type: 'function',
        },
        {
          inputs: [],
          name: 'factory',
          outputs: [
            {
              internalType: 'address',
              name: '',
              type: 'address',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: 'amountOut',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'reserveIn',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'reserveOut',
              type: 'uint256',
            },
          ],
          name: 'getAmountIn',
          outputs: [
            {
              internalType: 'uint256',
              name: 'amountIn',
              type: 'uint256',
            },
          ],
          stateMutability: 'pure',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: 'amountIn',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'reserveIn',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'reserveOut',
              type: 'uint256',
            },
          ],
          name: 'getAmountOut',
          outputs: [
            {
              internalType: 'uint256',
              name: 'amountOut',
              type: 'uint256',
            },
          ],
          stateMutability: 'pure',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: 'amountOut',
              type: 'uint256',
            },
            {
              internalType: 'address[]',
              name: 'path',
              type: 'address[]',
            },
          ],
          name: 'getAmountsIn',
          outputs: [
            {
              internalType: 'uint256[]',
              name: 'amounts',
              type: 'uint256[]',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: 'amountIn',
              type: 'uint256',
            },
            {
              internalType: 'address[]',
              name: 'path',
              type: 'address[]',
            },
          ],
          name: 'getAmountsOut',
          outputs: [
            {
              internalType: 'uint256[]',
              name: 'amounts',
              type: 'uint256[]',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: 'amountA',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'reserveA',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'reserveB',
              type: 'uint256',
            },
          ],
          name: 'quote',
          outputs: [
            {
              internalType: 'uint256',
              name: 'amountB',
              type: 'uint256',
            },
          ],
          stateMutability: 'pure',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'tokenA',
              type: 'address',
            },
            {
              internalType: 'address',
              name: 'tokenB',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'liquidity',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'amountAMin',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'amountBMin',
              type: 'uint256',
            },
            {
              internalType: 'address',
              name: 'to',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'deadline',
              type: 'uint256',
            },
          ],
          name: 'removeLiquidity',
          outputs: [
            {
              internalType: 'uint256',
              name: 'amountA',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'amountB',
              type: 'uint256',
            },
          ],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'token',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'liquidity',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'amountTokenMin',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'amountETHMin',
              type: 'uint256',
            },
            {
              internalType: 'address',
              name: 'to',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'deadline',
              type: 'uint256',
            },
          ],
          name: 'removeLiquidityETH',
          outputs: [
            {
              internalType: 'uint256',
              name: 'amountToken',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'amountETH',
              type: 'uint256',
            },
          ],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'token',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'liquidity',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'amountTokenMin',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'amountETHMin',
              type: 'uint256',
            },
            {
              internalType: 'address',
              name: 'to',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'deadline',
              type: 'uint256',
            },
            {
              internalType: 'bool',
              name: 'approveMax',
              type: 'bool',
            },
            {
              internalType: 'uint8',
              name: 'v',
              type: 'uint8',
            },
            {
              internalType: 'bytes32',
              name: 'r',
              type: 'bytes32',
            },
            {
              internalType: 'bytes32',
              name: 's',
              type: 'bytes32',
            },
          ],
          name: 'removeLiquidityETHWithPermit',
          outputs: [
            {
              internalType: 'uint256',
              name: 'amountToken',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'amountETH',
              type: 'uint256',
            },
          ],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'address',
              name: 'tokenA',
              type: 'address',
            },
            {
              internalType: 'address',
              name: 'tokenB',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'liquidity',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'amountAMin',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'amountBMin',
              type: 'uint256',
            },
            {
              internalType: 'address',
              name: 'to',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'deadline',
              type: 'uint256',
            },
            {
              internalType: 'bool',
              name: 'approveMax',
              type: 'bool',
            },
            {
              internalType: 'uint8',
              name: 'v',
              type: 'uint8',
            },
            {
              internalType: 'bytes32',
              name: 'r',
              type: 'bytes32',
            },
            {
              internalType: 'bytes32',
              name: 's',
              type: 'bytes32',
            },
          ],
          name: 'removeLiquidityWithPermit',
          outputs: [
            {
              internalType: 'uint256',
              name: 'amountA',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'amountB',
              type: 'uint256',
            },
          ],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: 'amountOut',
              type: 'uint256',
            },
            {
              internalType: 'address[]',
              name: 'path',
              type: 'address[]',
            },
            {
              internalType: 'address',
              name: 'to',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'deadline',
              type: 'uint256',
            },
          ],
          name: 'swapETHForExactTokens',
          outputs: [
            {
              internalType: 'uint256[]',
              name: 'amounts',
              type: 'uint256[]',
            },
          ],
          stateMutability: 'payable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: 'amountOutMin',
              type: 'uint256',
            },
            {
              internalType: 'address[]',
              name: 'path',
              type: 'address[]',
            },
            {
              internalType: 'address',
              name: 'to',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'deadline',
              type: 'uint256',
            },
          ],
          name: 'swapExactETHForTokens',
          outputs: [
            {
              internalType: 'uint256[]',
              name: 'amounts',
              type: 'uint256[]',
            },
          ],
          stateMutability: 'payable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: 'amountIn',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'amountOutMin',
              type: 'uint256',
            },
            {
              internalType: 'address[]',
              name: 'path',
              type: 'address[]',
            },
            {
              internalType: 'address',
              name: 'to',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'deadline',
              type: 'uint256',
            },
          ],
          name: 'swapExactTokensForETH',
          outputs: [
            {
              internalType: 'uint256[]',
              name: 'amounts',
              type: 'uint256[]',
            },
          ],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: 'amountIn',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'amountOutMin',
              type: 'uint256',
            },
            {
              internalType: 'address[]',
              name: 'path',
              type: 'address[]',
            },
            {
              internalType: 'address',
              name: 'to',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'deadline',
              type: 'uint256',
            },
          ],
          name: 'swapExactTokensForTokens',
          outputs: [
            {
              internalType: 'uint256[]',
              name: 'amounts',
              type: 'uint256[]',
            },
          ],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: 'amountOut',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'amountInMax',
              type: 'uint256',
            },
            {
              internalType: 'address[]',
              name: 'path',
              type: 'address[]',
            },
            {
              internalType: 'address',
              name: 'to',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'deadline',
              type: 'uint256',
            },
          ],
          name: 'swapTokensForExactETH',
          outputs: [
            {
              internalType: 'uint256[]',
              name: 'amounts',
              type: 'uint256[]',
            },
          ],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: 'amountOut',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'amountInMax',
              type: 'uint256',
            },
            {
              internalType: 'address[]',
              name: 'path',
              type: 'address[]',
            },
            {
              internalType: 'address',
              name: 'to',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'deadline',
              type: 'uint256',
            },
          ],
          name: 'swapTokensForExactTokens',
          outputs: [
            {
              internalType: 'uint256[]',
              name: 'amounts',
              type: 'uint256[]',
            },
          ],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          stateMutability: 'payable',
          type: 'receive',
        },
      ],
    },
    WETH: {
      address: '0xe39Ab88f8A4777030A534146A9Ca3B52bd5D43A3',
      abi: [
        {
          inputs: [],
          name: 'deposit',
          outputs: [],
          stateMutability: 'payable',
          type: 'function',
        },
        {
          inputs: [
            {
              internalType: 'uint256',
              name: 'wad',
              type: 'uint256',
            },
          ],
          name: 'withdraw',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
      ],
    },
    akrBTC: {
      address: '0x14e6a1772b7c0e598bEd12eA03de1fDb819E25A4',
      abi: anchorAbi,
    },
    akrETH: {
      address: '0xaB767C6FF9209Ea8844d9c9cDa0784559d56d61C',
      abi: anchorAbi,
    },

    krBTC: {
      address: '0x23ebF64A15Fa7580161617F292B8A844fB71BFF6',
      abi: krAssetAbi,
    },

    krCUBE: {
      address: '0xCc0498199e461c6e2dcFe4e21c380F0981Fc77aF',
      abi: [],
    },
    krETH: {
      address: '0xfb1B27839d64070D8AcdBF02872653e1178062d4',
      abi: krAssetAbi,
    },
  } as const,
};
