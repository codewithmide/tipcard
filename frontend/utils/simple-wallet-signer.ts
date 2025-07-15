import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { SignerWalletAdapter } from '@solana/wallet-adapter-base'

const SOLANA_RPC_URL = 'https://api.devnet.solana.com'

export class SimpleWalletSigner {
  private connection: Connection

  constructor() {
    this.connection = new Connection(SOLANA_RPC_URL, 'confirmed')
  }

  /**
   * Check if wallet has enough SOL for transaction fees
   */
  async checkSOLBalance(publicKey: PublicKey): Promise<{ balance: number, hasEnough: boolean }> {
    try {
      const balance = await this.connection.getBalance(publicKey)
      const balanceSOL = balance / LAMPORTS_PER_SOL
      
      // Need at least 0.001 SOL for transaction fees
      const minRequired = 0.001
      const hasEnough = balanceSOL >= minRequired
      
      return { balance: balanceSOL, hasEnough }
    } catch (error) {
      console.error('Error checking SOL balance:', error)
      return { balance: 0, hasEnough: false }
    }
  }

  /**
   * Create a simple SOL transfer transaction that can be signed by wallet
   */
  async createSOLTransfer(
    wallet: SignerWalletAdapter,
    fromPubkey: PublicKey,
    toPubkey: PublicKey,
    amountSOL: number
  ): Promise<{ signature: string; success: boolean }> {
    if (!wallet.signTransaction) {
      throw new Error('Wallet does not support transaction signing')
    }

    try {
      // Check balance first
      const { balance, hasEnough } = await this.checkSOLBalance(fromPubkey)
      
      if (!hasEnough) {
        throw new Error(`Insufficient SOL balance. You have ${balance.toFixed(4)} SOL but need at least 0.001 SOL for fees. Please add SOL to your wallet.`)
      }

      const amountLamports = Math.floor(amountSOL * LAMPORTS_PER_SOL)
      
      // Check if we have enough for the transfer + fees
      const totalNeeded = amountLamports + 5000 // 5000 lamports for fees
      const balanceLamports = balance * LAMPORTS_PER_SOL
      
      if (balanceLamports < totalNeeded) {
        throw new Error(`Insufficient SOL for transfer. You have ${balance.toFixed(4)} SOL but need ${(totalNeeded / LAMPORTS_PER_SOL).toFixed(4)} SOL (including fees).`)
      }

      // Create transaction
      const transaction = new Transaction()
      
      // Add transfer instruction
      transaction.add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports: amountLamports,
        })
      )

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.lastValidBlockHeight = lastValidBlockHeight
      transaction.feePayer = fromPubkey

      console.log('Transaction created, requesting signature from wallet...')
      
      // Sign transaction with wallet
      const signedTransaction = await wallet.signTransaction(transaction)
      
      console.log('Transaction signed, sending to network...')
      
      // Send transaction
      const signature = await this.connection.sendRawTransaction(
        signedTransaction.serialize(),
        {
          skipPreflight: false,
          preflightCommitment: 'processed',
        }
      )

      console.log('Transaction sent, waiting for confirmation...')
      
      // Wait for confirmation
      const confirmation = await this.connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      })

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${confirmation.value.err}`)
      }

      console.log('Transaction confirmed!')
      
      return { signature, success: true }
      
    } catch (error) {
      console.error('Error creating SOL transfer:', error)
      throw error
    }
  }

  /**
   * Get SOL balance for display
   */
  async getSOLBalance(publicKey: PublicKey): Promise<number> {
    try {
      const balance = await this.connection.getBalance(publicKey)
      return balance / LAMPORTS_PER_SOL
    } catch (error) {
      console.error('Error getting SOL balance:', error)
      return 0
    }
  }

  /**
   * Request SOL airdrop for testing (devnet only)
   */
  async requestAirdrop(publicKey: PublicKey): Promise<{ signature: string; success: boolean }> {
    try {
      console.log('Requesting SOL airdrop...')
      
      const signature = await this.connection.requestAirdrop(
        publicKey,
        LAMPORTS_PER_SOL // 1 SOL
      )

      console.log('Airdrop requested, waiting for confirmation...')
      
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash()
      
      await this.connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      })

      console.log('Airdrop confirmed!')
      
      return { signature, success: true }
      
    } catch (error) {
      console.error('Error requesting airdrop:', error)
      throw new Error('Failed to request airdrop. Please try again or use a faucet.')
    }
  }
}