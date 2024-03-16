// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

interface ISwapRouter {
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    struct ExactOutputParams {
        bytes path;
        address recipient;
        uint256 amountOut;
        uint256 amountInMaximum;
    }

    function WETH9() external view returns (address);

    function quoteExactInput(
        bytes memory path,
        uint256 amountIn
    )
        external
        returns (
            uint256 amountOut,
            uint160[] memory sqrtPriceX96AfterList,
            uint32[] memory initializedTicksCrossedList,
            uint256 gasEstimate
        );

    function quoteExactOutput(
        bytes memory path,
        uint256 amountOut
    )
        external
        returns (
            uint256 amountIn,
            uint160[] memory sqrtPriceX96AfterList,
            uint32[] memory initializedTicksCrossedList,
            uint256 gasEstimate
        );

    function exactInput(ExactInputParams calldata params) external returns (uint256 amountOut);

    function exactOutput(ExactOutputParams calldata params) external returns (uint256 amountIn);
}

interface IKrMulticall {
    function rescue(address _token, uint256 _amount, address _receiver) external;

    function execute(Operation[] calldata ops, bytes[] calldata _updateData) external payable returns (Result[] memory);

    /**
     * @notice An operation to execute.
     * @param action The operation to execute.
     * @param data The data for the operation.
     */
    struct Operation {
        Action action;
        Data data;
    }

    /**
     * @notice Data for an operation.
     * @param tokenIn The tokenIn to use, or address(0) if none.
     * @param amountIn The amount of tokenIn to use, or 0 if none.
     * @param tokensInMode The mode for tokensIn.
     * @param tokenOut The tokenOut to use, or address(0) if none.
     * @param amountOut The amount of tokenOut to use, or 0 if none.
     * @param tokensOutMode The mode for tokensOut.
     * @param amountOutMin The minimum amount of tokenOut to receive, or 0 if none.
     * @param index The index of the mintedKreskoAssets array to use, or 0 if none.
     * @param path The path for the Uniswap V3 swap, or empty if none.
     */
    struct Data {
        address tokenIn;
        uint96 amountIn;
        TokensInMode tokensInMode;
        address tokenOut;
        uint96 amountOut;
        TokensOutMode tokensOutMode;
        uint128 amountOutMin;
        uint128 index;
        bytes path;
    }

    /**
     * @notice The result of an operation.
     * @param tokenIn The tokenIn to use.
     * @param amountIn The amount of tokenIn used.
     * @param tokenOut The tokenOut to receive from the operation.
     * @param amountOut The amount of tokenOut received.
     */
    struct Result {
        address tokenIn;
        uint256 amountIn;
        address tokenOut;
        uint256 amountOut;
    }

    /**
     * @notice The action for an operation.
     */
    enum Action {
        MinterDeposit,
        MinterWithdraw,
        MinterRepay,
        MinterBorrow,
        SCDPDeposit,
        SCDPTrade,
        SCDPWithdraw,
        SCDPClaim,
        SynthUnwrap,
        SynthWrap,
        VaultDeposit,
        VaultRedeem,
        AMMExactInput,
        SynthwrapNative,
        SynthUnwrapNative
    }

    /**
     * @notice The token in mode for an operation.
     * @param None Operation requires no tokens in.
     * @param PullFromSender Operation pulls tokens in from sender.
     * @param UseContractBalance Operation uses the existing contract balance for tokens in.
     * @param UseContractBalanceExactAmountIn Operation uses the existing contract balance for tokens in, but only the amountIn specified.
     */
    enum TokensInMode {
        None,
        Native,
        PullFromSender,
        UseContractBalance,
        UseContractBalanceExactAmountIn
    }

    /**
     * @notice The token out mode for an operation.
     * @param None Operation requires no tokens out.
     * @param ReturnToSenderNative Operation will unwrap and transfer native to sender.
     * @param ReturnToSender Operation returns tokens received to sender.
     * @param LeaveInContract Operation leaves tokens received in the contract for later use.
     */
    enum TokensOutMode {
        None,
        ReturnToSenderNative,
        ReturnToSender,
        LeaveInContract
    }

    error NO_ALLOWANCE(Action action, address token, string symbol);
    error ZERO_AMOUNT_IN(Action action, address token, string symbol);
    error ZERO_NATIVE_IN(Action action);
    error VALUE_NOT_ZERO(Action action, uint256 value);
    error INVALID_NATIVE_TOKEN_IN(Action action, address token, string symbol);
    error ZERO_OR_INVALID_AMOUNT_IN(Action action, address token, string symbol, uint256 balance, uint256 amountOut);
    error INVALID_ACTION(Action action);
    error NATIVE_SYNTH_WRAP_NOT_ALLOWED(Action action, address token, string symbol);

    error TOKENS_IN_MODE_WAS_NONE_BUT_ADDRESS_NOT_ZERO(Action action, address token);
    error TOKENS_OUT_MODE_WAS_NONE_BUT_ADDRESS_NOT_ZERO(Action action, address token);

    error INSUFFICIENT_UPDATE_FEE(uint256 updateFee, uint256 amountIn);
}
