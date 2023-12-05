// solhint-disable code-complexity, state-visibility, max-states-count, var-name-mixedcase, no-global-import, const-name-snakecase, no-empty-blocks, no-console
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import {LocalDeployment} from "../config/LocalnetConfig.s.sol";

contract Localnet is LocalDeployment("MNEMONIC_DEVNET") {
    string internal constant configId = "localhost";

    function run() public {
        enableLogger();

        address deployer = getAddr(0);
        address admin = getAddr(0);
        address treasury = getAddr(10);
        vm.deal(deployer, 100 ether);

        UserCfg[] memory userCfg = super.createUserConfig(testUsers);
        AssetsOnChain memory assets = deploy(deployer, admin, treasury);

        setupUsers(userCfg, assets);

        super.afterComplete();
        writeDeploymentJSON();
    }

    function deploy(
        address deployer,
        address admin,
        address treasury
    ) internal broadcastWithAddr(deployer) returns (AssetsOnChain memory assets_) {
        factory = super.deployDeploymentFactory(admin);
        // create configurations
        AssetCfg memory assetCfg = super.createAssetConfig();
        CoreConfig memory coreCfg = super.createCoreConfig(admin, treasury, address(0));

        // create base contracts
        address kreskoAddr = super.createCore(coreCfg);
        address vaultAddr = super.createVault(coreCfg, kreskoAddr);

        // create assets
        KISSInfo memory kissInfo = super.createKISS(coreCfg, kreskoAddr, vaultAddr);
        KrAssetDeployInfo[] memory krAssetInfos = super.createKrAssets(coreCfg, assetCfg);

        // add assets
        assets_ = super.addAssets(assetCfg, krAssetInfos, kissInfo, kreskoAddr);

        // handle things depending on assets existing
        super.configureSwap(kreskoAddr, assets_);

        // deploy periphery contracts
        super.deployPeriphery();
        factory.transferOwnership(admin);
    }
}
