/* eslint-disable @typescript-eslint/no-var-requires */
import { getLogger } from "@kreskolabs/lib";
import { task } from "hardhat/config";
import { TASK_VERIFY_DEPLOYMENTS } from "../names";

const logger = getLogger(TASK_VERIFY_DEPLOYMENTS);

task(TASK_VERIFY_DEPLOYMENTS).setAction(async function () {
    if (!hre.network.live) {
        throw new Error("This task is only for live networks");
    }

    const all = await hre.deployments.all();

    if (Object.keys(all).length === 0) {
        throw new Error(`No contracts deployed in ${hre.network.name}`);
    }

    logger.log(`Verifying export ${all.length} contracts...`);

    logger.log("Verifying contracts on etherscan...");
    await hre.run("etherscan-verify");

    for (const [key, deployment] of Object.entries(all)) {
        console.log("tenderly", key, deployment.address);
        // await hre.tenderly.verifyMultiCompilerAPI(data);

        await fetch("https://api.tenderly.co/api/v1/account/kresko/project/protocol/address", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Access-Key": "Q0kvF3DHtaRG2FWuoNCHtU0NKWV6xeO4",
            },
            body: JSON.stringify({
                address: deployment.address,
                display_name: key,
                network_id: hre.network.config.chainId,
            }),
        });
    }

    logger.log("Done!");
});
