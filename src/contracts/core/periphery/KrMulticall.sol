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
import {ISwapRouter, IKrMulticall} from "periphery/IKrMulticall.sol";
import {IPyth} from "vendor/pyth/IPyth.sol";
import {BurnArgs, MintArgs, SCDPWithdrawArgs, SwapArgs, WithdrawArgs} from "common/Args.sol";

// solhint-disable avoid-low-level-calls, code-complexity

/**
 * @title KrMulticall
 * @notice Executes some number of supported operations one after another.
 * @notice Any operation can specify the mode for tokens in and out:
 * Specifically this means that if any operation leaves tokens in the contract, the next one can use them.
 * @notice All tokens left in the contract after operations will be returned to the sender at the end.
 */
contract KrMulticall is IKrMulticall, Ownable {
    address public kresko;
    address public kiss;
    IPyth public pythEp;
    ISwapRouter public v3Router;
    IWETH9 public wNative;

    constructor(address _kresko, address _kiss, address _v3Router, address _wNative, address _pythEp) Ownable(msg.sender) {
        kresko = _kresko;
        kiss = _kiss;
        v3Router = ISwapRouter(_v3Router);
        wNative = IWETH9(_wNative);
        pythEp = IPyth(_pythEp);
    }

    function rescue(address _token, uint256 _amount, address _receiver) external onlyOwner {
        if (_token == address(0)) payable(_receiver).transfer(_amount);
        IERC20(_token).transfer(_receiver, _amount);
    }

    function execute(
        Operation[] calldata ops,
        bytes[] calldata _updateData
    ) external payable returns (Result[] memory results) {
        uint256 _updateFee = pythEp.getUpdateFee(_updateData);
        if (msg.value < _updateFee) {
            revert INSUFFICIENT_UPDATE_FEE(msg.value, _updateFee);
        }
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

                (bool success, bytes memory returndata) = _handleOp(op, _updateData, _updateFee);
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
        if (_op.data.tokensInMode == TokensInMode.Native) {
            if (msg.value == 0) {
                revert ZERO_NATIVE_IN(_op.action);
            }

            if (address(wNative) != _op.data.tokenIn) {
                revert INVALID_NATIVE_TOKEN_IN(_op.action, _op.data.tokenIn, wNative.symbol());
            }

            wNative.deposit{value: msg.value}();
            return msg.value;
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
            wNative.withdraw(balance);
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
        bytes[] calldata _updateData,
        uint256 _updateFee
    ) internal returns (bool success, bytes memory returndata) {
        bool isReturn = _op.data.tokensOutMode == TokensOutMode.ReturnToSender;
        address receiver = isReturn ? msg.sender : address(this);
        if (_op.action == Action.MinterDeposit) {
            _approve(_op.data.tokenIn, _op.data.amountIn, address(kresko));
            return
                kresko.call(
                    abi.encodeCall(
                        IMinterDepositWithdrawFacet.depositCollateral,
                        (msg.sender, _op.data.tokenIn, _op.data.amountIn)
                    )
                );
        } else if (_op.action == Action.MinterWithdraw) {
            return
                kresko.call{value: _updateFee}(
                    abi.encodeCall(
                        IMinterDepositWithdrawFacet.withdrawCollateral,
                        (WithdrawArgs(msg.sender, _op.data.tokenOut, _op.data.amountOut, _op.data.index, receiver), _updateData)
                    )
                );
        } else if (_op.action == Action.MinterRepay) {
            return
                kresko.call{value: _updateFee}(
                    abi.encodeCall(
                        IMinterBurnFacet.burnKreskoAsset,
                        (BurnArgs(msg.sender, _op.data.tokenIn, _op.data.amountIn, _op.data.index, receiver), _updateData)
                    )
                );
        } else if (_op.action == Action.MinterBorrow) {
            return
                kresko.call{value: _updateFee}(
                    abi.encodeCall(
                        IMinterMintFacet.mintKreskoAsset,
                        (MintArgs(msg.sender, _op.data.tokenOut, _op.data.amountOut, receiver), _updateData)
                    )
                );
        } else if (_op.action == Action.SCDPDeposit) {
            _approve(_op.data.tokenIn, _op.data.amountIn, address(kresko));
            return kresko.call(abi.encodeCall(ISCDPFacet.depositSCDP, (msg.sender, _op.data.tokenIn, _op.data.amountIn)));
        } else if (_op.action == Action.SCDPTrade) {
            _approve(_op.data.tokenIn, _op.data.amountIn, address(kresko));
            return
                kresko.call{value: _updateFee}(
                    abi.encodeCall(
                        ISCDPSwapFacet.swapSCDP,
                        (
                            SwapArgs(
                                receiver,
                                _op.data.tokenIn,
                                _op.data.tokenOut,
                                _op.data.amountIn,
                                _op.data.amountOutMin,
                                _updateData
                            )
                        )
                    )
                );
        } else if (_op.action == Action.SCDPWithdraw) {
            return
                kresko.call{value: _updateFee}(
                    abi.encodeCall(
                        ISCDPFacet.withdrawSCDP,
                        (SCDPWithdrawArgs(msg.sender, _op.data.tokenOut, _op.data.amountOut, receiver), _updateData)
                    )
                );
        } else if (_op.action == Action.SCDPClaim) {
            return kresko.call(abi.encodeCall(ISCDPFacet.claimFeesSCDP, (msg.sender, _op.data.tokenOut, receiver)));
        } else if (_op.action == Action.SynthWrap) {
            _approve(_op.data.tokenIn, _op.data.amountIn, _op.data.tokenOut);
            return _op.data.tokenOut.call(abi.encodeCall(IKreskoAsset.wrap, (receiver, _op.data.amountIn)));
        } else if (_op.action == Action.SynthwrapNative) {
            if (!IKreskoAsset(_op.data.tokenOut).wrappingInfo().nativeUnderlyingEnabled) {
                revert NATIVE_SYNTH_WRAP_NOT_ALLOWED(_op.action, _op.data.tokenOut, IKreskoAsset(_op.data.tokenOut).symbol());
            }

            return address(_op.data.tokenOut).call{value: _op.data.amountIn}("");
        } else if (_op.action == Action.SynthUnwrap) {
            _approve(_op.data.tokenIn, _op.data.amountIn, _op.data.tokenIn);
            return _op.data.tokenIn.call(abi.encodeCall(IKreskoAsset.unwrap, (receiver, _op.data.amountIn, false)));
        } else if (_op.action == Action.SynthUnwrapNative) {
            _approve(_op.data.tokenIn, _op.data.amountIn, _op.data.tokenIn);
            return _op.data.tokenIn.call(abi.encodeCall(IKreskoAsset.unwrap, (receiver, _op.data.amountIn, false)));
        } else if (_op.action == Action.VaultDeposit) {
            _approve(_op.data.tokenIn, _op.data.amountIn, kiss);
            return kiss.call(abi.encodeCall(IVaultExtender.vaultDeposit, (_op.data.tokenIn, _op.data.amountIn, receiver)));
        } else if (_op.action == Action.VaultRedeem) {
            _approve(kiss, _op.data.amountIn, kiss);
            return
                kiss.call(
                    abi.encodeCall(IVaultExtender.vaultRedeem, (_op.data.tokenOut, _op.data.amountIn, receiver, address(this)))
                );
        } else if (_op.action == Action.AMMExactInput) {
            IERC20(_op.data.tokenIn).transfer(address(v3Router), _op.data.amountIn);
            if (
                v3Router.exactInput(
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
}
