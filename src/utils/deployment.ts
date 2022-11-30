/* eslint-disable @typescript-eslint/no-explicit-any */
import type { DeployOptions } from "@kreskolabs/hardhat-deploy/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import SharedConfig from "@deploy-config/shared";

export const deployWithSignatures =
    (hre: HardhatRuntimeEnvironment) =>
    async <T extends Contract>(name: string, options?: DeployOptions): Promise<DeployResultWithSignatures<T>> => {
        const { getNamedAccounts, deployments, ethers } = hre;
        const { testnetAdmin } = await getNamedAccounts();
        const { deploy } = deployments;
        const defaultOptions = {
            from: testnetAdmin,
            log: true,
        };
        const deployment = await deploy(name, options ? { ...options } : defaultOptions);

        const implementation = await ethers.getContract<T>(name);
        return [
            implementation,
            implementation.interface.fragments
                .filter(
                    frag =>
                        frag.type !== "constructor" &&
                        !SharedConfig.signatureFilters.some(f => f.indexOf(frag.name.toLowerCase()) > -1),
                )
                .map(frag => ethers.utils.Interface.getSighash(frag)),
            deployment,
        ];
    };

export const getSignatures =
    (hre: HardhatRuntimeEnvironment) =>
    async <T extends Contract>(name: string) => {
        const implementation = await hre.ethers.getContract<T>(name);

        const fragments = implementation.interface.fragments
            .filter(
                frag =>
                    frag.type !== "constructor" &&
                    !SharedConfig.signatureFilters.some(f => f.indexOf(frag.name.toLowerCase()) > -1),
            )
            .reduce<{ [key: string]: string }>((result, frag) => {
                result[frag.name] = hre.ethers.utils.Interface.getSighash(frag);
                return result;
            }, {});

        return fragments;
    };
