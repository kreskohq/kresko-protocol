import { expect } from "chai";
import { BigNumber } from "ethers";

export function expectBigNumberToBeWithinTolerance(
    value: BigNumber,
    expected: BigNumber,
    lessThanTolerance: BigNumber,
    greaterThanTolerance: BigNumber,
) {
    const minExpected = expected.sub(lessThanTolerance);
    const maxExpected = expected.add(greaterThanTolerance);
    expect(value.gte(minExpected) && value.lte(maxExpected)).to.be.true;
}
