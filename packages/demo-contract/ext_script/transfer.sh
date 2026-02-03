#!/bin/bash

# Script: transfer.sh
# Description: Test script for invoking token transfer operations in the Anvil test environment
# Purpose: Facilitates testing of transfer functionality by simulating blockchain transactions on a local Anvil instance
# Usage: ./transfer.sh
# Environment: Anvil (local Ethereum development environment)
# Dependencies: Anvil CLI, contract deployment artifacts
# Note: This script is intended for development and testing purposes only

# This script transfers 1 ETH from the demo contract to a specified recipient address.

PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
RPC_URL="http://127.0.0.1:8545"
CONTRACT_ADDRESS="0x5FbDB2315678afecb367f032d93F642f64180aa3"
RECIPIENT_ADDRESS="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
AMOUNT="1000000000000000000" # 1 ETH in wei 

cast send $CONTRACT_ADDRESS \
"transfer(address,uint256)" $RECIPIENT_ADDRESS $AMOUNT \
--rpc-url $RPC_URL \
--private-key $PRIVATE_KEY