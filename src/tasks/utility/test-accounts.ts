import { Wallet } from "ethers";
import { task } from "hardhat/config";

task("test-accounts", "Prints the list of test accounts", async () => {
    if (process.env.MNEMONIC) {
        for (let i = 10; i <= 19; i++) {
            const wallet = Wallet.fromMnemonic(process.env.MNEMONIC, `m/44'/60'/0'/0/${i}`);
            console.log("Test Account:", i, "Pub:", wallet.address, "Priv", wallet.privateKey);
        }
    } else {
        console.log("No mnemonic supplied");
    }
});
