#!/bin/bash

export RUST_BACKTRACE=1
export RUST_LOG=debug
export SUI_MAINNET_BINARY=sui_mainnet
export SUI_TESTNET_BINARY=sui_testnet

playmove-api
