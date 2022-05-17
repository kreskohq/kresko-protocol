import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { getLogger } from "@utils/deployment";
import { OwnershipFacet } from "types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("deploy-diamond");
    const {
        ethers,
        getNamedAccounts,
        deployments: { diamond },
    } = hre;
    const { admin } = await getNamedAccounts();

    await diamond.deploy("krDiamond", {
        from: admin,
        diamondContract: "Diamond",
        defaultOwnershipFacet: false,
        execute: {
            contract: "DiamondInit",
            methodName: "initialize",
            args: [],
        },
        facets: ["OwnershipFacet"],
    });

    const krDiamond = await ethers.getContract<OwnershipFacet>("krDiamond");
};

func.tags = ["local", "diamond-init", "diamond"];

export default func;
