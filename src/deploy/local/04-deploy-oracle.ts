import { fromBig, toFixedPoint } from "@utils";
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

    await priceFeeds["/USD"].transmit(toFixedPoint("1", 8), true);

    const usdPrice = fromBig(await priceFeeds["/USD"].latestAnswer(), 8);
    logger.log("USD price set at: ", usdPrice);

    // ETH
    await hre.run("deployone:fluxpricefeed", {
        name: "ETHUSD",
        decimals: 8,
        description: "ETH/USD",
        validator: priceFeedValidator,
    });
    await priceFeeds["ETH/USD"].transmit(toFixedPoint("2600", 8), true);

    const ethPrice = fromBig(await priceFeeds["ETH/USD"].latestAnswer(), 8);
    logger.log("ETH price set at: ", ethPrice);

    // GOLD
    await hre.run("deployone:fluxpricefeed", {
        name: "GOLDUSD",
        decimals: 8,
        description: "GOLD/USD",
        validator: priceFeedValidator,
    });
    await priceFeeds["GOLD/USD"].transmit(toFixedPoint("1898.2", 8), true);
    const goldPrice = fromBig(await priceFeeds["GOLD/USD"].latestAnswer(), 8);
    logger.log("GOLD price set at: ", goldPrice);

    // TSLA
    await hre.run("deployone:fluxpricefeed", {
        name: "TSLAUSD",
        decimals: 8,
        description: "TSLA/USD",
        validator: priceFeedValidator,
    });
    await priceFeeds["TSLA/USD"].transmit(toFixedPoint("852.2", 8), true);
    const tslaPrice = fromBig(await priceFeeds["TSLA/USD"].latestAnswer(), 8);
    logger.log("TSLA price set at: ", tslaPrice);

    // QQQ
    await hre.run("deployone:fluxpricefeed", {
        name: "QQQUSD",
        decimals: 8,
        description: "QQQ/USD",
        validator: priceFeedValidator,
    });
    await priceFeeds["QQQ/USD"].transmit(toFixedPoint("339.09", 8), true);
    const qqqPrice = fromBig(await priceFeeds["QQQ/USD"].latestAnswer(), 8);
    logger.log("QQQ price set at: ", qqqPrice);

    // AURORA
    await hre.run("deployone:fluxpricefeed", {
        name: "AURORAUSD",
        decimals: 8,
        description: "AURORA/USD",
        validator: priceFeedValidator,
    });
    await priceFeeds["AURORA/USD"].transmit(toFixedPoint("8.8", 8), true);
    const auroraPrice = fromBig(await priceFeeds["AURORA/USD"].latestAnswer(), 8);
    logger.log("AURORA price set at: ", auroraPrice);

    // NEAR
    await hre.run("deployone:fluxpricefeed", {
        name: "NEARUSD",
        decimals: 8,
        description: "NEAR/USD",
        validator: priceFeedValidator,
    });
    await priceFeeds["NEAR/USD"].transmit(toFixedPoint("10.2", 8), true);
    const nearPrice = fromBig(await priceFeeds["NEAR/USD"].latestAnswer(), 8);
    logger.log("NEAR price set at: ", nearPrice);

    logger.success("Succesfully deployeed oracles and set prices");
};
export default func;

func.tags = ["local", "local-oracles"];
