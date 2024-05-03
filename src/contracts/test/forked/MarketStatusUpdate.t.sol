// solhint-disable state-visibility, max-states-count, no-empty-blocks, no-console
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ShortAssert} from "kresko-lib/utils/ShortAssert.t.sol";
import {MarketStatusUpdate, DataV2} from "scripts/MarketStatus.s.sol";

contract MarketStatusUpdateTest is MarketStatusUpdate {
    using ShortAssert for *;

    function setUp() public override {
        super.setUp();
        payload0010();
    }

    function test_setMarketStatus() external {
        kresko.getMarketStatusProvider().eq(address(provider));
    }

    function test_getMarketStatus() external {
        address[] memory assets = new address[](9);
        assets[0] = address(wethAddr);
        assets[1] = address(USDCeAddr);
        assets[2] = address(USDCAddr);
        assets[3] = address(WBTCAddr);
        assets[4] = address(ARBAddr);
        assets[5] = address(krETHAddr);
        assets[6] = address(krBTCAddr);
        assets[7] = address(krSOLAddr);
        assets[8] = address(kissAddr);

        for (uint i = 0; i < assets.length; i++) {
            kresko.getMarketStatus(assets[i]).eq(true);
        }

        vm.expectRevert();
        kresko.getMarketStatus(address(DAIAddr));
    }

    function test_DataV2() external {
        // All crypto assets should be always open
        DataV2.DVAsset[] memory result = dataV2.getVAssets();
        for (uint256 i = 0; i < result.length; i++) {
            result[i].isMarketOpen.eq(true);
        }
    }
}
