import { Wallet } from "ethers";
import { task } from "hardhat/config";

task("accounts", "Prints the list of accounts", async () => {
    if (process.env.MNEMONIC) {
        for (let i = 0; i <= 10; i++) {
            const wallet = Wallet.fromMnemonic(process.env.MNEMONIC, `m/44'/60'/0'/0/${i}`);
            console.log(wallet.address, wallet.privateKey);
        }
    } else {
        console.log("No mnemonic supplied");
    }
});
