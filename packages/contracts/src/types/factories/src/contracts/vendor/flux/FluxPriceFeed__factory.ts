/* Autogenerated file. Do not edit manually. */
// @ts-nocheck
/* tslint:disable */
/* eslint-disable */
import { Signer, utils, Contract, ContractFactory, BigNumberish, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../../../../../common";
import type { FluxPriceFeed, FluxPriceFeedInterface } from "../../../../../src/contracts/vendor/flux/FluxPriceFeed";

const _abi = [
    {
        inputs: [
            {
                internalType: "address",
                name: "_validator",
                type: "address",
            },
            {
                internalType: "uint8",
                name: "_decimals",
                type: "uint8",
            },
            {
                internalType: "string",
                name: "_description",
                type: "string",
            },
        ],
        stateMutability: "nonpayable",
        type: "constructor",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "int256",
                name: "current",
                type: "int256",
            },
            {
                indexed: false,
                internalType: "bool",
                name: "marketOpen",
                type: "bool",
            },
            {
                indexed: true,
                internalType: "uint256",
                name: "roundId",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "updatedAt",
                type: "uint256",
            },
        ],
        name: "AnswerUpdated",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "uint256",
                name: "roundId",
                type: "uint256",
            },
            {
                indexed: true,
                internalType: "address",
                name: "startedBy",
                type: "address",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "startedAt",
                type: "uint256",
            },
        ],
        name: "NewRound",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "uint32",
                name: "aggregatorRoundId",
                type: "uint32",
            },
            {
                indexed: false,
                internalType: "int192",
                name: "answer",
                type: "int192",
            },
            {
                indexed: false,
                internalType: "bool",
                name: "marketOpen",
                type: "bool",
            },
            {
                indexed: false,
                internalType: "address",
                name: "transmitter",
                type: "address",
            },
        ],
        name: "NewTransmission",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "bytes32",
                name: "role",
                type: "bytes32",
            },
            {
                indexed: true,
                internalType: "bytes32",
                name: "previousAdminRole",
                type: "bytes32",
            },
            {
                indexed: true,
                internalType: "bytes32",
                name: "newAdminRole",
                type: "bytes32",
            },
        ],
        name: "RoleAdminChanged",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "bytes32",
                name: "role",
                type: "bytes32",
            },
            {
                indexed: true,
                internalType: "address",
                name: "account",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "sender",
                type: "address",
            },
        ],
        name: "RoleGranted",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "bytes32",
                name: "role",
                type: "bytes32",
            },
            {
                indexed: true,
                internalType: "address",
                name: "account",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "sender",
                type: "address",
            },
        ],
        name: "RoleRevoked",
        type: "event",
    },
    {
        inputs: [],
        name: "ADMIN_ROLE",
        outputs: [
            {
                internalType: "bytes32",
                name: "",
                type: "bytes32",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "DEFAULT_ADMIN_ROLE",
        outputs: [
            {
                internalType: "bytes32",
                name: "",
                type: "bytes32",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "VALIDATOR_ROLE",
        outputs: [
            {
                internalType: "bytes32",
                name: "",
                type: "bytes32",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "decimals",
        outputs: [
            {
                internalType: "uint8",
                name: "",
                type: "uint8",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "description",
        outputs: [
            {
                internalType: "string",
                name: "",
                type: "string",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "_roundId",
                type: "uint256",
            },
        ],
        name: "getAnswer",
        outputs: [
            {
                internalType: "int256",
                name: "",
                type: "int256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "_roundId",
                type: "uint256",
            },
        ],
        name: "getMarketOpen",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "role",
                type: "bytes32",
            },
        ],
        name: "getRoleAdmin",
        outputs: [
            {
                internalType: "bytes32",
                name: "",
                type: "bytes32",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "uint80",
                name: "_roundId",
                type: "uint80",
            },
        ],
        name: "getRoundData",
        outputs: [
            {
                internalType: "uint80",
                name: "roundId",
                type: "uint80",
            },
            {
                internalType: "int256",
                name: "answer",
                type: "int256",
            },
            {
                internalType: "bool",
                name: "marketOpen",
                type: "bool",
            },
            {
                internalType: "uint256",
                name: "startedAt",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "updatedAt",
                type: "uint256",
            },
            {
                internalType: "uint80",
                name: "answeredInRound",
                type: "uint80",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "_roundId",
                type: "uint256",
            },
        ],
        name: "getTimestamp",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "role",
                type: "bytes32",
            },
            {
                internalType: "address",
                name: "account",
                type: "address",
            },
        ],
        name: "grantRole",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "role",
                type: "bytes32",
            },
            {
                internalType: "address",
                name: "account",
                type: "address",
            },
        ],
        name: "hasRole",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "latestAggregatorRoundId",
        outputs: [
            {
                internalType: "uint32",
                name: "",
                type: "uint32",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "latestAnswer",
        outputs: [
            {
                internalType: "int256",
                name: "",
                type: "int256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "latestMarketOpen",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "latestRound",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "latestRoundData",
        outputs: [
            {
                internalType: "uint80",
                name: "roundId",
                type: "uint80",
            },
            {
                internalType: "int256",
                name: "answer",
                type: "int256",
            },
            {
                internalType: "bool",
                name: "marketOpen",
                type: "bool",
            },
            {
                internalType: "uint256",
                name: "startedAt",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "updatedAt",
                type: "uint256",
            },
            {
                internalType: "uint80",
                name: "answeredInRound",
                type: "uint80",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "latestTimestamp",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "latestTransmissionDetails",
        outputs: [
            {
                internalType: "int192",
                name: "_latestAnswer",
                type: "int192",
            },
            {
                internalType: "uint64",
                name: "_latestTimestamp",
                type: "uint64",
            },
            {
                internalType: "bool",
                name: "_marketOpen",
                type: "bool",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "role",
                type: "bytes32",
            },
            {
                internalType: "address",
                name: "account",
                type: "address",
            },
        ],
        name: "renounceRole",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "role",
                type: "bytes32",
            },
            {
                internalType: "address",
                name: "account",
                type: "address",
            },
        ],
        name: "revokeRole",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes4",
                name: "interfaceId",
                type: "bytes4",
            },
        ],
        name: "supportsInterface",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "int192",
                name: "_answer",
                type: "int192",
            },
            {
                internalType: "bool",
                name: "_marketOpen",
                type: "bool",
            },
        ],
        name: "transmit",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "typeAndVersion",
        outputs: [
            {
                internalType: "string",
                name: "",
                type: "string",
            },
        ],
        stateMutability: "pure",
        type: "function",
    },
    {
        inputs: [],
        name: "version",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
] as const;

const _bytecode =
    "0x604060a08152346200042a5762001704803803806200001e816200042f565b9283398101906060818303126200042a57805173ffffffffffffffffffffffffffffffffffffffff811691908290036200042a576020808201519260ff841684036200042a578286015167ffffffffffffffff938482116200042a570193601f918683870112156200042a5785518581116200030f577fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe096620000c7828601891687016200042f565b98828a528683830101116200042a57859060005b838110620004155750506000918901015260008052600084528760002033600052845260ff88600020541615620003c6575b7fa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c2177580600052600085528860002033600052855260ff8960002054161562000375575b507f21702c8af46127c7fa207f89d0b0a8441bb32959a0ac7df790e9ab1a25c989269081600052600085528860002081600052855260ff8960002054161562000325575b505060805284519283116200030f576003948554926001938481811c9116801562000304575b82821014620002ee57838111620002a3575b50809285116001146200021d57508394509083929160009462000211575b50501b9160001990841b1c19161790555b5161128f908162000475823960805181610a000152f35b015192503880620001e9565b9294849081168760005284600020946000905b8883831062000288575050501062000251575b505050811b019055620001fa565b01517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff83861b60f8161c1916905538808062000243565b85870151885590960195948501948793509081019062000230565b87600052816000208480880160051c820192848910620002e4575b0160051c019085905b828110620002d7575050620001cb565b60008155018590620002c7565b92508192620002be565b634e487b7160e01b600052602260045260246000fd5b90607f1690620001b9565b634e487b7160e01b600052604160045260246000fd5b81600052600085528860002081600052855288600020600160ff1982541617905533917f2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d600080a4388062000193565b80600052600085528860002033600052855288600020600160ff19825416179055339033907f2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d600080a4386200014f565b60008052600084528760002033600052845287600020600160ff19825416179055333360007f2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d8180a46200010d565b8181018301518b8201840152879201620000db565b600080fd5b6040519190601f017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe016820167ffffffffffffffff8111838210176200030f5760405256fe60806040908082526004908136101561001757600080fd5b600091823560e01c91826301ffc9a714610b6d57508163181f5a7714610b18578163248a9ca314610acf5781632f2ff15d14610a24578163313ce567146109e657816336568abe1461094457816350d25bcd14610913578163541780fd1461075157816354fd4d50146107355781635ed63b4014610710578163668a0f02146107105781637284e416146105da57816375b238fc1461059f5781638205bf6a1461056e57816384b0f349146104cc57816391d14854146104855781639a6fc8f5146103b8578163a217fddf1461039d578163b5ab58dc1461035f578163b633620c1461031a578163c49baebe146102df578163c6b050c1146102aa578163d547741f14610276578163e5fe4577146101dc575063feaf968c1461013957600080fd5b346101d957806003193601126101d9576101d58263ffffffff600154169283815260026020522091600184519361016f85611103565b8581549560ff8760170b9788835260c01c948594856020850152015416151597889101525195869584879490929360a0949796929760c087019869ffffffffffffffffffff80961688526020880152151560408701526060860152608085015216910152565b0390f35b80fd5b90503461027257816003193601126102725732330361022f57606083808463ffffffff6001541681526002602052209060ff60018354930154168151928060170b845260c01c6020840152151590820152f35b606490602084519162461bcd60e51b8352820152601460248201527f4f6e6c792063616c6c61626c6520627920454f410000000000000000000000006044820152fd5b5080fd5b8284346102725760016102a7916102a261028f36610c7d565b9390928387528660205286200154610cb5565b611173565b80f35b82843461027257816003193601126102725760ff60018260209463ffffffff8354168152600286522001541690519015158152f35b828434610272578160031936011261027257602090517f21702c8af46127c7fa207f89d0b0a8441bb32959a0ac7df790e9ab1a25c989268152f35b8383346101d9576020367ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc01126101d9575061035860209235611237565b9051908152f35b8383346101d9576020367ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc01126101d957506103586020923561120e565b82843461027257816003193601126102725751908152602090f35b919050346101d9576020367ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc01126101d95781359169ffffffffffffffffffff8316908184036104815784519061040e82611135565b600f82527f4e6f20646174612070726573656e740000000000000000000000000000000000602083015263ffffffff8093116104655750506101d59184918416815260026020522091600184519361016f85611103565b61047d865192839262461bcd60e51b84528301610c33565b0390fd5b8280fd5b8284346102725760ff8160209361049b36610c7d565b90825281865282822073ffffffffffffffffffffffffffffffffffffffff9091168252855220549151911615158152f35b905034610272576020367ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc011261027257803563ffffffff9182821161052b5760208560ff600182888888168152600286522001541690519015158152f35b606490602086519162461bcd60e51b8352820152601760248201527f466c75785072696365466565643a20726f756e642049440000000000000000006044820152fd5b8284346102725781600319360112610272578060209263ffffffff60015416815260028452205460c01c9051908152f35b828434610272578160031936011261027257602090517fa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c217758152f35b90508234610481578260031936011261048157805191836003549060019082821c928281168015610706575b60209586861082146106da575084885290811561069a5750600114610641575b6101d58686610637828b0383611151565b5191829182610c33565b929550600383527fc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f71f85b5b82841061068757505050826101d594610637928201019486610626565b805486850188015292860192810161066a565b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff001687860152505050151560051b8301019250610637826101d586610626565b7f4e487b7100000000000000000000000000000000000000000000000000000000845260229052602483fd5b93607f1693610606565b82843461027257816003193601126102725760209063ffffffff600154169051908152f35b8284346102725781600319360112610272576020905160018152f35b905082346104815780600319360112610481578135908160170b80920361090f5760243580151580910361090b577f21702c8af46127c7fa207f89d0b0a8441bb32959a0ac7df790e9ab1a25c989268552602093858552828620338752855260ff8387205416156108ae5760015463ffffffff91828216908382146108825750917f14763f9653228cd12887f43c05db1caec15aa7c42f8d1edabe741dcecf48c004959391816001606097950116809163ffffffff1916176001556001845161081981611103565b86815289810167ffffffffffffffff42168152868201938685528c5260028b52868c209151838060c01b03169067ffffffffffffffff60c01b905160c01b16178155019051151560ff80198354169116179055600154169582519384528301523390820152a280f35b7f4e487b7100000000000000000000000000000000000000000000000000000000895260119052602488fd5b82517f08c379a0000000000000000000000000000000000000000000000000000000008152908101859052601960248201527f43616c6c6572206973206e6f7420612076616c696461746f72000000000000006044820152606490fd5b8480fd5b8380fd5b8284346102725781600319360112610272578060209263ffffffff60015416815260028452205460170b9051908152f35b9050346102725761095436610c7d565b913373ffffffffffffffffffffffffffffffffffffffff84160361097d5750906102a791611173565b608490602086519162461bcd60e51b8352820152602f60248201527f416363657373436f6e74726f6c3a2063616e206f6e6c792072656e6f756e636560448201527f20726f6c657320666f722073656c6600000000000000000000000000000000006064820152fd5b8284346102725781600319360112610272576020905160ff7f0000000000000000000000000000000000000000000000000000000000000000168152f35b82843461027257610a3436610c7d565b909182845283602052610a4c60018286200154610cb5565b828452602084815281852073ffffffffffffffffffffffffffffffffffffffff9093168086529290528084205460ff1615610a85578380f35b828452836020528084208285526020528320600160ff1982541617905533917f2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d8480a48180808380f35b83915034610481576020367ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc011261048157816020936001923581528085522001549051908152f35b82843461027257816003193601126102725780516101d591610b3982611135565b601382527f466c757850726963654665656420312e302e300000000000000000000000000060208301525191829182610c33565b915034610481576020367ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc0112610481573563ffffffff60e01b811680910361048157602092507f7965db0b000000000000000000000000000000000000000000000000000000008114908115610be6575b5015158152f35b7f01ffc9a70000000000000000000000000000000000000000000000000000000014905083610bdf565b60005b838110610c235750506000910152565b8181015183820152602001610c13565b60409160208252610c538151809281602086015260208686019101610c10565b601f017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe016010190565b6040906003190112610cb0576004359060243573ffffffffffffffffffffffffffffffffffffffff81168103610cb05790565b600080fd5b6000818152602090808252604092838220338352835260ff848320541615610cdd5750505050565b33908451610cea81611103565b602a815284810191863684378151156110d657603083538151936001948510156110a9576078602184015360295b858111610fe25750610fa0578651936080850185811067ffffffffffffffff821117610f7357885260428552868501956060368837855115610f4657603087538551821015610f465790607860218701536041915b818311610e7b57505050610e3957938593610e0993610dfa604894610dc57f416363657373436f6e74726f6c3a206163636f756e74200000000000000000009961047d9b519a8b978801525180926037880190610c10565b8401917f206973206d697373696e6720726f6c6520000000000000000000000000000000603784015251809386840190610c10565b01036028810185520183611151565b517f08c379a000000000000000000000000000000000000000000000000000000000815291829160048301610c33565b60648587519062461bcd60e51b825280600483015260248201527f537472696e67733a20686578206c656e67746820696e73756666696369656e746044820152fd5b909192600f81166010811015610f19577f3031323334353637383961626364656600000000000000000000000000000000901a610eb885896111e7565b5360041c928015610eec577fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff019190610d6d565b7f4e487b710000000000000000000000000000000000000000000000000000000082526011600452602482fd5b7f4e487b710000000000000000000000000000000000000000000000000000000083526032600452602483fd5b7f4e487b710000000000000000000000000000000000000000000000000000000081526032600452602490fd5b7f4e487b710000000000000000000000000000000000000000000000000000000087526041600452602487fd5b60648688519062461bcd60e51b825280600483015260248201527f537472696e67733a20686578206c656e67746820696e73756666696369656e746044820152fd5b90600f8116601081101561107c577f3031323334353637383961626364656600000000000000000000000000000000901a61101d83866111e7565b5360041c90801561104f577fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff01610d18565b7f4e487b710000000000000000000000000000000000000000000000000000000087526011600452602487fd5b7f4e487b710000000000000000000000000000000000000000000000000000000088526032600452602488fd5b7f4e487b710000000000000000000000000000000000000000000000000000000086526032600452602486fd5b7f4e487b710000000000000000000000000000000000000000000000000000000085526032600452602485fd5b6060810190811067ffffffffffffffff82111761111f57604052565b634e487b7160e01b600052604160045260246000fd5b6040810190811067ffffffffffffffff82111761111f57604052565b90601f8019910116810190811067ffffffffffffffff82111761111f57604052565b9060009180835282602052604083209160018060a01b03169182845260205260ff6040842054166111a357505050565b80835282602052604083208284526020526040832060ff1981541690557ff6391f5c32d9c69d2a47ea670b442974b53935d1edc7fd64eb21e047a839171b339380a4565b9081518110156111f8570160200190565b634e487b7160e01b600052603260045260246000fd5b63ffffffff908181116112305716600052600260205260406000205460170b90565b5050600090565b63ffffffff908181116112305716600052600260205260406000205460c01c9056fea264697066735822122026d22a6c5c76f40741c311aa7dbfa7cb832a3b8006c3e0c63af72c46540f7c2064736f6c63430008130033";

type FluxPriceFeedConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (xs: FluxPriceFeedConstructorParams): xs is ConstructorParameters<typeof ContractFactory> =>
    xs.length > 1;

export class FluxPriceFeed__factory extends ContractFactory {
    constructor(...args: FluxPriceFeedConstructorParams) {
        if (isSuperArgs(args)) {
            super(...args);
        } else {
            super(_abi, _bytecode, args[0]);
        }
        this.contractName = "FluxPriceFeed";
    }

    override deploy(
        _validator: PromiseOrValue<string>,
        _decimals: PromiseOrValue<BigNumberish>,
        _description: PromiseOrValue<string>,
        overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<FluxPriceFeed> {
        return super.deploy(_validator, _decimals, _description, overrides || {}) as Promise<FluxPriceFeed>;
    }
    override getDeployTransaction(
        _validator: PromiseOrValue<string>,
        _decimals: PromiseOrValue<BigNumberish>,
        _description: PromiseOrValue<string>,
        overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): TransactionRequest {
        return super.getDeployTransaction(_validator, _decimals, _description, overrides || {});
    }
    override attach(address: string): FluxPriceFeed {
        return super.attach(address) as FluxPriceFeed;
    }
    override connect(signer: Signer): FluxPriceFeed__factory {
        return super.connect(signer) as FluxPriceFeed__factory;
    }
    static readonly contractName: "FluxPriceFeed";

    public readonly contractName: "FluxPriceFeed";

    static readonly bytecode = _bytecode;
    static readonly abi = _abi;
    static createInterface(): FluxPriceFeedInterface {
        return new utils.Interface(_abi) as FluxPriceFeedInterface;
    }
    static connect(address: string, signerOrProvider: Signer | Provider): FluxPriceFeed {
        return new Contract(address, _abi, signerOrProvider) as FluxPriceFeed;
    }
}
