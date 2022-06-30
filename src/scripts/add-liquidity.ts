import hre, { toBig } from "hardhat";
import { MockWETH10 } from "types";

async function main() {
    const { deployer } = await hre.getNamedAccounts();
    const USDC = await hre.ethers.getContract<Token>("USDC");
    const WETH = await hre.ethers.getContract<MockWETH10>("WETH");
    const ethValue = 1116;
    const wethDepositAmount = 250;

    const tx = await WETH.deposit(toBig(250));
    const USDCAmount = Number((Number(ethValue) * wethDepositAmount).toFixed(0));

    await USDC.mint(deployer, toBig(USDCAmount, 6));
    await tx.wait();

    await hre.run("uniswap:addliquidity", {
        tknA: {
            address: USDC.address,
            amount: USDCAmount,
        },
        tknB: {
            address: WETH.address,
            amount: wethDepositAmount,
        },
        skipIfLiqExists: false,
    });
}
main()
    .then(() => {
        console.log("script completed");
        process.exit(0);
    })
    .catch(e => {
        console.log("script errored", e);
    });
