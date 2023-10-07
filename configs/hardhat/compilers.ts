import type { SolcUserConfig } from 'hardhat/types';

const oldCompilerSettings = {
  settings: {
    optimizer: {
      enabled: !process.env.CI,
      runs: 1000,
    },
    outputSelection: {
      '*': {
        '*': ['storageLayout', 'evm.gasEstimates'],
      },
    },
  },
};
export const compilers: { compilers: SolcUserConfig[] } = {
  compilers: [
    {
      version: '0.8.19',
      settings: {
        viaIR: false,
        optimizer: {
          enabled: true,
          runs: 1000,
        },
        outputSelection: {
          '*': {
            '*': [
              'metadata',
              'abi',
              'storageLayout',
              'evm.methodIdentifiers',
              'devdoc',
              'userdoc',
              'evm.gasEstimates',
              'evm.byteCode',
            ],
          },
        },
      },
    },
    {
      version: '0.7.6',
      ...oldCompilerSettings,
    },
    {
      version: '0.6.12',
      ...oldCompilerSettings,
    },
    {
      version: '0.6.6',
      settings: {
        optimizer: {
          enabled: !process.env.CI,
          runs: 200,
        },
      },
    },
    {
      version: '0.5.16',
      settings: {
        optimizer: {
          enabled: !process.env.CI,
          runs: 200,
        },
      },
    },
  ],
};
