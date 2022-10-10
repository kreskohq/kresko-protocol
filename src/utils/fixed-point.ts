import { BigNumber } from "ethers";
export function JStoFixed(number: number, precision: number) {
    const multiplier = Math.pow(10, precision + 1),
        wholeNumber = Math.floor(number * multiplier);
    return (Math.round(wholeNumber / 10) * 10) / multiplier;
}

const FIXED_POINT_SCALING_FACTOR_DECIMALS = 18;
// In other words, the raw value of 1e18 is equal to a FixedPoint of 1
const FIXED_POINT_SCALING_FACTOR = BigNumber.from(10).pow(FIXED_POINT_SCALING_FACTOR_DECIMALS);

export function toFixedPoint(num: any, scalingFactorDecimals = FIXED_POINT_SCALING_FACTOR_DECIMALS) {
    if (typeof num === "number") {
        num = JStoFixed(num, 2);
    }
    const scalingFactor = BigNumber.from(10).pow(scalingFactorDecimals);
    // BigNumber enforces integer division - to allow a number with a few decimals to
    // be passed to this function (like 0.5), it's multiplied by 1000 and then subsequently
    // divided by 1000.
    return BigNumber.from(scalingFactor)
        .mul(1000 * num)
        .div(1000);
}

export function fromFixedPoint(fixedPoint: any, scalingFactorDecimals = FIXED_POINT_SCALING_FACTOR_DECIMALS) {
    const scalingFactor = BigNumber.from(10).pow(scalingFactorDecimals);
    return BigNumber.from(fixedPoint).div(scalingFactor);
}

// Multiplies two fixed point numbers together
export function fixedPointMul(a: BigNumber, b: any) {
    return a.mul(b).div(FIXED_POINT_SCALING_FACTOR);
}

export function fixedPointDiv(a: BigNumber, b: any) {
    return a.mul(FIXED_POINT_SCALING_FACTOR).div(b);
}
