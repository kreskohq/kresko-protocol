import { anchorTokenPrefix } from "@deploy-config/shared";
import { getLogger, toBig } from "@kreskolabs/lib";
import { defaultSupplyLimit } from "@utils/test/mocks";
import { task, types } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";
import { TASK_WHITELIST_KRASSET } from "./names";
import { redstoneMap } from "@deploy-config/arbitrumGoerli";
import { OracleType } from "@utils/test/oracles";
import { OracleConfigurationStruct } from "types/typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko";

task(TASK_WHITELIST_KRASSET)
    .addParam("symbol", "Name of the asset")
    .addParam("kFactor", "kFactor for the asset", 0, types.float)
    .addParam("oracleAddr", "Price feed address")
    .addParam("supplyLimit", "Supply limit", defaultSupplyLimit, types.int)
    .addOptionalParam("log", "Log outputs", false, types.boolean)
    .addOptionalParam("wait", "Log outputs", 1, types.int)
    .setAction(async function (taskArgs: TaskArguments, hre) {
        const { symbol, kFactor, oracleAddr, supplyLimit, log } = taskArgs;
        const logger = getLogger(TASK_WHITELIST_KRASSET, log);

        if (kFactor === 0 || kFactor < 1) {
            throw new Error("Invalid kFactor for", symbol);
        }
        hre.checkAddress(oracleAddr, `Invalid oracle address: ${oracleAddr}, Kresko Asset: ${symbol}`);

        const Kresko = await hre.getContractOrFork("Kresko");

        const KrAsset = await hre.getContractOrFork("KreskoAsset", symbol);
        const KrAssetAnchor = await hre.getDeploymentOrFork(`${anchorTokenPrefix}${symbol}`);

        const krAssetInfo = await Kresko.getKreskoAsset(KrAsset.address);
        const exists = krAssetInfo.exists;

        const redstoneId = redstoneMap[symbol as keyof typeof redstoneMap];
        if (!redstoneId) throw new Error(`Redstone not found for ${symbol}`);

        if (exists) {
            logger.warn(`KrAsset ${symbol} already exists! Skipping..`);
        } else {
            logger.log(`Whitelisting Kresko Asset: ${symbol}, anchor: ${KrAssetAnchor?.address}}`);
            const oracles: [number, number] = [OracleType.Redstone, OracleType.Chainlink];
            const config = {
                anchor: KrAssetAnchor ? KrAssetAnchor.address : KrAsset.address,
                kFactor: toBig(kFactor),
                oracle: oracleAddr,
                supplyLimit: toBig(supplyLimit),
                closeFee: toBig(0.02),
                openFee: toBig(0),
                exists: true,
                id: redstoneId,
                oracles: oracles,
            };
            const oracleConfig: OracleConfigurationStruct = {
                oracleIds: oracles,
                feeds: [hre.ethers.constants.AddressZero, oracleAddr],
            };
            const tx = await Kresko.addKreskoAsset(KrAsset.address, oracleConfig, config);
            logger.success("txHash", tx.hash);
            await tx.wait();
            logger.success(`Succesfully whitelisted Kresko Asset ${symbol} with a kFactor of ${kFactor}`);
        }
        return;
    });
