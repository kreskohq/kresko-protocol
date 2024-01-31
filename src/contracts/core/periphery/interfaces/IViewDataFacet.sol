// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;
import {PType} from "periphery/PTypes.sol";
import {Result} from "vendor/pyth/PythScript.sol";

interface IViewDataFacet {
    function getProtocolDataView(Result memory res) external view returns (PType.Protocol memory);

    function getAccountDataView(Result memory res, address _account) external view returns (PType.Account memory);

    function getAccountsMinterView(
        Result memory res,
        address[] memory _accounts
    ) external view returns (PType.MAccount[] memory);

    function getAccountSCDPView(Result memory res, address _account) external view returns (PType.SAccount memory);

    function getTokenBalancesView(
        Result memory res,
        address _account,
        address[] memory _tokens
    ) external view returns (PType.Balance[] memory result);

    function getAccountGatingPhase(address _account) external view returns (uint8 phase, bool eligibleForCurrentPhase);

    function getAccountsSCDPView(
        Result memory res,
        address[] memory _accounts,
        address[] memory _assets
    ) external view returns (PType.SAccount[] memory);

    function getAssetDatasSCDPView(
        Result memory res,
        address[] memory _assets
    ) external view returns (PType.AssetData[] memory);
}
