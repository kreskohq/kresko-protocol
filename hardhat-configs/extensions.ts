/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { FormatTypes, Fragment } from "@ethersproject/abi";
import { fromBig, toBig } from "@kreskolabs/lib";
import { getAddresses, getUsers } from "@utils/general";
import { constants, ethers } from "ethers";
import { FacetCut, FacetCutAction } from "hardhat-deploy/dist/types";
import { extendEnvironment } from "hardhat/config";
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
        deploy: async (name, options) => {
            const signer = options ? hre.forking.provider.getSigner(options.from) : hre.users.deployer;
            return (await hre.deploy(name, { ...options, from: await signer.getAddress() }))[0];
        },
    };
    hre.getDeploymentOrNull = async deploymentName => {
        const isFork = !hre.network.config.live && hre.companionNetworks["live"];
        const deployment = !isFork
            ? await hre.deployments.getOrNull(deploymentName)
            : await hre.companionNetworks["live"].deployments.getOrNull(deploymentName);

        if (!deployment && deploymentName === "Kresko") {
            return await hre.deployments.getOrNull("Diamond");
        }
        return deployment;
    };
    /* -------------------------------------------------------------------------- */
    /*                              Helper Functions                              */
    /* -------------------------------------------------------------------------- */
    hre.getContractOrFork = async (type, deploymentName) => {
        const deploymentId = deploymentName ? deploymentName : type;
        const deployment = await hre.getDeploymentOrNull(deploymentId);

        if (!deployment) {
            throw new Error(`${deploymentId} not deployed on ${hre.network.name} network`);
        }

        return hre.ethers.getContractAt(type, deployment.address) as unknown as TC[typeof type];
    };
    hre.fromBig = fromBig;
    hre.toBig = toBig;
    hre.deploy = async (type, options) => {
        const { deployer } = await hre.getNamedAccounts();
        const deploymentId = options?.deploymentName ?? type;
        const opts = options
            ? {
                  ...options,
                  contract: options.deploymentName ? type : options.contract,
                  log: true,
                  from: options.from || deployer,
                  name: undefined,
              }
            : {
                  from: deployer,
                  log: true,
                  contract: type,
              };

        const deployment = await hre.deployments.deploy(deploymentId, opts);

        const implementation = await hre.getContractOrFork(type, deploymentId);
        return [
            implementation,
            implementation.interface.fragments
                .filter(
                    frag =>
                        frag.type !== "constructor" &&
                        !SharedConfig.signatureFilters.some(f => f.indexOf(frag.name.toLowerCase()) > -1),
                )
                .map(frag => implementation.interface.getSighash(frag)),
            deployment,
        ] as const;
    };
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
    hre.getAddFacetArgs = (
        facet,
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
