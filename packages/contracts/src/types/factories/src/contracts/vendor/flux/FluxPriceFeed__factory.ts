/* Autogenerated file. Do not edit manually. */
// @ts-nocheck
/* tslint:disable */
/* eslint-disable */
import {
  Signer,
  utils,
  Contract,
  ContractFactory,
  BigNumberish,
  Overrides,
} from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../../../../../common";
import type {
  FluxPriceFeed,
  FluxPriceFeedInterface,
} from "../../../../../src/contracts/vendor/flux/FluxPriceFeed";

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
  "0x60a060405234620001325762001c17803803806200001d816200015e565b9283398101606082820312620001325781519173ffffffffffffffffffffffffffffffffffffffff831683036200013257602092838201519160ff831683036200013257604081015167ffffffffffffffff918282116200013257019484601f870112156200013257855191821162000137575b620000c3601f83017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe01682016200015e565b9482865281838801011162000132576000955b8287106200011c575081620000f496116200010d575b50506200036b565b60405161165c9081620005bb82396080518161055c0152f35b600091850101523880620000ec565b86810182015186880183015295810195620000d6565b600080fd5b6200014162000147565b62000091565b50634e487b7160e01b600052604160045260246000fd5b6040519190601f017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe016820167ffffffffffffffff811183821017620001a357604052565b620001ad62000147565b604052565b90600182811c92168015620001e4575b6020831014620001ce57565b634e487b7160e01b600052602260045260246000fd5b91607f1691620001c2565b601f8111620001fc575050565b6000906003825260208220906020601f850160051c830194106200023d575b601f0160051c01915b8281106200023157505050565b81815560010162000224565b90925082906200021b565b805190919067ffffffffffffffff81116200035b575b620002768162000270600354620001b2565b620001ef565b602080601f8311600114620002b55750819293600092620002a9575b50508160011b916000199060031b1c191617600355565b01519050388062000292565b60036000527fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe08316949091907fc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f71f85b926000905b8782106200034257505083600195961062000328575b505050811b01600355565b015160001960f88460031b161c191690553880806200031d565b8060018596829496860151815501950193019062000307565b6200036562000147565b6200025e565b3360009081527fad3228b676f7d3cd4284a5443f17f1962b36e491b30a40b2405849e597ba5fb56020526040808220546200040a95949362000401939092909160ff16156200045e575b7fa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c2177580835260208381528284203360009081529152604090205460ff16156200040c575b505050620004ae565b60805262000248565b565b8083526020838152828420336000908152915260409020600160ff198254161790557f2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d3393339351a4388080620003f8565b8180526020828152818320336000908152915260409020600160ff198254161790553333837f2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d818551a4620003b5565b73ffffffffffffffffffffffffffffffffffffffff811660009081527f5111aeae4aa79889928e72f88b5872109754de9d419ea9a4e3df5fba21d4d46f60205260408120547f21702c8af46127c7fa207f89d0b0a8441bb32959a0ac7df790e9ab1a25c989269060ff16156200052357505050565b8082526020828152604080842073ffffffffffffffffffffffffffffffffffffffff861660009081529252902080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00166001179055604051339373ffffffffffffffffffffffffffffffffffffffff16927f2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d91a456fe60806040526004361015610013575b600080fd5b60003560e01c806301ffc9a7146101fe578063181f5a77146101f5578063248a9ca3146101ec5780632f2ff15d146101e3578063313ce567146101da57806336568abe146101d157806350d25bcd146101c8578063541780fd146101bf57806354fd4d50146101b65780635ed63b40146101ad578063668a0f02146101ad5780637284e416146101a457806375b238fc1461019b5780638205bf6a1461019257806384b0f3491461018957806391d14854146101805780639a6fc8f514610177578063a217fddf1461016e578063b5ab58dc14610165578063b633620c1461015c578063c49baebe14610153578063c6b050c11461014a578063d547741f14610141578063e5fe4577146101385763feaf968c1461013057600080fd5b61000e611015565b5061000e610ee8565b5061000e610eb6565b5061000e610e5d565b5061000e610e03565b5061000e610dea565b5061000e610dc9565b5061000e610d8e565b5061000e610c22565b5061000e610bdc565b5061000e610b40565b5061000e610ada565b5061000e610a80565b5061000e610945565b5061000e610902565b5061000e6108c7565b5061000e610690565b5061000e61063c565b5061000e610580565b5061000e610523565b5061000e61041e565b5061000e61039d565b5061000e610324565b503461000e576020367ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc011261000e5760043563ffffffff60e01b811680910361000e576020907f7965db0b00000000000000000000000000000000000000000000000000000000811490811561027b575b506040519015158152f35b7f01ffc9a70000000000000000000000000000000000000000000000000000000014905038610270565b918091926000905b8282106102c55750116102be575050565b6000910152565b915080602091830151818601520182916102ad565b604091602082526102fa81518092816020860152602086860191016102a5565b601f017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe016010190565b503461000e576000367ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc011261000e57610399604051610363816112a1565b601381527f466c757850726963654665656420312e302e30000000000000000000000000006020820152604051918291826102da565b0390f35b503461000e576020367ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc011261000e5760043560005260006020526020600160406000200154604051908152f35b604090600319011261000e576004359060243573ffffffffffffffffffffffffffffffffffffffff8116810361000e5790565b503461000e5761042d366103eb565b6000918083528260205261044760016040852001546110d5565b8083526020838152604080852073ffffffffffffffffffffffffffffffffffffffff85166000908152925290205460ff1615610484575b82604051f35b8083526020838152604080852073ffffffffffffffffffffffffffffffffffffffff851660009081529252902080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00166001179055604051339273ffffffffffffffffffffffffffffffffffffffff1691907f2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d908590a4388061047e565b503461000e576000367ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc011261000e57602060405160ff7f0000000000000000000000000000000000000000000000000000000000000000168152f35b503461000e5761058f366103eb565b3373ffffffffffffffffffffffffffffffffffffffff8216036105b7576105b5916112df565b005b6040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152602f60248201527f416363657373436f6e74726f6c3a2063616e206f6e6c792072656e6f756e636560448201527f20726f6c657320666f722073656c6600000000000000000000000000000000006064820152608490fd5b503461000e576000367ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc011261000e5763ffffffff600154166000526002602052602060406000205460170b604051908152f35b503461000e5760408060031936011261000e57600435908160170b820361000e57602435801515810361000e577f21702c8af46127c7fa207f89d0b0a8441bb32959a0ac7df790e9ab1a25c98926600090815260208181528382203383529052604090205460ff1615610869577f14763f9653228cd12887f43c05db1caec15aa7c42f8d1edabe741dcecf48c00460009361075161073b61073660015463ffffffff1690565b61158e565b63ffffffff1663ffffffff196001541617600155565b61082f61075c6113c7565b601783900b81524267ffffffffffffffff166020820152841515818701526107a261078c60015463ffffffff1690565b63ffffffff166000526002602052604060002090565b8151602083015160c01b7fffffffffffffffff0000000000000000000000000000000000000000000000001677ffffffffffffffffffffffffffffffffffffffffffffffff9091161781556040909101516001909101805460ff921515929092167fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00909216919091179055565b61084a61084160015463ffffffff1690565b63ffffffff1690565b845160179290920b82529215156020820152336040820152606090a251f35b81517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601960248201527f43616c6c6572206973206e6f7420612076616c696461746f72000000000000006044820152606490fd5b503461000e576000367ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc011261000e57602060405160018152f35b503461000e576000367ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc011261000e57602063ffffffff60015416604051908152f35b503461000e57600080600319360112610a7d5760405190806003549060019180831c92808216928315610a73575b6020928386108514610a46578588526020880194908115610a0c57506001146109b3575b610399876109a7818903826112bd565b604051918291826102da565b600360005294509192917fc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f71f85b5b8386106109fb57505050910190506109a7826103993880610997565b8054858701529482019481016109df565b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff001685525050500191506109a79050826103993880610997565b7f4e487b710000000000000000000000000000000000000000000000000000000082526022600452602482fd5b93607f1693610973565b80fd5b503461000e576000367ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc011261000e5760206040517fa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c217758152f35b503461000e576000367ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc011261000e5763ffffffff600154166000526002602052602060406000205460c01c604051908152f35b602090600319011261000e5760043590565b503461000e57610b4f36610b2e565b63ffffffff90818111610b7d57166000526002602052602060ff600160406000200154166040519015158152f35b6040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601760248201527f466c75785072696365466565643a20726f756e642049440000000000000000006044820152606490fd5b503461000e57602060ff610c16610bf2366103eb565b906000526000845260406000209060018060a01b0316600052602052604060002090565b54166040519015158152f35b503461000e576020367ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc011261000e5760043569ffffffffffffffffffff811680820361000e57604051610c75816112a1565b600f81527f4e6f20646174612070726573656e740000000000000000000000000000000000602082015263ffffffff809211610d545750610ccb610cd091831663ffffffff166000526002602052604060002090565b6115f7565b90610399610cdf835160170b90565b9167ffffffffffffffff610d0b6020610cfb6040880151151590565b96015167ffffffffffffffff1690565b168060405195869560170b84879490929360a0949796929760c087019869ffffffffffffffffffff80961688526020880152151560408701526060860152608085015216910152565b6040517f08c379a0000000000000000000000000000000000000000000000000000000008152908190610d8a90600483016102da565b0390fd5b503461000e576000367ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc011261000e57602060405160008152f35b503461000e576020610de2610ddd36610b2e565b6115ac565b604051908152f35b503461000e576020610de2610dfe36610b2e565b6115d5565b503461000e576000367ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc011261000e5760206040517f21702c8af46127c7fa207f89d0b0a8441bb32959a0ac7df790e9ab1a25c989268152f35b503461000e576000367ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc011261000e5763ffffffff600154166000526002602052602060ff600160406000200154166040519015158152f35b503461000e576105b5610ec8366103eb565b90806000526000602052610ee36001604060002001546110d5565b6112df565b503461000e576000367ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc011261000e57323303610fb65760015463ffffffff1660008181526002602052604090205460170b610399610f886001610f80610f69610f628763ffffffff166000526002602052604060002090565b5460c01c90565b9563ffffffff166000526002602052604060002090565b015460ff1690565b60405193849384919267ffffffffffffffff6040929594606085019660170b85521660208401521515910152565b6040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601460248201527f4f6e6c792063616c6c61626c6520627920454f410000000000000000000000006044820152606490fd5b503461000e576000367ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc011261000e57604063ffffffff60015416806000526002602052610399826000209183519261106d84611278565b80549360ff60018660170b9687845260c01c93846020850152015416151595869101528060405195869584879490929360a0949796929760c087019869ffffffffffffffffffff80961688526020880152151560408701526060860152608085015216910152565b60008181526020818152604080832033845290915290205460ff16156110f85750565b33906111026113d6565b91603061110e84611408565b53607861111a8461141e565b5360295b600181116111ee57610d8a61117f6111bc866111ae611146886111418915611487565b6114d2565b6111a86040519586947f416363657373436f6e74726f6c3a206163636f756e74200000000000000000006020870152603786019061124a565b7f206973206d697373696e6720726f6c6520000000000000000000000000000000815260110190565b9061124a565b03601f1981018352826112bd565b6040517f08c379a0000000000000000000000000000000000000000000000000000000008152918291600483016102da565b9080600f6112389216601081101561123d575b7f3031323334353637383961626364656600000000000000000000000000000000901a61122e848761142f565b5360041c9161144e565b61111e565b6112456113f1565b611201565b9061125d602092828151948592016102a5565b0190565b50634e487b7160e01b600052604160045260246000fd5b6060810190811067ffffffffffffffff82111761129457604052565b61129c611261565b604052565b6040810190811067ffffffffffffffff82111761129457604052565b90601f8019910116810190811067ffffffffffffffff82111761129457604052565b60008181526020818152604080832073ffffffffffffffffffffffffffffffffffffffff8616845290915281205490919060ff1661131c57505050565b8082526020828152604080842073ffffffffffffffffffffffffffffffffffffffff861660009081529252902080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00169055604051339373ffffffffffffffffffffffffffffffffffffffff16927ff6391f5c32d9c69d2a47ea670b442974b53935d1edc7fd64eb21e047a839171b91a4565b50634e487b7160e01b600052601160045260246000fd5b604051906113d482611278565b565b604051906113e382611278565b602a82526040366020840137565b50634e487b7160e01b600052603260045260246000fd5b602090805115611416570190565b61125d6113f1565b602190805160011015611416570190565b90602091805182101561144157010190565b6114496113f1565b010190565b801561147a575b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0190565b6114826113b0565b611455565b1561148e57565b606460405162461bcd60e51b815260206004820152602060248201527f537472696e67733a20686578206c656e67746820696e73756666696369656e746044820152fd5b604051906080820182811067ffffffffffffffff821117611581575b604052604282526060366020840137603061150883611408565b5360786115148361141e565b536041905b6001821161152f5761152c915015611487565b90565b80600f61156e92166010811015611574575b7f3031323334353637383961626364656600000000000000000000000000000000901a61122e848661142f565b90611519565b61157c6113f1565b611541565b611589611261565b6114ee565b60019063ffffffff8091169081146115a4570190565b61125d6113b0565b63ffffffff908181116115ce5716600052600260205260406000205460170b90565b5050600090565b63ffffffff908181116115ce5716600052600260205260406000205460c01c90565b9060405161160481611278565b604060ff6001839580548060170b865260c01c6020860152015416151591015256fea2646970667358221220b30907c814ff1e8ef2032ea97b02b8239d310917e84ecc98c16bd1fd95c0d9ec64736f6c634300080e0033";

type FluxPriceFeedConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: FluxPriceFeedConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

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
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<FluxPriceFeed> {
    return super.deploy(
      _validator,
      _decimals,
      _description,
      overrides || {}
    ) as Promise<FluxPriceFeed>;
  }
  override getDeployTransaction(
    _validator: PromiseOrValue<string>,
    _decimals: PromiseOrValue<BigNumberish>,
    _description: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(
      _validator,
      _decimals,
      _description,
      overrides || {}
    );
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
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): FluxPriceFeed {
    return new Contract(address, _abi, signerOrProvider) as FluxPriceFeed;
  }
}
