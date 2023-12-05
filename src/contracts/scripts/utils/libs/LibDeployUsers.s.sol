// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;
import {VM, LibVm} from "kresko-lib/utils/Libs.sol";
import {MockERC20} from "mocks/MockERC20.sol";
import {IKISS} from "kiss/interfaces/IKISS.sol";
import {IVault} from "vault/interfaces/IVault.sol";
import {JSON} from "scripts/utils/libs/LibDeployConfig.s.sol";
import {Deployed} from "scripts/utils/libs/Deployed.s.sol";
import {MockERC1155} from "mocks/MockERC1155.sol";
import {IKresko} from "periphery/IKresko.sol";

library LibDeployUsers {
    bytes32 internal constant USERS_SLOT = keccak256("Users");

    /// @notice map tickers/symbols to deployed addresses
    struct UserState {
        mapping(address => bool) users;
    }

    function makeBalances(address _account, JSON.UserConfig memory userCfg, JSON.Assets memory assetCfg) internal {
        for (uint256 j; j < userCfg.balances.length; j++) {
            JSON.BalanceConfig memory cfg = userCfg.balances[j];
            MockERC20 token = MockERC20(Deployed.tokenAddrRuntime(cfg.symbol, assetCfg));
            if (address(token) == address(assetCfg.nativeWrapper)) {
                VM.deal(LibVm.sender(), cfg.amount);
                assetCfg.nativeWrapper.deposit{value: cfg.amount}();
                continue;
            }
            token.mint(_account, cfg.amount);
        }
    }

    function makeMinter(
        IKresko _kresko,
        address _account,
        JSON.UserConfig memory userCfg,
        JSON.Assets memory assetCfg,
        bytes memory _rsPayload
    ) internal {
        for (uint256 j; j < userCfg.minter.length; j++) {
            JSON.MinterUserConfig memory cfg = userCfg.minter[j];

            if (cfg.collAmount > 0) {
                address collateral = Deployed.tokenAddrRuntime(cfg.depositSymbol, assetCfg);

                MockERC20 collToken = MockERC20(collateral);
                if (collateral == address(assetCfg.nativeWrapper)) {
                    VM.deal(LibVm.sender(), cfg.collAmount);
                    assetCfg.nativeWrapper.deposit{value: cfg.collAmount}();
                } else {
                    collToken.mint(_account, cfg.collAmount);
                }

                collToken.approve(address(_kresko), type(uint256).max);

                _kresko.depositCollateral(_account, collateral, cfg.collAmount);
            }

            if (cfg.mintAmount == 0) continue;

            (bool success, bytes memory data) = address(_kresko).call(
                abi.encodePacked(
                    abi.encodeCall(
                        _kresko.mintKreskoAsset,
                        (_account, Deployed.tokenAddrRuntime(cfg.mintSymbol, assetCfg), cfg.mintAmount, _account)
                    ),
                    _rsPayload
                )
            );
            if (!success) {
                revert(string(data));
            }
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
