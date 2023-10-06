import { INFURA_API_KEY, RPC_URL, ETHERSCAN } from "@kreskolabs/configs";
import type { HttpNetworkConfig, NetworksUserConfig } from "hardhat/types";
import * as chains from "viem/chains";

export const networks = (mnemonic: string): NetworksUserConfig => ({
  hardhat: {
    accounts: {
      mnemonic,
      count: 100,
    },
    saveDeployments: true,
    blockGasLimit: process.env.CI ? 1599510662935 : 32000000,
    allowUnlimitedContractSize: !!process.env.CI,
    initialBaseFeePerGas: process.env.CI ? 0 : undefined,
    gasPrice: process.env.CI ? 1 : undefined,
    chainId: chains.hardhat.id,
    tags: ["local"],
    hardfork: "merge",
  },
  localhost: {
    accounts: {
      mnemonic,
      count: 100,
    },
    chainId: chains.hardhat.id,
    tags: ["local"],
  },
  ethereum: {
    accounts: { mnemonic },
    url: RPC_URL().mainnet.infura,
    chainId: 1,
    tags: ["ethereum"],
    verify: {
      etherscan: ETHERSCAN.mainnet.config,
    },
  },
  goerli: {
    accounts: { mnemonic },
    url: RPC_URL().goerli.alchemy,
    chainId: chains.goerli.id,
    tags: ["goerli"],
    verify: {
      etherscan: ETHERSCAN.goerli.config,
    },
  },
  sepolia: {
    accounts: { mnemonic },
    url: RPC_URL().sepolia.alchemy,
    chainId: 11155111,
    tags: ["sepolia"],
    verify: {
      etherscan: ETHERSCAN.sepolia.config,
    },
  },
  arbitrum: {
    accounts: { mnemonic },
    url: RPC_URL().arbitrum.alchemy,
    chainId: chains.arbitrum.id,
    tags: ["arbitrum"],
    verify: {
      etherscan: ETHERSCAN.arbitrum.config,
    },
  },
  arbitrumGoerli: {
    accounts: { mnemonic },
    url: RPC_URL().arbitrumGoerli.alchemy,
    chainId: chains.arbitrumGoerli.id,
    verify: {
      etherscan: ETHERSCAN.arbitrumGoerli.config,
    },
  },
  arbitrumSepolia: {
    accounts: { mnemonic },
    url: RPC_URL().arbitrumGoerli.alchemy,
    chainId: 421614,
    verify: {
      etherscan: ETHERSCAN.arbitrumGoerli.config,
    },
  },
  arbitrumNova: {
    accounts: { mnemonic },
    url: RPC_URL().arbitrumNova.default,
    chainId: chains.arbitrumNova.id,
    tags: ["arbitrumNova"],
    verify: {
      etherscan: ETHERSCAN.arbitrumNova.config,
    },
  },
  optimism: {
    accounts: { mnemonic, count: 100 },
    url: RPC_URL().optimism.alchemy,
    chainId: chains.optimism.id,
    saveDeployments: true,
    tags: ["optimism"],
    verify: {
      etherscan: ETHERSCAN.optimism.config,
    },
  },
  opgoerli: {
    accounts: { mnemonic, count: 100 },
    url: RPC_URL().optimismGoerli.alchemy,
    chainId: chains.optimismGoerli.id,
    gasPrice: 100000,
    verify: {
      etherscan: ETHERSCAN.optimismGoerli.config,
    },
    hardfork: "merge",
  },
  polygon: {
    accounts: { mnemonic },
    url: RPC_URL().polygon.default,
    chainId: chains.polygon.id,
    tags: ["polygon"],
    verify: {
      etherscan: ETHERSCAN.polygon.config,
    },
  },
  polygonMumbai: {
    accounts: { mnemonic },
    url: RPC_URL().polygonMumbai.mumbai.alchemy,
    chainId: chains.polygonMumbai.id,
    tags: ["polygonMumbai"],
    verify: {
      etherscan: ETHERSCAN.polygonMumbai.config,
    },
  },
  polygonZkEvm: {
    accounts: { mnemonic },
    url: RPC_URL().polygonZkEvm.default,
    chainId: chains.polygonZkEvm.id,
    tags: ["polygonZkEvm"],
    verify: {
      etherscan: ETHERSCAN.polygonZkEvm.config,
    },
  },
  polygonZkEvmTestnet: {
    accounts: { mnemonic },
    url: RPC_URL().polygonZkEvmTestnet.testnet.alchemy,
    chainId: chains.polygonZkEvmTestnet.id,
    tags: ["polygonZkEvmTestnet"],
    verify: {
      etherscan: ETHERSCAN.polygonZkEvmTestnet.config,
    },
  },
  ...networksPartialConfig(mnemonic),
});

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
    : networkConfig;
};

export const networksPartialConfig = (mnemonic: string) => ({
  xdai: {
    accounts: { mnemonic },
    url: "https://rpc.xdaichain.com",
    chainId: 100,
    tags: ["xdai"],
  },
  aurora: {
    accounts: {
      mnemonic,
    },
    gasPrice: 0,
    chainId: 1313161554,
    url: `https://mainnet.aurora.dev`,
    tags: ["aurora"],
  },
  auroraTestnet: {
    accounts: {
      mnemonic,
    },
    chainId: 1313161555,
    url: `https://aurora-testnet.infura.io/v3/${INFURA_API_KEY()}`,
    tags: ["auroraTestnet"],
    gasPrice: 0,
  },
  avalanche: {
    accounts: { mnemonic },
    url: "https://api.avax.network/ext/bc/C/rpc",
    chainId: 43114,
    tags: ["avalanche"],
  },
  avalancheTestnet: {
    accounts: { mnemonic },
    url: "https://api.avax-test.network/ext/bc/C/rpc",
    chainId: 43113,
    tags: ["avalancheTestnet"],
  },
  bsc: {
    accounts: { mnemonic },
    url: "https://bsc-dataseed.binance.org",
    chainId: 56,
    tags: ["bsc"],
  },
  bsctest: {
    accounts: { mnemonic },
    url: "https://data-seed-prebsc-2-s3.binance.org:8545",
    chainId: 97,
    tags: ["bsctest"],
  },
  celo: {
    url: "https://forno.celo.org",
    chainId: 42220,
    tags: ["celo"],
  },
  celotest: {
    url: "https://alfajores-forno.celo-testnet.org",
    chainId: 44787,
    tags: ["celotest"],
  },
  moonbeam: {
    chainId: 1284,
    url: "https://rpc.api.moonbeam.network",
    tags: ["moonbeam"],
  },
  moonriver: {
    chainId: 1285,
    url: "https://rpc.moonriver.moonbeam.network",
    tags: ["moonriver"],
  },
  moonbase: {
    chainId: 1287,
    url: "https://rpc.api.moonbase.moonbeam.network",
    tags: ["moonbase"],
  },
  fantom: {
    accounts: { mnemonic },
    url: "https://rpcapi.fantom.network",
    chainId: 2100,
    tags: ["fantom"],
  },
  harmony: {
    accounts: { mnemonic },
    url: "https://api.s0.t.hmny.io",
    chainId: 1666600000,
    tags: ["harmony"],
  },
  harmonyTestnet: {
    accounts: { mnemonic },
    url: "https://api.s0.b.hmny.io",
    chainId: 1666700000,
    tags: ["harmonyTestnet"],
  },
});
