// SPDX-License-Identifier: BUSL-1.1
pragma solidity <=0.8.20;

interface ILeverPositions {
    struct Position {
        address account;
        address collateral;
        address borrowed;
        uint256 collateralAmount;
        uint256 borrowedAmount;
        uint256 leverage;
        uint256 creationTimestamp;
        uint256 lastUpdateTimestamp;
    }

    /**
     * @notice Creates a new lever position
     * @param _params The parameters of the new position
     * @return id The ID of the new position
     */
    function createPosition(Position memory _params) external returns (uint256 id);

    /**
     * @notice Close a lever position
     * @param _id The ID of the position to close
     */
    function closePosition(uint256 _id) external;

    function getPosition(uint256 _id) external view returns (Position memory);

    /**
     * @notice Deposit collateral into a lever position
     * @param _id The ID of the position to deposit collateral into
     * @param _depositAmount The amount of collateral to deposit
     */
    function deposit(uint256 _id, uint256 _depositAmount) external;

    /**
     * @notice Withdraw collateral from a lever position
     * @param _id The ID of the position to withdraw collateral from
     * @param _withdrawAmount The amount of collateral to withdraw
     */
    function withdraw(uint256 _id, uint256 _withdrawAmount) external;

    /**
     * @notice Borrow more of the borrowed asset from a lever position
     * @param _id The ID of the position to borrow more from
     * @param _borrowAmount The amount of borrowed asset to borrow
     */
    function borrow(uint256 _id, uint256 _borrowAmount) external;

    /**
     * @notice Repay borrowed asset to a lever position
     * @param _id The ID of the position to repay borrowed asset to
     * @param _repayAmount The amount of borrowed asset to repay
     */
    function repay(uint256 _id, uint256 _repayAmount) external;

    /**
     * @notice Liquidate a lever position
     * @param _id The ID of the position to liquidate
     */
    function liquidate(uint256 _id) external;

    /**
     * @notice Get the liquidatable status of a lever positions
     * @param _ids The IDs of the positions
     * @return array of liquidatable results
     */
    function isLiquidatable(uint256[] calldata _ids) external view returns (bool[] memory);
}
