// solhint-disable state-visibility, max-states-count, no-empty-blocks, no-console
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Deployed} from "scripts/deploy/libs/Deployed.s.sol";
import {Help} from "kresko-lib/utils/s/LibVm.s.sol";
import {PLog} from "kresko-lib/utils/s/PLog.s.sol";
import {ShortAssert} from "kresko-lib/utils/s/ShortAssert.t.sol";
import {Tested} from "kresko-lib/utils/s/Tested.t.sol";
import {IPyth, PythView, Price} from "kresko-lib/vendor/Pyth.sol";
import {invertNormalizePythPrice, normalizePythPrice} from "common/funcs/Prices.sol";
import {createMockPyth} from "kresko-lib/mocks/MockPyth.sol";

contract PythTest is Tested {
    bytes32 constant PYTH_ETH = 0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;

    using PLog for *;
    using Help for *;
    using Deployed for *;
    using ShortAssert for *;

    IPyth mockPyth;
    IPyth pyth = IPyth(0x4374e5a8b9C22271E9EB878A2AA31DE97DF15DAF);

    uint8 oracleDec = 8;
    bytes32[] ids;
    Price[] prices;

    function setUp() public users(address(111), address(222), address(333)) {
        useMnemonic("MNEMONIC_DEVNET");

        prices.push(Price({price: 2000e8, conf: 0, expo: -8, publishTime: 0}));
        ids.push(PYTH_ETH);

        mockPyth = createMockPyth(PythView(ids, prices));
    }

    function testInvertPythPrice() public {
        uint256 price = invertNormalizePythPrice(Price(147023, 23, -3, 1706735592), oracleDec);
        price.eq(680165, "usdJpy.price");
    }

    function testNormalizeOver8Dec() public {
        uint256 normalizedPrice = normalizePythPrice(Price({price: 2000e9, conf: 0, expo: -9, publishTime: 0}), oracleDec);
        normalizedPrice.eq(2000e8, "normalizedPrice");
    }

    function testNormalizeUnder8Dec() public {
        uint256 normalizedPrice = normalizePythPrice(Price({price: 2000e5, conf: 0, expo: -5, publishTime: 0}), oracleDec);
        normalizedPrice.eq(2000e8, "normalizedPrice");
    }

    function testNormalize8Dec() public {
        uint256 normalizedPrice = normalizePythPrice(Price({price: 2000e8, conf: 0, expo: -8, publishTime: 0}), oracleDec);
        normalizedPrice.eq(2000e8, "normalizedPrice");
    }
}
