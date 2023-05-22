// SPDX-License-Identifier: BUSL-1.1
pragma solidity <=0.8.20;

import {ds} from "../../../../diamond/DiamondStorage.sol";
import {DiamondModifiers} from "../../../../diamond/DiamondModifiers.sol";
import {Error} from "../../../../libs/Errors.sol";
import {lz} from "../state/LZStorage.sol";
import {ERC721} from "../state/ERC721Storage.sol";
import {pos, LibPositions, PositionsInitializer} from "../state/PositionsStorage.sol";
import {ICollateralPoolSwapFacet} from "../../interfaces/ICollateralPoolSwapFacet.sol";

contract PositionsConfigFacet is DiamondModifiers {
    function initialize(PositionsInitializer memory _init) external {
        ds().contractOwner = msg.sender;
        require(ds().storageVersion == 1, Error.ALREADY_INITIALIZED);
        // check erc721
        require(bytes(_init.name).length > 0 && bytes(_init.symbol).length > 0, LibPositions.INVALID_NAME);
        ERC721().name = _init.name;
        ERC721().symbol = _init.symbol;
        // check liq threshold
        require(_init.liquidationThreshold <= 1e18, LibPositions.INVALID_LT);
        require(_init.liquidationThreshold >= 0.1e18, LibPositions.INVALID_LT);
        pos().liquidationThreshold = _init.liquidationThreshold;
        // check close threshold
        require(_init.closeThreshold <= 10e18, LibPositions.INVALID_LT); // 10,000% profit
        require(_init.closeThreshold >= 0.01e18, LibPositions.INVALID_LT); // 1% profit
        pos().closeThreshold = _init.closeThreshold;
        // check min/max lev
        require(_init.maxLeverage <= 500e18, LibPositions.INVALID_MAX_LEVERAGE);
        require(_init.maxLeverage >= 1e18, LibPositions.INVALID_MAX_LEVERAGE);
        require(_init.minLeverage >= 0.01e18, LibPositions.INVALID_MAX_LEVERAGE);
        require(_init.minLeverage < _init.maxLeverage, LibPositions.INVALID_MAX_LEVERAGE);
        pos().minLeverage = _init.minLeverage;
        pos().maxLeverage = _init.maxLeverage;
        // check kresko
        require(address(_init.kresko) != address(0), LibPositions.INVALID_KRESKO);
        pos().kresko = _init.kresko;
        ds().storageVersion = 1;
    }

    function getPositionsConfig() external view returns (PositionsInitializer memory) {
        return
            PositionsInitializer({
                kresko: pos().kresko,
                name: ERC721().name,
                symbol: ERC721().symbol,
                liquidationThreshold: pos().liquidationThreshold,
                closeThreshold: pos().closeThreshold,
                maxLeverage: pos().maxLeverage,
                minLeverage: pos().minLeverage
            });
    }

    function setLiquidationThreshold(uint256 _threshold) external onlyOwner {
        require(_threshold <= 1e18, LibPositions.INVALID_LT);
        require(_threshold >= 0.1e18, LibPositions.INVALID_LT);

        pos().liquidationThreshold = _threshold;
    }

    function setCloseThreshold(uint256 _threshold) external onlyOwner {
        require(_threshold <= 1e18, LibPositions.INVALID_LT);
        require(_threshold >= 0.01e18, LibPositions.INVALID_LT);

        pos().closeThreshold = _threshold;
    }

    function setMaxLeverage(uint256 _maxLeverage) external onlyOwner {
        require(_maxLeverage <= 500e18, LibPositions.INVALID_MAX_LEVERAGE);
        require(_maxLeverage >= 1e18, LibPositions.INVALID_MAX_LEVERAGE);

        pos().maxLeverage = _maxLeverage;
    }

    function setMinLeverage(uint256 _minLeverage) external onlyOwner {
        require(_minLeverage >= 0.01e18, LibPositions.INVALID_MAX_LEVERAGE);

        pos().minLeverage = _minLeverage;
    }

    function setKresko(ICollateralPoolSwapFacet _kresko) external onlyOwner {
        require(address(_kresko) != address(0), LibPositions.INVALID_KRESKO);

        pos().kresko = _kresko;
    }
}
