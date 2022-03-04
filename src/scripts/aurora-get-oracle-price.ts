import hre from "hardhat";
import { fromBig } from "@utils/numbers";

async function main() {
    const { ethers, getNamedAccounts } = hre;

    const { admin } = await getNamedAccounts();

    const Aggregator = await ethers.getContractAt<FluxPriceAggregator>(
        require("../utils/abi/FluxPriceAggregator.json"),
        "0x303E2c45F67DCAdB346f802f4B3fea88d73E82F3",
    );

    const PriceFeed = await ethers.getContractAt<FluxPriceFeed>(
        require("../utils/abi/FluxPriceFeed.json"),
        "0x8980a1c84753E3A57521af72E9570b7feff59647",
    );

    const aggPrice = await Aggregator.latestAnswer();
    const feedPrice = await PriceFeed.latestAnswer();

    console.log(fromBig(aggPrice, 8), fromBig(feedPrice, 8));
}

main()
    .then(() => {
        console.log("script completed");
        process.exit(0);
    })
    .catch(e => {
        console.log("script errored", e);
    });
