import { setupTests } from "@utils";
import { artifacts, waffle } from "hardhat";

import { shouldBehaveLikeFluxPriceAggregator } from "./FluxPriceAggregator.behavior";

describe.skip("Flux - Price Aggregator", function () {
    before(async function () {
        const { signers } = await setupTests();
        this.signers = signers;

        this.oracles = [] as FluxPriceFeed[];
    });

    beforeEach(async function () {
        // deploy three oracles
        for (let i = 0; i < 3; i++) {
            const decimals: number = 6;
            const description: string = "My description";
            const pricefeedArtifact = await artifacts.readArtifact("FluxPriceFeed");
            this.oracles[i] = <FluxPriceFeed>(
                await waffle.deployContract(this.signers.admin, pricefeedArtifact, [
                    this.signers.admin.address,
                    decimals,
                    description,
                ])
            );
        }

        // deploy aggregator
        const decimals: number = 6;
        const description: string = "My description";
        const priceaggregatorArtifact = await artifacts.readArtifact("FluxPriceAggregator");
        this.priceaggregator = <FluxPriceAggregator>(
            await waffle.deployContract(this.signers.admin, priceaggregatorArtifact, [
                this.signers.admin.address,
                [this.oracles[0].address, this.oracles[1].address, this.oracles[2].address],
                decimals,
                description,
            ])
        );
    });
    shouldBehaveLikeFluxPriceAggregator();
});
