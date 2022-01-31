import { utils } from "ethers";

const parseUnits = utils.parseUnits;

export const chainIds = {
    aurora: 1313161554,
    auroratest: 1313161555,
    avalanche: 43114,
    avalanchetest: 43113,
    arbitrum: 42161,
    arbitrumtest: 79377087078960,
    bsc: 56,
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

export const networks = (mnemonic: string) => ({
    aurora: {
        accounts: {
            mnemonic,
        },
        gasPrice: 0,
        chainId: chainIds.aurora,
        url: "https://mainnet.aurora.dev",
        tags: ["aurora"],
    },
    auroratest: {
        chainId: chainIds.auroratest,
        gasPrice: 0,
        url: "https://testnet.aurora.dev",
        tags: ["auroratest"],
    },
    arbitrum: {
        accounts: { mnemonic },
        url: "https://arb1.arbitrum.io/rpc",
        chainId: chainIds.arbitrum,
        tags: ["arbitrum"],
    },
    arbitrumtest: {
        accounts: { mnemonic },
        url: "https://kovan3.arbitrum.io/rpc",
        chainId: chainIds.arbitrumtest,
        tags: ["arbitrumtest"],
    },
    avalanche: {
        accounts: { mnemonic },
        url: "https://api.avax.network/ext/bc/C/rpc",
        chainId: chainIds.avalanche,
        tags: ["avalanche"],
    },
    avalanchetest: {
        accounts: { mnemonic },
        url: "https://api.avax-test.network/ext/bc/C/rpc",
        chainId: chainIds.avalanchetest,
        tags: ["avalanchetest"],
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
    hardhat: {
        accounts: {
            mnemonic,
        },
        saveDeployments: false,
        chainId: chainIds.hardhat,
        tags: ["test"],
    },
    localhost: {
        accounts: {
            mnemonic,
        },
        saveDeployments: true,
        chainId: chainIds.hardhat,
        tags: ["test", "local"],
    },
    ethereum: {
        accounts: { mnemonic },
        url: "https://data-seed-prebsc-2-s3.binance.org:8545",
        chainId: chainIds.bsctest,
        tags: ["ethereum"],
    },
    kovan: {
        chainId: chainIds.kovan,
        url: `https://eth-kovan.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY_KOVAN}`,
        gasPrice: Number(parseUnits("10", "gwei")),
        tags: ["kovan"],
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
    harmonytest: {
        accounts: { mnemonic },
        url: "https://api.s0.b.hmny.io",
        chainId: chainIds.harmonytest,
        tags: ["harmonytest"],
    },
    polygontest: {
        accounts: { mnemonic },
        url: "https://rpc-mumbai.maticvigil.com/",
        chainId: chainIds.polygontest,
        tags: ["polygontest"],
    },
    polygon: {
        accounts: { mnemonic },
        url: `https://polygon-rpc.com/`,
        chainId: chainIds.polygon,
        tags: ["polygon"],
    },
    xdai: {
        accounts: { mnemonic },
        url: "https://rpc.xdaichain.com",
        chainId: chainIds.xdai,
        tags: ["xdai"],
    },
});
