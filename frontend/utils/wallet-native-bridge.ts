import { NeonProxyRpcApi, createBalanceAccountInstruction } from '@neonevm/solana-sign'
import { Connection, PublicKey, Transaction, Keypair, SystemProgram } from '@solana/web3.js'
import { SignerWalletAdapter } from '@solana/wallet-adapter-base'
import { ethers } from 'ethers'

const NEON_RPC_URL = 'https://devnet.neonevm.org'
const SOLANA_RPC_URL = 'https://api.devnet.solana.com'

export class WalletNativeBridge {
  private proxyApi: NeonProxyRpcApi
  private connection: Connection

  constructor() {
    this.proxyApi = new NeonProxyRpcApi(NEON_RPC_URL)
    this.connection = new Connection(SOLANA_RPC_URL, 'confirmed')
  }

  /**
   * Create a scheduled Neon EVM transaction using wallet adapter signing
   * This approach doesn't require private keys - only wallet signing
   */
  async createScheduledTransactionWithWallet(
    wallet: SignerWalletAdapter,
    publicKey: PublicKey,
    contractAddress: string,
    contractABI: string[],
    functionName: string,
    functionArgs: any[]
  ) {
    if (!wallet.signTransaction) {
      throw new Error('Wallet does not support transaction signing')
    }

    try {
      // Create a temporary keypair for SDK initialization
      // The actual signing will be done by the wallet
      const tempKeypair = Keypair.generate()
      
      // Initialize with temp keypair to get Neon mapping
      const { chainId, solanaUser } = await this.proxyApi.init(tempKeypair)
      
      // Override the publicKey with the actual wallet's public key
      const actualSolanaUser = {
        ...solanaUser,
        publicKey: publicKey,
        balanceAddress: this.deriveBalanceAddress(publicKey, solanaUser.neonEvmProgram, chainId)
      }
      
      // Check SOL balance
      if (await this.connection.getBalance(publicKey) === 0) {
        throw new Error('Insufficient SOL balance for transaction fees')
      }

      // Get current nonce for the derived Neon wallet
      const nonce = Number(await this.proxyApi.getTransactionCount(solanaUser.neonWallet))
      
      // Prepare transaction data
      const contractInterface = new ethers.Interface(contractABI)
      const transactionData = {
        from: solanaUser.neonWallet,
        to: contractAddress,
        data: contractInterface.encodeFunctionData(functionName, functionArgs)
      }

      // Estimate gas for the scheduled transaction
      const transactionGas = await this.proxyApi.estimateScheduledTransactionGas({
        solanaPayer: publicKey,
        transactions: [transactionData]
      })
      
      // Create scheduled transaction
      const { scheduledTransaction } = await this.proxyApi.createScheduledTransaction({
        transactionGas,
        transactionData,
        nonce
      })

      // Check if balance account exists, if not create it
      const account = await this.connection.getAccountInfo(actualSolanaUser.balanceAddress)
      if (account === null) {
        scheduledTransaction.instructions.unshift(
          createBalanceAccountInstruction(
            actualSolanaUser.neonEvmProgram, 
            publicKey, 
            solanaUser.neonWallet, 
            chainId
          )
        )
      }

      // Get latest blockhash
      const { blockhash } = await this.connection.getLatestBlockhash()
      scheduledTransaction.recentBlockhash = blockhash
      scheduledTransaction.feePayer = publicKey
      
      // Sign with wallet adapter (this is the key part - wallet signs, not exposing private key)
      const signedTransaction = await wallet.signTransaction(scheduledTransaction)
      
      // Send the signed transaction
      const signature = await this.connection.sendRawTransaction(signedTransaction.serialize())
      console.log('Scheduled transaction signature:', signature)

      // Wait for Neon EVM execution
      console.log('Awaiting transaction finalization on Neon EVM...')
      await this.asyncTimeout(60000) // Wait 60 seconds

      // Get Neon EVM transaction hash
      const response = await fetch(NEON_RPC_URL, {
        method: 'POST',
        body: JSON.stringify({
          "method": "neon_getTransactionBySenderNonce",
          "params": [solanaUser.neonWallet, nonce],
          "id": 1,
          "jsonrpc": "2.0"
        }),
        headers: { 'Content-Type': 'application/json' }
      })
      
      const result = await response.json()
      
      return {
        solanaSignature: signature,
        neonTxHash: result.result?.hash,
        neonWallet: solanaUser.neonWallet,
        linkId: signature
      }
      
    } catch (error) {
      console.error('Error creating scheduled transaction:', error)
      throw error
    }
  }

  /**
   * Create a simple SOL transfer that demonstrates wallet signing
   * This is a fallback approach that shows the signing pattern
   */
  async createSOLTransferWithWallet(
    wallet: SignerWalletAdapter,
    publicKey: PublicKey,
    recipient: PublicKey,
    amountLamports: number
  ) {
    if (!wallet.signTransaction) {
      throw new Error('Wallet does not support transaction signing')
    }

    try {
      // Create a simple SOL transfer transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipient,
          lamports: amountLamports,
        })
      )

      // Get latest blockhash
      const { blockhash } = await this.connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = publicKey

      // Sign with wallet
      const signedTransaction = await wallet.signTransaction(transaction)
      
      // Send transaction
      const signature = await this.connection.sendRawTransaction(signedTransaction.serialize())
      
      return { signature }
    } catch (error) {
      console.error('Error creating SOL transfer:', error)
      throw error
    }
  }

  private deriveBalanceAddress(publicKey: PublicKey, neonEvmProgram: PublicKey, chainId: number): PublicKey {
    // This is a simplified version - in reality, you'd need the exact derivation logic
    // from the Neon SDK for the balance account PDA
    const seeds = [
      Buffer.from('balance'),
      publicKey.toBuffer(),
      Buffer.from(chainId.toString())
    ]
    
    const [balanceAddress] = PublicKey.findProgramAddressSync(seeds, neonEvmProgram)
    return balanceAddress
  }

  private async asyncTimeout(timeout: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(), timeout)
    })
  }

  /**
   * Convert Solana address to bytes32 format for contract
   */
  static solanaToBytes32(solanaAddress: string): string {
    try {
      const publicKey = new PublicKey(solanaAddress)
      const publicKeyBytes = publicKey.toBytes()
      return '0x' + Buffer.from(publicKeyBytes).toString('hex')
    } catch (error) {
      throw new Error('Invalid Solana address')
    }
  }
}