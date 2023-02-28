/* eslint-disable @typescript-eslint/no-explicit-any */
import SharedConfig from "@deploy-config/shared";

export const getSignatures = async (name: keyof TC) => {
    const implementation = await hre.getContractOrFork(name);

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
