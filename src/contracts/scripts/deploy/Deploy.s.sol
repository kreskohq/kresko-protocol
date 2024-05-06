// solhint-disable code-complexity, state-visibility, max-states-count, var-name-mixedcase, no-global-import, const-name-snakecase, no-empty-blocks, no-console
// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.23;

import {DeployBase} from "scripts/deploy/DeployBase.s.sol";
import {Scripted} from "kresko-lib/utils/Scripted.s.sol";
import {LibJSON} from "scripts/deploy/libs/LibJSON.s.sol";
import {LibMocks} from "scripts/deploy/libs/LibMocks.s.sol";
import {LibDeploy} from "scripts/deploy/libs/LibDeploy.s.sol";
import {LibDeployUtils} from "scripts/deploy/libs/LibDeployUtils.s.sol";
import {Help, Log} from "kresko-lib/utils/Libs.s.sol";
import {VaultAsset} from "vault/VTypes.sol";
import {SwapRouteSetter} from "scdp/STypes.sol";
import {Ownable} from "@oz/access/Ownable.sol";
import "scripts/deploy/JSON.s.sol" as JSON;
import {MockERC20} from "mocks/MockERC20.sol";
import {IERC1155} from "common/interfaces/IERC1155.sol";
import {Enums, Role} from "common/Constants.sol";
import {Deployed} from "scripts/deploy/libs/Deployed.s.sol";
import {Asset, FeedConfiguration} from "common/Types.sol";
import {IDeploymentFactory} from "factory/IDeploymentFactory.sol";
import {IGatingManager} from "periphery/IGatingManager.sol";
import {IPyth} from "vendor/pyth/IPyth.sol";
import {IMarketStatus} from "common/interfaces/IMarketStatus.sol";
import {getPythData} from "vendor/pyth/PythScript.sol";
import {MintArgs} from "common/Args.sol";

