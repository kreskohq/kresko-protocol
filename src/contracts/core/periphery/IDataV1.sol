// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;
import {PType} from "periphery/PTypes.sol";
import {RawPrice} from "common/Types.sol";
import {VaultAsset} from "vault/VTypes.sol";

interface IDataV1 {
    struct DVAsset {
        address addr;
        bool marketStatus;
        uint8 oracleDecimals;
        string name;
        string symbol;
        uint256 vSupply;
        uint256 tSupply;
        uint256 price;
        RawPrice priceRaw;
        VaultAsset config;
    }

    struct DVToken {
        string symbol;
        string name;
        uint256 price;
        uint256 tSupply;
        uint8 oracleDecimals;
        uint8 decimals;
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
        PType.Protocol protocol;
        DVault vault;
        DCollection[] collections;
    }

    struct DVTokenBalance {
        address addr;
        uint8 oracleDecimals;
        uint8 decimals;
        string name;
        string symbol;
        uint256 amount;
        uint256 val;
        uint256 price;
    }

    struct DAccount {
        PType.Account protocol;
        DCollection[] collections;
        DVTokenBalance vault;
        bool eligible;
        uint8 phase;
    }

    function getGlobals() external view returns (DGlobal memory);

    function getAccount(address _account) external view returns (DAccount memory);
}
