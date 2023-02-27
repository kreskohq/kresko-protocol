import { ALCHEMY_API_KEY_GOERLI, INFURA_API_KEY, RPC } from "@kreskolabs/configs";
import { parseUnits } from "ethers/lib/utils";
import { HttpNetworkUserConfig } from "hardhat/types";

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
    op: 10,
    opkovan: 69,
    opgoerli: 420,
    ethereum: 1,
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
    harmonytest: 1666700000,
    polygon: 137,
    polygontest: 80001,
    xdai: 100,
};

export const networks = (mnemonic: string): { [key: string]: HttpNetworkUserConfig } => ({
    aurora: {
        accounts: {
            mnemonic,
        },
        gasPrice: 0,
        chainId: chainIds.aurora,
        url: `https://mainnet.aurora.dev`,
        deploy: ["./src/deploy/aurora"],
        live: true,
    },
    auroratest: {
        accounts: {
            mnemonic,
        },
        chainId: chainIds.auroratest,
        url: `https://aurora-testnet.infura.io/v3/${INFURA_API_KEY}`,
        deploy: ["./src/deploy/auroratest"],
        gasPrice: 0,
        live: true,
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
            count: 100,
        },
        chainId: chainIds.hardhat,
    },
    ganache: {
        url: "http://127.0.0.1:7545",
        chainId: 1337,
        accounts: { mnemonic, count: 100 },
        companionNetworks: {
            live: "opgoerli",
        },
    },
    localhost: {
        accounts: {
            mnemonic,
            count: 100,
        },
        chainId: chainIds.hardhat,
    },
    ethereum: {
        accounts: { mnemonic },
        url: RPC().eth.mainnet.infura,
        chainId: chainIds.ethereum,
        tags: ["ethereum"],
        live: true,
    },
    op: {
        accounts: { mnemonic, count: 100 },
        url: RPC().optimism.mainnet.default,
        chainId: chainIds.op,
        saveDeployments: true,
        tags: ["mainnet"],
    },
    opgoerli: {
        accounts: { mnemonic, count: 100 },
        url: RPC().optimism.goerli.alchemy,
        chainId: chainIds.opgoerli,
        gasPrice: +parseUnits("0.001", "gwei"),
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
        url: RPC().polygon.mainnet.default,
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
