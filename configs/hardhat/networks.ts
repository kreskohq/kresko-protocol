import type { HttpNetworkConfig, NetworksUserConfig } from 'hardhat/types'

export const networks = (mnemonic: string): NetworksUserConfig => ({
  hardhat: {
    accounts: {
      mnemonic,
      count: 100,
    },
    saveDeployments: false,
    blockGasLimit: process.env.CI ? 1599510662935 : 2599510662935,
    allowUnlimitedContractSize: true,
    initialBaseFeePerGas: process.env.CI ? 0 : undefined,
    gasPrice: process.env.CI ? 1 : undefined,
    chainId: 31337,
    tags: ['local'],
    hardfork: 'merge',
  },
  localhost: {
    accounts: {
      mnemonic,
      count: 100,
    },
    chainId: 1337,
    tags: ['local'],
  },
  ethereum: {
    accounts: { mnemonic },
    url: rpc('mainnet'),
    chainId: 1,
    tags: ['ethereum'],
    verify: {
      etherscan: etherscan('mainnet'),
    },
  },
  goerli: {
    accounts: { mnemonic },
    url: rpc('goerli'),
    chainId: 5,
    tags: ['goerli'],
    verify: {
      etherscan: etherscan('goerli'),
    },
  },
  sepolia: {
    accounts: { mnemonic },
    url: rpc('sepolia'),
    chainId: 11155111,
    tags: ['sepolia'],
    verify: {
      etherscan: etherscan('sepolia'),
    },
  },
  arbitrum: {
    accounts: { mnemonic },
    url: rpc('arbitrum'),
    chainId: 42161,
    tags: ['arbitrum'],
    verify: {
      etherscan: etherscan('arbitrum'),
    },
  },
  arbitrumSepolia: {
    accounts: { mnemonic },
    url: rpc('arbitrum_sepolia'),
    chainId: 421614,
    verify: {
      etherscan: etherscan('arbitrum_sepolia'),
    },
  },
  arbitrumNova: {
    accounts: { mnemonic },
    url: rpc('arbitrum_nova'),
    chainId: 42170,
    tags: ['arbitrumNova'],
    verify: {
      etherscan: etherscan('arbitrum_nova'),
    },
  },
  optimism: {
    accounts: { mnemonic, count: 100 },
    url: rpc('optimism'),
    chainId: 10,
    saveDeployments: true,
    tags: ['optimism'],
    verify: {
      etherscan: etherscan('optimism'),
    },
  },
  polygon: {
    accounts: { mnemonic },
    url: rpc('polygon'),
    chainId: 137,
    tags: ['polygon'],
    verify: {
      etherscan: etherscan('polygon'),
    },
  },
  polygonMumbai: {
    accounts: { mnemonic },
    url: rpc('polygon_mumbai'),
    chainId: 80001,
    tags: ['polygonMumbai'],
    verify: {
      etherscan: etherscan('polygon_mumbai'),
    },
  },
  polygonZkEvm: {
    accounts: { mnemonic },
    url: rpc('polygon_zkevm'),
    chainId: 1101,
    tags: ['polygonZkEvm'],
    verify: {
      etherscan: etherscan('polygon_zkevm'),
    },
  },
  polygonZkEvmTestnet: {
    accounts: { mnemonic },
    url: rpc('polygon_zkevm_testnet'),
    chainId: 1442,
    tags: ['polygonZkEvmTestnet'],
    verify: {
      etherscan: etherscan('polygon_zkevm_testnet'),
    },
  },
  ...networksPartialConfig(mnemonic),
})

export const networksPartialConfig = (mnemonic: string) => ({
  xdai: {
    accounts: { mnemonic },
    url: 'https://rpc.xdaichain.com',
    chainId: 100,
    tags: ['xdai'],
  },
  aurora: {
    accounts: {
      mnemonic,
    },
    gasPrice: 0,
    chainId: 1313161554,
    url: `https://mainnet.aurora.dev`,
    tags: ['aurora'],
  },
  avalanche: {
    accounts: { mnemonic },
    url: 'https://api.avax.network/ext/bc/C/rpc',
    chainId: 43114,
    tags: ['avalanche'],
  },
  avalancheTestnet: {
    accounts: { mnemonic },
    url: 'https://api.avax-test.network/ext/bc/C/rpc',
    chainId: 43113,
    tags: ['avalancheTestnet'],
  },
  bsc: {
    accounts: { mnemonic },
    url: 'https://bsc-dataseed.binance.org',
    chainId: 56,
    tags: ['bsc'],
  },
  bsctest: {
    accounts: { mnemonic },
    url: 'https://data-seed-prebsc-2-s3.binance.org:8545',
    chainId: 97,
    tags: ['bsctest'],
  },
  celo: {
    url: 'https://forno.celo.org',
    chainId: 42220,
    tags: ['celo'],
  },
  celotest: {
    url: 'https://alfajores-forno.celo-testnet.org',
    chainId: 44787,
    tags: ['celotest'],
  },
  moonbeam: {
    chainId: 1284,
    url: 'https://rpc.api.moonbeam.network',
    tags: ['moonbeam'],
  },
  moonriver: {
    chainId: 1285,
    url: 'https://rpc.moonriver.moonbeam.network',
    tags: ['moonriver'],
  },
  moonbase: {
    chainId: 1287,
    url: 'https://rpc.api.moonbase.moonbeam.network',
    tags: ['moonbase'],
  },
  fantom: {
    accounts: { mnemonic },
    url: 'https://rpcapi.fantom.network',
    chainId: 2100,
    tags: ['fantom'],
  },
  harmony: {
    accounts: { mnemonic },
    url: 'https://api.s0.t.hmny.io',
    chainId: 1666600000,
    tags: ['harmony'],
  },
  harmonyTestnet: {
    accounts: { mnemonic },
    url: 'https://api.s0.b.hmny.io',
    chainId: 1666700000,
    tags: ['harmonyTestnet'],
  },
})

export const handleForking = (networkConfig: ReturnType<typeof networks>) => {
  return process.env.FORKING !== undefined
    ? {
        ...networkConfig,
        hardhat: {
          ...networkConfig.hardhat,
          forking: {
            url: (networkConfig[process.env.FORKING] as HttpNetworkConfig).url,
            blockNumber: process.env.FORKING_BLOCKNUMBER ? parseInt(process.env.FORKING_BLOCKNUMBER) : undefined,
          },
          companionNetworks: {
            live: process.env.FORKING,
          },
        },
      }
    : networkConfig
}

const rpc = (network: string) => {
  if (process.env.ALCHEMY_API_KEY) {
    return process.env[`RPC_${network.toUpperCase()}_ALCHEMY`] ?? process.env[`RPC_${network.toUpperCase()}`]
  }
  return process.env[`RPC_${network.toUpperCase()}`]
}

const etherscan = (network: string) => {
  const apiKey = process.env[`ETHERSCAN_API_KEY_${network.toUpperCase()}`]
  if (apiKey) {
    return {
      apiKey,
      apiUrl: process.env[`ETHERSCAN_API_URL_${network.toUpperCase()}`],
    }
  }
}
