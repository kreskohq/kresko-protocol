// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;
import {PType} from "periphery/PTypes.sol";

interface IDataFacet {
    function getProtocolData() external view returns (PType.Protocol memory);

    function getAccountData(address _account) external view returns (PType.Account memory);

    function getDataMinter() external view returns (PType.Minter memory);

    function getDataSCDP() external view returns (PType.SCDP memory);

    function getTokenBalances(address _account, address[] memory _tokens) external view returns (PType.Balance[] memory);

    function getTotalsSCDP() external view returns (PType.STotals memory);

    function getAccountsMinter(address[] memory _accounts) external view returns (PType.MAccount[] memory);

    function getAccountGatingPhase(address _account) external view returns (uint8 phase, bool eligibleForCurrentPhase);

    function getAccountSCDP(address _account) external view returns (PType.SAccount memory);

    function getAccountsSCDP(
        address[] memory _accounts,
        address[] memory _assets
    ) external view returns (PType.SAccount[] memory);

    function getAssetDataSCDP(address _assetAddr) external view returns (PType.AssetData memory);

    function getAssetDatasSCDP(address[] memory _assets) external view returns (PType.AssetData[] memory);
}
