// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import {IMinterDepositWithdrawFacet} from "minter/interfaces/IMinterDepositWithdrawFacet.sol";
import {IMinterBurnFacet} from "minter/interfaces/IMinterBurnFacet.sol";
import {IMinterMintFacet} from "minter/interfaces/IMinterMintFacet.sol";
import {ISCDPFacet} from "scdp/interfaces/ISCDPFacet.sol";
import {ISCDPSwapFacet} from "scdp/interfaces/ISCDPSwapFacet.sol";
import {IVaultExtender} from "vault/interfaces/IVaultExtender.sol";
import {IERC20} from "kresko-lib/token/IERC20.sol";
import {IKreskoAsset} from "kresko-asset/IKreskoAsset.sol";
import {Ownable} from "@oz/access/Ownable.sol";
import {IWETH9} from "kresko-lib/token/IWETH9.sol";

interface ISwapRouter {
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInput(ExactInputParams memory params) external returns (uint256 amountOut);
}

// solhint-disable avoid-low-level-calls, code-complexity

/**
 * @title KrMulticall
 * @notice Executes some number of supported operations one after another.
 * @notice Any operation can specify the mode for tokens in and out:
 * Specifically this means that if any operation leaves tokens in the contract, the next one can use them.
 * @notice All tokens left in the contract after operations will be returned to the sender at the end.
 */
