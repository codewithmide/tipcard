#!/bin/bash

# ========== CONFIG ==========
TOKEN_MINT="Ejmc1UB4EsES5fEcM8h5bFu4xZ7x3DphUE2D5mtzXXGA" # USDC devnet token (change if needed)
RECIPIENT_WALLET=$1                                      # Pass recipient wallet address as argument
AMOUNT=$2                                                 # Amount to mint (e.g., 1000)

# ========== CHECKS ==========
if [ -z "$RECIPIENT_WALLET" ] || [ -z "$AMOUNT" ]; then
  echo "Usage: ./mint-usdc-devnet.sh <recipient-wallet> <amount>"
  exit 1
fi

# ========== CREATE TOKEN ACCOUNT FOR RECIPIENT ==========
echo "Creating token account for recipient..."
RECIPIENT_TOKEN_ACCOUNT=$(spl-token create-account $TOKEN_MINT --owner $RECIPIENT_WALLET --output json | jq -r '.account')

# ========== MINT TOKENS ==========
echo "Minting $AMOUNT USDC tokens to $RECIPIENT_WALLET ($RECIPIENT_TOKEN_ACCOUNT)..."
spl-token mint $TOKEN_MINT $AMOUNT $RECIPIENT_TOKEN_ACCOUNT

# ========== DONE ==========
echo "Mint complete. Use Solana explorer to verify."
