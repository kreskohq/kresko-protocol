/* Autogenerated file. Do not edit manually. */
// @ts-nocheck
/* tslint:disable */
/* eslint-disable */
import { Signer, utils, Contract, ContractFactory, Overrides } from 'ethers';
import type { Provider, TransactionRequest } from '@ethersproject/providers';
import type { PromiseOrValue } from '../../../../../../common';
import type {
  SCDPSwapFacet,
  SCDPSwapFacetInterface,
} from '../../../../../../src/contracts/core/scdp/facets/SCDPSwapFacet';

const _abi = [
  {
    inputs: [
      {
        internalType: 'address',
        name: 'target',
        type: 'address',
      },
    ],
    name: 'AddressEmptyCode',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'AddressInsufficientBalance',
    type: 'error',
  },
  {
    inputs: [],
    name: 'CUMULATE_AMOUNT_ZERO',
    type: 'error',
  },
  {
    inputs: [],
    name: 'CUMULATE_NO_DEPOSITS',
    type: 'error',
  },
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
    name: 'CanNotPickMedianOfEmptyArray',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'collateralValue',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'minCollateralValue',
        type: 'uint256',
      },
      {
        internalType: 'uint32',
        name: 'ratio',
        type: 'uint32',
      },
    ],
    name: 'DEBT_EXCEEDS_COLLATERAL',
    type: 'error',
  },
  {
    inputs: [],
    name: 'FailedInnerCall',
    type: 'error',
  },
  {
    inputs: [],
    name: 'IDENTICAL_ASSETS',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'asset',
        type: 'address',
      },
    ],
    name: 'INVALID_ASSET',
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
    inputs: [
      {
        internalType: 'address',
        name: 'incomeAsset',
        type: 'address',
      },
    ],
    name: 'NOT_INCOME_ASSET',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'primaryPrice',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'referencePrice',
        type: 'uint256',
      },
    ],
    name: 'PRICE_UNSTABLE',
    type: 'error',
  },
  {
    inputs: [],
    name: 'RE_ENTRANCY',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'SAFE_ERC20_PERMIT_ERC20_OPERATION_FAILED',
    type: 'error',
  },
  {
    inputs: [],
    name: 'SEQUENCER_DOWN_NO_REDSTONE_AVAILABLE',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'assetIn',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'assetOut',
        type: 'address',
      },
    ],
    name: 'SWAP_NOT_ENABLED',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'invalid',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'valid',
        type: 'uint256',
      },
    ],
    name: 'SWAP_SLIPPAGE',
    type: 'error',
  },
  {
    inputs: [],
    name: 'SWAP_ZERO_AMOUNT',
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
  {
    inputs: [
      {
        internalType: 'address',
        name: 'asset',
        type: 'address',
      },
    ],
    name: 'ZERO_AMOUNT',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'asset',
        type: 'address',
      },
    ],
    name: 'ZERO_BURN',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'asset',
        type: 'address',
      },
    ],
    name: 'ZERO_MINT',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'underlyingId',
        type: 'string',
      },
    ],
    name: 'ZERO_PRICE',
    type: 'error',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'asset',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'Income',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'who',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'assetIn',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'assetOut',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amountIn',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amountOut',
        type: 'uint256',
      },
    ],
    name: 'Swap',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'feeAsset',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'assetIn',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'feeAmount',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'protocolFeeAmount',
        type: 'uint256',
      },
    ],
    name: 'SwapFee',
    type: 'event',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_depositAssetAddr',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '_incomeAmount',
        type: 'uint256',
      },
    ],
    name: 'cumulateIncomeSCDP',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_assetIn',
        type: 'address',
      },
      {
        internalType: 'address',
        name: '_assetOut',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '_amountIn',
        type: 'uint256',
      },
    ],
    name: 'previewSwapSCDP',
    outputs: [
      {
        internalType: 'uint256',
        name: 'amountOut',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'feeAmount',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'feeAmountProtocol',
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
        name: '_receiver',
        type: 'address',
      },
      {
        internalType: 'address',
        name: '_assetIn',
        type: 'address',
      },
      {
        internalType: 'address',
        name: '_assetOut',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '_amountIn',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_amountOutMin',
        type: 'uint256',
      },
    ],
    name: 'swapSCDP',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

