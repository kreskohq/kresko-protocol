// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;
import {ms} from "../MinterStorage.sol";
import {FixedPoint} from "../../libs/FixedPoint.sol";

contract FacetUpgrade16052023 {
    function initialize() external {
        ms().initializations += 1;
        address DAI = 0x7ff84e6d3111327ED63eb97691Bf469C7fcE832F;
        address WETH = 0x4200000000000000000000000000000000000006;
        address krBTC = 0xf88721B9C87EBc86E3C91E6C98c0f646a75600f4;
        address krETH = 0xbb37d6016f97Dd369eCB76e2A5036DacD8770f8b;
        address krTSLA = 0x3502B0329a45011C8FEE033B8eEe6BDA89c03081;
        address KISS = 0xC0B5aBa9F46bDf4D1bC52a4C3ab05C857aC4Ee80;

        ms().collateralAssets[DAI].liquidationIncentive = FixedPoint.Unsigned(1.05 ether);
        ms().collateralAssets[WETH].liquidationIncentive = FixedPoint.Unsigned(1.05 ether);
        ms().collateralAssets[krBTC].liquidationIncentive = FixedPoint.Unsigned(1.05 ether);
        ms().collateralAssets[krETH].liquidationIncentive = FixedPoint.Unsigned(1.05 ether);
        ms().collateralAssets[krTSLA].liquidationIncentive = FixedPoint.Unsigned(1.05 ether);
        ms().collateralAssets[KISS].liquidationIncentive = FixedPoint.Unsigned(1.05 ether);
    }
}
