// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import {MockERC20} from "mocks/MockERC20.sol";
import {ScriptBase} from "kresko-lib/utils/ScriptBase.s.sol";
import {Addr} from "kresko-lib/info/Arbitrum.sol";
import {Log} from "kresko-lib/utils/Libs.sol";
import {IKresko} from "periphery/IKresko.sol";
import {Deployed} from "scripts/deploy/libs/Deployed.s.sol";
import {IERC20} from "kresko-lib/token/IERC20.sol";
import {IVault} from "vault/interfaces/IVault.sol";
import {IKISS} from "kiss/interfaces/IKISS.sol";

interface INFT {
    function mint(address to, uint256 tokenId, uint256 amount) external;

    function grantRole(bytes32 role, address to) external;

    function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes memory data) external;

    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) external;
}

contract Impersonated is ScriptBase("MNEMONIC_DEVNET") {
    uint32[5] public users = [0, 1, 2, 3, 4];

    function setupArbForkWBTC() public {
        vm.startBroadcast(0x4bb7f4c3d47C4b431cb0658F44287d52006fb506);
        for (uint256 i; i < users.length; i++) {
            address user = getAddr(users[i]);
            MockERC20(Addr.WBTC).transfer(user, 0.253333e8);
        }
        vm.stopBroadcast();
        Log.clg("WBTC sent to users");
    }

    function setupArbForkNFTs() public {
        address nftOwner = 0x99999A0B66AF30f6FEf832938a5038644a72180a;
        vm.startBroadcast(nftOwner);
        INFT kreskian = INFT(Addr.OFFICIALLY_KRESKIAN);
        INFT questForKresko = INFT(Addr.QUEST_FOR_KRESK);

        kreskian.safeTransferFrom(nftOwner, getAddr(0), 0, 1, "");
        questForKresko.safeTransferFrom(nftOwner, getAddr(0), 0, 1, "");
        questForKresko.safeTransferFrom(nftOwner, getAddr(0), 1, 1, "");
        questForKresko.safeTransferFrom(nftOwner, getAddr(0), 2, 1, "");
        questForKresko.safeTransferFrom(nftOwner, getAddr(0), 3, 1, "");
        questForKresko.safeTransferFrom(nftOwner, getAddr(0), 4, 1, "");

        kreskian.safeTransferFrom(nftOwner, getAddr(1), 0, 1, "");
        questForKresko.safeTransferFrom(nftOwner, getAddr(1), 0, 1, "");

        kreskian.safeTransferFrom(nftOwner, getAddr(2), 0, 1, "");
        vm.stopBroadcast();
    }

    function setupArbForkStables() public {
        vm.startBroadcast(0xB38e8c17e38363aF6EbdCb3dAE12e0243582891D);
        for (uint256 i; i < users.length; i++) {
            address user = getAddr(users[i]);
            if (i == 0) {
                MockERC20(Addr.USDC).transfer(user, 200000e6);
            } else {
                MockERC20(Addr.USDC).transfer(user, 110000e6);
            }
            MockERC20(Addr.USDCe).transfer(user, 17500e6);
            MockERC20(Addr.DAI).transfer(user, 25000 ether);
            MockERC20(Addr.USDT).transfer(user, 5000e6);
        }
        vm.stopBroadcast();
        Log.clg("USDCe sent to users");
    }

    function setupArbForkUsers() public {
        IKresko kresko = IKresko(Deployed.addr("Kresko", block.chainid));
        IERC20 usdc = IERC20(Deployed.addr("USDC", block.chainid));
        IKISS kiss = IKISS(Deployed.addr("KISS", block.chainid));
        uint256 kissBalance = 10_000e18;
        uint256 kissSCDPAmount = 50_000e18;

        vm.startBroadcast(getAddr(0));

        usdc.approve(address(kiss), type(uint256).max);
        kiss.approve(address(kresko), type(uint256).max);
        kiss.vaultMint(address(usdc), kissSCDPAmount + kissBalance, getAddr(0));
        kresko.depositSCDP(getAddr(0), address(kiss), kissSCDPAmount);

        vm.stopBroadcast();

        // address kresko =
    }
}
