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
import {Percents} from "common/Constants.sol";
import {Asset, Role, Oracle, OracleType, FeedConfiguration} from "common/Types.sol";
import {CError} from "common/Errors.sol";
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
        if (_asset == address(0)) {
            revert CError.ZERO_ADDRESS();
        } else if (cs().assets[_asset].id != bytes12("")) {
            revert CError.ASSET_ALREADY_EXISTS(_asset);
        }

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
        cs().assets[_asset] = _config;
        if (cs().assets[_asset].pushedPrice().price == 0) {
            revert CError.NO_PUSH_PRICE(string(abi.encodePacked(_config.id)));
        }
    }

    /// @inheritdoc IAssetConfigurationFacet
    function updateAsset(address _asset, Asset memory _config) external onlyRole(Role.ADMIN) {
        if (_asset == address(0)) {
            revert CError.ZERO_ADDRESS();
        } else if (cs().assets[_asset].id == bytes12("")) {
            revert CError.ASSET_DOES_NOT_EXIST(_asset);
        } else if (_config.id == bytes12("")) {
            revert CError.INVALID_ASSET_ID();
        }

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
            emit MEvent.KreskoAssetUpdated(_asset, _config.anchor, _config.kFactor, 0, _config.closeFee, _config.openFee);
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
        if (asset.isSCDPCollateral && !_config.isSCDPCollateral) {
            scdp().isEnabled[_asset] = false;
        }

        asset.isCollateral = _config.isCollateral;
        asset.isKrAsset = _config.isKrAsset;
        asset.isSCDPDepositAsset = _config.isSCDPDepositAsset;
        asset.isSCDPKrAsset = _config.isSCDPKrAsset;

        if (cs().assets[_asset].pushedPrice().price == 0) {
            revert CError.NO_PUSH_PRICE(string(abi.encodePacked(_config.id)));
        }

        if (asset.isSCDPDepositAsset || asset.isSCDPKrAsset) {
            bool shouldAddToCollaterals = true;
            for (uint256 i; i < scdp().collaterals.length; i++) {
                if (scdp().collaterals[i] == _asset) {
                    shouldAddToCollaterals = false;
                }
            }
            if (shouldAddToCollaterals) {
                scdp().collaterals.push(_asset);
            }
        }
    }

    /// @inheritdoc IAssetConfigurationFacet
    function updateFeeds(bytes32 _assetId, FeedConfiguration memory _config) public onlyRole(Role.ADMIN) {
        if (_config.oracleIds.length != _config.feeds.length) {
            revert CError.ARRAY_LENGTH_MISMATCH(_config.oracleIds.length, _config.feeds.length);
        }
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
        if (_assets.length != _feeds.length) {
            revert CError.ARRAY_LENGTH_MISMATCH(_assets.length, _feeds.length);
        }
        for (uint256 i; i < _assets.length; i++) {
            setChainLinkFeed(_assets[i], _feeds[i]);
        }
    }

    /// @inheritdoc IAssetConfigurationFacet
    function setApi3Feeds(bytes32[] calldata _assets, address[] calldata _feeds) public onlyRole(Role.ADMIN) {
        if (_assets.length != _feeds.length) {
            revert CError.ARRAY_LENGTH_MISMATCH(_assets.length, _feeds.length);
        }
        for (uint256 i; i < _assets.length; i++) {
            setApi3Feed(_assets[i], _feeds[i]);
        }
    }

    /// @inheritdoc IAssetConfigurationFacet
    function setChainLinkFeed(bytes32 _asset, address _feed) public onlyRole(Role.ADMIN) {
        if (_feed == address(0)) {
            revert CError.ORACLE_ZERO_ADDRESS();
        }
        cs().oracles[_asset][OracleType.Chainlink] = Oracle(_feed, AssetStateFacet(address(this)).getChainlinkPrice);
        if (AssetStateFacet(address(this)).getChainlinkPrice(_feed) == 0) {
            revert CError.INVALID_CL_PRICE();
        }
    }

    /// @inheritdoc IAssetConfigurationFacet
    function setApi3Feed(bytes32 _asset, address _feed) public onlyRole(Role.ADMIN) {
        if (_feed == address(0)) {
            revert CError.ZERO_ADDRESS();
        }
        cs().oracles[_asset][OracleType.API3] = Oracle(_feed, AssetStateFacet(address(this)).getAPI3Price);

        if (AssetStateFacet(address(this)).getAPI3Price(_feed) == 0) {
            revert CError.INVALID_API3_PRICE();
        }
    }

    /// @inheritdoc IAssetConfigurationFacet
    function updateOracleOrder(address _asset, OracleType[2] memory _newOrder) external onlyRole(Role.ADMIN) {
        if (cs().assets[_asset].id == bytes12("")) {
            revert CError.ASSET_DOES_NOT_EXIST(_asset);
        }

        cs().assets[_asset].oracles = _newOrder;

        if (cs().assets[_asset].pushedPrice().price == 0) {
            revert CError.NO_PUSH_PRICE(string(abi.encodePacked(cs().assets[_asset].id)));
        }
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

        if (_config.pushedPrice().price == 0) {
            revert CError.NO_PUSH_PRICE(string(abi.encodePacked(_config.id)));
        }
    }

    function _validateMinterCollateral(Asset memory _config) internal pure {
        if (_config.factor > Percents.ONE_HUNDRED_PERCENT) {
            revert CError.INVALID_FACTOR(_config.factor);
        } else if (_config.liquidationIncentive > Percents.MAX_LIQUIDATION_INCENTIVE_MULTIPLIER) {
            revert CError.INVALID_LIQUIDATION_INCENTIVE(_config.liquidationIncentive);
        } else if (_config.liquidationIncentive < Percents.ONE_HUNDRED_PERCENT) {
            revert CError.INVALID_LIQUIDATION_INCENTIVE(_config.liquidationIncentive);
        } else if (_config.decimals == 0) {
            revert CError.INVALID_DECIMALS(_config.decimals);
        }
    }

    function _validateMinterKrAsset(address _asset, Asset memory _config) internal view {
        if (_config.kFactor < Percents.ONE_HUNDRED_PERCENT) {
            revert CError.INVALID_FACTOR(_config.kFactor);
        } else if (_config.closeFee > Percents.TWENTY_FIVE) {
            revert CError.INVALID_MINTER_FEE(_config.closeFee);
        } else if (_config.openFee > Percents.TWENTY_FIVE) {
            revert CError.INVALID_MINTER_FEE(_config.openFee);
        }

        IERC165 asset = IERC165(_asset);
        if (!asset.supportsInterface(type(IKISS).interfaceId) && !asset.supportsInterface(type(IKreskoAsset).interfaceId)) {
            revert CError.INVALID_KRASSET_CONTRACT();
        } else if (!IERC165(_config.anchor).supportsInterface(type(IKreskoAssetIssuer).interfaceId)) {
            revert CError.INVALID_KRASSET_ANCHOR();
        } else if (_config.supplyLimit > type(uint128).max) {
            revert CError.SUPPLY_LIMIT(_config.supplyLimit);
        } else if (!IKreskoAsset(_asset).hasRole(Role.OPERATOR, address(this))) {
            revert CError.INVALID_KRASSET_OPERATOR();
        }
    }

    function _validateSCDPDepositAsset(Asset memory _config) internal pure {
        if (_config.factor > Percents.ONE_HUNDRED_PERCENT) {
            revert CError.INVALID_FACTOR(_config.factor);
        } else if (_config.depositLimitSCDP > type(uint128).max) {
            revert CError.DEPOSIT_LIMIT(_config.depositLimitSCDP);
        } else if (_config.decimals == 0) {
            revert CError.INVALID_DECIMALS(_config.decimals);
        }
    }

    function _validateSCDPKrAsset(Asset memory _config) internal pure {
        if (_config.closeFeeSCDP > Percents.TWENTY_FIVE) {
            revert CError.INVALID_FEE(_config.closeFeeSCDP);
        } else if (_config.openFeeSCDP > Percents.TWENTY_FIVE) {
            revert CError.INVALID_FEE(_config.openFeeSCDP);
        } else if (_config.protocolFeeSCDP > Percents.FIFTY) {
            revert CError.INVALID_FEE(_config.protocolFeeSCDP);
        } else if (_config.liquidationIncentiveSCDP > Percents.MAX_LIQUIDATION_INCENTIVE_MULTIPLIER) {
            revert CError.INVALID_LIQUIDATION_INCENTIVE(_config.liquidationIncentiveSCDP);
        } else if (_config.liquidationIncentiveSCDP < Percents.MIN_LIQUIDATION_INCENTIVE_MULTIPLIER) {
            revert CError.INVALID_LIQUIDATION_INCENTIVE(_config.liquidationIncentiveSCDP);
        }
    }
}
