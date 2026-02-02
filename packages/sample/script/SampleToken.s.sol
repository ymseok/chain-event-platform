// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {SampleToken} from "../src/SampleToken.sol";

contract SampleTokenScript is Script {
    // 기본 설정값
    string public constant TOKEN_NAME = "Sample Token";
    string public constant TOKEN_SYMBOL = "SAMPLE";
    uint256 public constant INITIAL_SUPPLY = 1_000_000 ether; // 1,000,000 tokens

    function setUp() public {}

    function run() public {
        // 환경변수에서 private key 로드
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deployer address:", deployer);
        console.log("Deployer balance:", deployer.balance);

        vm.startBroadcast(deployerPrivateKey);

        SampleToken token = new SampleToken(TOKEN_NAME, TOKEN_SYMBOL, INITIAL_SUPPLY);

        console.log("SampleToken deployed at:", address(token));
        console.log("Token name:", token.name());
        console.log("Token symbol:", token.symbol());
        console.log("Total supply:", token.totalSupply());
        console.log("Owner balance:", token.balanceOf(deployer));

        vm.stopBroadcast();
    }

    /// @notice 커스텀 파라미터로 배포
    function runWithParams(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        SampleToken token = new SampleToken(name, symbol, initialSupply);

        console.log("SampleToken deployed at:", address(token));

        vm.stopBroadcast();
    }
}
