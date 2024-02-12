// solhint-disable state-visibility, max-states-count, no-empty-blocks, no-console
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Deployed} from "scripts/deploy/libs/Deployed.s.sol";
import {Help} from "kresko-lib/utils/Libs.s.sol";
import {PLog} from "kresko-lib/utils/PLog.s.sol";
import {ShortAssert} from "kresko-lib/utils/ShortAssert.t.sol";
import {Tested} from "kresko-lib/utils/Tested.t.sol";
import {IPyth} from "vendor/pyth/IPyth.sol";
import {invertNormalizePythPrice, normalizePythPrice} from "common/funcs/Prices.sol";
import {createMockPyth} from "mocks/MockPyth.sol";

contract PythTest is Tested {
    bytes32 constant PYTH_ETH = 0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;

    using PLog for *;
    using Help for *;
    using Deployed for *;
    using ShortAssert for *;

    IPyth mockPyth;
    IPyth pyth = IPyth(0x4374e5a8b9C22271E9EB878A2AA31DE97DF15DAF);

    uint8 oracleDec = 8;
    bytes32[] ids = [PYTH_ETH];
    int64[] prices = [int64(2000e8)];

    function setUp() public users(address(111), address(222), address(333)) {
        useMnemonic("MNEMONIC_DEVNET");
        mockPyth = createMockPyth(ids, prices);
    }

    function testInvertPythPrice() public {
        IPyth.Price memory usdJpy = IPyth.Price(147023, 23, -3, 1706735592);
        uint256 price = invertNormalizePythPrice(usdJpy, oracleDec);
        price.eq(680165, "usdJpy.price");
    }

    function testNormalizeOver8Dec() public {
        IPyth.Price memory price1 = IPyth.Price({price: 2000e9, conf: 0, exp: -9, timestamp: 0});

        uint256 normalizedPrice = normalizePythPrice(price1, oracleDec);
        normalizedPrice.eq(2000e8, "normalizedPrice");
    }

    function testNormalizeUnder8Dec() public {
        IPyth.Price memory price1 = IPyth.Price({price: 2000e5, conf: 0, exp: -5, timestamp: 0});

        uint256 normalizedPrice = normalizePythPrice(price1, oracleDec);
        normalizedPrice.eq(2000e8, "normalizedPrice");
    }

    function testNormalize8Dec() public {
        IPyth.Price memory price1 = IPyth.Price({price: 2000e8, conf: 0, exp: -8, timestamp: 0});

        uint256 normalizedPrice = normalizePythPrice(price1, oracleDec);
        normalizedPrice.eq(2000e8, "normalizedPrice");
    }
}
