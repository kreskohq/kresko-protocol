// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;
import {VM, LibVm} from "kresko-lib/utils/Libs.sol";
import {MockERC20} from "mocks/MockERC20.sol";
import {IKISS} from "kiss/interfaces/IKISS.sol";
import {IVault} from "vault/interfaces/IVault.sol";
import {JSON} from "scripts/utils/libs/LibConfig.s.sol";
import {LibOutput} from "scripts/utils/libs/LibOutput.s.sol";
import {MockERC1155} from "mocks/MockERC1155.sol";

library LibUsers {
    bytes32 internal constant USERS_SLOT = keccak256("Users");

    /// @notice map tickers/symbols to deployed addresses
    struct UserState {
        mapping(address => bool) users;
    }

    function mockMint(address _account, address factory, JSON.UserConfig memory userCfg, JSON.Assets memory assetCfg) internal {
        for (uint256 j; j < userCfg.extAmounts.length; j++) {
            JSON.UserAmountConfig memory userAmount = userCfg.extAmounts[j];
            MockERC20 token = MockERC20(LibOutput.findAddress(factory, userAmount.symbol, assetCfg));
            if (address(token) == address(assetCfg.nativeWrapper)) {
                VM.deal(LibVm.sender(), userAmount.amount);
                assetCfg.nativeWrapper.deposit{value: userAmount.amount}();
                continue;
            }
            token.mint(_account, userAmount.amount);
        }
    }

    function mintKissMocked(address _account, uint256 _amount, address _vaultAsset, address _vault, address _kiss) internal {
        MockERC20 asset = MockERC20(_vaultAsset);
        (uint256 assetsIn, ) = IVault(_vault).previewMint(_vaultAsset, _amount);
        asset.mint(_account, assetsIn);
        asset.approve(_kiss, type(uint256).max);
        IKISS(_kiss).vaultMint(_vaultAsset, _amount, _account);
    }

    function mintMockNFTs(address[4] memory users, JSON.ChainConfig memory cfg) internal {
        MockERC1155 officallyKreskianNFT = MockERC1155(cfg.periphery.officallyKreskianNFT);
        MockERC1155 questForKreskNFT = MockERC1155(cfg.periphery.questForKreskNFT);
        for (uint256 i; i < users.length; i++) {
            address user = users[i];
            officallyKreskianNFT.mint(user, 0, 1);
            if (i < 3) {
                questForKreskNFT.mint(user, 0, 1);
            }
            if (i < 2) {
                questForKreskNFT.mint(user, 1, 1);
            }
            if (i == 0) {
                questForKreskNFT.mint(user, 2, 1);
                questForKreskNFT.mint(user, 3, 1);
                questForKreskNFT.mint(user, 4, 1);
                questForKreskNFT.mint(user, 5, 1);
                questForKreskNFT.mint(user, 6, 1);
                questForKreskNFT.mint(user, 7, 1);
            }
        }
    }
}
