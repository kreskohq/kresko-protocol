// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import {WadRay} from "libs/WadRay.sol";
import {PercentageMath} from "libs/PercentageMath.sol";
import {toWad, wadUSD} from "common/funcs/Math.sol";

using WadRay for uint256;
using PercentageMath for uint256;

contract DecimalsTest is Test {
    function testDecimals() public {
        uint256 amount = 1e7;
        uint256 price = 0.5e8;
        uint8 priceDecimal = 8;
        uint8 tokenDecimals = 8;

        uint256 result = usdWadTest(amount, price, priceDecimal, tokenDecimals);
        console.log("result: %s", result);

        uint256 resultUsdWad = wadUSD(amount, tokenDecimals, price, priceDecimal);
        console.log("resultUsdWad: %s", resultUsdWad);

        uint256 resultWadRay = toWad(amount, tokenDecimals).wadMul(toWad(price, 8));
        console.log("resultWadRay: %s", resultWadRay);
    }

    function usdWadTest(
        uint256 amount,
        uint256 price,
        uint256 priceDecimal,
        uint256 tokenDecimals
    ) internal view returns (uint256) {
        return (amount * (10 ** (18 - priceDecimal)) * price) / 10 ** tokenDecimals;
    }
}
