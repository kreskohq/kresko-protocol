/* Autogenerated file. Do not edit manually. */
// @ts-nocheck
/* tslint:disable */
/* eslint-disable */
import { Signer, utils, Contract, ContractFactory, Overrides } from 'ethers';
import type { Provider, TransactionRequest } from '@ethersproject/providers';
import type { PromiseOrValue } from '../../../../../../common';
import type {
  RedstoneConstants,
  RedstoneConstantsInterface,
} from '../../../../../../src/contracts/core/test/redstone/RedstoneConstants';

const _abi = [
  {
    inputs: [],
    name: 'CalldataMustHaveValidPayload',
    type: 'error',
  },
  {
    inputs: [],
    name: 'CalldataOverOrUnderFlow',
    type: 'error',
  },
  {
    inputs: [],
    name: 'EachSignerMustProvideTheSameValue',
    type: 'error',
  },
  {
    inputs: [],
    name: 'EmptyCalldataPointersArr',
    type: 'error',
  },
  {
    inputs: [],
    name: 'IncorrectUnsignedMetadataSize',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'receivedSignersCount',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'requiredSignersCount',
        type: 'uint256',
      },
    ],
    name: 'InsufficientNumberOfUniqueSigners',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidCalldataPointer',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'receivedSigner',
        type: 'address',
      },
    ],
    name: 'SignerNotAuthorised',
    type: 'error',
  },
] as const;

const _bytecode =
  '0x6080604052348015600f57600080fd5b50603f80601d6000396000f3fe6080604052600080fdfea26469706673582212208c00107c5efadcc83c0fd5e57605761918ffa1b13d34af1df910189cf7b9ab2564736f6c63430008150033';

type RedstoneConstantsConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (xs: RedstoneConstantsConstructorParams): xs is ConstructorParameters<typeof ContractFactory> =>
  xs.length > 1;

export class RedstoneConstants__factory extends ContractFactory {
  constructor(...args: RedstoneConstantsConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
    this.contractName = 'RedstoneConstants';
  }

  override deploy(overrides?: Overrides & { from?: PromiseOrValue<string> }): Promise<RedstoneConstants> {
    return super.deploy(overrides || {}) as Promise<RedstoneConstants>;
  }
  override getDeployTransaction(overrides?: Overrides & { from?: PromiseOrValue<string> }): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  override attach(address: string): RedstoneConstants {
    return super.attach(address) as RedstoneConstants;
  }
  override connect(signer: Signer): RedstoneConstants__factory {
    return super.connect(signer) as RedstoneConstants__factory;
  }
  static readonly contractName: 'RedstoneConstants';

  public readonly contractName: 'RedstoneConstants';

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): RedstoneConstantsInterface {
    return new utils.Interface(_abi) as RedstoneConstantsInterface;
  }
  static connect(address: string, signerOrProvider: Signer | Provider): RedstoneConstants {
    return new Contract(address, _abi, signerOrProvider) as RedstoneConstants;
  }
}
