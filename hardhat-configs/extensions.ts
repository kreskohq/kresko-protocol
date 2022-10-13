import { FormatTypes, Fragment } from "@ethersproject/abi";
import { FacetCut, FacetCutAction } from "@kreskolabs/hardhat-deploy/dist/types";
import { deployWithSignatures } from "@utils/deployment";
import { getAddresses, getUsers } from "@utils/general";
import { fromBig, toBig } from "@utils/numbers";
import { constants, ethers } from "ethers";
import { extendEnvironment } from "hardhat/config";
import SharedConfig from "src/config/shared";

extendEnvironment(async function (hre) {
    hre.users = await getUsers(hre);
    hre.addr = await getAddresses(hre);
});
// We can access these values from deploy scripts / hardhat run scripts
extendEnvironment(function (hre) {
    /* -------------------------------------------------------------------------- */
    /*                                   VALUES                                   */
    /* -------------------------------------------------------------------------- */
    hre.priceFeedsRegistry;
    hre.uniPairs = {};
    hre.utils = ethers.utils;
    hre.facets = [];
    hre.collaterals = [];
    hre.krAssets = [];
    hre.allAssets = [];
    hre.getUsers = getUsers;
    hre.getAddresses = getAddresses;
    /* -------------------------------------------------------------------------- */
    /*                              Helper Functions                              */
    /* -------------------------------------------------------------------------- */
    hre.fromBig = fromBig;
    hre.toBig = toBig;
    hre.deploy = deployWithSignatures(hre);
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

    hre.getSignature = from =>
        Fragment.from(from)?.type === "function" && ethers.utils.Interface.getSighash(Fragment.from(from));
    hre.getSignatures = abi =>
        new hre.utils.Interface(abi).fragments
            .filter(
                f =>
                    f.type === "function" &&
                    !SharedConfig.signatureFilters.some(s => s.indexOf(f.name.toLowerCase()) > -1),
            )
            .map(hre.utils.Interface.getSighash);
    hre.getSignaturesWithNames = abi =>
        new hre.utils.Interface(abi).fragments
            .filter(
                f =>
                    f.type === "function" &&
                    !SharedConfig.signatureFilters.some(s => s.indexOf(f.name.toLowerCase()) > -1),
            )
            .map(fragment => ({ name: fragment.name, sig: hre.utils.Interface.getSighash(fragment) }));
});
