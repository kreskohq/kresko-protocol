import { getLogger } from "@utils/deployment";
import { toFixedPoint } from "@utils/fixed-point";
import { minterFacets } from "src/contracts/diamond/config/config";
import { addFacet } from "@scripts/add-facet";
import type { DeployFunction } from "@kreskolabs/hardhat-deploy/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { MinterInitParamsStruct } from "types/typechain/MinterParameterFacet";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("init-minter");
    const { getNamedAccounts, Diamond } = hre;
    const { operator, treasury } = await getNamedAccounts();
    if (!Diamond.address) {
        throw new Error("Diamond not deployed");
    }

    const initializerArgs: MinterInitParamsStruct = {
        feeRecipient: treasury,
        operator,
        burnFee: toFixedPoint(process.env.BURN_FEE),
        liquidationIncentiveMultiplier: toFixedPoint(process.env.LIQUIDATION_INCENTIVE),
        minimumCollateralizationRatio: toFixedPoint(process.env.MINIMUM_COLLATERALIZATION_RATIO),
        minimumDebtValue: toFixedPoint(process.env.MINIMUM_DEBT_VALUE, 8),
    };

    for (const facet of minterFacets) {
        await addFacet({ name: facet, internalInitializer: true, initializerArgs });
    }
    logger.success("Added minter facets and saved to diamond");
};

func.tags = ["local", "minter-init", "minter", "diamond"];
func.dependencies = ["diamond-init"];

export default func;
