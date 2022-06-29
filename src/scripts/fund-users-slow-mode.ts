import { getLogger } from "@utils/deployment";
import { toBig } from "@utils/numbers";
import hre from "hardhat";

async function main() {
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
        testUserEleven,
        testUserTwelve,
        testUserThirteen,
    } = await hre.ethers.getNamedSigners();

    const USDC = await hre.ethers.getContract<Token>("USDC");
    const Aurora = await hre.ethers.getContract<Token>("AURORA");

    const wNEAR = await hre.ethers.getContract<Token>("wNEAR");
    const WETH = await hre.ethers.getContract("WETH");

    const users = [
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
        testUserEleven,
        testUserTwelve,
        testUserThirteen,
    ];
    let count = 0;
    for (const user of users) {
        count++;
        logger.log("Funding", user.address, "count:", count);

        let tx = await USDC.mint(user.address, toBig(100_000, 6));
        logger.log("Minting USDC");
        await tx.wait(2);
        logger.log("Minted USDC for", user.address);

        tx = await Aurora.mint(user.address, toBig(25_000, 18));
        logger.log("Minting aurora");
        await tx.wait(2);
        logger.log("Minted Aurora for", user.address);

        tx = await WETH.connect(user).deposit(toBig(20, 18));
        logger.log("Depositing WETH");
        await tx.wait(2);
        logger.log("WETH Deposited");

        tx = await wNEAR.mint(user.address, toBig(10_000, 18));
        await tx.wait(2);
        logger.log("WNEAR minted");

        logger.success("funded", count, "account");
    }

    logger.success("Succesfully funded test accounts");
}

main()
    .then(() => {
        console.log("script completed");
        process.exit(0);
    })
    .catch(e => {
        console.log("script errored", e);
    });
