/* eslint-disable @typescript-eslint/no-unused-vars */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import hre from "hardhat";
const { ethers } = hre;

async function main() {
    const { deployer, userOne } = await ethers.getNamedSigners();

    const tx = await deployer.sendTransaction({
        to: await userOne.getAddress(),
        value: ethers.utils.formatEther("1"),
        data: "gg",
    });

    console.log(tx);
}

main()
    .then(() => {
        console.log("script completed");
        process.exit(0);
    })
    .catch(e => {
        console.log("script errored", e);
    });
