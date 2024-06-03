// solhint-disable state-visibility, max-states-count, no-empty-blocks, no-console
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Deployed} from "scripts/deploy/libs/Deployed.s.sol";
import {Log, Help} from "kresko-lib/utils/Libs.s.sol";
import {ShortAssert} from "kresko-lib/utils/ShortAssert.t.sol";
import {Tested} from "kresko-lib/utils/Tested.t.sol";
import {IKresko} from "periphery/IKresko.sol";
import {CommonConfigFacet} from "common/facets/CommonConfigFacet.sol";
import {CommonStateFacet} from "common/facets/CommonStateFacet.sol";
import {AssetStateFacet} from "common/facets/AssetStateFacet.sol";
import {ProtocolUpgrader} from "scripts/utils/ProtocolUpgrader.s.sol";
import {DataV1} from "periphery/DataV1.sol";
import {IMarketStatus} from "common/interfaces/IMarketStatus.sol";
import {ArbDeployAddr} from "kresko-lib/info/ArbDeployAddr.sol";

contract MarketStatusTest is Tested, ProtocolUpgrader, ArbDeployAddr {
    using Log for *;
    using Help for *;
    using Deployed for *;
    using ShortAssert for *;

    IKresko kresko = IKresko(kreskoAddr);
    DataV1 dataV1 = DataV1(dataV1Addr);

    IMarketStatus provider = IMarketStatus(marketStatusAddr);

    function setUp() public pranked(safe) {
        vm.createSelectFork("arbitrum", 217380985); // Market status already running at this block
    }

    function testMarketStatusProviderAddress() external {
        kresko.getMarketStatusProvider().eq(address(provider));
    }

    function testGetMarketStatus() external {
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

        for (uint256 i; i < assets.length; i++) {
            kresko.getMarketStatus(assets[i]).eq(true);
        }

        vm.expectRevert();
        kresko.getMarketStatus(address(DAIAddr));
    }

    function testTickerStatuses() external {
        bytes32[] memory tickers = _cryptoTickers();

        bool[] memory status = provider.getTickerStatuses(tickers);
        for (uint256 i = 0; i < status.length; i++) {
            status[i].eq(true);
        }

        vm.expectRevert();
        provider.getTickerStatus(bytes32("DAI"));
    }

    function testDataContractStatuses() external {
        DataV1.DVAsset[] memory result = dataV1.getVAssets();
        for (uint256 i; i < result.length; i++) {
            result[i].isMarketOpen.eq(true);
        }
    }

    function _cryptoTickers() internal pure returns (bytes32[] memory) {
        bytes32[] memory tickers = new bytes32[](6);
        tickers[0] = "ETH";
        tickers[1] = "BTC";
        tickers[2] = "SOL";
        tickers[3] = "ARB";
        tickers[4] = "USDC";
        tickers[5] = "KISS";

        return tickers;
    }
}
