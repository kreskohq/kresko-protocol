/* Autogenerated file. Do not edit manually. */
// @ts-nocheck
/* tslint:disable */
/* eslint-disable */
import { Signer, utils, Contract, ContractFactory, PayableOverrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../../../../common";
import type { ERC20Upgradeable, ERC20UpgradeableInterface } from "../../../../src/contracts/shared/ERC20Upgradeable";

const _abi = [
    {
        inputs: [],
        stateMutability: "payable",
        type: "constructor",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "owner",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "spender",
                type: "address",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "amount",
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
                indexed: false,
                internalType: "uint8",
                name: "version",
                type: "uint8",
            },
        ],
        name: "Initialized",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "from",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "to",
                type: "address",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "amount",
                type: "uint256",
            },
        ],
        name: "Transfer",
        type: "event",
    },
    {
        inputs: [],
        name: "DOMAIN_SEPARATOR",
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
                internalType: "address",
                name: "_owner",
                type: "address",
            },
            {
                internalType: "address",
                name: "_spender",
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
                name: "spender",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "amount",
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
                name: "_account",
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
        inputs: [
            {
                internalType: "address",
                name: "",
                type: "address",
            },
        ],
        name: "nonces",
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
                name: "owner",
                type: "address",
            },
            {
                internalType: "address",
                name: "spender",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "value",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "deadline",
                type: "uint256",
            },
            {
                internalType: "uint8",
                name: "v",
                type: "uint8",
            },
            {
                internalType: "bytes32",
                name: "r",
                type: "bytes32",
            },
            {
                internalType: "bytes32",
                name: "s",
                type: "bytes32",
            },
        ],
        name: "permit",
        outputs: [],
        stateMutability: "nonpayable",
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
                name: "to",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "amount",
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
                name: "from",
                type: "address",
            },
            {
                internalType: "address",
                name: "to",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "amount",
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
] as const;

