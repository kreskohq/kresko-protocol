import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "@kreskolabs/hardhat-deploy/types";
import { toBig } from "hardhat";
import { getLogger } from "@utils/deployment";
import { MockWETH10 } from "types";
import { fromBig } from "@utils/numbers";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
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

    const USDC = await hre.ethers.getContract<Token>("USDC");
    const Aurora = await hre.ethers.getContract<Token>("Aurora");
    const WETH = await hre.ethers.getContract<MockWETH10>("Wrapped Ether");

    await Promise.all(
        [
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
        ].map(async user => {
            await USDC.connect(user).mint(user.address, toBig(100_000, 6));
            await Aurora.connect(user).mint(user.address, toBig(15_000, 18));
            await WETH.connect(user).deposit(toBig(50, 18));

            logger.log(fromBig(await USDC.balanceOf(user.address), 6));
            logger.log(fromBig(await Aurora.balanceOf(user.address)));
            logger.log(fromBig(await WETH.balanceOf(user.address)));
        }),
    );

    logger.success("succesfully funded ten test accounts");
};

func.tags = ["local", "test-accounts"];

export default func;
