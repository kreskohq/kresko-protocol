import { setupTests } from "@utils";
import { artifacts, waffle } from "hardhat";
import { shouldBehaveLikeFeedsRegistry } from "./FeedsRegistry.behavior";

describe.skip("Flux - Feed Registry", function () {
    before(async function () {
        const { signers } = await setupTests();
        this.signers = signers;

        this.oracles = [] as FluxPriceFeed[];

        this.usd = "0x5553440000000000000000000000000000000000000000000000000000000000";
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

        // deploy feeds registry
        const frArtifact = await artifacts.readArtifact("FeedsRegistry");
        this.feedsregistry = <FeedsRegistry>(
            await waffle.deployContract(this.signers.admin, frArtifact, [this.signers.admin.address])
        );
    });

    shouldBehaveLikeFeedsRegistry();
});
