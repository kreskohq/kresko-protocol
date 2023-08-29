import { testnetConfigs } from "@deploy-config/arbitrumGoerli";
import { scdpFacets, getSCDPInitializer, getDeploymentUsers } from "@deploy-config/shared";
import { getLogger } from "@kreskolabs/lib";
import { addFacets } from "@scripts/add-facets";
import type { DeployFunction } from "hardhat-deploy/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

const logger = getLogger("init-minter");

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    if (!hre.Diamond.address) {
        throw new Error("Diamond not deployed");
    }
    const { treasury, admin: _admin, multisig } = await getDeploymentUsers(hre);
    const config = testnetConfigs[hre.network.name].protocolParams;
    const [SDI] = await hre.deploy("SDI", {
        args: [hre.Diamond.address, treasury, config.extOracleDecimals, multisig],
    });
    const initializer = await getSCDPInitializer(hre, SDI.address);

    await addFacets({
        names: scdpFacets,
        initializerName: initializer.name,
        initializerArgs: initializer.args,
    });
    logger.success("Added SCDP facets, saved to diamond");
};

deploy.tags = ["minter-test", "local", "minter-init", "all", "add-facets"];
deploy.dependencies = ["diamond-init", "minter-facets"];
deploy.skip = async hre => hre.network.live;

export default deploy;
