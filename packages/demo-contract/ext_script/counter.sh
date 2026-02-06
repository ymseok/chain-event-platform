#!/bin/bash

# Script: counter.sh
# Description: Test script for invoking Counter contract operations in the Anvil test environment
# Purpose: Facilitates testing of SetNumber and Increment events by simulating blockchain transactions on a local Anvil instance
# Usage: ./counter.sh setnumber [value] | ./counter.sh increment
# Environment: Anvil (local Ethereum development environment)
# Dependencies: Anvil CLI, contract deployment artifacts
# Note: This script is intended for development and testing purposes only

PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
RPC_URL="http://127.0.0.1:8545"
CONTRACT_ADDRESS="0x0116686e2291dbd5e317f47fadbfb43b599786ef"

case "$1" in
  setnumber)
    NUMBER="${2:-42}"
    echo "Setting number to $NUMBER..."
    cast send $CONTRACT_ADDRESS \
      "setNumber(uint256)" $NUMBER \
      --rpc-url $RPC_URL \
      --private-key $PRIVATE_KEY
    ;;
  increment)
    echo "Incrementing number..."
    cast send $CONTRACT_ADDRESS \
      "increment()" \
      --rpc-url $RPC_URL \
      --private-key $PRIVATE_KEY
    ;;
  *)
    echo "Usage: $0 {setnumber [value]|increment}"
    echo ""
    echo "Commands:"
    echo "  setnumber [value]  Set the counter to a specific value (default: 42)"
    echo "  increment          Increment the counter by 1"
    exit 1
    ;;
esac
