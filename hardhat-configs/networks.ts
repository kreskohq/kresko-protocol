import { utils } from "ethers";
import { HardhatNetworkAccountsConfig, HardhatNetworkChainsConfig, HardhatNetworkConfig } from "hardhat/types";

const parseUnits = utils.parseUnits;

export const chainIds = {
    aurora: 1313161554,
    auroratest: 1313161555,
    avalanche: 43114,
    avalanchetest: 43113,
    arbitrum: 42161,
    arbitrumtest: 79377087078960,
    bsc: 56,
    opkovan: 69,
    bsctest: 97,
    celo: 42220,
    celotest: 44787,
    ethereum: 1,
    goerli: 5,
    kovan: 42,
    moonbeam: 1284,
    moonriver: 1285,
    moonbase: 1287,
    rinkeby: 4,
    ropsten: 3,
    hardhat: 1337,
    fantom: 250,
    harmony: 1666600000,
    harmonytest: 1666700000,
    polygon: 137,
    polygontest: 80001,
    xdai: 100,
};

const defaultAccountConfig = (mnemonic: string) => ({
    count: 50,
    mnemonic,
});

export const networks: (mnemonic: string) => { [key: string]: any } = mnemonic => ({
    aurora: {
        accounts: defaultAccountConfig(mnemonic),
        gasPrice: 0,
        chainId: chainIds.aurora,
        url: `https://mainnet.aurora.dev/${process.env.AURORA_API_KEY}`,
        deploy: ["./src/deploy/aurora"],
        live: true,
    },
    auroratest: {
        accounts: defaultAccountConfig(mnemonic),
        chainId: chainIds.auroratest,
        url: "https://aurora-testnet.infura.io/v3/49b8b68abcc1484abfcb0f9e24a0c4c9",
        deploy: ["./src/deploy/auroratest"],
        gasPrice: 0,
        live: true,
    },
    opkovan: {
        accounts: defaultAccountConfig(mnemonic),
        chainId: chainIds.opkovan,
        url: "https://optimism-kovan.infura.io/v3/49b8b68abcc1484abfcb0f9e24a0c4c9",
        deploy: ["./src/deploy/auroratest"],
        live: true,
    },
    arbitrum: {
        accounts: defaultAccountConfig(mnemonic),
        url: "https://arb1.arbitrum.io/rpc",
        chainId: chainIds.arbitrum,
        tags: ["arbitrum"],
    },
    arbitrumtest: {
        accounts: defaultAccountConfig(mnemonic),
        url: "https://kovan3.arbitrum.io/rpc",
        chainId: chainIds.arbitrumtest,
        tags: ["arbitrumtest"],
    },
    avalanche: {
        accounts: defaultAccountConfig(mnemonic),
        url: "https://api.avax.network/ext/bc/C/rpc",
        chainId: chainIds.avalanche,
        tags: ["avalanche"],
    },
    avalanchetest: {
        accounts: defaultAccountConfig(mnemonic),
        url: "https://api.avax-test.network/ext/bc/C/rpc",
        chainId: chainIds.avalanchetest,
        tags: ["avalanchetest"],
    },
    bsc: {
        accounts: defaultAccountConfig(mnemonic),
        url: "https://bsc-dataseed.binance.org",
        chainId: chainIds.bsc,
        tags: ["bsc"],
    },
    bsctest: {
        accounts: defaultAccountConfig(mnemonic),
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
    hardhat: {
        accounts: defaultAccountConfig(mnemonic),
        chainId: chainIds.hardhat,
        saveDeployments: true,
        deploy: ["./src/deploy/auroratest"],
        mining: {
            automine: true,
        },
    },
    localhost: {
        accounts: defaultAccountConfig(mnemonic),
        saveDeployments: true,
        chainId: chainIds.hardhat,
        deploy: ["./src/deploy/local"],
    },
    ethereum: {
        accounts: defaultAccountConfig(mnemonic),
        url: "https://data-seed-prebsc-2-s3.binance.org:8545",
        chainId: chainIds.bsctest,
        tags: ["ethereum"],
    },
    kovan: {
        chainId: chainIds.kovan,
        url: `https://eth-kovan.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY_KOVAN}`,
        gasPrice: Number(parseUnits("10", "gwei")),
        deploy: ["./src/deploy/kovan"],
        live: true,
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
        accounts: defaultAccountConfig(mnemonic),
        url: "https://rpcapi.fantom.network",
        chainId: chainIds.fantom,
        tags: ["fantom"],
    },
    harmony: {
        accounts: defaultAccountConfig(mnemonic),
        url: "https://api.s0.t.hmny.io",
        chainId: chainIds.harmony,
        tags: ["harmony"],
    },
    harmonytest: {
        accounts: defaultAccountConfig(mnemonic),
        url: "https://api.s0.b.hmny.io",
        chainId: chainIds.harmonytest,
        tags: ["harmonytest"],
    },
    polygontest: {
        accounts: defaultAccountConfig(mnemonic),
        url: "https://rpc-mumbai.maticvigil.com/",
        chainId: chainIds.polygontest,
        tags: ["polygontest"],
    },
    polygon: {
        accounts: defaultAccountConfig(mnemonic),
        url: `https://polygon-rpc.com/`,
        chainId: chainIds.polygon,
        tags: ["polygon"],
    },
    xdai: {
        accounts: defaultAccountConfig(mnemonic),
        url: "https://rpc.xdaichain.com",
        chainId: chainIds.xdai,
        tags: ["xdai"],
    },
});
