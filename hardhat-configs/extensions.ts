import { extendEnvironment } from "hardhat/config";
import { toBig, fromBig } from "@utils/numbers";
import { constructors } from "@utils/constuctors";
import { deployWithSignatures } from "@utils/deployment";
import { constants, ethers } from "ethers";
import { FacetCut, FacetCutAction } from "@kreskolabs/hardhat-deploy/dist/types";
import { FormatTypes } from "@ethersproject/abi";

// We can access these values from deploy scripts / hardhat run scripts
extendEnvironment(async function (hre) {
    hre.deploy = deployWithSignatures(hre);
    hre.utils = ethers.utils;
    hre.fromBig = fromBig;
    hre.toBig = toBig;
    hre.krAssets = {};
    hre.priceFeeds = {};
    hre.priceFeedsRegistry;
    hre.priceAggregators = {};
    hre.uniPairs = {};
    hre.constructors = constructors;
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
                : hre.getSignatures(facet.interface.format(FormatTypes.json) as any[]);

        const facetCut: FacetCut = {
            facetAddress: facet.address,
            action: FacetCutAction.Add,
            functionSelectors: selectors,
        };
        const initialization = initializer
            ? {
                  _init: initializer.contract.address,
                  _calldata: initializer.contract.interface.encodeFunctionData(
                      initializer.functionName,
                      initializer.args,
                  ),
              }
            : { _init: constants.AddressZero, _calldata: "0x" };

        return {
            facetCut,
            initialization,
        };
    };
    hre.getSignatures = abi =>
        new hre.utils.Interface(abi).fragments.filter(f => f.type === "function").map(hre.utils.Interface.getSighash);
    hre.getSignaturesWithNames = abi =>
        new hre.utils.Interface(abi).fragments
            .filter(f => f.type === "function")
            .map(fragment => ({ name: fragment.name, sig: hre.utils.Interface.getSighash(fragment) }));
});

export {};
