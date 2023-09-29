import { config } from "dotenv";
export const envCheck = () => {
    config();
    if (typeof process.env.LIQUIDATION_INCENTIVE === "undefined") {
        throw new Error("LIQUIDATION_INCENTIVE env var not set");
    }
    if (typeof process.env.MINIMUM_COLLATERALIZATION_RATIO === "undefined") {
        throw new Error("MINIMUM_COLLATERALIZATION_RATIO env var not set");
    }
    if (typeof process.env.MINIMUM_DEBT_VALUE === "undefined") {
        throw new Error("MINIMUM_DEBT_VALUE env var not set");
    }
    if (!typeof process.env.FEED_VALIDATOR_PK) {
        throw new Error("FEED_VALIDATOR_PK env var not set");
    }
};
