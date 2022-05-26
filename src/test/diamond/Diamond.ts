import { useDeployment } from "@utils";
import hre from "hardhat";

describe.only("Diamond", function () {
    describe("#initialization", function () {
        before(async function () {
            this.Diamond = useDeployment("diamond-init");
        });

        it("should deploy");
    });
});
