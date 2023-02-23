/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { FormatTypes, Fragment } from "@ethersproject/abi";
import { FacetCut, FacetCutAction } from "hardhat-deploy/dist/types";
import { DeployOptions } from "hardhat-deploy/types";
import { fromBig, toBig } from "@kreskolabs/lib";
import { deployWithSignatures } from "@utils/deployment";
import { getAddresses, getUsers } from "@utils/general";
import { constants, ethers } from "ethers";
import { extendEnvironment } from "hardhat/config";
import { ContractNames } from "packages/contracts";
import SharedConfig from "src/deploy-config/shared";
import { networks } from "./networks";

extendEnvironment(async function (hre) {
    hre.users = await getUsers(hre);
    hre.addr = await getAddresses(hre);
});
// We can access these values from deploy scripts / hardhat run scripts
extendEnvironment(function (hre) {
    /* -------------------------------------------------------------------------- */
    /*                                   VALUES                                   */
    /* -------------------------------------------------------------------------- */
    hre.facets = [];
    hre.collaterals = [];
    hre.krAssets = [];
    hre.allAssets = [];
    hre.getUsers = getUsers;
    hre.getAddresses = getAddresses;
    hre.forking = {
        provider: new ethers.providers.JsonRpcProvider(networks(process.env.MNEMONIC!).ganache.url),
        deploy: async <T extends Contract>(name: string, options?: DeployOptions) => {
            const signer = options ? hre.forking.provider.getSigner(options.from) : hre.users.deployer;
            return (await (await hre.ethers.getContractFactory(name, signer)).deploy(options?.args)) as T;
        },
    };

    /* -------------------------------------------------------------------------- */
    /*                              Helper Functions                              */
    /* -------------------------------------------------------------------------- */
    hre.getContractOrFork = async <T = Contract>(name: ContractNames) => {
        if (hre.companionNetworks["live"]) {
            const deployment = await hre.companionNetworks["live"].deployments.get(name);
            return hre.ethers.getContractAt(name, deployment.address) as unknown as T;
        }
        return hre.ethers.getContract(name) as unknown as T;
    };
    hre.fromBig = fromBig;
    hre.toBig = toBig;
    hre.deploy = deployWithSignatures(hre);
    hre.getSignature = from =>
        Fragment.from(from)?.type === "function" && ethers.utils.Interface.getSighash(Fragment.from(from));
    hre.getSignatures = abi =>
        new ethers.utils.Interface(abi).fragments
            .filter(
                f =>
                    f.type === "function" &&
                    !SharedConfig.signatureFilters.some(s => s.indexOf(f.name.toLowerCase()) > -1),
            )
            .map(ethers.utils.Interface.getSighash);
    hre.getAddFacetArgs = <T extends Contract>(
        facet: T,
        selectors?: string[],
        initializer?: {
            contract: Contract;
            functionName?: string;
            args?: unknown[];
        },
    ) => {
        selectors =
            selectors && selectors.length
                ? selectors
                : // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  hre.getSignatures(facet.interface.format(FormatTypes.json) as any[]);

        const facetCut: FacetCut = {
            facetAddress: facet.address,
            action: FacetCutAction.Add,
            functionSelectors: selectors,
        };
        const initialization = initializer
            ? {
                  _init: initializer.contract.address,
                  _calldata: initializer.contract.interface.encodeFunctionData(
                      initializer.functionName!,
                      initializer.args,
                  ),
              }
            : { _init: constants.AddressZero, _calldata: "0x" };

        return {
            facetCut,
            initialization,
        };
    };

    hre.getSignaturesWithNames = abi =>
        new ethers.utils.Interface(abi).fragments
            .filter(
                f =>
                    f.type === "function" &&
                    !SharedConfig.signatureFilters.some(s => s.indexOf(f.name.toLowerCase()) > -1),
            )
            .map(fragment => ({ name: fragment.name, sig: ethers.utils.Interface.getSighash(fragment) }));
});
