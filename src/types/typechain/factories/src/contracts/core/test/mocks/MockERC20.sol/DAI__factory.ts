/* Autogenerated file. Do not edit manually. */
// @ts-nocheck
/* tslint:disable */
/* eslint-disable */
import { Signer, utils, Contract, ContractFactory, Overrides } from 'ethers';
import type { Provider, TransactionRequest } from '@ethersproject/providers';
import type { PromiseOrValue } from '../../../../../../../common';
import type { DAI, DAIInterface } from '../../../../../../../src/contracts/core/test/mocks/MockERC20.sol/DAI';

const _abi = [
  {
    inputs: [],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'spender',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'Approval',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'from',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'Transfer',
    type: 'event',
  },
  {
    inputs: [],
    name: 'DOMAIN_SEPARATOR',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'allowance',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'spender',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'approve',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'balanceOf',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'from',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'burn',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [
      {
        internalType: 'uint8',
        name: '',
        type: 'uint8',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'deposit',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'nonces',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'spender',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'value',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'deadline',
        type: 'uint256',
      },
      {
        internalType: 'uint8',
        name: 'v',
        type: 'uint8',
      },
      {
        internalType: 'bytes32',
        name: 'r',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: 's',
        type: 'bytes32',
      },
    ],
    name: 'permit',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'transfer',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'from',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'transferFrom',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

const _bytecode =
  '0x60e06040523480156200001157600080fd5b5060408051808201825260038082526244414960e81b602080840182905284518086019095529184529083015290601260008383838362000053848262000244565b50600162000062838262000244565b5060ff81166080524660a0526200007862000096565b60c052506200008c91503390508262000132565b50505050620003b6565b60007f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f6000604051620000ca919062000310565b6040805191829003822060208301939093528101919091527fc89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc660608201524660808201523060a082015260c00160405160208183030381529060405280519060200120905090565b80600260008282546200014691906200038e565b90915550506001600160a01b0382166000818152600360209081526040808320805486019055518481527fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef910160405180910390a35050565b634e487b7160e01b600052604160045260246000fd5b600181811c90821680620001ca57607f821691505b602082108103620001eb57634e487b7160e01b600052602260045260246000fd5b50919050565b601f8211156200023f57600081815260208120601f850160051c810160208610156200021a5750805b601f850160051c820191505b818110156200023b5782815560010162000226565b5050505b505050565b81516001600160401b038111156200026057620002606200019f565b6200027881620002718454620001b5565b84620001f1565b602080601f831160018114620002b05760008415620002975750858301515b600019600386901b1c1916600185901b1785556200023b565b600085815260208120601f198616915b82811015620002e157888601518255948401946001909101908401620002c0565b5085821015620003005787850151600019600388901b60f8161c191681555b5050505050600190811b01905550565b60008083546200032081620001b5565b600182811680156200033b5760018114620003515762000382565b60ff198416875282151583028701945062000382565b8760005260208060002060005b85811015620003795781548a8201529084019082016200035e565b50505082870194505b50929695505050505050565b80820180821115620003b057634e487b7160e01b600052601160045260246000fd5b92915050565b60805160a05160c051610d54620003e660003960006105a40152600061056f015260006101cb0152610d546000f3fe6080604052600436106100f35760003560e01c806370a082311161008a578063a9059cbb11610059578063a9059cbb146102c3578063d0e30db0146102e3578063d505accf146102eb578063dd62ed3e1461030b57600080fd5b806370a08231146102345780637ecebe001461026157806395d89b411461028e5780639dc29fac146102a357600080fd5b80632e1a7d4d116100c65780632e1a7d4d14610197578063313ce567146101b95780633644e515146101ff57806340c10f191461021457600080fd5b806306fdde03146100f8578063095ea7b31461012357806318160ddd1461015357806323b872dd14610177575b600080fd5b34801561010457600080fd5b5061010d610343565b60405161011a9190610a58565b60405180910390f35b34801561012f57600080fd5b5061014361013e366004610ac2565b6103d1565b604051901515815260200161011a565b34801561015f57600080fd5b5061016960025481565b60405190815260200161011a565b34801561018357600080fd5b50610143610192366004610aec565b61043e565b3480156101a357600080fd5b506101b76101b2366004610b28565b610530565b005b3480156101c557600080fd5b506101ed7f000000000000000000000000000000000000000000000000000000000000000081565b60405160ff909116815260200161011a565b34801561020b57600080fd5b5061016961056b565b34801561022057600080fd5b506101b761022f366004610ac2565b6105c6565b34801561024057600080fd5b5061016961024f366004610b41565b60036020526000908152604090205481565b34801561026d57600080fd5b5061016961027c366004610b41565b60056020526000908152604090205481565b34801561029a57600080fd5b5061010d6105d0565b3480156102af57600080fd5b506101b76102be366004610ac2565b6105dd565b3480156102cf57600080fd5b506101436102de366004610ac2565b6105e7565b6101b761065f565b3480156102f757600080fd5b506101b7610306366004610b63565b61066b565b34801561031757600080fd5b50610169610326366004610bd6565b600460209081526000928352604080842090915290825290205481565b6000805461035090610c09565b80601f016020809104026020016040519081016040528092919081815260200182805461037c90610c09565b80156103c95780601f1061039e576101008083540402835291602001916103c9565b820191906000526020600020905b8154815290600101906020018083116103ac57829003601f168201915b505050505081565b3360008181526004602090815260408083206001600160a01b038716808552925280832085905551919290917f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b9259061042c9086815260200190565b60405180910390a35060015b92915050565b6001600160a01b0383166000908152600460209081526040808320338452909152812054600019811461049a576104758382610c59565b6001600160a01b03861660009081526004602090815260408083203384529091529020555b6001600160a01b038516600090815260036020526040812080548592906104c2908490610c59565b90915550506001600160a01b03808516600081815260036020526040908190208054870190555190918716907fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9061051d9087815260200190565b60405180910390a3506001949350505050565b61053a33826108de565b604051339082156108fc029083906000818181858888f19350505050158015610567573d6000803e3d6000fd5b5050565b60007f000000000000000000000000000000000000000000000000000000000000000046146105a15761059c61095a565b905090565b507f000000000000000000000000000000000000000000000000000000000000000090565b61056782826109f4565b6001805461035090610c09565b61056782826108de565b33600090815260036020526040812080548391908390610608908490610c59565b90915550506001600160a01b038316600081815260036020526040908190208054850190555133907fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9061042c9086815260200190565b61066933346109f4565b565b428410156106c05760405162461bcd60e51b815260206004820152601760248201527f5045524d49545f444541444c494e455f4558504952454400000000000000000060448201526064015b60405180910390fd5b600060016106cc61056b565b6001600160a01b038a811660008181526005602090815260409182902080546001810190915582517f6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c98184015280840194909452938d166060840152608083018c905260a083019390935260c08083018b90528151808403909101815260e0830190915280519201919091207f19010000000000000000000000000000000000000000000000000000000000006101008301526101028201929092526101228101919091526101420160408051601f198184030181528282528051602091820120600084529083018083525260ff871690820152606081018590526080810184905260a0016020604051602081039080840390855afa1580156107f3573d6000803e3d6000fd5b5050604051601f1901519150506001600160a01b038116158015906108295750876001600160a01b0316816001600160a01b0316145b6108755760405162461bcd60e51b815260206004820152600e60248201527f494e56414c49445f5349474e455200000000000000000000000000000000000060448201526064016106b7565b6001600160a01b0390811660009081526004602090815260408083208a8516808552908352928190208990555188815291928a16917f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925910160405180910390a350505050505050565b6001600160a01b03821660009081526003602052604081208054839290610906908490610c59565b90915550506002805482900390556040518181526000906001600160a01b038416907fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef906020015b60405180910390a35050565b60007f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f600060405161098c9190610c6c565b6040805191829003822060208301939093528101919091527fc89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc660608201524660808201523060a082015260c00160405160208183030381529060405280519060200120905090565b8060026000828254610a069190610d0b565b90915550506001600160a01b0382166000818152600360209081526040808320805486019055518481527fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef910161094e565b600060208083528351808285015260005b81811015610a8557858101830151858201604001528201610a69565b506000604082860101526040601f19601f8301168501019250505092915050565b80356001600160a01b0381168114610abd57600080fd5b919050565b60008060408385031215610ad557600080fd5b610ade83610aa6565b946020939093013593505050565b600080600060608486031215610b0157600080fd5b610b0a84610aa6565b9250610b1860208501610aa6565b9150604084013590509250925092565b600060208284031215610b3a57600080fd5b5035919050565b600060208284031215610b5357600080fd5b610b5c82610aa6565b9392505050565b600080600080600080600060e0888a031215610b7e57600080fd5b610b8788610aa6565b9650610b9560208901610aa6565b95506040880135945060608801359350608088013560ff81168114610bb957600080fd5b9699959850939692959460a0840135945060c09093013592915050565b60008060408385031215610be957600080fd5b610bf283610aa6565b9150610c0060208401610aa6565b90509250929050565b600181811c90821680610c1d57607f821691505b602082108103610c3d57634e487b7160e01b600052602260045260246000fd5b50919050565b634e487b7160e01b600052601160045260246000fd5b8181038181111561043857610438610c43565b600080835481600182811c915080831680610c8857607f831692505b60208084108203610ca757634e487b7160e01b86526022600452602486fd5b818015610cbb5760018114610cd057610cfd565b60ff1986168952841515850289019650610cfd565b60008a81526020902060005b86811015610cf55781548b820152908501908301610cdc565b505084890196505b509498975050505050505050565b8082018082111561043857610438610c4356fea2646970667358221220785e5b40efe4bd8512e358e772f6b73e9f866d1f0451a55b10b50f2e0872269064736f6c63430008150033';

type DAIConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (xs: DAIConstructorParams): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class DAI__factory extends ContractFactory {
  constructor(...args: DAIConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
    this.contractName = 'DAI';
  }

  override deploy(overrides?: Overrides & { from?: PromiseOrValue<string> }): Promise<DAI> {
    return super.deploy(overrides || {}) as Promise<DAI>;
  }
  override getDeployTransaction(overrides?: Overrides & { from?: PromiseOrValue<string> }): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  override attach(address: string): DAI {
    return super.attach(address) as DAI;
  }
  override connect(signer: Signer): DAI__factory {
    return super.connect(signer) as DAI__factory;
  }
  static readonly contractName: 'DAI';

  public readonly contractName: 'DAI';

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): DAIInterface {
    return new utils.Interface(_abi) as DAIInterface;
  }
  static connect(address: string, signerOrProvider: Signer | Provider): DAI {
    return new Contract(address, _abi, signerOrProvider) as DAI;
  }
}
