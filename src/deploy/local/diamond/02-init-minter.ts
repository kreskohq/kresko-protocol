import { getLogger } from "@utils/deployment";
import { toFixedPoint } from "@utils/fixed-point";
import { minterFacets } from "src/contracts/diamond/diamond-config";
import type { DeployFunction } from "@kreskolabs/hardhat-deploy/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { MinterInitParamsStruct } from "types/typechain/MinterInitV1";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("init-minter");
    const { getNamedAccounts, Diamond } = hre;
    const { operator, treasury } = await getNamedAccounts();
    if (!Diamond.address) {
        throw new Error("Diamond not deployed");
    }

    const initializationArgs: MinterInitParamsStruct = {
        feeRecipient: treasury,
        operator,
        burnFee: toFixedPoint(process.env.BURN_FEE),
        liquidationIncentiveMultiplier: toFixedPoint(process.env.LIQUIDATION_INCENTIVE),
        minimumCollateralizationRatio: toFixedPoint(process.env.MINIMUM_COLLATERALIZATION_RATIO),
        minimumDebtValue: toFixedPoint(process.env.MINIMUM_DEBT_VALUE, 8),
    };
    for (const facet of minterFacets) {
        const Facet = await hre.run("add-facet", {
            name: facet,
            initializer: "MinterInitV1",
            initializerArgs: initializationArgs,
        });

        const params = await Diamond;
    }
    logger.success("Added minter facets and saved to diamond");
};

func.tags = ["local", "minter-init", "minter", "diamond"];

export default func;
