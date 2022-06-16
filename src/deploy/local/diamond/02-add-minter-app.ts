import { getLogger } from "@utils/deployment";
import { toFixedPoint } from "@utils/fixed-point";
import minterConfig from "src/config/minter";
import { addFacets } from "@scripts/add-facets";
import type { DeployFunction } from "@kreskolabs/hardhat-deploy/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { MinterInitParamsStruct } from "types/typechain/OperatorFacet";

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
        secondsUntilStalePrice: toFixedPoint(process.env.MINIMUM_DEBT_VALUE, 8),
    };

    const UpgradedDiamond = await addFacets({
        names: minterConfig.facets,
        initializerName: "MinterAdminFacet",
        initializerArgs,
    });
    const doesSupportFacets = await UpgradedDiamond.supportsInterface("0x5d630885");

    if (doesSupportFacets) {
        logger.success("Added minter facets and saved to diamond");
    } else {
        logger.warn("Added facets but ERC165 support for latest facet is missing");
    }
};

func.tags = ["local", "minter-init", "minter", "diamond"];
func.dependencies = ["diamond-init"];

export default func;
