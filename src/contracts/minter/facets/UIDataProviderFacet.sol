// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

/* solhint-disable max-line-length */
/* solhint-disable var-name-mixedcase */
/* solhint-disable func-name-mixedcase */
/* solhint-disable contract-name-camelcase */
/* solhint-disable no-inline-assembly */
/* solhint-disable avoid-low-level-calls */
/* solhint-disable func-visibility */

import {ds, Error, Meta} from "../../shared/Modifiers.sol";
import {LibUI, IKresko, IKrStaking, IUniswapV2Pair, IERC20Upgradeable, AggregatorV2V3Interface, ms} from "../libs/LibUI.sol";

bytes32 constant UI_STORAGE_POSITION = keccak256("kresko.ui.storage");

struct UIState {
    IKrStaking staking;
}

contract UIDataProviderFacet {
    function getGlobalData(address[] memory _collateralAssets, address[] memory _krAssets)
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
            liqMultiplier: ms().liquidationIncentiveMultiplier.rawValue,
            minDebtValue: ms().minimumDebtValue.rawValue,
            liquidationThreshold: ms().liquidationThreshold.rawValue
        });
    }

    function getAccountData(
        address _account,
        address[] memory _tokens,
        address _staking
    )
        external
        view
        returns (
            LibUI.KreskoUser memory user,
            LibUI.Balance[] memory balances,
            LibUI.StakingData[] memory stakingData
        )
    {
        user = LibUI.kreskoUser(_account);
        balances = LibUI.getBalances(_tokens, _account);
        stakingData = LibUI.getStakingData(_account, _staking);
    }

    function getPairsData(address[] memory _pairAddresses) external view returns (LibUI.PairData[] memory result) {
        result = new LibUI.PairData[](_pairAddresses.length);
        for (uint256 i; i < _pairAddresses.length; i++) {
            IUniswapV2Pair pair = IUniswapV2Pair(_pairAddresses[i]);
            IERC20Upgradeable tkn0 = IERC20Upgradeable(pair.token0());
            IERC20Upgradeable tkn1 = IERC20Upgradeable(pair.token1());
            (uint112 reserve0, uint112 reserve1, ) = pair.getReserves();
            result[i] = LibUI.PairData({
                decimals0: tkn0.decimals(),
                decimals1: tkn1.decimals(),
                totalSupply: pair.totalSupply(),
                reserve0: reserve0,
                reserve1: reserve1
            });
        }
    }

    function batchPrices(address[] memory _assets, address[] memory _oracles)
        public
        view
        returns (LibUI.Price[] memory result)
    {
        return LibUI.batchPrices(_assets, _oracles);
    }

    function getTokenData(
        address[] memory _allTokens,
        address[] memory _assets,
        address[] memory _oracles
    ) external view returns (LibUI.TokenMetadata[] memory metadatas, LibUI.Price[] memory prices) {
        metadatas = new LibUI.TokenMetadata[](_allTokens.length);
        for (uint256 i; i < _allTokens.length; i++) {
            metadatas[i] = LibUI.TokenMetadata({
                decimals: IERC20Upgradeable(_allTokens[i]).decimals(),
                name: IERC20Upgradeable(_allTokens[i]).name(),
                symbol: IERC20Upgradeable(_allTokens[i]).symbol(),
                totalSupply: IERC20Upgradeable(_allTokens[i]).totalSupply()
            });
        }
        prices = LibUI.batchPrices(_assets, _oracles);
    }
}
