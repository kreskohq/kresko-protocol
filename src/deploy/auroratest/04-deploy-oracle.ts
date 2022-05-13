import { toFixedPoint } from "@utils";
import { getLogger } from "@utils/deployment";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre) {
    const logger = getLogger("deploy-oracle");
    const { priceFeeds, getNamedAccounts } = hre;

    const { priceFeedValidator } = await getNamedAccounts();
    // USD
    await hre.run("deployone:fluxpricefeed", {
        name: "USD",
        decimals: 8,
        description: "/USD",
        validator: priceFeedValidator,
    });

    // await priceFeeds["/USD"].transmit(toFixedPoint("1", 8));
    logger.log("USD price set");

    // ETH
    await hre.run("deployone:fluxpricefeed", {
        name: "ETHUSD",
        decimals: 8,
        description: "ETH/USD",
        validator: priceFeedValidator,
    });
    // await priceFeeds["ETH/USD"].transmit(toFixedPoint("1930.3", 8));
    logger.log("eth price set");

    // GOLD
    await hre.run("deployone:fluxpricefeed", {
        name: "GOLDUSD",
        decimals: 8,
        description: "GOLD/USD",
        validator: priceFeedValidator,
    });
    // await priceFeeds["GOLD/USD"].transmit(toFixedPoint("1864", 8));
    logger.log("Gold price set");

    // TSLA
    await hre.run("deployone:fluxpricefeed", {
        name: "TSLAUSD",
        decimals: 8,
        description: "TSLA/USD",
        validator: priceFeedValidator,
    });
    // await priceFeeds["TSLA/USD"].transmit(toFixedPoint("737.4", 8));

    logger.log("tsla price set");

    // QQQ
    await hre.run("deployone:fluxpricefeed", {
        name: "QQQUSD",
        decimals: 8,
        description: "QQQ/USD",
        validator: priceFeedValidator,
    });
    // await priceFeeds["QQQ/USD"].transmit(toFixedPoint("291.02", 8));
    logger.log("qqq price set");

    // GME
    await hre.run("deployone:fluxpricefeed", {
        name: "GMEUSD",
        decimals: 8,
        description: "GME/USD",
        validator: priceFeedValidator,
    });
    // await priceFeeds["GME/USD"].transmit(toFixedPoint("91.81", 8));
    logger.log("gme price set");

    // AURORA
    await hre.run("deployone:fluxpricefeed", {
        name: "AURORAUSD",
        decimals: 8,
        description: "AURORA/USD",
        validator: priceFeedValidator,
    });
    // await priceFeeds["AURORA/USD"].transmit(toFixedPoint("3.67", 8));
    logger.log("aurora price set");

    // NEAR
    await hre.run("deployone:fluxpricefeed", {
        name: "NEARUSD",
        decimals: 8,
        description: "NEAR/USD",
        validator: priceFeedValidator,
    });
    // await priceFeeds["NEAR/USD"].transmit(toFixedPoint("6.93", 8));
    logger.log("near price set");
    logger.success("Succesfully deployed oracles and set prices");
};

export default func;

func.tags = ["auroratest", "auroratest-oracles"];
