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
        wait: 2,
    });

    let tx;
    tx = await priceFeeds["/USD"].transmit(toFixedPoint("1", 8));
    await tx.wait(2);
    const usdPrice = fromBig(await priceFeeds["/USD"].latestAnswer(), 8);
    logger.log("USD price set at: ", usdPrice);

    // ETH
    await hre.run("deployone:fluxpricefeed", {
        name: "ETHUSD",
        decimals: 8,
        description: "ETH/USD",
        validator: priceFeedValidator,
        wait: 2,
    });
    tx = await priceFeeds["ETH/USD"].transmit(toFixedPoint("3104.4", 8));
    await tx.wait(2);
    logger.log("eth price set");

    // GOLD
    await hre.run("deployone:fluxpricefeed", {
        name: "GOLDUSD",
        decimals: 8,
        description: "GOLD/USD",
        validator: priceFeedValidator,
        wait: 2,
    });
    tx = await priceFeeds["GOLD/USD"].transmit(toFixedPoint("1864", 8));
    await tx.wait(2);

    const goldPrice = await priceFeeds["GOLD/USD"].latestAnswer();
    logger.log("gold price", fromBig(goldPrice, 8));

    // TSLA
    await hre.run("deployone:fluxpricefeed", {
        name: "TSLAUSD",
        decimals: 8,
        description: "TSLA/USD",
        validator: priceFeedValidator,
        wait: 1,
    });
    tx = await priceFeeds["TSLA/USD"].transmit(toFixedPoint("1020.4", 8));
    await tx.wait(2);

    const tslaprice = await priceFeeds["TSLA/USD"].latestAnswer();
    logger.log("tsla price", fromBig(tslaprice, 8));

    // QQQ
    await hre.run("deployone:fluxpricefeed", {
        name: "QQQUSD",
        decimals: 8,
        description: "QQQ/USD",
        validator: priceFeedValidator,
    });
    tx = await priceFeeds["QQQ/USD"].transmit(toFixedPoint("390.09", 8));
    await tx.wait(2);

    const qqqPrice = await priceFeeds["QQQ/USD"].latestAnswer();
    logger.log("qqq price", fromBig(qqqPrice, 8));

    // AURORA
    await hre.run("deployone:fluxpricefeed", {
        name: "AURORAUSD",
        decimals: 8,
        description: "AURORA/USD",
        validator: priceFeedValidator,
        wait: 2,
    });
    tx = await priceFeeds["AURORA/USD"].transmit(toFixedPoint("9.41", 8));
    await tx.wait(2);

    const auroraPrice = await priceFeeds["AURORA/USD"].latestAnswer();
    logger.log("aurora price", fromBig(auroraPrice, 8));

    // NEAR
    await hre.run("deployone:fluxpricefeed", {
        name: "NEARUSD",
        decimals: 8,
        description: "NEAR/USD",
        validator: priceFeedValidator,
        wait: 2,
    });
    tx = await priceFeeds["NEAR/USD"].transmit(toFixedPoint("15.41", 8));
    await tx.wait(2);
    logger.log("near price set");
    logger.success("Succesfully deployed oracles and set prices");
};
export default func;

func.tags = ["auroratest", "auroratest-oracles"];
