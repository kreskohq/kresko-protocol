import { toFixedPoint } from "@utils";
import { getLogger } from "@utils/deployment";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre) {
    const loggerGeneral = getLogger("general");
    const logger = getLogger("deploy-oracle");
    loggerGeneral.log("Starting deployment to Aurora Testnet");
    const { getNamedAccounts } = hre;

    const { priceFeedValidator } = await getNamedAccounts();
    // USD
    const USDCFeed = await hre.run("deployone:fluxpricefeed", {
        name: "USD",
        decimals: 8,
        description: "/USD",
        validator: priceFeedValidator,
    });
    const latestAnswer = await USDCFeed.latestAnswer();
    if (!latestAnswer.gt(0)) {
        const tx = await USDCFeed.transmit(toFixedPoint("1", 8));
        await tx.wait();
    }

    // ETH
    await hre.run("deployone:fluxpricefeed", {
        name: "ETHUSD",
        decimals: 8,
        description: "ETH/USD",
        validator: priceFeedValidator,
    });

    // GOLD
    await hre.run("deployone:fluxpricefeed", {
        name: "GOLDUSD",
        decimals: 8,
        description: "GOLD/USD",
        validator: priceFeedValidator,
    });

    // TSLA
    await hre.run("deployone:fluxpricefeed", {
        name: "TSLAUSD",
        decimals: 8,
        description: "TSLA/USD",
        validator: priceFeedValidator,
    });

    // QQQ
    await hre.run("deployone:fluxpricefeed", {
        name: "QQQUSD",
        decimals: 8,
        description: "QQQ/USD",
        validator: priceFeedValidator,
    });

    // GME
    await hre.run("deployone:fluxpricefeed", {
        name: "GMEUSD",
        decimals: 8,
        description: "GME/USD",
        validator: priceFeedValidator,
    });

    // AURORA
    await hre.run("deployone:fluxpricefeed", {
        name: "AURORAUSD",
        decimals: 8,
        description: "AURORA/USD",
        validator: priceFeedValidator,
    });

    // NEAR
    await hre.run("deployone:fluxpricefeed", {
        name: "NEARUSD",
        decimals: 8,
        description: "NEAR/USD",
        validator: priceFeedValidator,
    });

    logger.success("All price feeds deployed");
};

func.tags = ["auroratest", "auroratest-oracles"];
export default func;
