import { withFixture } from "@utils/test";

describe("Council", function () {
    withFixture(["minter-init", "council"]);

    describe("#toggleAssetsPaused", () => {
        it("can toggle different asset functionality to be paused"); // todo
    });
});
