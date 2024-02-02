// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;
import {View} from "periphery/ViewTypes.sol";
import {PythView} from "vendor/pyth/PythScript.sol";

interface IViewDataFacet {
    function viewProtocolData(PythView calldata prices) external view returns (View.Protocol memory);

    function viewAccountData(PythView calldata prices, address account) external view returns (View.Account memory);

    function viewMinterAccounts(
        PythView calldata prices,
        address[] memory accounts
    ) external view returns (View.MAccount[] memory);

    function viewSCDPAccount(PythView calldata prices, address account) external view returns (View.SAccount memory);

    function viewSCDPDepositAssets() external view returns (address[] memory);

    function viewTokenBalances(
        PythView calldata prices,
        address account,
        address[] memory tokens
    ) external view returns (View.Balance[] memory result);

    function viewAccountGatingPhase(address account) external view returns (uint8 phase, bool eligibleForCurrentPhase);

    function viewSCDPAccounts(
        PythView calldata prices,
        address[] memory accounts,
        address[] memory assets
    ) external view returns (View.SAccount[] memory);

    function viewSCDPAssets(PythView calldata prices, address[] memory assets) external view returns (View.AssetData[] memory);
}
