// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.23;

import {PythView} from "kresko-lib/vendor/Pyth.sol";

import {View} from "periphery/ViewTypes.sol";
import {IViewDataFacet} from "periphery/interfaces/IViewDataFacet.sol";
import {ViewFuncs} from "periphery/ViewData.sol";

contract ViewDataFacet is IViewDataFacet {
    /// @inheritdoc IViewDataFacet
    function viewProtocolData(PythView calldata _prices) external view returns (View.Protocol memory) {
        return ViewFuncs.viewProtocol(_prices);
    }

    /// @inheritdoc IViewDataFacet
    function viewAccountData(PythView calldata _prices, address _account) external view returns (View.Account memory) {
        return ViewFuncs.viewAccount(_prices, _account);
    }

    function viewSCDPDepositAssets() external view returns (address[] memory result) {
        return ViewFuncs.viewSDepositAssets();
    }

    /// @inheritdoc IViewDataFacet
    function viewTokenBalances(
        PythView calldata _prices,
        address _account,
        address[] memory _tokens
    ) external view returns (View.Balance[] memory result) {
        result = new View.Balance[](_tokens.length);

        for (uint256 i; i < _tokens.length; i++) {
            result[i] = ViewFuncs.viewBalance(_prices, _account, _tokens[i]);
        }
    }

    /// @inheritdoc IViewDataFacet
    function viewMinterAccounts(
        PythView calldata _prices,
        address[] memory _accounts
    ) external view returns (View.MAccount[] memory result) {
        result = new View.MAccount[](_accounts.length);

        for (uint256 i; i < _accounts.length; ) {
            result[i] = ViewFuncs.viewMAccount(_prices, _accounts[i]);
            unchecked {
                i++;
            }
        }
    }

    /// @inheritdoc IViewDataFacet
    function viewSCDPAccount(PythView calldata _prices, address _account) external view returns (View.SAccount memory) {
        return ViewFuncs.viewSAccount(_prices, _account, ViewFuncs.viewSDepositAssets());
    }

    /// @inheritdoc IViewDataFacet
    function viewSCDPAccounts(
        PythView calldata _prices,
        address[] memory _accounts,
        address[] memory _assets
    ) external view returns (View.SAccount[] memory result) {
        result = new View.SAccount[](_accounts.length);

        for (uint256 i; i < _accounts.length; ) {
            result[i] = ViewFuncs.viewSAccount(_prices, _accounts[i], _assets);

            unchecked {
                i++;
            }
        }
    }

    /// @inheritdoc IViewDataFacet
    function viewSCDPAssets(
        PythView calldata _prices,
        address[] memory _assets
    ) external view returns (View.AssetData[] memory results) {
        // address[] memory collateralAssets = scdp().collaterals;
        results = new View.AssetData[](_assets.length);

        for (uint256 i; i < _assets.length; ) {
            results[i] = ViewFuncs.viewSAssetData(_prices, _assets[i]);
            unchecked {
                i++;
            }
        }
    }

    function viewAccountGatingPhase(address _account) external view returns (uint8 phase, bool eligibleForCurrentPhase) {
        return ViewFuncs.viewPhaseEligibility(_account);
    }
}
