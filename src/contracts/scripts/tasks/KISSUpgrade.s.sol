// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import {Scripted} from "kresko-lib/utils/s/Scripted.s.sol";
import {KISS} from "kiss/KISS.sol";
import {ITransparentUpgradeableProxy} from "factory/TransparentUpgradeableProxy.sol";
import {ArbDeploy} from "kresko-lib/info/ArbDeploy.sol";

struct Diff {
    string kiss;
    string share;
    string diff;
}
struct Data {
    address account;
    string txHash;
    string kissBurn;
    string shareBurn;
    string diff;
    Diff bn;
}

struct Result {
    address account;
    uint256 amount;
}

contract Executor is ArbDeploy {
    Result[] _rows;
    bool public executed;
    constructor(Result[] memory data) {
        for (uint256 i; i < data.length; i++) {
            _rows.push(data[i]);
        }
    }
    function rows() external view returns (Result[] memory) {
        return _rows;
    }

    fallback() external {
        if (msg.sender != kissAddr) revert("sender");
        if (executed) revert("executed");

        for (uint256 i; i < _rows.length; i++) {
            kiss.issue(_rows[i].amount, _rows[i].account);
        }

        executed = true;
    }
}

contract KISSUpgrade is ArbDeploy, Scripted {
    Executor executor;

    function getMintData() internal view returns (Data[] memory, Result[] memory) {
        Data[] memory data = abi.decode(
            vm.parseJson(vm.readFile("./src/contracts/scripts/tasks/kiss-accounts.json")),
            (Data[])
        );

        Result[] memory results = new Result[](data.length);

        for (uint256 i; i < data.length; i++) {
            results[i] = Result(data[i].account, vm.parseUint(data[i].bn.diff));
        }

        return (data, results);
    }

    function setUp() public virtual {
        vm.createSelectFork("arbitrum", 243449523);
        useMnemonic("MNEMONIC");
    }

    function upgrade() public broadcasted(safe) {
        (, Result[] memory data) = getMintData();
        executor = Executor(
            factory
                .deployCreate2(abi.encodePacked(type(Executor).creationCode, abi.encode(data)), "", "kiss-fix")
                .implementation
        );
        factory.upgradeAndCall(
            ITransparentUpgradeableProxy(kissAddr),
            type(KISS).creationCode,
            abi.encodeCall(KISS.initializers, (address(executor)))
        );
    }
}
