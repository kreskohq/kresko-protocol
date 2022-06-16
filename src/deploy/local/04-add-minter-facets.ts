import { getLogger } from "@utils/deployment";
import { toFixedPoint } from "@utils/fixed-point";
import minterConfig from "src/config/minter";
import { addFacets } from "@scripts/add-facets";
import type { DeployFunction } from "@kreskolabs/hardhat-deploy/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { MinterInitArgsStruct } from "types/typechain/OperatorFacet";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("init-minter");
    const { getNamedAccounts, Diamond, deployments } = hre;
    const { operator, treasury } = await getNamedAccounts();
    if (!Diamond.address) {
        throw new Error("Diamond not deployed");
    }
    const Safe = await deployments.get("Multisig");

    if (!Safe.address) {
        throw new Error("Safe not deployed");
    }

    const initializerArgs: MinterInitArgsStruct = {
        feeRecipient: treasury,
        operator,
        council: Safe.address,
        burnFee: toFixedPoint(process.env.BURN_FEE),
        liquidationIncentiveMultiplier: toFixedPoint(process.env.LIQUIDATION_INCENTIVE),
        minimumCollateralizationRatio: toFixedPoint(process.env.MINIMUM_COLLATERALIZATION_RATIO),
        minimumDebtValue: toFixedPoint(process.env.MINIMUM_DEBT_VALUE, 8),
        secondsUntilStalePrice: toFixedPoint(process.env.MINIMUM_DEBT_VALUE, 8),
    };

    // Will save deployment
    await addFacets({
        names: minterConfig.facets,
        initializerName: "OperatorFacet",
        initializerArgs,
    });
    logger.success("Added minter facets and saved to diamond");
};

func.tags = ["local", "minter-init", "minter", "diamond"];
func.dependencies = ["diamond-init", "gnosis-safe"];

export default func;
