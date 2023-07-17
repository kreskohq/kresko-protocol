import { task } from "hardhat/config";
import { TASK_ACCOUNTS } from "../names";
import { fromBig, getPriceFromTwelveData } from "@kreskolabs/lib";

task(TASK_ACCOUNTS, "Prints the list of accounts", async () => {
    // if (process.env.MNEMONIC) {
    //     for (let i = 0; i <= 102; i++) {
    //         const wallet = hre.ethers.Wallet.fromMnemonic(process.env.MNEMONIC, `m/44'/60'/0'/0/${i}`);
    //         console.log("Account:", i, "Pub:", wallet.address, "Priv", wallet.privateKey);
    //     }
    // } else {
    //     console.log("No mnemonic supplied");
    // }

    const sequencerUptimeFeed = await hre.ethers.getContractAt(
        "AggregatorV3Interface",
        "0x6550bc2301936011c1334555e62A87705A81C12C",
    );

    const result = await sequencerUptimeFeed.latestRoundData();

    console.log(fromBig(result.answer, 8));
    console.log(await getPriceFromTwelveData("BTC/USD"));
});
