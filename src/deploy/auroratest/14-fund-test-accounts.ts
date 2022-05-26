import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { getLogger } from "@utils/deployment";
import { toBig } from "@utils/numbers";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const logger = getLogger("fund-test-accounts");

    const { customTestUser, customTestUser2 } = await hre.ethers.getNamedSigners();

    const customTestUserAddr = await customTestUser.getAddress();
    const customTestUser2Addr = await customTestUser2.getAddress();

    const _USDC = await hre.ethers.getContract<Token>("USDC");
    const _Aurora = await hre.ethers.getContract<Token>("Aurora");
    const _wNEAR = await hre.ethers.getContract<Token>("wNEAR");

    await _USDC.mint(customTestUserAddr, toBig(100_000, 6));
    await _USDC.mint(customTestUser2Addr, toBig(100_000, 6));
    logger.log("USDC minted");
    await _Aurora.mint(customTestUserAddr, toBig(25_000));
    await _Aurora.mint(customTestUser2Addr, toBig(25_000));
    logger.log("Aurora minted");
    await _wNEAR.mint(customTestUserAddr, toBig(10_000));
    await _wNEAR.mint(customTestUser2Addr, toBig(10_000));
    logger.log("wNEAR minted");

    // const users = [
    //     testUserOne,
    //     testUserTwo,
    //     testUserThree,
    //     testUserFour,
    //     testUserFive,
    //     testUserSix,
    //     testUserSeven,
    //     testUserEight,
    //     testUserNine,
    //     testUserTen,
    // ];
    // let count = 0;
    // for (const user of users) {
    //     count++;
    //     logger.log("Funding", user.address, "count:", count);
    //     const USDC = _USDC.connect(user);

    //     const USDCBal = await USDC.balanceOf(user.address);
    //     sleep(1000);
    //     let tx = await USDC.burn(USDCBal);
    //     logger.log("Burning USDC");
    //     let res = await tx.wait(0);
    //     logger.log("USDC burned", res.status);

    //     sleep(1000);
    //     tx = await USDC.mint(user.address, toBig(100_000, 6));
    //     logger.log("Minting USDC");
    //     res = await tx.wait(0);
    //     logger.log("Minted USDC for", user.address);

    //     const Aurora = _Aurora.connect(user);

    //     const AuroraBal = await Aurora.balanceOf(user.address);

    //     sleep(1000);
    //     tx = await Aurora.burn(AuroraBal);
    //     logger.log("Burning Aurora");
    //     res = await tx.wait(0);
    //     logger.log("Aurora burned", res.status);

    //     sleep(1000);
    //     tx = await Aurora.mint(user.address, toBig(15_000, 18));
    //     logger.log("Minting aurora");
    //     res = await tx.wait(0);
    //     logger.log("Minted Aurora for", user.address);

    //     const WETH = _WETH.connect(user);
    //     const WETHBal = await WETH.balanceOf(user.address);
    //     sleep(1000);
    //     tx = await WETH.withdraw(WETHBal);
    //     logger.log("Burning WETH");
    //     res = await tx.wait(0);
    //     logger.log("WETH burned");

    //     sleep(1000);
    //     await WETH.deposit(toBig(20, 18));
    //     logger.log("Depositing WETH");
    //     res = await tx.wait(0);
    //     logger.log("WETH Deposited");

    //     logger.log("Minted WETH for", user.address);

    //     logger.log(fromBig(await USDC.balanceOf(user.address), 6));
    //     logger.log(fromBig(await Aurora.balanceOf(user.address)));
    //     logger.log(fromBig(await WETH.balanceOf(user.address)));
    // }

    logger.success("Succesfully funded test accounts");
};

func.tags = ["auroratest", "test-accounts"];

export default func;
