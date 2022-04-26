import { setupTests } from "@utils";
import { artifacts, waffle } from "hardhat";
import { shouldBehaveLikeFluxPriceFeed } from "./FluxPriceFeed.behavior";

describe.only("FluxPriceFeed", function () {
    before(async function () {
        const { signers } = await setupTests();
        this.signers = signers;
    });

    beforeEach(async function () {
        const decimals: number = 6;
        const description: string = "My description";
        const pricefeedArtifact: Artifact = await artifacts.readArtifact("FluxPriceFeed");
        this.pricefeed = <FluxPriceFeed>(
            await waffle.deployContract(this.signers.admin, pricefeedArtifact, [
                this.signers.admin.address,
                decimals,
                description,
            ])
        );
        shouldBehaveLikeFluxPriceFeed();
    });
});
