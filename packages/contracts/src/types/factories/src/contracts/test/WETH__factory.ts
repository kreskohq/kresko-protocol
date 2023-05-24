/* Autogenerated file. Do not edit manually. */
// @ts-nocheck
/* tslint:disable */
/* eslint-disable */
import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../../../../common";
import type { WETH, WETHInterface } from "../../../../src/contracts/test/WETH";

const _abi = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "src",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "guy",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "wad",
        type: "uint256",
      },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "dst",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "wad",
        type: "uint256",
      },
    ],
    name: "Deposit",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "src",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "dst",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "wad",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "src",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "wad",
        type: "uint256",
      },
    ],
    name: "Withdrawal",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "allowance",
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
        internalType: "address",
        name: "guy",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "wad",
        type: "uint256",
      },
    ],
    name: "approve",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "balanceOf",
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
    inputs: [
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "deposit",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "minters",
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
    name: "name",
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
    inputs: [],
    name: "symbol",
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
    inputs: [],
    name: "totalSupply",
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
        internalType: "address",
        name: "dst",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "wad",
        type: "uint256",
      },
    ],
    name: "transfer",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "src",
        type: "address",
      },
      {
        internalType: "address",
        name: "dst",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "wad",
        type: "uint256",
      },
    ],
    name: "transferFrom",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "wad",
        type: "uint256",
      },
    ],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const _bytecode =
  "0x608080604052346100395760ff196012816002541617600255335f526005602052600160405f20918254161790556109d8908161003e8239f35b5f80fdfe6080604081815260049182361015610015575f80fd5b5f92833560e01c91826306fdde031461067557508163095ea7b31461060657816318160ddd146105eb57816323b872dd1461059b5781632e1a7d4d146104df578163313ce567146104bd57816370a082311461045a57816395d89b41146102cc578163a9059cbb14610299578163b6b55f25146101c8578163d0e30db014610176578163dd62ed3e1461011c575063f46eccc4146100b1575f80fd5b34610118576020367ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc01126101185760209160ff90829073ffffffffffffffffffffffffffffffffffffffff6101056107b0565b1681526005855220541690519015158152f35b5080fd5b905034610172578160031936011261017257602092829161013b6107b0565b6101436107d7565b73ffffffffffffffffffffffffffffffffffffffff918216845291865283832091168252845220549051908152f35b8280fd5b5050816003193601126101185733825260036020528082206101993482546107fa565b9055513481527fe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c60203392a280f35b91905034610172576020367ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc011261017257813591338452600560205260ff828520541615610257575033835260036020528083206102288382546107fa565b9055519081527fe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c60203392a280f35b6020606492519162461bcd60e51b8352820152600c60248201527f4e6f742061206d696e74657200000000000000000000000000000000000000006044820152fd5b5050346101185780600319360112610118576020906102c36102b96107b0565b602435903361088e565b90519015158152f35b83833461011857816003193601126101185780519082600180549081811c90808316928315610450575b6020938484108114610424578388529081156103ea5750600114610395575b505050829003601f017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe01682019267ffffffffffffffff8411838510176103695750829182610365925282610769565b0390f35b7f4e487b7100000000000000000000000000000000000000000000000000000000815260418552602490fd5b8087529192508591837fb10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf65b8385106103d65750505050830101858080610315565b8054888601830152930192849082016103c0565b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0016878501525050151560051b8401019050858080610315565b7f4e487b7100000000000000000000000000000000000000000000000000000000895260228a52602489fd5b91607f16916102f6565b505034610118576020367ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc011261011857602091819073ffffffffffffffffffffffffffffffffffffffff6104ad6107b0565b1681526003845220549051908152f35b50503461011857816003193601126101185760209060ff600254169051908152f35b905034610172576020367ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc011261017257359033835260036020526105298282852054101561081b565b338352600360205280832061053f838254610881565b90558280838015610591575b8280929181923390f11561058657519081527f7fcf532c15f0a6db0bd6d0e038bea71d30d808c7d98cb3bf7268a95bf5081b6560203392a280f35b51913d9150823e3d90fd5b6108fc915061054b565b505034610118576060367ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc0112610118576020906102c36105da6107b0565b6105e26107d7565b6044359161088e565b50503461011857816003193601126101185751478152602090f35b9050346101725781600319360112610172576020926106236107b0565b918360243592839233825287528181209460018060a01b0316948582528752205582519081527f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925843392a35160018152f35b84908434610172578260031936011261017257828354600181811c9080831692831561075f575b6020938484108114610424578388529081156103ea575060011461070a57505050829003601f017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe01682019267ffffffffffffffff8411838510176103695750829182610365925282610769565b8680529192508591837f290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e5635b83851061074b5750505050830101858080610315565b805488860183015293019284908201610735565b91607f169161069c565b602080825282518183018190529093925f5b82811061079c57505060409293505f838284010152601f8019910116010190565b81810186015184820160400152850161077b565b6004359073ffffffffffffffffffffffffffffffffffffffff821682036107d357565b5f80fd5b6024359073ffffffffffffffffffffffffffffffffffffffff821682036107d357565b9190820180921161080757565b634e487b7160e01b5f52601160045260245ffd5b1561082257565b6040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600c60248201527f57455448393a204572726f7200000000000000000000000000000000000000006044820152606490fd5b9190820391821161080757565b91907fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9060018060a01b03809416925f948486526020926003845260409182916108dd85848b2054101561081b565b3388141580610966575b610924575b87895260038652828920610901868254610881565b9055169687815260038552206109188382546107fa565b905551908152a3600190565b87895260048652828920338a52865261094285848b2054101561081b565b87895260048652828920338a52865282892061095f868254610881565b90556108ec565b5087895260048652828920338a528652828920547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff14156108e756fea2646970667358221220f49f9d422bcda3043126573e8aa1e5db953aee8b1b7bba0002e50816c5f67d9b64736f6c63430008140033";

type WETHConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: WETHConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class WETH__factory extends ContractFactory {
  constructor(...args: WETHConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
    this.contractName = "WETH";
  }

  override deploy(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<WETH> {
    return super.deploy(overrides || {}) as Promise<WETH>;
  }
  override getDeployTransaction(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  override attach(address: string): WETH {
    return super.attach(address) as WETH;
  }
  override connect(signer: Signer): WETH__factory {
    return super.connect(signer) as WETH__factory;
  }
  static readonly contractName: "WETH";

  public readonly contractName: "WETH";

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): WETHInterface {
    return new utils.Interface(_abi) as WETHInterface;
  }
  static connect(address: string, signerOrProvider: Signer | Provider): WETH {
    return new Contract(address, _abi, signerOrProvider) as WETH;
  }
}
