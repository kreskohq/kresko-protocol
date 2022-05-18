import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "@kreskolabs/hardhat-deploy/types";
import { getLogger } from "@utils/deployment";
import { DiamondOwnershipFacet } from "types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("deploy-diamond");
    const {
        ethers,
        getNamedAccounts,
        deployments: { diamond },
    } = hre;
    const { admin } = await getNamedAccounts();

    const result = await diamond.deploy("krDiamond", {
        diamondContract: "Diamond",
        defaultCutFacet: false,
        defaultOwnershipFacet: false,
        from: admin,
        owner: admin,
        log: true,
        facets: [
            { name: "DiamondCutFacet", contract: "DiamondCutFacet" },
            { name: "DiamondOwnershipFacet", contract: "DiamondOwnershipFacet" },
            { name: "ERC165Facet", contract: "ERC165Facet" },
        ],
    });

    const krDiamond = await ethers.getContract<DiamondOwnershipFacet>("krDiamond");
    logger.log("Initiated diamond with", result.facets.length, "facets");

    const owner = await krDiamond.owner();
    console.log("Owner is:", owner);
};

func.tags = ["local", "diamond-init", "diamond"];

export default func;