contract Deploy is Scripted, DeployBase {
    using LibJSON for *;
    using LibMocks for *;
    using LibDeploy for *;
    using Deployed for *;
    using LibDeployUtils for *;
    using Help for *;
    using Log for *;

    mapping(bytes32 => bool) tickerExists;
    mapping(bytes32 => bool) routeExists;
    SwapRouteSetter[] routeCache;
    bytes[] updateData;
    uint256 updateFee;

    function exec(
        JSON.Config memory json,
        JSON.Salts memory salts,
        address deployer,
        bool disableLog
    ) private broadcasted(deployer) returns (JSON.Config memory) {
        // Deploy the deployment factory first.
        if (json.params.deploymentFactory == address(0)) {
            json.params.deploymentFactory = super.deployDeploymentFactory(deployer);
        } else {
            factory = IDeploymentFactory(json.params.deploymentFactory);
            LibDeploy.state().factory = factory;
        }
        // Create configured mocks, updates the received config with addresses.
        json = json.createMocks(deployer);
        pythEp = IPyth(json.params.common.pythEp);
        weth = json.assets.wNative.token;
        // Set tokens to cache as we know them at this point.
        json.cacheExtTokens();

        if (json.params.common.gatingManager == address(0)) {
            json.params.common.gatingManager = super.deployGatingManager(json, deployer);
        } else {
            gatingManager = IGatingManager(json.params.common.gatingManager);
        }

        if (json.params.common.marketStatusProvider == address(0)) {
            json.params.common.marketStatusProvider = super.deployMarketStatusProvider(json, deployer);
        } else {
            marketStatusProvider = IMarketStatus(json.params.common.marketStatusProvider);
        }
        // Create base contracts
        address diamond = super.deployDiamond(json, deployer, salts.kresko);

        vault = json.createVault(deployer);
        kiss = json.createKISS(diamond, address(vault));

        json = json.createKrAssets(diamond);

        /* ---------------------------- Externals --------------------------- */
        _addExtAssets(json, diamond);
        /* ------------------------------ KISS ------------------------------ */
        _addKISS(json);
        /* ------------------------------ KrAssets ------------------------------ */
        _addKrAssets(json, diamond);
        /* -------------------------- Vault Assets -------------------------- */
        _addVaultAssets(json);

        /* -------------------------- Setup states -------------------------- */
        json.getAllTradeRoutes(routeCache, routeExists, address(kiss));
        kresko.setSwapRoutesSCDP(routeCache);
        delete routeCache;

        json.getCustomTradeRoutes(routeCache);
        for (uint256 i; i < routeCache.length; i++) {
            kresko.setSingleSwapRouteSCDP(routeCache[i]);
        }
        delete routeCache;

        /* ---------------------------- Periphery --------------------------- */
        multicall = json.createMulticall(diamond, address(kiss), address(pythEp), salts.multicall);
        dataV1 = json.createDataV1(diamond, address(vault), address(kiss));

        /* ------------------------------ Users ----------------------------- */
        if (json.users.accounts.length > 0) {
            setupUsers(json, deployer, disableLog);
        }
        kresko.setMarketStatusProvider(address(marketStatusProvider));
        gatingManager.setPhase(json.params.gatingPhase);
        if (!disableLog) Log.clg(json.params.gatingPhase, "Gating phase set to: ");
        /* --------------------- Remove deployer access --------------------- */
        address admin = json.params.common.admin;
        if (admin != deployer) {
            kresko.transferOwnership(admin);
            vault.setGovernance(admin);
            Ownable(address(factory)).transferOwnership(admin);
            kresko.grantRole(Role.DEFAULT_ADMIN, admin);
            kresko.grantRole(Role.ADMIN, admin);
            kresko.renounceRole(Role.ADMIN, deployer);
            kresko.renounceRole(Role.DEFAULT_ADMIN, deployer);
        }

        if (!disableLog) {
            json.logOutput(kresko, address(kiss));
            Log.br();
            Log.hr();
            Log.clg("Deployment finished!");
            Log.hr();
        }
        return json;
    }

    function _addKISS(JSON.Config memory json) private {
        json
            .assets
            .kiss
            .symbol
            .cache(
                kresko.addAsset(
                    address(kiss),
                    json.assets.kiss.config.toAsset(json.assets.kiss.symbol),
                    FeedConfiguration(
                        [Enums.OracleType.Vault, Enums.OracleType.Empty],
                        [address(vault), address(0)],
                        [uint256(0), 0],
                        bytes32(0),
                        false
                    )
                )
            )
            .logAsset(address(kresko), address(kiss));
        kresko.setFeeAssetSCDP(address(kiss));
    }

    function _addVaultAssets(JSON.Config memory json) private {
        VaultAsset[] memory vaultAssets = json.getVaultAssets();
        for (uint256 i; i < vaultAssets.length; i++) {
            vault.addAsset(vaultAssets[i]).logOutput(address(vault));
        }
    }

    function _addExtAssets(JSON.Config memory json, address diamond) private {
        for (uint256 i; i < json.assets.extAssets.length; i++) {
            JSON.ExtAsset memory eAsset = json.assets.extAssets[i];
            Asset memory assetConfig = eAsset.config.toAsset(eAsset.symbol);
            FeedConfiguration memory feedConfig;
            if (!tickerExists[assetConfig.ticker]) {
                feedConfig = json.getFeeds(eAsset.config.ticker, eAsset.config.oracles);
                tickerExists[assetConfig.ticker] = true;
            }

            tickerExists[assetConfig.ticker] = true;
            eAsset.symbol.cache(kresko.addAsset(eAsset.addr, assetConfig, feedConfig)).logAsset(diamond, eAsset.addr);
        }
    }

    function _addKrAssets(JSON.Config memory json, address diamond) private {
        for (uint256 i; i < json.assets.kreskoAssets.length; i++) {
            JSON.KrAssetConfig memory krAsset = json.assets.kreskoAssets[i];

            Asset memory assetConfig = krAsset.config.toAsset(krAsset.symbol);
            FeedConfiguration memory feedConfig;
            if (!tickerExists[assetConfig.ticker]) {
                feedConfig = json.getFeeds(krAsset.config.ticker, krAsset.config.oracles);
                tickerExists[assetConfig.ticker] = true;
            }

            address assetAddr = krAsset.symbol.cached();
            krAsset.symbol.cache(kresko.addAsset(assetAddr, assetConfig, feedConfig)).logAsset(diamond, assetAddr);
        }
    }

    /* ---------------------------------------------------------------------- */
    /*                               USER SETUPS                              */
    /* ---------------------------------------------------------------------- */

    function setupUsers(JSON.Config memory json, address deployer, bool disableLog) private reclearCallers {
        updateData = getPythData(json);
        updateFee = pythEp.getUpdateFee(updateData);
        setupBalances(json.users, json.assets);
        setupSCDP(json.users, json.assets);
        setupMinter(json.users, json.assets);
        setupNFTs(json.users.nfts.nftsFrom == address(0) ? deployer : json.users.nfts.nftsFrom, json.users, json.params);

        if (!disableLog) {
            for (uint256 i; i < json.users.accounts.length; i++) {
                json.logUserOutput(json.users.get(i), kresko, address(kiss));
            }
            Log.hr();
            Log.clg("Users setup finished!");
            Log.hr();
        }
    }

    function setupBalances(JSON.Users memory users, JSON.Assets memory assets) private {
        for (uint256 i; i < users.balances.length; i++) {
            JSON.Balance memory bal = users.balances[i];
            if (bal.user == JSON.ALL_USERS) {
                for (uint256 j; j < users.accounts.length; j++) {
                    setupBalance(assets, users.get(j), bal);
                }
            } else {
                setupBalance(assets, users.get(bal.user), bal);
            }
        }
    }

    function setupNativeWrapper(address user, JSON.Balance memory bal) private broadcasted(user) {
        if (bal.amount == 0) return;
        if (bal.assetsFrom == address(0)) {
            vm.deal(user, bal.amount);
            weth.deposit{value: bal.amount}();
        } else if (bal.assetsFrom == address(1)) {
            weth.deposit{value: bal.amount}();
        } else {
            _transfer(bal.assetsFrom, user, address(weth), bal.amount);
        }
    }

    function setupBalance(
        JSON.Assets memory assets,
        address user,
        JSON.Balance memory bal
    ) internal rebroadcasted(user) returns (address tokenAddr) {
        tokenAddr = bal.symbol.cached();
        if (bal.amount == 0) return tokenAddr;

        if (tokenAddr == address(assets.wNative.token)) {
            setupNativeWrapper(user, bal);
            return tokenAddr;
        }

        if (bal.assetsFrom == address(1)) {
            return tokenAddr;
        }

        if (bal.assetsFrom == address(0)) {
            _mintTokens(user, tokenAddr, bal.amount);
        } else {
            _transfer(bal.assetsFrom, user, tokenAddr, bal.amount);
        }
    }

    function setupSCDP(JSON.Users memory users, JSON.Assets memory assets) private {
        for (uint256 i; i < users.scdp.length; i++) {
            JSON.SCDPPosition memory pos = users.scdp[i];
            if (pos.user == JSON.ALL_USERS) {
                for (uint256 j; j < users.accounts.length; j++) {
                    setupSCDPUser(assets, users.get(j), j, pos);
                }
            } else {
                setupSCDPUser(assets, users.get(pos.user), i, pos);
            }
        }
    }

    function setupMinter(JSON.Users memory users, JSON.Assets memory assets) private {
        for (uint256 i; i < users.minter.length; i++) {
            JSON.MinterPosition memory pos = users.minter[i];
            bool isKISS = pos.mintSymbol.equals("KISS");
            if (pos.user == JSON.ALL_USERS) {
                for (uint256 j; j < users.accounts.length; j++) {
                    !isKISS ? setupMinterUser(assets, users.get(j), j, pos) : setupKISSBalance(assets, users.get(j), j, pos);
                }
            } else {
                !isKISS
                    ? setupMinterUser(assets, users.get(pos.user), i, pos)
                    : setupKISSBalance(assets, users.get(pos.user), i, pos);
            }
        }
    }

    function setupMinterUser(
        JSON.Assets memory assets,
        address user,
        uint256 index,
        JSON.MinterPosition memory pos
    ) private broadcasted(user) {
        if (pos.depositAmount > 0) {
            address collAddr = setupBalance(
                assets,
                user,
                JSON.Balance(index, pos.depositSymbol, pos.depositAmount, pos.assetsFrom)
            );

            _maybeApprove(collAddr, address(kresko), 1);
            kresko.depositCollateral(user, collAddr, pos.depositAmount);
        }

        if (pos.mintAmount == 0) return;
        if (user.balance < 0.005 ether) {
            vm.deal(getAddr(0), 0.01 ether);
            broadcastWith(0);
            payable(user).transfer(0.005 ether);
            broadcastWith(user);
        }
        kresko.mintKreskoAsset{value: updateFee}(MintArgs(user, pos.mintSymbol.cached(), pos.mintAmount, user), updateData);
    }

    function setupKISSBalance(
        JSON.Assets memory assets,
        address user,
        uint256 index,
        JSON.MinterPosition memory pos
    ) private broadcasted(user) {
        if (pos.depositAmount > 0) {
            address assetAddr = setupBalance(
                assets,
                user,
                JSON.Balance(index, pos.depositSymbol, pos.depositAmount, pos.assetsFrom)
            );
            _maybeApprove(assetAddr, address(kiss), 1);
            kiss.vaultDeposit(assetAddr, pos.depositAmount, user);
        } else {
            (uint256 assetsIn, ) = vault.previewMint(pos.depositSymbol.cached(), pos.mintAmount);
            address assetAddr = setupBalance(assets, user, JSON.Balance(index, pos.depositSymbol, assetsIn, pos.assetsFrom));

            _maybeApprove(assetAddr, address(kiss), 1);
            kiss.vaultMint(assetAddr, pos.mintAmount, user);
        }
    }

    function setupSCDPUser(
        JSON.Assets memory assets,
        address user,
        uint256 index,
        JSON.SCDPPosition memory pos
    ) private broadcasted(user) {
        if (pos.kissDeposits > 0) {
            address assetAddr = pos.vaultAssetSymbol.cached();
            (uint256 assetsIn, ) = vault.previewMint(assetAddr, pos.kissDeposits);

            setupBalance(assets, user, JSON.Balance(index, pos.vaultAssetSymbol, assetsIn, pos.assetsFrom));

            _maybeApprove(assetAddr, address(kiss), 1);
            kiss.vaultMint(assetAddr, pos.kissDeposits, user);

            _maybeApprove(address(kiss), address(kresko), 1);
            kresko.depositSCDP(user, address(kiss), pos.kissDeposits);
        }
    }

    function setupNFTs(address _owner, JSON.Users memory users, JSON.Params memory params) private broadcasted(_owner) {
        if (users.nfts.userCount == 0) return;
        IERC1155 okNFT = IERC1155(params.periphery.okNFT);
        IERC1155 qfkNFT = IERC1155(params.periphery.qfkNFT);
        for (uint256 i; i < users.nfts.userCount; i++) {
            address user = users.get(i);
            if (users.nfts.useMocks) {
                if (i < 5) {
                    okNFT.mint(user, 0, 3, "");
                }
                if (i < 3) {
                    qfkNFT.mint(user, 0, 1, "");
                }
                if (i < 2) {
                    qfkNFT.mint(user, 1, 1, "");
                    qfkNFT.mint(user, 2, 1, "");
                }
                if (i == 0) {
                    qfkNFT.mint(user, 2, 1, "");
                    qfkNFT.mint(user, 3, 1, "");
                    qfkNFT.mint(user, 4, 1, "");
                    qfkNFT.mint(user, 5, 1, "");
                    qfkNFT.mint(user, 6, 1, "");
                    qfkNFT.mint(user, 7, 1, "");
                }
            } else {
                if (i < 3) {
                    okNFT.safeTransferFrom(_owner, user, 0, 1, "");
                }
                if (i < 2) {
                    qfkNFT.safeTransferFrom(_owner, user, 1, 1, "");
                }
                if (i == 0) {
                    qfkNFT.safeTransferFrom(_owner, user, 2, 1, "");
                    qfkNFT.safeTransferFrom(_owner, user, 3, 1, "");
                    qfkNFT.safeTransferFrom(_owner, user, 4, 1, "");
                    qfkNFT.safeTransferFrom(_owner, user, 5, 1, "");
                }
            }
        }
    }

    function _maybeApprove(address token, address spender, uint256 amount) internal {
        if (MockERC20(token).allowance(peekSender(), spender) < amount) {
            MockERC20(token).approve(spender, type(uint256).max);
        }
    }

    function _mintTokens(address user, address token, uint256 amount) internal {
        MockERC20(token).mint(user, amount);
    }

    function _transfer(address from, address to, address token, uint256 amount) internal rebroadcasted(from) {
        MockERC20(token).transfer(to, amount);
    }

    function deploy(
        string memory network,
        string memory mnemonicEnv,
        uint32 deployer,
        bool saveOutput,
        bool disableLog
    ) public mnemonic(mnemonicEnv) returns (JSON.Config memory) {
        return deploy(network, network, mnemonicEnv, deployer, saveOutput, disableLog);
    }

    function deploy(
        string memory network,
        string memory configId,
        string memory mnemonicEnv,
        uint32 deployer,
        bool saveOutput,
        bool disableLog
    ) public mnemonic(mnemonicEnv) returns (JSON.Config memory json) {
        if (disableLog) LibDeploy.disableLog();
        else Log.clg(network.and(":").and(configId), "Deploying");
        if (saveOutput) LibDeploy.initOutputJSON(configId);

        json = exec(JSON.getConfig(network, configId), JSON.getSalts(network, configId), getAddr(deployer), disableLog);

        if (saveOutput) LibDeploy.writeOutputJSON();
    }

    function deployTest(uint32 deployer) public returns (JSON.Config memory) {
        return deploy("test", "test-base", "MNEMONIC_DEVNET", deployer, true, true);
    }

    function deployTest(string memory mnemonic, string memory configId, uint32 deployer) public returns (JSON.Config memory) {
        return deploy("test", configId, mnemonic, deployer, true, true);
    }

    function deployFrom(
        string memory dir,
        string memory configId,
        string memory mnemonicEnv,
        uint32 deployer,
        bool saveOutput,
        bool disableLog
    ) public mnemonic(mnemonicEnv) returns (JSON.Config memory json) {
        if (disableLog) LibDeploy.disableLog();
        else Log.clg(dir.and(configId), "Deploying from");
        if (saveOutput) LibDeploy.initOutputJSON(configId);

        json = exec(
            JSON.getConfigFrom(dir, configId),
            JSON.Salts(bytes32("Kresko"), bytes32("Multicall")),
            getAddr(deployer),
            disableLog
        );

        if (saveOutput) LibDeploy.writeOutputJSON();
    }

    function deployFromTest(
        string memory mnemonic,
        string memory dir,
        string memory configId,
        uint32 deployer
    ) public returns (JSON.Config memory) {
        return deployFrom(dir, configId, mnemonic, deployer, false, true);
    }
}
