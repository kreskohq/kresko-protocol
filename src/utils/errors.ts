import { HardhatRuntimeEnvironment } from "hardhat/types";
import {
    AssetConfigurationFacet__factory,
    CError__factory,
    CommonConfigurationFacet__factory,
    ConfigurationFacet__factory,
    Errors__factory,
} from "types/typechain";

export const getCError = (hre: HardhatRuntimeEnvironment) => {
    return CError__factory.connect(hre.Diamond.address, hre.Diamond.provider);
};
