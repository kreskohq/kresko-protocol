import { extendEnvironment } from "hardhat/config";
import { toBig, fromBig } from "@utils/numbers";
import { constructors } from "@utils/constuctors";
import { deployWithSignatures } from "@utils/deployment";
import { ethers } from "ethers";

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
    hre.getSignatures = abi => new hre.utils.Interface(abi).fragments.map(hre.utils.Interface.getSighash);
});

export {};
