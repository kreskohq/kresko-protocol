// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;
import {IDataV1} from "./interfaces/IDataV1.sol";
import {ViewFuncs} from "periphery/ViewData.sol";
import {View} from "periphery/ViewTypes.sol";
import {IERC20} from "kresko-lib/token/IERC20.sol";
import {IVault} from "vault/interfaces/IVault.sol";
import {IERC1155} from "common/interfaces/IERC1155.sol";
import {VaultAsset} from "vault/VTypes.sol";
import {Enums} from "common/Constants.sol";
import {RawPrice} from "common/Types.sol";
import {IAggregatorV3} from "kresko-lib/vendor/IAggregatorV3.sol";
import {toWad} from "common/funcs/Math.sol";
import {WadRay} from "libs/WadRay.sol";
import {IViewDataFacet} from "periphery/interfaces/IViewDataFacet.sol";
import {PythView} from "vendor/pyth/PythScript.sol";

// solhint-disable avoid-low-level-calls, var-name-mixedcase

contract DataV1 is IDataV1 {
    using WadRay for uint256;

    address public immutable VAULT;
    IViewDataFacet public immutable DIAMOND;
    address public immutable KISS;

    uint256 public constant QUEST_FOR_KRESK_LAST_TOKEN_ID = 7;
    uint256 public constant KRESKIAN_LAST_TOKEN_ID = 1;
    address public immutable KRESKIAN_COLLECTION;
    address public immutable QUEST_FOR_KRESK_COLLECTION;

    constructor(address _diamond, address _vault, address _KISS, address _kreskian, address _questForKresk) {
        VAULT = _vault;
        DIAMOND = IViewDataFacet(address(_diamond));
        KISS = _KISS;
        KRESKIAN_COLLECTION = _kreskian;
        QUEST_FOR_KRESK_COLLECTION = _questForKresk;
    }

    function getGlobals(PythView calldata _prices) external view returns (DGlobal memory result) {
        result.chainId = block.chainid;
        result.protocol = DIAMOND.viewProtocolData(_prices);
        result.vault = getVault();
        result.collections = getCollectionData(address(1));
    }

    function getExternalTokens(
        ExternalTokenArgs[] memory tokens,
        address _account
    ) external view returns (DVTokenBalance[] memory result) {
        result = new DVTokenBalance[](tokens.length);

        for (uint256 i; i < tokens.length; i++) {
            ExternalTokenArgs memory token = tokens[i];
            IERC20 tkn = IERC20(token.token);

            (int256 answer, uint256 updatedAt, uint8 oracleDecimals) = _possibleOracleValue(token.feed);

            uint256 balance = _account != address(0) ? tkn.balanceOf(_account) : 0;

            uint8 decimals = tkn.decimals();
            uint256 value = toWad(balance, decimals).wadMul(answer > 0 ? uint256(answer) : 0);

            result[i] = DVTokenBalance({
                chainId: block.chainid,
                addr: token.token,
                name: tkn.name(),
                symbol: ViewFuncs._symbol(token.token),
                decimals: decimals,
                amount: balance,
                val: value,
                tSupply: tkn.totalSupply(),
                price: answer >= 0 ? uint256(answer) : 0,
                oracleDecimals: oracleDecimals,
                priceRaw: RawPrice(
                    answer,
                    block.timestamp,
                    86401,
                    block.timestamp - updatedAt > 86401,
                    answer == 0,
                    Enums.OracleType.Chainlink,
                    token.feed
                )
            });
        }
    }

    function _possibleOracleValue(address _feed) internal view returns (int256 answer, uint256 updatedAt, uint8 decimals) {
        if (_feed == address(0)) {
            return (0, 0, 8);
        }
        (, answer, , updatedAt, ) = IAggregatorV3(_feed).latestRoundData();
        decimals = IAggregatorV3(_feed).decimals();
    }

    function getAccount(PythView calldata _prices, address _account) external view returns (DAccount memory result) {
        result.protocol = DIAMOND.viewAccountData(_prices, _account);

        result.vault.addr = VAULT;
        result.vault.name = IERC20(VAULT).name();
        result.vault.amount = IERC20(VAULT).balanceOf(_account);
        result.vault.price = IVault(VAULT).exchangeRate();
        result.vault.oracleDecimals = 18;
        result.vault.symbol = IERC20(VAULT).symbol();
        result.vault.decimals = IERC20(VAULT).decimals();

        result.collections = getCollectionData(_account);
        (result.phase, result.eligible) = DIAMOND.viewAccountGatingPhase(_account);
        result.chainId = block.chainid;
    }

    function getBalances(
        PythView calldata _prices,
        address _account,
        address[] memory _tokens
    ) external view returns (View.Balance[] memory result) {
        result = DIAMOND.viewTokenBalances(_prices, _account, _tokens);
    }

    function getCollectionData(address _account) public view returns (DCollection[] memory result) {
        result = new DCollection[](2);

        if (address(QUEST_FOR_KRESK_COLLECTION) == address(0) && address(KRESKIAN_COLLECTION) == address(0)) return result;

        result[0].uri = IERC1155(KRESKIAN_COLLECTION).contractURI();
        result[0].addr = KRESKIAN_COLLECTION;
        result[0].name = IERC20(KRESKIAN_COLLECTION).name();
        result[0].symbol = IERC20(KRESKIAN_COLLECTION).symbol();
        result[0].items = getCollectionItems(_account, KRESKIAN_COLLECTION);

        result[1].uri = IERC1155(QUEST_FOR_KRESK_COLLECTION).contractURI();
        result[1].addr = QUEST_FOR_KRESK_COLLECTION;
        result[1].name = IERC20(QUEST_FOR_KRESK_COLLECTION).name();
        result[1].symbol = IERC20(QUEST_FOR_KRESK_COLLECTION).symbol();
        result[1].items = getCollectionItems(_account, QUEST_FOR_KRESK_COLLECTION);
    }

    function getCollectionItems(
        address _account,
        address _collectionAddr
    ) public view returns (DCollectionItem[] memory result) {
        uint256 totalItems = _collectionAddr == KRESKIAN_COLLECTION ? KRESKIAN_LAST_TOKEN_ID : QUEST_FOR_KRESK_LAST_TOKEN_ID;
        result = new DCollectionItem[](totalItems);

        for (uint256 i; i < totalItems; i++) {
            result[i] = DCollectionItem({
                id: i,
                uri: IERC1155(_collectionAddr).uri(i),
                balance: IERC1155(_collectionAddr).balanceOf(_account, i)
            });
        }
    }

    function getVault() public view returns (DVault memory result) {
        result.assets = getVAssets();
        result.token.price = IVault(VAULT).exchangeRate();
        result.token.symbol = IERC20(VAULT).symbol();
        result.token.name = IERC20(VAULT).name();
        result.token.tSupply = IERC20(VAULT).totalSupply();
        result.token.decimals = IERC20(VAULT).decimals();
        result.token.oracleDecimals = 18;
    }

    function getVAssets() public view returns (DVAsset[] memory result) {
        VaultAsset[] memory vAssets = IVault(VAULT).allAssets();
        result = new DVAsset[](vAssets.length);

        for (uint256 i; i < vAssets.length; i++) {
            VaultAsset memory asset = vAssets[i];
            (, int256 answer, , uint256 updatedAt, ) = asset.feed.latestRoundData();

            result[i] = DVAsset({
                addr: address(asset.token),
                name: asset.token.name(),
                symbol: ViewFuncs._symbol(address(asset.token)),
                tSupply: asset.token.totalSupply(),
                vSupply: asset.token.balanceOf(VAULT),
                price: answer > 0 ? uint256(answer) : 0,
                isMarketOpen: answer > 0 ? true : false,
                oracleDecimals: asset.feed.decimals(),
                priceRaw: RawPrice(
                    answer,
                    block.timestamp,
                    asset.staleTime,
                    block.timestamp - updatedAt > asset.staleTime,
                    answer == 0,
                    Enums.OracleType.Chainlink,
                    address(asset.feed)
                ),
                config: asset
            });
        }
    }
}
