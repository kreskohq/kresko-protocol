import { getLogger } from "@utils/deployment";
import { task } from "hardhat/config";
import { TaskArguments } from "hardhat/types";
import { ERC20PresetMinterPauser, MockWETH10 } from "types/contracts";

task("fund:accounts").setAction(async function (_taskArgs: TaskArguments, hre) {
    const logger = getLogger("fund-accounts", true);
    const USDC = await hre.ethers.getContract<ERC20PresetMinterPauser>("USDC");
    const WETH = await hre.ethers.getContract<MockWETH10>("WETH");
    const WNEAR = await hre.ethers.getContract<ERC20PresetMinterPauser>("WNEAR");
    const accounts = await hre.ethers.getNamedSigners();
    const USDCAmount = hre.toBig("25000", 6);
    const WETHAmount = hre.toBig("15");
    const WNEARAmount = hre.toBig("15000");
    for (const [name, signer] of Object.entries(accounts)) {
        if (name.includes("testUser")) {
            logger.log(`funding ${name}`);
            if ((await USDC.balanceOf(signer.address)).eq(0)) {
                logger.log(`minting USDC`);
                await USDC.mint(signer.address, USDCAmount);
            }
            if ((await WETH.balanceOf(signer.address)).eq(0)) {
                logger.log(`minting WETH`);
                const tx = await accounts.deployer.sendTransaction({ to: signer.address, value: hre.toBig(0.0025) });
                await tx.wait();
                await WETH.connect(signer).deposit(WETHAmount);
            }
            if ((await WNEAR.balanceOf(signer.address)).eq(0)) {
                logger.log(`minting WNEAR`);
                await WNEAR.mint(signer.address, WNEARAmount);
            }
            logger.success(`successfully funded ${name}`);
        }
    }
});