const _bytecode =
  '0x608060405234801561001057600080fd5b50613217806100206000396000f3fe608060405234801561001057600080fd5b50600436106100415760003560e01c80631e7207e114610046578063af57c9c814610079578063ce1d9ede1461009a575b600080fd5b610059610054366004612dbf565b6100af565b604080519384526020840192909252908201526060015b60405180910390f35b61008c610087366004612dfb565b6102a6565b604051908152602001610070565b6100ad6100a8366004612e25565b6104b5565b005b6001600160a01b0383811660009081527fb26ba31e2d664e549a653236f2f9de4c4049d88f596d626e9ff280a35dbf5f66602090815260408083209386168352929052908120548190819060ff166101325760405163022bbd8d60e01b81526001600160a01b038088166004830152861660248201526044015b60405180910390fd5b846001600160a01b0316866001600160a01b03160361016457604051631aa5e6a560e21b815260040160405180910390fd5b6001600160a01b03861660009081526000805160206131c2833981519152602052604090206004810154600160601b900460ff166101c0576040516302c33dc560e01b81526001600160a01b0388166004820152602401610129565b6001600160a01b03861660009081526000805160206131c2833981519152602052604090206004810154600160601b900460ff1661021c576040516302c33dc560e01b81526001600160a01b0389166004820152602401610129565b6004818101549083015461ffff80831662010000830482160181169264010000000090819004821692048116919091011661025788836106a9565b955061027f610265846106cf565b610279610272898c612e90565b8790610784565b906107a0565b965061028b86826106a9565b94506102978587612e90565b95505050505093509350939050565b7fd6577bbd1315995ef7d02da632fcee9ea37575f42959077f04433a81ba97815b54600090600119016102ec57604051632a0128d160e11b815260040160405180910390fd5b60027fd6577bbd1315995ef7d02da632fcee9ea37575f42959077f04433a81ba97815b556000829003610356576040517f3672821d0000000000000000000000000000000000000000000000000000000081526001600160a01b0384166004820152602401610129565b6001600160a01b03831660009081526000805160206131c28339815191526020526040812060048101549091906b010000000000000000000000900460ff1680156103b457506003820154600160801b90046001600160801b031615155b80156103d757506103d46000805160206131a283398151915286846107d7565b15155b90508061041b576040517fead8cc930000000000000000000000000000000000000000000000000000000081526001600160a01b0386166004820152602401610129565b6104306001600160a01b03861633308761082d565b604080516001600160a01b0387168152602081018690527f0d2e009b696be50eaeafa43283c2e91362ec7d038b2af93783ec767d536ad278910160405180910390a16104908583866000805160206131a28339815191525b9291906108e4565b9250505060016104ab6000805160206131c283398151915290565b6005015592915050565b7fd6577bbd1315995ef7d02da632fcee9ea37575f42959077f04433a81ba97815b54600119016104f857604051632a0128d160e11b815260040160405180910390fd5b60027fd6577bbd1315995ef7d02da632fcee9ea37575f42959077f04433a81ba97815b556000829003610557576040517f9b9e2a0500000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b61056c6001600160a01b03851633308561082d565b60006001600160a01b038616156105835785610585565b335b6001600160a01b03861660009081526000805160206131c283398151915260205260409020600481015491925090600160601b900460ff166105e5576040516302c33dc560e01b81526001600160a01b0387166004820152602401610129565b7fb26ba31e2d664e549a653236f2f9de4c4049d88f596d626e9ff280a35dbf5f6b546001600160a01b03868116918882169133917fcd3829a3813dc3cdd188fd3d01dcf3268c16be2fdd2dd21d0665418816e4606291899116851461065757610652878c888d8d8d6109b4565b610664565b610664878c888c8c610b61565b6040805192835260208301919091520160405180910390a4505060017fd6577bbd1315995ef7d02da632fcee9ea37575f42959077f04433a81ba97815b555050505050565b6000811561138819839004841115176106c157600080fd5b506127109102611388010490565b8054604080518082019182905260009261077e9260a09190911b919060018601906002908287855b82829054906101000a900460ff16600281111561071657610716612ea3565b8152602060019283018181049485019490930390920291018084116106f757905050505050506107516000805160206131c283398151915290565b600401547c0100000000000000000000000000000000000000000000000000000000900461ffff16610cf3565b92915050565b600061079982610793856106cf565b90610dd9565b9392505050565b60008115670de0b6b3a7640000600284041904841117156107c057600080fd5b50670de0b6b3a76400009190910260028204010490565b6001600160a01b038216600090815260048401602052604081206001015461082590610815906001600160801b03600160801b820481169116612eb9565b83906001600160801b0316610e11565b949350505050565b6040516001600160a01b03808516602483015283166044820152606481018290526108de9085907f23b872dd00000000000000000000000000000000000000000000000000000000906084015b60408051601f198184030181529190526020810180517bffffffffffffffffffffffffffffffffffffffffffffffffffffffff167fffffffff0000000000000000000000000000000000000000000000000000000090931692909217909152610ed3565b50505050565b600081600003610920576040517f3d0a884700000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b600061092d8686866107d7565b905080600003610969576040517fafdeffab00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b61098461097582610f4c565b61097e85610f4c565b90610f67565b6003850180546001600160801b03600160801b808304821690940181169384029116179055915050949350505050565b6001600160a01b03831660009081526000805160206131c2833981519152602052604081206004810154600160601b900460ff16610a10576040516302c33dc560e01b81526001600160a01b0386166004820152602401610129565b6001600160a01b0387811660009081527fb26ba31e2d664e549a653236f2f9de4c4049d88f596d626e9ff280a35dbf5f66602090815260408083209389168352929052205460ff16610a885760405163022bbd8d60e01b81526001600160a01b03808916600483015286166024820152604401610129565b846001600160a01b0316876001600160a01b031603610aba57604051631aa5e6a560e21b815260040160405180910390fd5b6004818101549087015461ffff8083166201000083048216018116926401000000009081900482169204811691909101166000610af787846106a9565b968790039690506000610b208b8b8a306000805160206131a28339815191525b93929190610fa6565b9050610b428986838f6000805160206131a28339815191525b93929190611089565b9550610b528b8b888a86886111b6565b50505050509695505050505050565b7fb26ba31e2d664e549a653236f2f9de4c4049d88f596d626e9ff280a35dbf5f6b546001600160a01b0390811660008181526000805160206131c28339815191526020908152604080832094891683527fb26ba31e2d664e549a653236f2f9de4c4049d88f596d626e9ff280a35dbf5f66825280832084845290915281205490929060ff16610c165760405163022bbd8d60e01b81526001600160a01b03808916600483015283166024820152604401610129565b816001600160a01b0316876001600160a01b031603610c4857604051631aa5e6a560e21b815260040160405180910390fd5b6004818101549087015461ffff808316620100008304821601811692640100000000908190048216920481169190910116610cae8484610c998c8c8c306000805160206131a2833981519152610b17565b306000805160206131a2833981519152610b39565b94506000610cbc86846106a9565b95869003959050610cd76001600160a01b0386168c88611297565b610ce58585888a85876111b6565b505050505095945050505050565b6000806040518060400160405280610d2286600060028110610d1757610d17612ee0565b6020020151886112e0565b8152602001610d32866001610d17565b90528051909150158015610d4857506020810151155b15610da057610d6d73ffffffffffffffffffffffffffffffffffffffff198616611436565b6040517fe6b879ac0000000000000000000000000000000000000000000000000000000081526004016101299190612f1a565b610da8611461565b610dbe57610db6848261159b565b915050610799565b80516020820151610dd091908561163d565b95945050505050565b600081156706f05b59d3b200001983900484111517610df757600080fd5b50670de0b6b3a764000091026706f05b59d3b20000010490565b600081600003610e235750600061077e565b8254600160601b90046001600160a01b031615610ecd5782546040517f07a2d13a00000000000000000000000000000000000000000000000000000000815260048101849052600160601b9091046001600160a01b0316906307a2d13a906024015b602060405180830381865afa158015610ea2573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610ec69190612f4d565b905061077e565b50919050565b6000610ee86001600160a01b038416836116ec565b805190915015610f475780806020019051810190610f069190612f66565b610f47576040517fa451527e0000000000000000000000000000000000000000000000000000000081526001600160a01b0384166004820152602401610129565b505050565b633b9aca008181029081048214610f6257600080fd5b919050565b600081156b033b2e3c9fd0803ce800000060028404190484111715610f8b57600080fd5b506b033b2e3c9fd0803ce80000009190910260028204010490565b6001600160a01b0384166000908152600486016020526040812080548290610fcf908790610e11565b905060008086831015610fe757505080850381610fea565b50855b8115611040576000610ffc89846116fa565b600186018054600160801b6fffffffffffffffffffffffffffffffff1982166001600160801b03928316850183169081178290048316909401909116029091179055505b801561105757611051888288611772565b84540384555b6110618282612f88565b871461106f5761106f612f9b565b61107b888860016117e0565b9a9950505050505050505050565b6001600160a01b03841660009081526004860160205260408120600181015482906110c5908790600160801b90046001600160801b0316610e11565b90506110d38686600161181d565b925060008084836001600160801b031610156110fd5750506001600160801b038116808403611101565b8491505b811561117a57600061111389846116fa565b600186018054600160801b6001600160801b0380831685900381166fffffffffffffffffffffffffffffffff1990931683178290048116859003160217905590506001600160a01b0387163014611178576111786001600160a01b038b168885611297565b505b80156111915761118b888288611868565b84540184555b61119b8282612f88565b85146111a9576111a9612f9b565b5050505095945050505050565b828410156111fa576040517f0b41d4980000000000000000000000000000000000000000000000000000000081526004810185905260248101849052604401610129565b8115611257577fb26ba31e2d664e549a653236f2f9de4c4049d88f596d626e9ff280a35dbf5f6b546001600160a01b031660008181526000805160206131c283398151915260205260409020611255908290898987876118c7565b505b61128f6000805160206131a283398151915260070154600160a01b900463ffffffff166000805160206131a2833981519152906119c4565b505050505050565b6040516001600160a01b038316602482015260448101829052610f479084907fa9059cbb000000000000000000000000000000000000000000000000000000009060640161087a565b6000808360028111156112f5576112f5612ea3565b146114165773ffffffffffffffffffffffffffffffffffffffff19821660009081527fd6577bbd1315995ef7d02da632fcee9ea37575f42959077f04433a81ba978157602052604081208185600281111561135257611352612ea3565b600281111561136357611363612ea3565b8152602080820192909252604090810160002060018101548154925160e082901b7fffffffff000000000000000000000000000000000000000000000000000000001681526001600160a01b0393841660048201529194509283901c9091169163ffffffff1690602401602060405180830381865afa1580156113ea573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061140e9190612f4d565b91505061077e565b61079973ffffffffffffffffffffffffffffffffffffffff198316611a5f565b60608160405160200161144b91815260200190565b6040516020818303038152906040529050919050565b7fd6577bbd1315995ef7d02da632fcee9ea37575f42959077f04433a81ba97815a546000906001906001600160a01b031615610f62576000806000805160206131c2833981519152600490810154604080517ffeaf968c00000000000000000000000000000000000000000000000000000000815290516001600160a01b039092169263feaf968c928282019260a092908290030181865afa15801561150b573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061152f9190612fcb565b505092509250508160001492508261154b576000935050505090565b7fd6577bbd1315995ef7d02da632fcee9ea37575f42959077f04433a81ba97815a54600160a01b900463ffffffff166115848242612e90565b1015611594576000935050505090565b5050919050565b8151600090819060028111156115b3576115b3612ea3565b1480156115c05750815115155b156115d5578160005b6020020151905061077e565b602083015160009060028111156115ee576115ee612ea3565b1480156115fe5750602082015115155b1561160b578160016115c9565b6040517f7f72541400000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b60008215801561164c57508315155b15611658575082610799565b8315801561166557508215155b15611671575081610799565b8361168861168184612710612e90565b85906106a9565b111580156116a45750836116a161168184612710612f88565b10155b156116b0575082610799565b6040517fe15e19130000000000000000000000000000000000000000000000000000000081526004810185905260248101849052604401610129565b606061079983836000611acf565b60008160000361170c5750600061077e565b8254600160601b90046001600160a01b031615610ecd5782546040517fc6e6f59200000000000000000000000000000000000000000000000000000000815260048101849052600160601b9091046001600160a01b03169063c6e6f59290602401610e85565b82546000906117949084908490600160601b90046001600160a01b0316611b85565b90506117a284826000611c5c565b7f600d84bdc249b6ed51bca9ec0e9cddb82252a3411774d569bfd9421b9ace4c4980546000906117d3908490612e90565b9091555090949350505050565b6000826000036117f257506000610799565b6117fc8484610784565b90508161079957600284015461082590829062010000900461ffff166106a9565b60008260000361182f57506000610799565b600061183a856106cf565b90508261185e57600285015461185b90829062010000900461ffff166106a9565b90505b610dd084826107a0565b825460009061188a9084908490600160601b90046001600160a01b0316611c74565b905061189884826000611c5c565b7f600d84bdc249b6ed51bca9ec0e9cddb82252a3411774d569bfd9421b9ace4c49805490910190559392505050565b836001600160a01b0316866001600160a01b0316146118f1576118ee308585898987611d4b565b91505b60006118fd83836106a9565b808403939091508114611926576119248787856000805160206131a2833981519152610488565b505b8015611965577fd6577bbd1315995ef7d02da632fcee9ea37575f42959077f04433a81ba97815954611965906001600160a01b03898116911683611297565b846001600160a01b0316876001600160a01b03167f5b95ead7bc393beefd89643f9ac4fb05f7ccf4e1c12717accb04fcda868003ed85846040516119b3929190918252602082015260400190565b60405180910390a350505050505050565b60006119d08382611dbf565b90506000611a0d63ffffffff8416611a077f600d84bdc249b6ed51bca9ec0e9cddb82252a3411774d569bfd9421b9ace4c49611edd565b906106a9565b9050808210156108de576040517f7bfec00c000000000000000000000000000000000000000000000000000000008152600481018390526024810182905263ffffffff84166044820152606401610129565b604080516001808252818301909252600091829190602080830190803683370190505090508281600081518110611a9857611a98612ee0565b602002602001018181525050611aad81611f4b565b600081518110611abf57611abf612ee0565b6020026020010151915050919050565b606081471015611b0d576040517fcd786059000000000000000000000000000000000000000000000000000000008152306004820152602401610129565b600080856001600160a01b03168486604051611b299190613031565b60006040518083038185875af1925050503d8060008114611b66576040519150601f19603f3d011682016040523d82523d6000602084013e611b6b565b606091505b5091509150611b7b8683836120ed565b9695505050505050565b6040517f8dec3daa000000000000000000000000000000000000000000000000000000008152600481018490526001600160a01b03838116602483015260009190831690638dec3daa906044016020604051808303816000875af1158015611bf1573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190611c159190612f4d565b905080600003610799576040517fc7a718310000000000000000000000000000000000000000000000000000000081526001600160a01b0383166004820152602401610129565b6000610825611c69612162565b6102798686866117e0565b6040517fb696a6ad000000000000000000000000000000000000000000000000000000008152600481018490526001600160a01b0383811660248301526000919083169063b696a6ad906044016020604051808303816000875af1158015611ce0573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190611d049190612f4d565b905080600003610799576040517fcc21a8dd0000000000000000000000000000000000000000000000000000000081526001600160a01b0383166004820152602401610129565b6000836001600160a01b0316866001600160a01b031603611d7f57604051631aa5e6a560e21b815260040160405180910390fd5b611db48484611d9f898987306000805160206131a2833981519152610b17565b8a6000805160206131a2833981519152610b39565b979650505050505050565b8154604080516020808402820181019092528281526000928392869190830182828015611e1557602002820191906000526020600020905b81546001600160a01b03168152600190910190602001808311611df7575b5050505050905060005b8151811015611ed55760006000805160206131c28339815191526000016000848481518110611e5057611e50612ee0565b60200260200101516001600160a01b03166001600160a01b0316815260200190815260200160002090506000611eaa848481518110611e9157611e91612ee0565b602002602001015183896121ec9092919063ffffffff16565b6001600160801b031690508015611ecb57611ec682828861221e565b850194505b5050600101611e1f565b505092915050565b600080611ee8612162565b90506000611ef584612275565b9050600081600003611f08576000611f12565b611f1282846107a0565b85549091506000839003611f2a57611b7b8185610dd9565b808210611f3d5750600095945050505050565b611b7b846107938484612e90565b60606000825167ffffffffffffffff811115611f6957611f6961301b565b604051908082528060200260200182016040528015611f92578160200160208202803683370190505b5090506000835167ffffffffffffffff811115611fb157611fb161301b565b604051908082528060200260200182016040528015611fda578160200160208202803683370190505b5090506000845167ffffffffffffffff811115611ff957611ff961301b565b60405190808252806020026020018201604052801561202c57816020015b60608152602001906001900390816120175790505b50905060005b855181101561207e5760408051600180825281830190925290602080830190803683370190505082828151811061206b5761206b612ee0565b6020908102919091010152600101612032565b506000612089612312565b90506000612096826123d1565b61ffff1690506002820191506000604051905060005b828110156120d65760006120c38a89898989612401565b60408490529490940193506001016120ac565b506120e18487612642565b98975050505050505050565b606082612102576120fd8261276a565b610799565b815115801561211957506001600160a01b0384163b155b1561215b576040517f9996b3150000000000000000000000000000000000000000000000000000000081526001600160a01b0385166004820152602401610129565b5080610799565b6000806121806000805160206131a2833981519152612710836127ac565b9050806000036121c0577f600d84bdc249b6ed51bca9ec0e9cddb82252a3411774d569bfd9421b9ace4c4d546121ba9060ff16600a613131565b91505090565b6121ba7f600d84bdc249b6ed51bca9ec0e9cddb82252a3411774d569bfd9421b9ace4c495482906107a0565b6001600160a01b03821660009081526004840160205260408120600101546108259083906001600160801b0316610e11565b60008260000361223057506000610799565b61225a61223c856106cf565b60048601546107939068010000000000000000900460ff1686612911565b90508161079957600284015461082590829061ffff166106a9565b600080826003018054806020026020016040519081016040528092919081815260200182805480156122d057602002820191906000526020600020905b81546001600160a01b031681526001909101906020018083116122b2575b5050505050905060005b815181101561159457612306848383815181106122f9576122f9612ee0565b6020026020010151612965565b909201916001016122da565b60006602ed57011e0000601f193601358116148061235c576040517fe7764c9e00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b6000366029111561238057604051632bcb7bc560e11b815260040160405180910390fd5b50366028198101359062ffffff8216600c810191600e9091011115610799576040517fc30a7bd700000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b600060208201368111156123f857604051632bcb7bc560e11b815260040160405180910390fd5b36033592915050565b60008060008061241085612a91565b909250905060008080606081600d612429602088612f88565b6124339089613140565b61243d9190612f88565b9050600061244e3660688d01612ad5565b90506000612461368d8501604101612ad5565b905061246d8382612480565b93508260208501209450813596506124a4565b60408051838152602081850181019092526000910183838237601f19019392505050565b50506124ba836124b560418d612f88565b612ae1565b93506124c584612b59565b60ff169750505050505060008060005b84811015612628576124e8888583612c1c565b909350915060005b8c5181101561261f578c818151811061250b5761250b612ee0565b602002602001015184036126175760008b828151811061252d5761252d612ee0565b6020026020010151905061254681896001901b16151590565b15801561256f5750600160ff168d838151811061256557612565612ee0565b6020026020010151105b15612611578c828151811061258657612586612ee0565b60200260200101805180919060010181525050838b83815181106125ac576125ac612ee0565b602002602001015160018f85815181106125c8576125c8612ee0565b602002602001015103815181106125e1576125e1612ee0565b60209081029190910101526001881b81178c838151811061260457612604612ee0565b6020026020010181815250505b5061261f565b6001016124f0565b506001016124d5565b505050816020820102604e01935050505095945050505050565b60606000835167ffffffffffffffff8111156126605761266061301b565b604051908082528060200260200182016040528015612689578160200160208202803683370190505b509050600160005b855181101561276057818582815181106126ad576126ad612ee0565b60200260200101511015612713578481815181106126cd576126cd612ee0565b6020026020010151826040517f2b13aef5000000000000000000000000000000000000000000000000000000008152600401610129929190918252602082015260400190565b600061273787838151811061272a5761272a612ee0565b6020026020010151612c7c565b90508084838151811061274c5761274c612ee0565b602090810291909101015250600101612691565b5090949350505050565b80511561277a5780518082602001fd5b6040517f1425ea4200000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b6000808460010180548060200260200160405190810160405280929190818152602001828054801561280757602002820191906000526020600020905b81546001600160a01b031681526001909101906020018083116127e9575b5050505050905060005b81518110156128e65760006000805160206131c2833981519152600001600084848151811061284257612842612ee0565b60200260200101516001600160a01b03166001600160a01b03168152602001908152602001600020905060006128c488600401600086868151811061288957612889612ee0565b60200260200101516001600160a01b03166001600160a01b031681526020019081526020016000206000015483610e1190919063ffffffff16565b905080156128dc576128d78282886117e0565b850194505b5050600101612811565b5063ffffffff84166127101461290957610dd08263ffffffff808716906106a916565b509392505050565b6000601283101561293c57612927836012612e90565b61293290600a613157565b610ec69083613140565b6012831115610ecd57612950601284612e90565b61295b90600a613157565b610ec69083613179565b60028201546040517f70a082310000000000000000000000000000000000000000000000000000000081526001600160a01b0391821660048201526000918291908416906370a0823190602401602060405180830381865afa1580156129cf573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906129f39190612f4d565b905080600003612a0757600091505061077e565b6001600160a01b03831660009081526000805160206131c28339815191526020526040902060048101546e010000000000000000000000000000900460ff16612a555760009250505061077e565b6004810154612a749068010000000000000000900460ff16600a613131565b612a7d826106cf565b612a879084613140565b610dd09190613179565b60008080806041850181612aa83660618901612ad5565b803594509050612ab9816003612ad5565b62ffffff9490941697933563ffffffff16965092945050505050565b60006107998284612e90565b60408051600080825260208083018085528690523685900380850135831a948401859052803560608501819052910135608084018190529193909260019060a0016020604051602081039080840390855afa158015612b44573d6000803e3d6000fd5b5050604051601f190151979650505050505050565b60006001600160a01b03821673926e370fd53c23f8b71ad2b3217b227e41a92b1203612b8757506000919050565b6001600160a01b038216730c39486f770b26f5527bbbf942726537986cd7eb03612bb357506001919050565b6001600160a01b03821673f39fd6e51aad88f6f4ce6ab8827279cfffb9226603612bdf57506002919050565b6040517fec459bc00000000000000000000000000000000000000000000000000000000081526001600160a01b0383166004820152602401610129565b60008080612c2b604e87612f88565b90506000612c3a602087612f88565b612c45866001612f88565b612c4f9190613140565b612c599083612f88565b90506000612c673683612ad5565b80359960209091013598509650505050505050565b600061077e82600061077e8260008151600003612cc5576040517f9e198af900000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b612cce82612d60565b600060028351612cde9190613179565b905060028351612cee919061318d565b600003612d4e576000838281518110612d0957612d09612ee0565b602002602001015184600184612d1f9190612e90565b81518110612d2f57612d2f612ee0565b6020026020010151612d419190612f88565b9050610825600282613179565b828181518110611abf57611abf612ee0565b8051602082016020820281019150805b828110156108de57815b81811015612d9f578151815180821015612d95578084528183525b5050602001612d7a565b50602001612d70565b80356001600160a01b0381168114610f6257600080fd5b600080600060608486031215612dd457600080fd5b612ddd84612da8565b9250612deb60208501612da8565b9150604084013590509250925092565b60008060408385031215612e0e57600080fd5b612e1783612da8565b946020939093013593505050565b600080600080600060a08688031215612e3d57600080fd5b612e4686612da8565b9450612e5460208701612da8565b9350612e6260408701612da8565b94979396509394606081013594506080013592915050565b634e487b7160e01b600052601160045260246000fd5b8181038181111561077e5761077e612e7a565b634e487b7160e01b600052602160045260246000fd5b6001600160801b03828116828216039080821115612ed957612ed9612e7a565b5092915050565b634e487b7160e01b600052603260045260246000fd5b60005b83811015612f11578181015183820152602001612ef9565b50506000910152565b6020815260008251806020840152612f39816040850160208701612ef6565b601f01601f19169190910160400192915050565b600060208284031215612f5f57600080fd5b5051919050565b600060208284031215612f7857600080fd5b8151801515811461079957600080fd5b8082018082111561077e5761077e612e7a565b634e487b7160e01b600052600160045260246000fd5b805169ffffffffffffffffffff81168114610f6257600080fd5b600080600080600060a08688031215612fe357600080fd5b612fec86612fb1565b945060208601519350604086015192506060860151915061300f60808701612fb1565b90509295509295909350565b634e487b7160e01b600052604160045260246000fd5b60008251613043818460208701612ef6565b9190910192915050565b600181815b8085111561308857816000190482111561306e5761306e612e7a565b8085161561307b57918102915b93841c9390800290613052565b509250929050565b60008261309f5750600161077e565b816130ac5750600061077e565b81600181146130c257600281146130cc576130e8565b600191505061077e565b60ff8411156130dd576130dd612e7a565b50506001821b61077e565b5060208310610133831016604e8410600b841016171561310b575081810a61077e565b613115838361304d565b806000190482111561312957613129612e7a565b029392505050565b600061079960ff841683613090565b808202811582820484141761077e5761077e612e7a565b60006107998383613090565b634e487b7160e01b600052601260045260246000fd5b60008261318857613188613163565b500490565b60008261319c5761319c613163565b50069056feb26ba31e2d664e549a653236f2f9de4c4049d88f596d626e9ff280a35dbf5f64d6577bbd1315995ef7d02da632fcee9ea37575f42959077f04433a81ba978156a2646970667358221220f0930755ea41e6f2641c52fa298c2d7c714e2d1500fe321d9403e48fa90c8fc864736f6c63430008150033';

type SCDPSwapFacetConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (xs: SCDPSwapFacetConstructorParams): xs is ConstructorParameters<typeof ContractFactory> =>
  xs.length > 1;

export class SCDPSwapFacet__factory extends ContractFactory {
  constructor(...args: SCDPSwapFacetConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
    this.contractName = 'SCDPSwapFacet';
  }

  override deploy(overrides?: Overrides & { from?: PromiseOrValue<string> }): Promise<SCDPSwapFacet> {
    return super.deploy(overrides || {}) as Promise<SCDPSwapFacet>;
  }
  override getDeployTransaction(overrides?: Overrides & { from?: PromiseOrValue<string> }): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  override attach(address: string): SCDPSwapFacet {
    return super.attach(address) as SCDPSwapFacet;
  }
  override connect(signer: Signer): SCDPSwapFacet__factory {
    return super.connect(signer) as SCDPSwapFacet__factory;
  }
  static readonly contractName: 'SCDPSwapFacet';

  public readonly contractName: 'SCDPSwapFacet';

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): SCDPSwapFacetInterface {
    return new utils.Interface(_abi) as SCDPSwapFacetInterface;
  }
  static connect(address: string, signerOrProvider: Signer | Provider): SCDPSwapFacet {
    return new Contract(address, _abi, signerOrProvider) as SCDPSwapFacet;
  }
}
