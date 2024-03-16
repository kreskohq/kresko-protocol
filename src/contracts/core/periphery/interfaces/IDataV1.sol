// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;
import {View} from "periphery/ViewTypes.sol";
import {RawPrice} from "common/Types.sol";
import {VaultAsset} from "vault/VTypes.sol";
import {PythView} from "vendor/pyth/PythScript.sol";

interface IDataV1 {
    struct PreviewWithdrawArgs {
        address vaultAsset;
        uint256 outputAmount;
        bytes path;
    }

    struct ExternalTokenArgs {
        address token;
        address feed;
    }

    struct DVAsset {
        address addr;
        string name;
        string symbol;
        uint8 oracleDecimals;
        uint256 vSupply;
        bool isMarketOpen;
        uint256 tSupply;
        RawPrice priceRaw;
        VaultAsset config;
        uint256 price;
    }

    struct DVToken {
        string symbol;
        uint8 decimals;
        string name;
        uint256 price;
        uint8 oracleDecimals;
        uint256 tSupply;
    }

    struct DVault {
        DVAsset[] assets;
        DVToken token;
    }

    struct DCollection {
        address addr;
        string name;
        string symbol;
        string uri;
        DCollectionItem[] items;
    }

    struct DCollectionItem {
        uint256 id;
        string uri;
        uint256 balance;
    }

    struct DGlobal {
        View.Protocol protocol;
        DVault vault;
        DCollection[] collections;
        uint256 chainId;
    }

    struct DVTokenBalance {
        address addr;
        string name;
        string symbol;
        uint256 amount;
        uint256 tSupply;
        uint8 oracleDecimals;
        uint256 val;
        uint8 decimals;
        uint256 price;
        RawPrice priceRaw;
        uint256 chainId;
    }

    struct DAccount {
        View.Account protocol;
        DCollection[] collections;
        DVTokenBalance vault;
        bool eligible;
        uint8 phase;
        uint256 chainId;
    }

    function getTradeFees(
        address _assetIn,
        address _assetOut
    ) external view returns (uint256 feePercentage, uint256 depositorFee, uint256 protocolFee);

    function previewWithdraw(PreviewWithdrawArgs calldata args) external payable returns (uint256 withdrawAmount, uint256 fee);

    function getGlobals(PythView calldata prices) external view returns (DGlobal memory);

    function getExternalTokens(
        ExternalTokenArgs[] memory tokens,
        address _account
    ) external view returns (DVTokenBalance[] memory);

    function getAccount(PythView calldata prices, address _account) external view returns (DAccount memory);

    function getVault() external view returns (DVault memory);

    function getVAssets() external view returns (DVAsset[] memory);
}
