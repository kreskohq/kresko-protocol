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

interface ISwapRouter {
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInput(ExactInputParams memory params) external returns (uint256 amountOut);
}

// solhint-disable avoid-low-level-calls, code-complexity
contract KrMulticall {
    struct Op {
        OpAction action;
        OpData data;
    }

    struct OpData {
        address tokenIn;
        address tokenOut;
        uint96 amountIn;
        uint96 amountOut;
        uint128 amountOutMin;
        uint128 index;
        uint256 deadline;
        bytes path;
    }

    struct OpResult {
        address tokenIn;
        uint256 amountIn;
        address tokenOut;
        uint256 amountOut;
    }

    enum OpAction {
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

    error NoAllowance(OpAction action, address token, string symbol);
    error ZeroAmountIn(OpAction action, address token, string symbol);
    error ZeroOrInvalidAmountOut(OpAction action, address token, string symbol, uint256 balance, uint256 amountOut);
    error InvalidOpAction(OpAction action);

    address public kresko;
    address public kiss;
    ISwapRouter public uniswapRouter;

    constructor(address _kresko, address _kiss, address _uniswapRouter) {
        kresko = _kresko;
        kiss = _kiss;
        uniswapRouter = ISwapRouter(_uniswapRouter);
    }

    function execute(Op[] calldata ops, bytes calldata rsPayload) external payable returns (OpResult[] memory results) {
        unchecked {
            results = new OpResult[](ops.length);
            for (uint256 i; i < ops.length; i++) {
                Op calldata op = ops[i];

                if (op.data.tokenIn != address(0)) {
                    IERC20 tokenIn = IERC20(op.data.tokenIn);
                    results[i].tokenIn = op.data.tokenIn;

                    uint256 balIn = tokenIn.balanceOf(msg.sender);
                    _pullTokenIn(op);
                    results[i].amountIn = balIn - tokenIn.balanceOf(msg.sender);
                }

                if (op.data.tokenOut != address(0)) {
                    results[i].tokenOut = op.data.tokenOut;
                    results[i].amountOut = IERC20(op.data.tokenOut).balanceOf(msg.sender);
                }

                (bool success, bytes memory returndata) = _handleOp(ops[i], rsPayload);
                if (!success) _handleRevert(returndata);

                _sendTokens(op);

                if (op.data.tokenOut != address(0)) {
                    uint256 balanceAfter = IERC20(op.data.tokenOut).balanceOf(msg.sender);
                    if (balanceAfter >= results[i].amountOut) {
                        results[i].amountOut = balanceAfter - results[i].amountOut;
                    }
                }
            }
        }
    }

    function _pullTokenIn(Op calldata _op) internal {
        IERC20 token = IERC20(_op.data.tokenIn);
        if (_op.data.amountIn > 0) {
            if (token.allowance(msg.sender, address(this)) < _op.data.amountIn)
                revert NoAllowance(_op.action, _op.data.tokenIn, token.symbol());

            token.transferFrom(msg.sender, address(this), _op.data.amountIn);
        } else {
            revert ZeroAmountIn(_op.action, _op.data.tokenIn, token.symbol());
        }
    }

    function _sendTokens(Op calldata _op) internal {
        if (address(this).balance > 0) payable(msg.sender).transfer(address(this).balance);

        if (_op.data.tokenIn != address(0)) {
            IERC20 tokenIn = IERC20(_op.data.tokenIn);
            uint256 bal = tokenIn.balanceOf(address(this));
            if (bal != 0) {
                tokenIn.transfer(msg.sender, bal);
            }
        }

        if (_op.data.tokenOut != address(0)) {
            IERC20 tokenOut = IERC20(_op.data.tokenOut);
            uint256 balance = tokenOut.balanceOf(address(this));
            if (balance != 0) {
                tokenOut.transfer(msg.sender, balance);
            }
        }
    }

    function _approve(address _token, uint256 _amount, address spender) internal {
        if (_amount > 0) {
            IERC20(_token).approve(spender, _amount);
        }
    }

    function _handleOp(Op calldata _op, bytes calldata rsPayload) internal returns (bool success, bytes memory returndata) {
        if (_op.action == OpAction.MinterDeposit) {
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
        } else if (_op.action == OpAction.MinterWithdraw) {
            return
                kresko.call(
                    abi.encodePacked(
                        abi.encodeCall(
                            IMinterDepositWithdrawFacet.withdrawCollateral,
                            (msg.sender, _op.data.tokenOut, _op.data.amountOut, _op.data.index)
                        ),
                        rsPayload
                    )
                );
        } else if (_op.action == OpAction.MinterRepay) {
            return
                kresko.call(
                    abi.encodePacked(
                        abi.encodeCall(
                            IMinterBurnFacet.burnKreskoAsset,
                            (msg.sender, _op.data.tokenIn, _op.data.amountIn, _op.data.index)
                        ),
                        rsPayload
                    )
                );
        } else if (_op.action == OpAction.MinterBorrow) {
            return
                kresko.call(
                    abi.encodePacked(
                        abi.encodeCall(IMinterMintFacet.mintKreskoAsset, (msg.sender, _op.data.tokenOut, _op.data.amountOut)),
                        rsPayload
                    )
                );
        } else if (_op.action == OpAction.SCDPDeposit) {
            _approve(_op.data.tokenIn, _op.data.amountIn, address(kresko));
            return
                kresko.call(
                    abi.encodePacked(
                        abi.encodeCall(ISCDPFacet.depositSCDP, (msg.sender, _op.data.tokenIn, _op.data.amountIn)),
                        rsPayload
                    )
                );
        } else if (_op.action == OpAction.SCDPTrade) {
            _approve(_op.data.tokenIn, _op.data.amountIn, address(kresko));
            return
                kresko.call(
                    abi.encodePacked(
                        abi.encodeCall(
                            ISCDPSwapFacet.swapSCDP,
                            (msg.sender, _op.data.tokenIn, _op.data.tokenOut, _op.data.amountIn, _op.data.amountOutMin)
                        ),
                        rsPayload
                    )
                );
        } else if (_op.action == OpAction.SCDPWithdraw) {
            return
                kresko.call(
                    abi.encodePacked(
                        abi.encodeCall(
                            ISCDPFacet.withdrawSCDP,
                            (msg.sender, _op.data.tokenOut, _op.data.amountOut, msg.sender)
                        ),
                        rsPayload
                    )
                );
        } else if (_op.action == OpAction.SCDPClaim) {
            return
                kresko.call(
                    abi.encodePacked(abi.encodeCall(ISCDPFacet.claimFeesSCDP, (msg.sender, _op.data.tokenOut)), rsPayload)
                );
        } else if (_op.action == OpAction.SynthWrap) {
            IKreskoAsset(_op.data.tokenOut).wrap(msg.sender, _op.data.amountIn);
            return (true, "");
        } else if (_op.action == OpAction.SynthUnwrap) {
            IKreskoAsset(_op.data.tokenIn).unwrap(_op.data.amountIn, false);
            return (true, "");
        } else if (_op.action == OpAction.VaultDeposit) {
            _approve(_op.data.tokenIn, _op.data.amountIn, kiss);
            IVaultExtender(kiss).vaultDeposit(_op.data.tokenIn, _op.data.amountIn, msg.sender);
            return (true, "");
        } else if (_op.action == OpAction.VaultRedeem) {
            _approve(kiss, _op.data.amountIn, kiss);
            IVaultExtender(kiss).vaultRedeem(_op.data.tokenOut, _op.data.amountIn, msg.sender, msg.sender);
            return (true, "");
        } else if (_op.action == OpAction.AMMExactInput) {
            _approve(address(uniswapRouter), _op.data.amountIn, _op.data.tokenIn);
            if (
                uniswapRouter.exactInput(
                    ISwapRouter.ExactInputParams({
                        path: _op.data.path,
                        recipient: msg.sender,
                        deadline: _op.data.deadline,
                        amountIn: _op.data.amountIn,
                        amountOutMinimum: _op.data.amountOutMin
                    })
                ) == 0
            ) {
                revert ZeroOrInvalidAmountOut(
                    _op.action,
                    _op.data.tokenOut,
                    IERC20(_op.data.tokenOut).symbol(),
                    IERC20(_op.data.tokenOut).balanceOf(address(this)),
                    _op.data.amountOutMin
                );
            }
            return (true, "");
        } else {
            revert InvalidOpAction(_op.action);
        }
    }

    function _handleRevert(bytes memory data) internal pure {
        assembly {
            revert(add(32, data), mload(data))
        }
    }
}
