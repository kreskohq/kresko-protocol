// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;
import {IDataV1} from "./IDataV1.sol";
import {IDataFacet} from "periphery/interfaces/IDataFacet.sol";
import {PFunc} from "periphery/PFuncs.sol";
import {IERC20} from "kresko-lib/token/IERC20.sol";
import {IVault} from "vault/interfaces/IVault.sol";
import {IERC1155} from "common/interfaces/IERC1155.sol";
import {VaultAsset} from "vault/VTypes.sol";
import {Enums} from "common/Constants.sol";
import {RawPrice} from "common/Types.sol";

contract DataV1 is IDataV1 {
    address public immutable VAULT;
    IDataFacet public immutable DIAMOND;
    address public immutable KISS;

    uint256 public constant QUEST_FOR_KRESK_LAST_TOKEN_ID = 7;
    uint256 public constant KRESKIAN_LAST_TOKEN_ID = 0;
    address public constant KRESKIAN_COLLECTION = 0xAbDb949a18d27367118573A217E5353EDe5A0f1E;
    address public constant QUEST_FOR_KRESK_COLLECTION = 0x1C04925779805f2dF7BbD0433ABE92Ea74829bF6;

    constructor(IDataFacet _diamond, address _vault, address _KISS) {
        VAULT = _vault;
        DIAMOND = _diamond;
        KISS = _KISS;
    }

    function getGlobals() external view override returns (DGlobal memory result) {
        result.protocol = DIAMOND.getProtocolData();
        result.vault = getVault();
        result.collections = getCollectionData(address(1));
    }

    function getAccount(address _account) external view returns (DAccount memory result) {
        result.protocol = DIAMOND.getAccountData(_account);

        result.vault.addr = VAULT;
        result.vault.name = IERC20(VAULT).name();
        result.vault.amount = IERC20(VAULT).balanceOf(_account);
        result.vault.price = IVault(VAULT).exchangeRate();
        result.vault.oracleDecimals = 18;
        result.vault.symbol = IERC20(VAULT).symbol();
        result.vault.decimals = IERC20(VAULT).decimals();

        result.collections = getCollectionData(address(1));
        (result.phase, result.eligible) = DIAMOND.getAccountGatingPhase(msg.sender);
    }

    function getCollectionData(address _account) public view returns (DCollection[] memory result) {
        result = new DCollection[](2);
        if (_account == address(1)) return result;

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
                symbol: asset.token.symbol(),
                tSupply: asset.token.totalSupply(),
                vSupply: asset.token.balanceOf(VAULT),
                price: answer > 0 ? uint256(answer) : 0,
                marketStatus: answer > 0 ? true : false,
                oracleDecimals: asset.feed.decimals(),
                priceRaw: RawPrice(
                    answer,
                    block.timestamp,
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
