// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

/* solhint-disable max-line-length */
/* solhint-disable var-name-mixedcase */
/* solhint-disable func-name-mixedcase */
/* solhint-disable contract-name-camelcase */
/* solhint-disable no-inline-assembly */
/* solhint-disable avoid-low-level-calls */
/* solhint-disable func-visibility */

import {ds, Error, Meta} from "../../shared/Modifiers.sol";
import {LibUI, IKrStaking, IUniswapV2Pair, IERC20Upgradeable, AggregatorV2V3Interface, ms} from "../libs/LibUI.sol";

/**
 * @author Kresko
 * @title UIDataProviderFacet2
 * @notice UI data aggregation views
 */
contract UIDataProviderFacet2 {
    function getGlobalData(
        address[] memory _collateralAssets,
        address[] memory _krAssets
    )
        external
        view
        returns (
            LibUI.CollateralAssetInfo[] memory collateralAssets,
            LibUI.krAssetInfo[] memory krAssets,
            LibUI.ProtocolParams memory protocolParams
        )
    {
        collateralAssets = LibUI.collateralAssetInfos(_collateralAssets);
        krAssets = LibUI.krAssetInfos(_krAssets);
        protocolParams = LibUI.ProtocolParams({
            minCollateralRatio: ms().minimumCollateralizationRatio.rawValue,
            minDebtValue: ms().minimumDebtValue.rawValue,
            liquidationThreshold: ms().liquidationThreshold.rawValue
        });
    }

    function getPairsData(address[] memory _pairAddresses) external view returns (LibUI.PairData[] memory result) {
        result = new LibUI.PairData[](_pairAddresses.length);
        for (uint256 i; i < _pairAddresses.length; i++) {
            IUniswapV2Pair pair = IUniswapV2Pair(_pairAddresses[i]);
            (uint112 reserve0, uint112 reserve1, ) = pair.getReserves();
            result[i] = LibUI.PairData({
                decimals0: IERC20Upgradeable(pair.token0()).decimals(),
                decimals1: IERC20Upgradeable(pair.token1()).decimals(),
                totalSupply: pair.totalSupply(),
                reserve0: reserve0,
                reserve1: reserve1
            });
        }
    }
}
