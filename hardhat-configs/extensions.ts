/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Fragment } from "@ethersproject/abi";
import { checkAddress } from "@scripts/check-address";
import { getAddresses, getUsers } from "@utils/general";
import { ethers } from "ethers";
import { extendEnvironment } from "hardhat/config";
import SharedConfig from "src/deploy-config/shared";
import { ContractTypes } from "types";

extendEnvironment(async function (hre) {
    // for testing
    hre.users = await getUsers(hre);
    hre.addr = await getAddresses(hre);
});

// Simply access these extensions from hre
extendEnvironment(function (hre) {
    /* -------------------------------------------------------------------------- */
    /*                                   VALUES                                   */
    /* -------------------------------------------------------------------------- */
    hre.facets = [];
    hre.collaterals = [];
    hre.krAssets = [];
    hre.allAssets = [];
    hre.checkAddress = checkAddress;
    // hre.forking = {
    //     provider: new ethers.providers.JsonRpcProvider(
    //         (networks(process.env.MNEMONIC!).ganache as HttpNetworkConfig).url,
    //     ),
    //     deploy: async (name, options) => {
    //         const signer = options ? hre.forking.provider.getSigner(options.from) : hre.users.deployer;
    //         return (await hre.deploy(name, { ...options, from: await signer.getAddress() }))[0];
    //     },
    // };
    hre.getDeploymentOrFork = async deploymentName => {
        const isFork = !hre.network.live && hre.companionNetworks["live"];
        const deployment = !isFork
            ? await hre.deployments.getOrNull(deploymentName)
            : await hre.companionNetworks["live"].deployments.getOrNull(deploymentName);

        if (!deployment && deploymentName === "Kresko") {
            return !isFork
                ? await hre.deployments.getOrNull("Diamond")
                : await hre.companionNetworks["live"].deployments.getOrNull("Diamond");
        }
        return deployment || (await hre.deployments.getOrNull(deploymentName));
    };
    /* -------------------------------------------------------------------------- */
    /*                              Helper Functions                              */
    /* -------------------------------------------------------------------------- */
    hre.getContractOrFork = async (type, deploymentName) => {
        const deploymentId = deploymentName ? deploymentName : type;
        const deployment = await hre.getDeploymentOrFork(deploymentId);

        if (!deployment) {
            throw new Error(`${deploymentId} not deployed on ${hre.network.name} network`);
        }

        return hre.ethers.getContractAt(type, deployment.address) as unknown as TC[typeof type];
    };

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

        try {
            const implementation = await hre.getContractOrFork(type, deploymentId);
            return [
                implementation,
                implementation.interface.fragments
                    .filter(
                        frag =>
                            frag.type === "function" &&
                            !SharedConfig.signatureFilters.some(f => f.indexOf(frag.name.toLowerCase()) > -1),
                    )
                    .map(frag => implementation.interface.getSighash(frag)),

                deployment,
            ] as const;
        } catch (e: any) {
            if (e.message.includes("not deployed")) {
                const implementation = (await hre.ethers.getContractAt(
                    type,
                    deployment.address,
                )) as unknown as ContractTypes[typeof type];
                return [
                    implementation,
                    implementation.interface.fragments
                        .filter(
                            frag =>
                                frag.type === "function" &&
                                !SharedConfig.signatureFilters.some(f => f.indexOf(frag.name.toLowerCase()) > -1),
                        )
                        .map(frag => implementation.interface.getSighash(frag)),
                    deployment,
                ] as const;
            } else {
                throw new Error(e);
            }
        }
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

    hre.getSignaturesWithNames = abi =>
        new ethers.utils.Interface(abi).fragments
            .filter(
                f =>
                    f.type === "function" &&
                    !SharedConfig.signatureFilters.some(s => s.indexOf(f.name.toLowerCase()) > -1),
            )
            .map(fragment => ({
                name: fragment.name,
                sig: ethers.utils.Interface.getSighash(fragment),
            }));
});
