import { INFURA_API_KEY, RPC_URL, ETHERSCAN, chains } from "@kreskolabs/configs";
import { parseUnits } from "ethers/lib/utils";
import { HttpNetworkConfig, NetworksUserConfig } from "hardhat/types";

/** @deprecated */
export const chainIds = {
    aurora: 1313161554,
    auroraTestnet: 1313161555,
    avalanche: 43114,
    avalancheTestnet: 43113,
    arbitrum: 42161,
    bsc: 56,
    bsctest: 97,
    celo: 42220,
    celotest: 44787,
    optimism: 10,
    opgoerli: 420,
    ethereum: 1,
    sepolia: 11155111,
    goerli: 5,
    kovan: 42,
    moonbeam: 1284,
    moonriver: 1285,
    moonbase: 1287,
    rinkeby: 4,
    ropsten: 3,
    hardhat: 1337,
    fantom: 2100,
    harmony: 1666600000,
    harmonyTestnet: 1666700000,
    polygon: 137,
    polygonMumbai: 80001,
    polygonZkEvm: 1101,
    polygonZkEvmTestnet: 1442,
    xdai: 100,
};

export const networks = (mnemonic: string): NetworksUserConfig => ({
    hardhat: {
        accounts: {
            mnemonic,
            count: 100,
        },
        blockGasLimit: process.env.CI ? 1599510662935 : 32000000,
        allowUnlimitedContractSize: !!process.env.CI,
        initialBaseFeePerGas: process.env.CI ? 0 : undefined,
        gasPrice: process.env.CI ? 1 : undefined,
        chainId: chainIds.hardhat,
        tags: ["local"],
    },
    localhost: {
        accounts: {
            mnemonic,
            count: 100,
        },
        chainId: chainIds.hardhat,
        tags: ["local"],
    },
    ethereum: {
        accounts: { mnemonic },
        url: RPC_URL().mainnet.infura,
        chainId: chains.mainnet.id,
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
        chainId: chains.sepolia.id,
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
        tags: ["arbitrumGoerli"],
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
        gasPrice: +parseUnits("0.0001", "gwei"),
        verify: {
            etherscan: ETHERSCAN.optimismGoerli.config,
        },
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
    xdai: {
        accounts: { mnemonic },
        url: "https://rpc.xdaichain.com",
        chainId: chainIds.xdai,
        tags: ["xdai"],
    },
    aurora: {
        accounts: {
            mnemonic,
        },
        gasPrice: 0,
        chainId: chainIds.aurora,
        url: `https://mainnet.aurora.dev`,
        deploy: ["./src/deploy/aurora"],
    },
    auroraTestnet: {
        accounts: {
            mnemonic,
        },
        chainId: chainIds.auroraTestnet,
        url: `https://aurora-testnet.infura.io/v3/${INFURA_API_KEY}`,
        deploy: ["./src/deploy/auroraTestnet"],
        gasPrice: 0,
    },
    avalanche: {
        accounts: { mnemonic },
        url: "https://api.avax.network/ext/bc/C/rpc",
        chainId: chainIds.avalanche,
        tags: ["avalanche"],
    },
    avalancheTestnet: {
        accounts: { mnemonic },
        url: "https://api.avax-test.network/ext/bc/C/rpc",
        chainId: chainIds.avalancheTestnet,
        tags: ["avalancheTestnet"],
    },
    bsc: {
        accounts: { mnemonic },
        url: "https://bsc-dataseed.binance.org",
        chainId: chainIds.bsc,
        tags: ["bsc"],
    },
    bsctest: {
        accounts: { mnemonic },
        url: "https://data-seed-prebsc-2-s3.binance.org:8545",
        chainId: chainIds.bsctest,
        tags: ["bsctest"],
    },
    celo: {
        url: "https://forno.celo.org",
        chainId: chainIds.celo,
        tags: ["celo"],
    },
    celotest: {
        url: "https://alfajores-forno.celo-testnet.org",
        chainId: chainIds.celotest,
        tags: ["celotest"],
    },
    moonbeam: {
        chainId: chainIds.moonbeam,
        url: "https://rpc.api.moonbeam.network",
        tags: ["moonbeam"],
    },
    moonriver: {
        chainId: chainIds.moonriver,
        url: "https://rpc.moonriver.moonbeam.network",
        tags: ["moonriver"],
    },
    moonbase: {
        chainId: chainIds.moonbase,
        url: "https://rpc.api.moonbase.moonbeam.network",
        tags: ["moonbase"],
    },
    fantom: {
        accounts: { mnemonic },
        url: "https://rpcapi.fantom.network",
        chainId: chainIds.fantom,
        tags: ["fantom"],
    },
    harmony: {
        accounts: { mnemonic },
        url: "https://api.s0.t.hmny.io",
        chainId: chainIds.harmony,
        tags: ["harmony"],
    },
    harmonyTestnet: {
        accounts: { mnemonic },
        url: "https://api.s0.b.hmny.io",
        chainId: chainIds.harmonyTestnet,
        tags: ["harmonyTestnet"],
    },
});

export const handleForking = (networkConfig: ReturnType<typeof networks>) =>
    process.env.FORKING
        ? {
              ...networkConfig,
              hardhat: {
                  ...networkConfig.hardhat,
                  forking: {
                      url: (networkConfig[process.env.FORKING] as HttpNetworkConfig).url,
                      blockNumber: process.env.FORKING_BLOCKNUMBER
                          ? parseInt(process.env.FORKING_BLOCKNUMBER)
                          : undefined,
                  },
                  companionNetworks: {
                      live: process.env.FORKING,
                  },
              },
          }
        : networkConfig;
