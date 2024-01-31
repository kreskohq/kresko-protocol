// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.23;

import {PType} from "periphery/PTypes.sol";
import {IViewDataFacet} from "periphery/interfaces/IViewDataFacet.sol";
import {ViewDataFuncs} from "periphery/ViewData.sol";
import {Result} from "vendor/pyth/PythScript.sol";

contract ViewDataFacet is IViewDataFacet {
    /// @inheritdoc IViewDataFacet
    function getProtocolDataView(Result memory res) external view returns (PType.Protocol memory) {
        return ViewDataFuncs.getProtocol(res);
    }

    /// @inheritdoc IViewDataFacet
    function getAccountDataView(Result memory res, address _account) external view returns (PType.Account memory) {
        return ViewDataFuncs.getAccount(res, _account);
    }

    /// @inheritdoc IViewDataFacet
    function getTokenBalancesView(
        Result memory res,
        address _account,
        address[] memory _tokens
    ) external view returns (PType.Balance[] memory result) {
        result = new PType.Balance[](_tokens.length);

        for (uint256 i; i < _tokens.length; i++) {
            result[i] = ViewDataFuncs.getBalance(res, _account, _tokens[i]);
        }
    }

    /// @inheritdoc IViewDataFacet
    function getAccountsMinterView(
        Result memory res,
        address[] memory _accounts
    ) external view returns (PType.MAccount[] memory result) {
        result = new PType.MAccount[](_accounts.length);

        for (uint256 i; i < _accounts.length; ) {
            result[i] = ViewDataFuncs.getMAccount(res, _accounts[i]);
            unchecked {
                i++;
            }
        }
    }

    /// @inheritdoc IViewDataFacet
    function getAccountSCDPView(Result memory res, address _account) external view returns (PType.SAccount memory) {
        return ViewDataFuncs.getSAccount(res, _account, ViewDataFuncs.getSDepositAssets());
    }

    /// @inheritdoc IViewDataFacet
    function getAccountsSCDPView(
        Result memory res,
        address[] memory _accounts,
        address[] memory _assets
    ) external view returns (PType.SAccount[] memory result) {
        result = new PType.SAccount[](_accounts.length);

        for (uint256 i; i < _accounts.length; ) {
            result[i] = ViewDataFuncs.getSAccount(res, _accounts[i], _assets);
            unchecked {
                i++;
            }
        }
    }

    /// @inheritdoc IViewDataFacet
    function getAssetDatasSCDPView(
        Result memory res,
        address[] memory _assets
    ) external view returns (PType.AssetData[] memory results) {
        // address[] memory collateralAssets = scdp().collaterals;
        results = new PType.AssetData[](_assets.length);

        for (uint256 i; i < _assets.length; ) {
            results[i] = ViewDataFuncs.getSAssetData(res, _assets[i]);
            unchecked {
                i++;
            }
        }
    }

    function getAccountGatingPhase(address _account) external view returns (uint8 phase, bool eligibleForCurrentPhase) {
        return ViewDataFuncs.getPhaseEligibility(_account);
    }
}
