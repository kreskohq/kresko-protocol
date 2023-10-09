/* Autogenerated file. Do not edit manually. */
// @ts-nocheck
/* tslint:disable */
/* eslint-disable */
import { Signer, utils, Contract, ContractFactory, BigNumberish, Overrides } from 'ethers';
import type { Provider, TransactionRequest } from '@ethersproject/providers';
import type { PromiseOrValue } from '../../../../../../common';
import type { MockOracle, MockOracleInterface } from '../../../../../../src/contracts/core/test/mocks/MockOracle';

const _abi = [
  {
    inputs: [
      {
        internalType: 'string',
        name: '_description',
        type: 'string',
      },
      {
        internalType: 'uint256',
        name: '_initialAnswer',
        type: 'uint256',
      },
      {
        internalType: 'uint8',
        name: '_decimals',
        type: 'uint8',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'int256',
        name: 'current',
        type: 'int256',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'roundId',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'updatedAt',
        type: 'uint256',
      },
    ],
    name: 'AnswerUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'roundId',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'startedBy',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'startedAt',
        type: 'uint256',
      },
    ],
    name: 'NewRound',
    type: 'event',
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
    name: 'description',
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
        internalType: 'uint80',
        name: '',
        type: 'uint80',
      },
    ],
    name: 'getRoundData',
    outputs: [
      {
        internalType: 'uint80',
        name: 'roundId',
        type: 'uint80',
      },
      {
        internalType: 'int256',
        name: 'answer',
        type: 'int256',
      },
      {
        internalType: 'uint256',
        name: 'startedAt',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'updatedAt',
        type: 'uint256',
      },
      {
        internalType: 'uint80',
        name: 'answeredInRound',
        type: 'uint80',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'initialAnswer',
    outputs: [
      {
        internalType: 'int256',
        name: '',
        type: 'int256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      {
        internalType: 'uint80',
        name: 'roundId',
        type: 'uint80',
      },
      {
        internalType: 'int256',
        name: 'answer',
        type: 'int256',
      },
      {
        internalType: 'uint256',
        name: 'startedAt',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'updatedAt',
        type: 'uint256',
      },
      {
        internalType: 'uint80',
        name: 'answeredInRound',
        type: 'uint80',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'price',
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
        internalType: 'uint256',
        name: '_answer',
        type: 'uint256',
      },
    ],
    name: 'setPrice',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'version',
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
] as const;

const _bytecode =
  '0x60806040526000805460ff19166008179055600160025534801561002257600080fd5b506040516105eb3803806105eb83398101604081905261004191610099565b600161004d8482610205565b506003919091556000805460ff191660ff909216919091179055506102c4565b634e487b7160e01b600052604160045260246000fd5b805160ff8116811461009457600080fd5b919050565b6000806000606084860312156100ae57600080fd5b83516001600160401b03808211156100c557600080fd5b818601915086601f8301126100d957600080fd5b8151818111156100eb576100eb61006d565b604051601f8201601f19908116603f011681019083821181831017156101135761011361006d565b8160405282815260209350898484870101111561012f57600080fd5b600091505b828210156101515784820184015181830185015290830190610134565b6000848483010152809750505050808601519350505061017360408501610083565b90509250925092565b600181811c9082168061019057607f821691505b6020821081036101b057634e487b7160e01b600052602260045260246000fd5b50919050565b601f82111561020057600081815260208120601f850160051c810160208610156101dd5750805b601f850160051c820191505b818110156101fc578281556001016101e9565b5050505b505050565b81516001600160401b0381111561021e5761021e61006d565b6102328161022c845461017c565b846101b6565b602080601f831160018114610267576000841561024f5750858301515b600019600386901b1c1916600185901b1785556101fc565b600085815260208120601f198616915b8281101561029657888601518255948401946001909101908401610277565b50858210156102b45787850151600019600388901b60f8161c191681555b5050505050600190811b01905550565b610318806102d36000396000f3fe608060405234801561001057600080fd5b50600436106100885760003560e01c80639a6fc8f51161005b5780639a6fc8f5146100f2578063a035b1fe14610147578063cb6030f81461014f578063feaf968c1461015857600080fd5b8063313ce5671461008d57806354fd4d50146100b15780637284e416146100c857806391b7f5ed146100dd575b600080fd5b60005461009a9060ff1681565b60405160ff90911681526020015b60405180910390f35b6100ba60025481565b6040519081526020016100a8565b6100d0610167565b6040516100a891906101f5565b6100f06100eb366004610243565b600355565b005b61011061010036600461025c565b5060035460019142908190600090565b6040805169ffffffffffffffffffff968716815260208101959095528401929092526060830152909116608082015260a0016100a8565b6003546100ba565b6100ba60035481565b60035460019042806000610110565b600180546101749061028f565b80601f01602080910402602001604051908101604052809291908181526020018280546101a09061028f565b80156101ed5780601f106101c2576101008083540402835291602001916101ed565b820191906000526020600020905b8154815290600101906020018083116101d057829003601f168201915b505050505081565b600060208083528351808285015260005b8181101561022257858101830151858201604001528201610206565b506000604082860101526040601f19601f8301168501019250505092915050565b60006020828403121561025557600080fd5b5035919050565b60006020828403121561026e57600080fd5b813569ffffffffffffffffffff8116811461028857600080fd5b9392505050565b600181811c908216806102a357607f821691505b6020821081036102dc577f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b5091905056fea2646970667358221220a7d6a946656326cf9c1a5ab99d2d14d1789c1d54c2768ee95b3920c20833e58264736f6c63430008150033';

type MockOracleConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (xs: MockOracleConstructorParams): xs is ConstructorParameters<typeof ContractFactory> =>
  xs.length > 1;

export class MockOracle__factory extends ContractFactory {
  constructor(...args: MockOracleConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
    this.contractName = 'MockOracle';
  }

  override deploy(
    _description: PromiseOrValue<string>,
    _initialAnswer: PromiseOrValue<BigNumberish>,
    _decimals: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> },
  ): Promise<MockOracle> {
    return super.deploy(_description, _initialAnswer, _decimals, overrides || {}) as Promise<MockOracle>;
  }
  override getDeployTransaction(
    _description: PromiseOrValue<string>,
    _initialAnswer: PromiseOrValue<BigNumberish>,
    _decimals: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> },
  ): TransactionRequest {
    return super.getDeployTransaction(_description, _initialAnswer, _decimals, overrides || {});
  }
  override attach(address: string): MockOracle {
    return super.attach(address) as MockOracle;
  }
  override connect(signer: Signer): MockOracle__factory {
    return super.connect(signer) as MockOracle__factory;
  }
  static readonly contractName: 'MockOracle';

  public readonly contractName: 'MockOracle';

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): MockOracleInterface {
    return new utils.Interface(_abi) as MockOracleInterface;
  }
  static connect(address: string, signerOrProvider: Signer | Provider): MockOracle {
    return new Contract(address, _abi, signerOrProvider) as MockOracle;
  }
}
