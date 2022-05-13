import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { getLogger, sleep } from "@utils/deployment";
import { MockWETH10 } from "types";
import { fromBig, toBig } from "@utils/numbers";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const logger = getLogger("fund-test-accounts");

    const {
        testUserOne,
        testUserTwo,
        testUserThree,
        testUserFour,
        testUserFive,
        testUserSix,
        testUserSeven,
        testUserEight,
        testUserNine,
        testUserTen,
    } = await hre.ethers.getNamedSigners();

    const _USDC = await hre.ethers.getContract<Token>("USDC");
    const _Aurora = await hre.ethers.getContract<Token>("AURORA");
    const _WETH = await hre.ethers.getContract<MockWETH10>("WETH");

    const users = [
        // testUserOne,
        // testUserTwo,
        // testUserThree,
        // testUserFour,
        // testUserFive,
        // testUserSix,
        // testUserSeven,
        // testUserEight,
        // testUserNine,
        testUserTen,
    ];
    let count = 0;
    for (const user of users) {
        count++;
        logger.log("Funding", user.address, "count:", count);
        // const USDC = _USDC.connect(user);

        // const USDCBal = await USDC.balanceOf(user.address);
        // // sleep(1000);
        // let tx = await USDC.burn(USDCBal);
        // logger.log("Burning USDC");
        // let res = await tx.wait(0);
        // logger.log("USDC burned", res.status);

        // // sleep(1000);
        // tx = await USDC.mint(user.address, toBig(100_000, 6));
        // logger.log("Minting USDC");
        // res = await tx.wait(0);
        // logger.log("Minted USDC for", user.address);

        // const Aurora = _Aurora.connect(user);

        // const AuroraBal = await Aurora.balanceOf(user.address);

        // // sleep(1000);
        // tx = await Aurora.burn(AuroraBal);
        // logger.log("Burning Aurora");
        // res = await tx.wait(0);
        // logger.log("Aurora burned", res.status);

        // // sleep(1000);
        // tx = await Aurora.mint(user.address, toBig(15_000, 18));
        // logger.log("Minting aurora");
        // res = await tx.wait(0);
        // logger.log("Minted Aurora for", user.address);

        const WETH = _WETH.connect(user);
        // const WETHBal = await WETH.balanceOf(user.address);
        // sleep(1000);
        // tx = await WETH.withdraw(WETHBal);
        // logger.log("Burning WETH");
        // res = await tx.wait(0);
        // logger.log("WETH burned");

        // sleep(1000);
        await WETH.deposit(toBig(20, 18));
        // logger.log("Depositing WETH");
        // res = await tx.wait(0);
        // logger.log("WETH Deposited");

        logger.log("Minted WETH for", user.address);

        // logger.log(fromBig(await USDC.balanceOf(user.address), 6));
        // logger.log(fromBig(await Aurora.balanceOf(user.address)));
        logger.log(fromBig(await WETH.balanceOf(user.address)));
    }

    logger.success("Succesfully funded ten test accounts");
};

func.tags = ["auroratest", "test-accounts"];

export default func;
