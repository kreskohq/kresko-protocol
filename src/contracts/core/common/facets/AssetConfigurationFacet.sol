// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {IERC20Permit} from "vendor/IERC20Permit.sol";
import {IERC165} from "vendor/IERC165.sol";
import {WadRay} from "libs/WadRay.sol";
import {Arrays} from "libs/Arrays.sol";
import {IKreskoAsset} from "kresko-asset/IKreskoAsset.sol";
import {IKreskoAssetIssuer} from "kresko-asset/IKreskoAssetIssuer.sol";
import {DSModifiers} from "diamond/Modifiers.sol";
import {IKISS} from "kiss/interfaces/IKISS.sol";

import {scdp} from "scdp/State.sol";
import {MEvent} from "minter/Events.sol";

import {IAssetConfigurationFacet} from "common/interfaces/IAssetConfigurationFacet.sol";
import {AssetStateFacet} from "common/facets/AssetStateFacet.sol";

import {CModifiers} from "common/Modifiers.sol";
import {Constants} from "common/Constants.sol";
import {Asset, Role, Oracle, OracleType, FeedConfiguration} from "common/Types.sol";
import {Error} from "common/Errors.sol";
import {cs} from "common/State.sol";

// solhint-disable code-complexity
contract AssetConfigurationFacet is IAssetConfigurationFacet, CModifiers, DSModifiers {
    using WadRay for uint256;
    using Arrays for address[];

    /// @inheritdoc IAssetConfigurationFacet
    function addAsset(
        address _asset,
        Asset memory _config,
        FeedConfiguration memory _feeds,
        bool setFeeds
    ) external onlyRole(Role.ADMIN) {
        require(_asset != address(0), Error.ZERO_ADDRESS);
        require(cs().assets[_asset].id == bytes32(""), Error.ASSET_ALREADY_EXISTS);

        _config.decimals = IERC20Permit(_asset).decimals();

        if (_config.isCollateral) {
            _validateMinterCollateral(_config);
            emit MEvent.CollateralAssetAdded(_asset, _config.factor, _config.anchor, _config.liquidationIncentive);
        }
        if (_config.isKrAsset) {
            _validateMinterKrAsset(_asset, _config);
            emit MEvent.KreskoAssetAdded(
                _asset,
                _config.anchor,
                _config.kFactor,
                _config.supplyLimit,
                _config.closeFee,
                _config.openFee
            );
        }

        if (_config.isSCDPDepositAsset) {
            _validateSCDPDepositAsset(_config);
            _config.liquidityIndexSCDP = uint128(WadRay.RAY);
        }

        if (_config.isSCDPKrAsset) {
            _validateSCDPKrAsset(_config);
            scdp().krAssets.push(_asset);
        }

        if (_config.isSCDPKrAsset || _config.isSCDPDepositAsset) {
            scdp().isEnabled[_asset] = true;
            scdp().collaterals.push(_asset);
        }

        if (setFeeds) {
            updateFeeds(_config.id, _feeds);
        }

        /* ---------------------------------- Save ---------------------------------- */
        require(cs().assets[_asset].pushedPrice().price != 0, Error.ZERO_PRICE);
        cs().assets[_asset] = _config;
    }

    /// @inheritdoc IAssetConfigurationFacet
    function updateAsset(address _asset, Asset memory _config) external onlyRole(Role.ADMIN) {
        require(_asset != address(0), Error.ZERO_ADDRESS);
        require(cs().assets[_asset].id != bytes32(""), Error.ASSET_DOES_NOT_EXIST);
        require(_config.id != bytes32(""), Error.ASSET_DOES_NOT_EXIST);

        Asset memory asset = cs().assets[_asset];
        asset.id = _config.id;
        asset.oracles = _config.oracles;

        if (_config.isCollateral) {
            _validateMinterCollateral(_config);
            asset.factor = _config.factor;
            asset.liquidationIncentive = _config.liquidationIncentive;
            emit MEvent.CollateralAssetUpdated(_asset, _config.factor, _config.anchor, _config.liquidationIncentive);
        }
        if (_config.isKrAsset) {
            _validateMinterKrAsset(_asset, _config);
            asset.kFactor = _config.kFactor;
            asset.supplyLimit = _config.supplyLimit;
            asset.closeFee = _config.closeFee;
            asset.openFee = _config.openFee;
            asset.anchor = _config.anchor;
            emit MEvent.KreskoAssetUpdated(
                _asset,
                _config.anchor,
                _config.kFactor,
                _config.supplyLimit,
                _config.closeFee,
                _config.openFee
            );
        }

        if (_config.isSCDPDepositAsset) {
            _validateSCDPDepositAsset(_config);
            if (asset.liquidityIndexSCDP == 0) {
                _config.liquidityIndexSCDP = uint128(WadRay.RAY);
            }
            asset.depositLimitSCDP = _config.depositLimitSCDP;
        }

        if (_config.isSCDPKrAsset) {
            _validateSCDPKrAsset(_config);
            asset.openFeeSCDP = _config.openFeeSCDP;
            asset.closeFeeSCDP = _config.closeFeeSCDP;
            asset.protocolFeeSCDP = _config.protocolFeeSCDP;
            asset.liquidationIncentiveSCDP = _config.liquidationIncentiveSCDP;
            bool shouldAddToKrAssets = true;
            for (uint256 i; i < scdp().krAssets.length; i++) {
                if (scdp().krAssets[i] == _asset) {
                    shouldAddToKrAssets = false;
                }
            }
            if (shouldAddToKrAssets) {
                scdp().krAssets.push(_asset);
            }
        }

        if (asset.isCollateral && !_config.isCollateral) {}
        if (asset.isKrAsset && !_config.isKrAsset) {
            asset.supplyLimit = 0;
        }
        if (asset.isSCDPKrAsset && !_config.isSCDPKrAsset) {
            scdp().isEnabled[_asset] = false;
            for (uint256 i; i < scdp().krAssets.length; i++) {
                if (scdp().krAssets[i] == _asset) {
                    scdp().krAssets.removeAddress(_asset, i);
                }
            }
        }

        if (asset.isSCDPDepositAsset && !_config.isSCDPDepositAsset) {
            asset.depositLimitSCDP = 0;
        }

        asset.isCollateral = _config.isCollateral;
        asset.isKrAsset = _config.isKrAsset;
        asset.isSCDPDepositAsset = _config.isSCDPDepositAsset;
        asset.isSCDPKrAsset = _config.isSCDPKrAsset;

        require(cs().assets[_asset].pushedPrice().price != 0, Error.ZERO_PRICE);
    }

    /// @inheritdoc IAssetConfigurationFacet
    function updateFeeds(bytes32 _assetId, FeedConfiguration memory _config) public onlyRole(Role.ADMIN) {
        require(_config.oracleIds.length == _config.feeds.length, Error.ARRAY_OUT_OF_BOUNDS);
        for (uint256 i; i < _config.oracleIds.length; i++) {
            if (_config.oracleIds[i] == OracleType.Chainlink) {
                setChainLinkFeed(_assetId, _config.feeds[i]);
            } else if (_config.oracleIds[i] == OracleType.API3) {
                setApi3Feed(_assetId, _config.feeds[i]);
            }
        }
    }

    /// @inheritdoc IAssetConfigurationFacet
    function setChainlinkFeeds(bytes32[] calldata _assets, address[] calldata _feeds) public onlyRole(Role.ADMIN) {
        require(_assets.length == _feeds.length, "assets-feeds-length");
        for (uint256 i; i < _assets.length; i++) {
            setChainLinkFeed(_assets[i], _feeds[i]);
        }
    }

    /// @inheritdoc IAssetConfigurationFacet
    function setApi3Feeds(bytes32[] calldata _assets, address[] calldata _feeds) public onlyRole(Role.ADMIN) {
        require(_assets.length == _feeds.length, "assets-feeds-length");
        for (uint256 i; i < _assets.length; i++) {
            setApi3Feed(_assets[i], _feeds[i]);
        }
    }

    /// @inheritdoc IAssetConfigurationFacet
    function setChainLinkFeed(bytes32 _asset, address _feed) public onlyRole(Role.ADMIN) {
        require(_feed != address(0), Error.ADDRESS_INVALID_ORACLE);
        cs().oracles[_asset][OracleType.Chainlink] = Oracle(_feed, AssetStateFacet(address(this)).getChainlinkPrice);
        require(AssetStateFacet(address(this)).getChainlinkPrice(_feed) != 0, Error.ZERO_PRICE);
    }

    /// @inheritdoc IAssetConfigurationFacet
    function setApi3Feed(bytes32 _asset, address _feed) public onlyRole(Role.ADMIN) {
        require(_feed != address(0), Error.ADDRESS_INVALID_ORACLE);
        cs().oracles[_asset][OracleType.API3] = Oracle(_feed, AssetStateFacet(address(this)).getAPI3Price);
        require(AssetStateFacet(address(this)).getAPI3Price(_feed) != 0, Error.ZERO_PRICE);
    }

    /// @inheritdoc IAssetConfigurationFacet
    function updateOracleOrder(address _asset, OracleType[2] memory _newOrder) external onlyRole(Role.ADMIN) {
        require(cs().assets[_asset].id != bytes32(""), "oracle-order-length");
        cs().assets[_asset].oracles = _newOrder;
        require(cs().assets[_asset].pushedPrice().price != 0, Error.ZERO_PRICE);
    }

    /// @inheritdoc IAssetConfigurationFacet
    function validateAssetConfig(address _asset, Asset memory _config) external view {
        if (_config.isCollateral) {
            _validateMinterCollateral(_config);
        }
        if (_config.isKrAsset) {
            _validateMinterKrAsset(_asset, _config);
        }
        if (_config.isSCDPDepositAsset) {
            _validateSCDPDepositAsset(_config);
        }
        if (_config.isSCDPKrAsset) {
            _validateSCDPKrAsset(_config);
        }
        require(_config.pushedPrice().price != 0, Error.ZERO_PRICE);
    }

    function _validateMinterCollateral(Asset memory _config) internal view {
        require(_config.factor <= Constants.ONE_HUNDRED_PERCENT, Error.COLLATERAL_INVALID_FACTOR);
        require(
            _config.liquidationIncentive >= Constants.MIN_LIQUIDATION_INCENTIVE_MULTIPLIER,
            Error.PARAM_LIQUIDATION_INCENTIVE_LOW
        );
        require(
            _config.liquidationIncentive <= Constants.MAX_LIQUIDATION_INCENTIVE_MULTIPLIER,
            Error.PARAM_LIQUIDATION_INCENTIVE_HIGH
        );
        require(_config.decimals != 0, "deposit-limit-too-high");
    }

    function _validateMinterKrAsset(address _asset, Asset memory _config) internal view {
        require(_config.kFactor >= Constants.ONE_HUNDRED_PERCENT, Error.KRASSET_INVALID_FACTOR);
        require(_config.closeFee <= Constants.MAX_CLOSE_FEE, Error.PARAM_CLOSE_FEE_TOO_HIGH);
        require(_config.openFee <= Constants.MAX_OPEN_FEE, Error.PARAM_OPEN_FEE_TOO_HIGH);
        require(
            IERC165(_asset).supportsInterface(type(IKISS).interfaceId) ||
                IERC165(_asset).supportsInterface(type(IKreskoAsset).interfaceId),
            Error.KRASSET_INVALID_CONTRACT
        );
        require(IERC165(_config.anchor).supportsInterface(type(IKreskoAssetIssuer).interfaceId), Error.KRASSET_INVALID_ANCHOR);
        // The diamond needs the operator role
        require(IKreskoAsset(_asset).hasRole(Role.OPERATOR, address(this)), Error.NOT_OPERATOR);
    }

    function _validateSCDPDepositAsset(Asset memory _config) internal view {
        require(_config.factor <= Constants.ONE_HUNDRED_PERCENT, Error.COLLATERAL_INVALID_FACTOR);
        require(_config.depositLimitSCDP <= type(uint128).max, "deposit-limit-too-high");
        require(_config.decimals != 0, "deposit-limit-too-high");
    }

    function _validateSCDPKrAsset(Asset memory _config) internal view {
        require(_config.closeFeeSCDP <= Constants.MAX_CLOSE_FEE, Error.PARAM_CLOSE_FEE_TOO_HIGH);
        require(_config.openFeeSCDP <= Constants.MAX_OPEN_FEE, Error.PARAM_OPEN_FEE_TOO_HIGH);
        require(_config.protocolFeeSCDP <= Constants.MAX_COLLATERAL_POOL_PROTOCOL_FEE, "krasset-protocol-fee-too-high");
        require(_config.liquidationIncentiveSCDP >= Constants.MIN_LIQUIDATION_INCENTIVE_MULTIPLIER, "li-too-low");
        require(_config.liquidationIncentiveSCDP <= Constants.MAX_LIQUIDATION_INCENTIVE_MULTIPLIER, "li-too-high");
    }
}
