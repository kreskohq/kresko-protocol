// SPDX-License-Identifier: BUSL-1.1
pragma solidity <=0.8.20;
import {ICollateralPoolSwapFacet} from "../../interfaces/ICollateralPoolSwapFacet.sol";
import {ILayerZeroEndpointUpgradeable} from "../interfaces/ILayerZeroEndpointUpgradeable.sol";
import {ds} from "../../../../diamond/DiamondStorage.sol";
import {Error} from "../../../../libs/Errors.sol";
import {lz} from "../state/LZStorage.sol";
import {ERC721} from "../state/ERC721Storage.sol";
import {pos, NewPosition, Position} from "../state/PositionsStorage.sol";
import {IPositionsFacet} from "../interfaces/IPositionsFacet.sol";

contract PositionsFacet is IPositionsFacet {
    modifier onlyOwner() {
        require(msg.sender == ds().contractOwner, "!owner");
        _;
    }

    function initialize(
        string memory _name,
        string memory _symbol,
        ICollateralPoolSwapFacet _kresko,
        uint256 _minGasToTransfer,
        ILayerZeroEndpointUpgradeable _lzEndpoint,
        uint256 _liquidationThreshold,
        uint256 _maxLeverage
    ) external onlyOwner {
        require(ds().storageVersion == 0, Error.ALREADY_INITIALIZED);
        require(_liquidationThreshold <= 1e18, "10");
        require(_liquidationThreshold >= 0.01e18, "11");
        require(_maxLeverage <= 100e18, "12");
        lz().minGasToTransferAndStore = _minGasToTransfer;
        lz().lzEndpoint = _lzEndpoint;

        ERC721().name = _name;
        ERC721().symbol = _symbol;

        require(address(_kresko) != address(0), "kresko-address-zero");
        pos().kresko = _kresko;
        pos().minLeverage = 0.01e18;
        pos().maxLeverage = 0.5e18;

        ds().storageVersion = 1;
    }

    modifier check(uint256 _id) {
        address owner = ERC721().ownerOf(_id);
        require(msg.sender == owner || ERC721().isApprovedForAll(owner, msg.sender), "!account");
        _;
    }

    /// @inheritdoc IPositionsFacet
    function isLiquidatable(uint256[] calldata _ids) public view returns (bool[] memory results) {
        results = new bool[](_ids.length);
        for (uint256 i; i < _ids.length; i++) {
            results[i] = pos().isLiquidatable(_ids[i]);
        }
    }

    /// @inheritdoc IPositionsFacet
    function createPosition(NewPosition memory _position) external returns (uint256 positionId) {
        (uint256 amountInAfterFee, uint256 amountOut) = pos().kresko.swapLeverIn(msg.sender, _position);
        positionId = ERC721().currentId++;

        pos().positions[positionId] = Position({
            account: _position.account,
            collateral: _position.collateralAsset,
            borrowed: _position.borrowAsset,
            collateralAmount: amountInAfterFee,
            borrowedAmount: amountOut,
            leverage: _position.leverage,
            creationTimestamp: block.timestamp,
            lastUpdateTimestamp: block.timestamp
        });

        ERC721().safeMint(_position.account, positionId, "");
    }

    /// @inheritdoc IPositionsFacet
    function getPosition(uint256 _id) external view returns (Position memory) {
        return pos().getPosition(_id);
    }

    /// @inheritdoc IPositionsFacet
    function closePosition(uint256 _id) external override check(_id) {
        pos().kresko.swapLeverOut(pos().positions[_id]);
        ERC721().burn(_id);
    }

    /// @inheritdoc IPositionsFacet
    function deposit(uint256 _id, uint256 _collateralAmount) external override check(_id) {
        pos().adjustIn(_id, _collateralAmount, 0);
    }

    /// @inheritdoc IPositionsFacet
    function repay(uint256 _id, uint256 _repayAmount) external override check(_id) {
        pos().adjustIn(_id, 0, _repayAmount);
    }

    /// @inheritdoc IPositionsFacet
    function withdraw(uint256 _id, uint256 _collateralAmount) external override check(_id) {
        pos().adjustOut(_id, _collateralAmount, 0);
    }

    /// @inheritdoc IPositionsFacet
    function borrow(uint256 _id, uint256 _borrowAmount) external override check(_id) {
        pos().adjustOut(_id, 0, _borrowAmount);
    }
}
