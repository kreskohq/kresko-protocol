import { task } from "hardhat/config";
import { TASK_ACCOUNTS } from "../names";
// import { fromBig } from "@kreskolabs/lib";
// import { writeFileSync } from "fs";

task(TASK_ACCOUNTS, "Prints the list of accounts", async (_args, hre) => {
    // const cube = await hre.getContractOrFork("MockERC20", "krCUBE");
    // const Oracle = await hre.getContractOrFork("UniswapV2Oracle");
    // const filter = cube.filters.Transfer(Oracle.address, null, null);
    // const events = await cube.queryFilter(filter, 9037967, "latest");
    // const results = await Promise.all(
    //     events.map(async event => {
    //         return {
    //             account: event.args.to,
    //             amount: fromBig(event.args.amount),
    //         };
    //     }),
    // );
    // const output = results.reduce((acc, curr) => {
    //     if (!acc[curr.account]) {
    //         acc[curr.account] = {
    //             total: curr.amount,
    //             count: 1,
    //         };
    //     } else {
    //         acc[curr.account].total += curr.amount;
    //         acc[curr.account].count += 1;
    //     }
    //     return acc;
    // }, {} as { [key: string]: { [key: string]: any } });
    // // sort the object by total repaid
    // const sorted = Object.entries(output).sort((a, b) => {
    //     return b[1].total - a[1].total;
    // });
    // // convert back to object
    // const sortedOutput = sorted.reduce((acc, curr) => {
    //     acc[curr[0]] = curr[1];
    //     return acc;
    // }, {} as { [key: string]: { [key: string]: any } });
    // writeFileSync("./cubez.json", JSON.stringify(sortedOutput, null, 2));
    // const Kresko = await hre.getContractOrFork("Kresko");
    // const filter = Kresko.filters.StabilityRateInterestRepaid(null, null, null);
    // const events = await Kresko.queryFilter(filter, 9037967, "latest");
    // const results = await Promise.all(
    //     events.map(async event => {
    //         return {
    //             account: event.args.account,
    //             repaid: fromBig(event.args.value),
    //             asset: event.args.asset,
    //             assetSymbol: await (await hre.ethers.getContractAt("MockERC20", event.args.asset)).symbol(),
    //         };
    //     }),
    // );
    // const output = results.reduce((acc, curr) => {
    //     if (!acc[curr.account]) {
    //         acc[curr.account] = {
    //             total: curr.repaid,
    //             [curr.assetSymbol]: {
    //                 repaid: curr.repaid,
    //                 count: 1,
    //             },
    //         };
    //     } else {
    //         acc[curr.account].total += curr.repaid;
    //         if (!acc[curr.account][curr.assetSymbol]) {
    //             acc[curr.account][curr.assetSymbol] = {
    //                 repaid: curr.repaid,
    //                 count: 1,
    //             };
    //         } else {
    //             acc[curr.account][curr.assetSymbol].repaid += curr.repaid;
    //             acc[curr.account][curr.assetSymbol].count += 1;
    //         }
    //     }
    //     return acc;
    // }, {} as { [key: string]: { [key: string]: any } });
    // // sort the object by total repaid
    // const sorted = Object.entries(output).sort((a, b) => {
    //     return b[1].total - a[1].total;
    // });
    // // convert back to object
    // const sortedOutput = sorted.reduce((acc, curr) => {
    //     acc[curr[0]] = curr[1];
    //     return acc;
    // }, {} as { [key: string]: { [key: string]: any } });
    // writeFileSync("./repaid.json", JSON.stringify(sortedOutput, null, 2));
    if (process.env.MNEMONIC) {
        for (let i = 0; i <= 102; i++) {
            const wallet = hre.ethers.Wallet.fromMnemonic(process.env.MNEMONIC, `m/44'/60'/0'/0/${i}`);
            console.log("Account:", i, "Pub:", wallet.address, "Priv", wallet.privateKey);
        }
    } else {
        console.log("No mnemonic supplied");
    }
});