contract KrMulticall is Ownable {
    address public constant ETH = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public kresko;
    address public kiss;
    ISwapRouter public uniswapRouter;
    IWETH9 public wrappedNative;

    constructor(address _kresko, address _kiss, address _uniswapRouter, address _wrappedNative) Ownable(msg.sender) {
        kresko = _kresko;
        kiss = _kiss;
        uniswapRouter = ISwapRouter(_uniswapRouter);
        wrappedNative = IWETH9(_wrappedNative);
    }

    function rescue(address _token, uint256 _amount, address _receiver) external onlyOwner {
        if (_token == address(0)) payable(_receiver).transfer(_amount);
        IERC20(_token).transfer(_receiver, _amount);
    }

    function execute(Operation[] calldata ops, bytes calldata rsPayload) external payable returns (Result[] memory results) {
        unchecked {
            results = new Result[](ops.length);
            for (uint256 i; i < ops.length; i++) {
                Operation memory op = ops[i];

                if (op.data.tokensInMode != TokensInMode.None) {
                    op.data.amountIn = uint96(_handleTokensIn(op));
                    results[i].tokenIn = op.data.tokenIn;
                    results[i].amountIn = op.data.amountIn;
                } else {
                    if (op.data.tokenIn != address(0)) {
                        revert TOKENS_IN_MODE_WAS_NONE_BUT_ADDRESS_NOT_ZERO(op.action, op.data.tokenIn);
                    }
                }

                if (op.data.tokensOutMode != TokensOutMode.None) {
                    results[i].tokenOut = op.data.tokenOut;
                    if (op.data.tokensOutMode == TokensOutMode.ReturnToSender) {
                        results[i].amountOut = IERC20(op.data.tokenOut).balanceOf(msg.sender);
                    } else if (op.data.tokensOutMode == TokensOutMode.ReturnToSenderNative) {
                        results[i].amountOut = msg.sender.balance;
                    } else {
                        results[i].amountOut = IERC20(op.data.tokenOut).balanceOf(address(this));
                    }
                } else {
                    if (op.data.tokenOut != address(0)) {
                        revert TOKENS_OUT_MODE_WAS_NONE_BUT_ADDRESS_NOT_ZERO(op.action, op.data.tokenOut);
                    }
                }

                (bool success, bytes memory returndata) = _handleOp(op, rsPayload);
                if (!success) _handleRevert(returndata);

                if (
                    op.data.tokensInMode != TokensInMode.None &&
                    op.data.tokensInMode != TokensInMode.UseContractBalanceExactAmountIn
                ) {
                    uint256 balanceAfter = IERC20(op.data.tokenIn).balanceOf(address(this));
                    if (balanceAfter != 0 && balanceAfter <= results[i].amountIn) {
                        results[i].amountIn = results[i].amountIn - balanceAfter;
                    }
                }

                if (op.data.tokensOutMode != TokensOutMode.None) {
                    uint256 balanceAfter = IERC20(op.data.tokenOut).balanceOf(address(this));
                    if (op.data.tokensOutMode == TokensOutMode.ReturnToSender) {
                        _handleTokensOut(op, balanceAfter);
                        results[i].amountOut = IERC20(op.data.tokenOut).balanceOf(msg.sender) - results[i].amountOut;
                    } else if (op.data.tokensOutMode == TokensOutMode.ReturnToSenderNative) {
                        _handleTokensOut(op, balanceAfter);
                        results[i].amountOut = msg.sender.balance - results[i].amountOut;
                    } else {
                        results[i].amountOut = balanceAfter - results[i].amountOut;
                    }
                }
            }

            _handleFinished(ops);
        }
    }

    function _handleTokensIn(Operation memory _op) internal returns (uint256 amountIn) {
        uint256 nativeAmount = msg.value;
        if (_op.data.tokensInMode == TokensInMode.Native) {
            if (nativeAmount == 0) {
                revert ZERO_NATIVE_IN(_op.action);
            }

            if (address(wrappedNative) != _op.data.tokenIn) {
                revert INVALID_NATIVE_TOKEN_IN(_op.action, _op.data.tokenIn, wrappedNative.symbol());
            }

            wrappedNative.deposit{value: nativeAmount}();
            return nativeAmount;
        }
        if (nativeAmount != 0) {
            revert VALUE_NOT_ZERO(_op.action, nativeAmount);
        }

        IERC20 token = IERC20(_op.data.tokenIn);

        // Pull tokens from sender
        if (_op.data.tokensInMode == TokensInMode.PullFromSender) {
            if (_op.data.amountIn == 0) revert ZERO_AMOUNT_IN(_op.action, _op.data.tokenIn, token.symbol());
            if (token.allowance(msg.sender, address(this)) < _op.data.amountIn)
                revert NO_ALLOWANCE(_op.action, _op.data.tokenIn, token.symbol());
            token.transferFrom(msg.sender, address(this), _op.data.amountIn);
            return _op.data.amountIn;
        }

        // Use contract balance for tokens in
        if (_op.data.tokensInMode == TokensInMode.UseContractBalance) {
            return token.balanceOf(address(this));
        }

        // Use amountIn for tokens in, eg. MinterRepay allows this.
        if (_op.data.tokensInMode == TokensInMode.UseContractBalanceExactAmountIn) return _op.data.amountIn;

        revert INVALID_ACTION(_op.action);
    }

    function _handleTokensOut(Operation memory _op, uint256 balance) internal {
        if (_op.data.tokensOutMode == TokensOutMode.ReturnToSenderNative) {
            wrappedNative.withdraw(balance);
            payable(msg.sender).transfer(balance);
            return;
        }

        // Transfer tokens to sender
        IERC20 tokenOut = IERC20(_op.data.tokenOut);
        if (balance != 0) {
            tokenOut.transfer(msg.sender, balance);
        }
    }

    /// @notice Send all op tokens and native to sender
    function _handleFinished(Operation[] memory _ops) internal {
        for (uint256 i; i < _ops.length; i++) {
            Operation memory _op = _ops[i];

            // Transfer any tokenIns to sender
            if (_op.data.tokenIn != address(0)) {
                IERC20 tokenIn = IERC20(_op.data.tokenIn);
                uint256 bal = tokenIn.balanceOf(address(this));
                if (bal != 0) {
                    tokenIn.transfer(msg.sender, bal);
                }
            }

            // Transfer any tokenOuts to sender
            if (_op.data.tokenOut != address(0)) {
                IERC20 tokenOut = IERC20(_op.data.tokenOut);
                uint256 bal = tokenOut.balanceOf(address(this));
                if (bal != 0) {
                    tokenOut.transfer(msg.sender, bal);
                }
            }
        }

        // Transfer native to sender
        if (address(this).balance > 0) payable(msg.sender).transfer(address(this).balance);
    }

    function _approve(address _token, uint256 _amount, address spender) internal {
        if (_amount > 0) {
            IERC20(_token).approve(spender, _amount);
        }
    }

    function _handleOp(
        Operation memory _op,
        bytes calldata rsPayload
    ) internal returns (bool success, bytes memory returndata) {
        address receiver = _op.data.tokensOutMode == TokensOutMode.ReturnToSender ? msg.sender : address(this);
        if (_op.action == Action.MinterDeposit) {
            _approve(_op.data.tokenIn, _op.data.amountIn, address(kresko));
            return
                kresko.call(
                    abi.encodePacked(
                        abi.encodeCall(
                            IMinterDepositWithdrawFacet.depositCollateral,
                            (msg.sender, _op.data.tokenIn, _op.data.amountIn)
                        ),
                        rsPayload
                    )
                );
        } else if (_op.action == Action.MinterWithdraw) {
            return
                kresko.call(
                    abi.encodePacked(
                        abi.encodeCall(
                            IMinterDepositWithdrawFacet.withdrawCollateral,
                            (msg.sender, _op.data.tokenOut, _op.data.amountOut, _op.data.index, receiver)
                        ),
                        rsPayload
                    )
                );
        } else if (_op.action == Action.MinterRepay) {
            return
                kresko.call(
                    abi.encodePacked(
                        abi.encodeCall(
                            IMinterBurnFacet.burnKreskoAsset,
                            (msg.sender, _op.data.tokenIn, _op.data.amountIn, _op.data.index, receiver)
                        ),
                        rsPayload
                    )
                );
        } else if (_op.action == Action.MinterBorrow) {
            return
                kresko.call(
                    abi.encodePacked(
                        abi.encodeCall(
                            IMinterMintFacet.mintKreskoAsset,
                            (msg.sender, _op.data.tokenOut, _op.data.amountOut, receiver)
                        ),
                        rsPayload
                    )
                );
        } else if (_op.action == Action.SCDPDeposit) {
            _approve(_op.data.tokenIn, _op.data.amountIn, address(kresko));
            return
                kresko.call(
                    abi.encodePacked(
                        abi.encodeCall(ISCDPFacet.depositSCDP, (msg.sender, _op.data.tokenIn, _op.data.amountIn)),
                        rsPayload
                    )
                );
        } else if (_op.action == Action.SCDPTrade) {
            _approve(_op.data.tokenIn, _op.data.amountIn, address(kresko));
            return
                kresko.call(
                    abi.encodePacked(
                        abi.encodeCall(
                            ISCDPSwapFacet.swapSCDP,
                            (receiver, _op.data.tokenIn, _op.data.tokenOut, _op.data.amountIn, _op.data.amountOutMin)
                        ),
                        rsPayload
                    )
                );
        } else if (_op.action == Action.SCDPWithdraw) {
            return
                kresko.call(
                    abi.encodePacked(
                        abi.encodeCall(ISCDPFacet.withdrawSCDP, (msg.sender, _op.data.tokenOut, _op.data.amountOut, receiver)),
                        rsPayload
                    )
                );
        } else if (_op.action == Action.SCDPClaim) {
            return
                kresko.call(
                    abi.encodePacked(
                        abi.encodeCall(ISCDPFacet.claimFeesSCDP, (msg.sender, _op.data.tokenOut, receiver)),
                        rsPayload
                    )
                );
        } else if (_op.action == Action.SynthWrap) {
            _approve(_op.data.tokenIn, _op.data.amountIn, _op.data.tokenOut);
            IKreskoAsset(_op.data.tokenOut).wrap(receiver, _op.data.amountIn);
            return (true, "");
        } else if (_op.action == Action.SynthUnwrap) {
            _approve(_op.data.tokenIn, _op.data.amountIn, _op.data.tokenIn);
            IKreskoAsset(_op.data.tokenIn).unwrap(receiver, _op.data.amountIn, false);
            return (true, "");
        } else if (_op.action == Action.VaultDeposit) {
            _approve(_op.data.tokenIn, _op.data.amountIn, kiss);
            IVaultExtender(kiss).vaultDeposit(_op.data.tokenIn, _op.data.amountIn, receiver);
            return (true, "");
        } else if (_op.action == Action.VaultRedeem) {
            _approve(kiss, _op.data.amountIn, kiss);
            IVaultExtender(kiss).vaultRedeem(_op.data.tokenOut, _op.data.amountIn, receiver, address(this));
            return (true, "");
        } else if (_op.action == Action.AMMExactInput) {
            IERC20(_op.data.tokenIn).transfer(address(uniswapRouter), _op.data.amountIn);
            if (
                uniswapRouter.exactInput(
                    ISwapRouter.ExactInputParams({
                        path: _op.data.path,
                        recipient: receiver,
                        amountIn: 0,
                        amountOutMinimum: _op.data.amountOutMin
                    })
                ) == 0
            ) {
                revert ZERO_OR_INVALID_AMOUNT_IN(
                    _op.action,
                    _op.data.tokenOut,
                    IERC20(_op.data.tokenOut).symbol(),
                    IERC20(_op.data.tokenOut).balanceOf(address(this)),
                    _op.data.amountOutMin
                );
            }
            return (true, "");
        } else {
            revert INVALID_ACTION(_op.action);
        }
    }

    function _handleRevert(bytes memory data) internal pure {
        assembly {
            revert(add(32, data), mload(data))
        }
    }

    receive() external payable {}

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
        AMMExactInput
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

    error TOKENS_IN_MODE_WAS_NONE_BUT_ADDRESS_NOT_ZERO(Action action, address token);
    error TOKENS_OUT_MODE_WAS_NONE_BUT_ADDRESS_NOT_ZERO(Action action, address token);
}
