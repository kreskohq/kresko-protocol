// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

/* solhint-disable max-line-length */
/* solhint-disable var-name-mixedcase */
/* solhint-disable func-name-mixedcase */
/* solhint-disable contract-name-camelcase */
/* solhint-disable no-inline-assembly */
/* solhint-disable avoid-low-level-calls */
/* solhint-disable func-visibility */

import {LibUI, IKrStaking, IERC20Permit, ms} from "minter/libs/LibUI.sol";

/**
 * @author Kresko
 * @title UIDataProviderFacet
 * @notice UI data aggregation views
 */
contract UIDataProviderFacet {
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
            LibUI.StakingData[] memory stakingData,
            uint256 ethBalance
        )
    {
        user = LibUI.kreskoUser(_account);
        stakingData = LibUI.getStakingData(_account, _staking);
        (balances, ethBalance) = LibUI.getBalances(_tokens, _account);
    }

    function batchOracleValues(address[] memory _assets) public view returns (LibUI.Price[] memory result) {
        return LibUI.batchOracleValues(_assets);
    }

    function getTokenData(
        address[] memory _allTokens,
        address[] memory _assets
    ) external view returns (LibUI.TokenMetadata[] memory metadatas, LibUI.Price[] memory prices) {
        metadatas = new LibUI.TokenMetadata[](_allTokens.length);
        for (uint256 i; i < _allTokens.length; i++) {
            metadatas[i] = LibUI.TokenMetadata({
                decimals: IERC20Permit(_allTokens[i]).decimals(),
                name: IERC20Permit(_allTokens[i]).name(),
                symbol: IERC20Permit(_allTokens[i]).symbol(),
                totalSupply: IERC20Permit(_allTokens[i]).totalSupply()
            });
        }
        prices = LibUI.batchOracleValues(_assets);
    }
}
