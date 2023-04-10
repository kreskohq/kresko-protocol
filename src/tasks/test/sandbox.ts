/* eslint-disable @typescript-eslint/no-unused-vars */
import { getLogger } from "@kreskolabs/lib";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";
import { TASK_SANDBOX } from "../names";
// import fetch from "node-fetch";
// eslint-disable-next-line @typescript-eslint/no-var-requires

const log = getLogger(TASK_SANDBOX);
task(TASK_SANDBOX).setAction(async function (_taskArgs: TaskArguments, hre) {
    const all = await hre.deployments.all();

    // for (const [key, deployment] of Object.entries(all)) {
    //     console.log("verifying", key, deployment.address);
    //     // await hre.tenderly.verifyMultiCompilerAPI(data);

    //     await fetch("https://api.tenderly.co/api/v1/account/kresko/project/protocol/address", {
    //         method: "POST",
    //         headers: {
    //             "Content-Type": "application/json",
    //             "X-Access-Key": "Q0kvF3DHtaRG2FWuoNCHtU0NKWV6xeO4",
    //         },
    //         body: JSON.stringify({
    //             address: deployment.address,
    //             display_name: key,
    //             network_id: "420",
    //         }),
    //     });
    // }

    return;
});
