/* Autogenerated file. Do not edit manually. */
// @ts-nocheck
/* tslint:disable */
/* eslint-disable */
import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../../../../../common";
import type {
  UniswapV2LiquidityMathLibrary,
  UniswapV2LiquidityMathLibraryInterface,
} from "../../../../../src/contracts/test/markets/UniswapV2LiquidityMathLibrary";

const _abi = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "truePriceTokenA",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "truePriceTokenB",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "reserveA",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "reserveB",
        type: "uint256",
      },
    ],
    name: "computeProfitMaximizingTrade",
    outputs: [
      {
        internalType: "bool",
        name: "aToB",
        type: "bool",
      },
      {
        internalType: "uint256",
        name: "amountIn",
        type: "uint256",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
] as const;

const _bytecode =
  "0x6080806040523461001a576104519081610020823930815050f35b600080fdfe6080604052600436101561001257600080fd5b6000803560e01c63fa6531541461002857600080fd5b6080367ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc011261017a576024356103e56044356064356100ba6100b56004356100af8161007e866100798b8a6103ce565b610194565b10976100a261009d610090888a6103ce565b8b156101735785906103ce565b61031f565b92891561016c57506103ad565b90610194565b6101cc565b9450831561015d57506100cc9061031f565b04808310610150575b82039182116100f1576040805191151582526020820192909252f35b6040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601560248201527f64732d6d6174682d7375622d756e646572666c6f7700000000000000000000006044820152606490fd5b61015861017d565b6100d5565b610167915061031f565b6100cc565b90506103ad565b83906103ce565b80fd5b50634e487b7160e01b600052601160045260246000fd5b811561019e570490565b634e487b7160e01b600052601260045260246000fd5b811981116101c0570190565b6101c861017d565b0190565b80156103195780600181700100000000000000000000000000000000811015610301575b61028461027e61026e61027e61029f61027e61029561027e61027e9861027861028e61027e6102846102a99f61028e9f6008826801000000000000000061027e9410156102f4575b6401000000008110156102e7575b620100008110156102db575b6101008110156102cf575b60108110156102c2575b10156102ba575b6102788188610194565b906101b4565b60011c90565b6102788186610194565b8092610194565b610278818c610194565b610278818a610194565b808210156102b5575090565b905090565b60011b61026e565b60041c9160021b91610267565b811c9160041b9161025d565b60101c91811b91610252565b60201c9160101b91610246565b60401c9160201b91610238565b608081901c92506801000000000000000091506101f0565b50600090565b906103e89180600019048311811515166103a0575b8281029283040361034157565b6040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601460248201527f64732d6d6174682d6d756c2d6f766572666c6f770000000000000000000000006044820152606490fd5b6103a861017d565b610334565b906103e59180600019048311811515166103a0578281029283040361034157565b6000929180159182156103e5575b50501561034157565b91509250806000190483118115151661040e575b6104068382029384610194565b1438806103dc565b61041661017d565b6103f956fea26469706673582212207be10bc600bb9fadb4637e2cdf132527f11a0c79ed31aa5634901563452f49d464736f6c634300080e0033";

type UniswapV2LiquidityMathLibraryConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: UniswapV2LiquidityMathLibraryConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class UniswapV2LiquidityMathLibrary__factory extends ContractFactory {
  constructor(...args: UniswapV2LiquidityMathLibraryConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
    this.contractName = "UniswapV2LiquidityMathLibrary";
  }

  override deploy(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<UniswapV2LiquidityMathLibrary> {
    return super.deploy(
      overrides || {}
    ) as Promise<UniswapV2LiquidityMathLibrary>;
  }
  override getDeployTransaction(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  override attach(address: string): UniswapV2LiquidityMathLibrary {
    return super.attach(address) as UniswapV2LiquidityMathLibrary;
  }
  override connect(signer: Signer): UniswapV2LiquidityMathLibrary__factory {
    return super.connect(signer) as UniswapV2LiquidityMathLibrary__factory;
  }
  static readonly contractName: "UniswapV2LiquidityMathLibrary";

  public readonly contractName: "UniswapV2LiquidityMathLibrary";

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): UniswapV2LiquidityMathLibraryInterface {
    return new utils.Interface(_abi) as UniswapV2LiquidityMathLibraryInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): UniswapV2LiquidityMathLibrary {
    return new Contract(
      address,
      _abi,
      signerOrProvider
    ) as UniswapV2LiquidityMathLibrary;
  }
}