const _bytecode =
    "0x60c060409080825260009081549060ff8260081c161590818092610347575b8015610330575b156102ae5750600160ff19928282858316178655610280575b50466080528451918482549081841c848316928315610276575b6020978883108514610249578890838952818901959283600014610233575050506001146101fc575b5067ffffffffffffffff9490819003601f017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe01681019190858311818410176101cf5782895251902090858101917f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f8352888201527fc89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc660608201524660808201523060a082015260a0815260c0810194818610908611176101a25784885251902060a05261016b575b8451610b9f908162000355823960805181610990015260a051816109b70152f35b7f7f26b83ff96e1f2b6a682f133852f6798a09c465da95921460cefb38474024989361ff001981541690558152a13880808061014a565b7f4e487b710000000000000000000000000000000000000000000000000000000087526041600452602487fd5b7f4e487b710000000000000000000000000000000000000000000000000000000088526041600452602488fd5b869150848852818820908589925b82841061021d5750505085010138610081565b8054848a0186015289949093019287910161020a565b9194509150168352151560051b85010138610081565b7f4e487b71000000000000000000000000000000000000000000000000000000008a52602260045260248afd5b90607f1690610058565b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000166101011784553861003e565b7f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152602e60248201527f496e697469616c697a61626c653a20636f6e747261637420697320616c72656160448201527f647920696e697469616c697a65640000000000000000000000000000000000006064820152608490fd5b50303b1580156100255750600160ff841614610025565b50600160ff84161061001e56fe608060408181526004918236101561001657600080fd5b600092833560e01c91826306fdde03146107bc57508163095ea7b31461074b57816318160ddd1461072d57816323b872dd1461063e578163313ce5671461061c5781633644e515146105f857816370a08231146105955781637ecebe001461053257816395d89b4114610451578163a9059cbb146103c0578163d505accf14610101575063dd62ed3e146100a957600080fd5b346100fd57806003193601126100fd57806020926100c561091d565b6100cd610945565b73ffffffffffffffffffffffffffffffffffffffff91821683526006865283832091168252845220549051908152f35b5080fd5b9050346103bc5760e0367ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc01126103bc5761013a61091d565b610142610945565b9260443590606435936084359360ff85168095036103b8574286106103755761016961098b565b9660018060a01b0380921696878a5260209660078852858b20998a549a60018c019055865192858a8501957f6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c987528c8a870152169b8c606086015289608086015260a085015260c084015260c0835260e0830167ffffffffffffffff9484821086831117610349578189528451902061010085019261190160f01b8452610102860152610122850152604281526101608401948186109086111761031d57848852519020835261018082015260a4356101a082015260c4356101c0909101528880528590899060809060015afa1561031357875116908115158061030a575b156102ad57508652600683528086208587528352808620829055519081527f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b9259190a380f35b82517f08c379a0000000000000000000000000000000000000000000000000000000008152908101859052600e60248201527f494e56414c49445f5349474e45520000000000000000000000000000000000006044820152606490fd5b50858214610268565b82513d89823e3d90fd5b7f4e487b71000000000000000000000000000000000000000000000000000000008d526041875260248dfd5b7f4e487b71000000000000000000000000000000000000000000000000000000008e526041885260248efd5b506020606492519162461bcd60e51b8352820152601760248201527f5045524d49545f444541444c494e455f455850495245440000000000000000006044820152fd5b8780fd5b8280fd5b5050346100fd57806003193601126100fd576020916103dd61091d565b8260243591338452600586528184206103f7848254610968565b905573ffffffffffffffffffffffffffffffffffffffff16808452600586529220805482019055825190815233907fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef908590a35160018152f35b5050346100fd57816003193601126100fd578051908260025461047381610862565b8085529160019180831690811561050a57506001146104ad575b50505061049f826104a994038361089c565b51918291826108d4565b0390f35b9450600285527f405787fa12a823e0f2b7631cc41b3ba8828b3321ca811111fa75cd3aa3bb5ace5b8286106104f25750505061049f8260206104a9958201019461048d565b805460208787018101919091529095019481016104d5565b6104a997508693506020925061049f94915060ff191682840152151560051b8201019461048d565b5050346100fd576020367ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc01126100fd57602091819073ffffffffffffffffffffffffffffffffffffffff61058561091d565b1681526007845220549051908152f35b5050346100fd576020367ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc01126100fd57602091819073ffffffffffffffffffffffffffffffffffffffff6105e861091d565b1681526005845220549051908152f35b5050346100fd57816003193601126100fd5760209061061561098b565b9051908152f35b5050346100fd57816003193601126100fd5760209060ff600354169051908152f35b5050346100fd576060367ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc01126100fd5761067761091d565b91610680610945565b7fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef6044359160018060a01b03809616928385528560209788936006855282882033895285528288205484600019820361070a575b5050868852600585528288206106eb858254610968565b9055169586815260058452208181540190558551908152a35160018152f35b61071391610968565b87895260068652838920338a5286528389205538846106d4565b9050346103bc57826003193601126103bc5760209250549051908152f35b5050346100fd57806003193601126100fd576020918161076961091d565b91602435918291338152600687528181209460018060a01b0316948582528752205582519081527f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925843392a35160018152f35b849084346103bc57826003193601126103bc578260018054916107de83610862565b8086529282811690811561050a57506001146108065750505061049f826104a994038361089c565b94508085527fb10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf65b82861061084a5750505061049f8260206104a9958201019461048d565b8054602087870181019190915290950194810161082d565b90600182811c92168015610892575b602083101461087c57565b634e487b7160e01b600052602260045260246000fd5b91607f1691610871565b90601f8019910116810190811067ffffffffffffffff8211176108be57604052565b634e487b7160e01b600052604160045260246000fd5b6020808252825181830181905290939260005b82811061090957505060409293506000838284010152601f8019910116010190565b8181018601518482016040015285016108e7565b6004359073ffffffffffffffffffffffffffffffffffffffff8216820361094057565b600080fd5b6024359073ffffffffffffffffffffffffffffffffffffffff8216820361094057565b9190820391821161097557565b634e487b7160e01b600052601160045260246000fd5b6000467f0000000000000000000000000000000000000000000000000000000000000000036109d957507f000000000000000000000000000000000000000000000000000000000000000090565b60405181600191825491816109ed84610862565b9182825260209586830195878282169182600014610b2d575050600114610ad4575b50610a1c9250038261089c565b51902091604051918201927f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f845260408301527fc89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc660608301524660808301523060a083015260a0825260c082019082821067ffffffffffffffff831117610aa7575060405251902090565b7f4e487b710000000000000000000000000000000000000000000000000000000081526041600452602490fd5b80885286915087907fb10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf65b858310610b15575050610a1c935082010138610a0f565b80548388018501528694508893909201918101610afe565b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00168852610a1c95151560051b8501019250389150610a0f905056fea2646970667358221220ab902ccbac82abc0c171a621444704981a34ec8470f3495e474ad4fe0af8a39f64736f6c63430008130033";

type ERC20UpgradeableConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (xs: ERC20UpgradeableConstructorParams): xs is ConstructorParameters<typeof ContractFactory> =>
    xs.length > 1;

export class ERC20Upgradeable__factory extends ContractFactory {
    constructor(...args: ERC20UpgradeableConstructorParams) {
        if (isSuperArgs(args)) {
            super(...args);
        } else {
            super(_abi, _bytecode, args[0]);
        }
        this.contractName = "ERC20Upgradeable";
    }

    override deploy(overrides?: PayableOverrides & { from?: PromiseOrValue<string> }): Promise<ERC20Upgradeable> {
        return super.deploy(overrides || {}) as Promise<ERC20Upgradeable>;
    }
    override getDeployTransaction(
        overrides?: PayableOverrides & { from?: PromiseOrValue<string> },
    ): TransactionRequest {
        return super.getDeployTransaction(overrides || {});
    }
    override attach(address: string): ERC20Upgradeable {
        return super.attach(address) as ERC20Upgradeable;
    }
    override connect(signer: Signer): ERC20Upgradeable__factory {
        return super.connect(signer) as ERC20Upgradeable__factory;
    }
    static readonly contractName: "ERC20Upgradeable";

    public readonly contractName: "ERC20Upgradeable";

    static readonly bytecode = _bytecode;
    static readonly abi = _abi;
    static createInterface(): ERC20UpgradeableInterface {
        return new utils.Interface(_abi) as ERC20UpgradeableInterface;
    }
    static connect(address: string, signerOrProvider: Signer | Provider): ERC20Upgradeable {
        return new Contract(address, _abi, signerOrProvider) as ERC20Upgradeable;
    }
}
