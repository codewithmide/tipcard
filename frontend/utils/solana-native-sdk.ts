import { NeonProxyRpcApi, createBalanceAccountInstruction } from '@neonevm/solana-sign'
import { Connection, PublicKey, Keypair } from '@solana/web3.js'
import { ethers } from 'ethers'
import bs58 from 'bs58'

const NEON_RPC_URL = 'https://devnet.neonevm.org/sol'
const SOLANA_RPC_URL = 'https://api.devnet.solana.com'

export class SolanaNativeSDK {
  private proxyApi: NeonProxyRpcApi
  private connection: Connection

  constructor() {
    this.proxyApi = new NeonProxyRpcApi(NEON_RPC_URL)
    this.connection = new Connection(SOLANA_RPC_URL, 'confirmed')
  }

  /**
   * Create a scheduled Neon EVM transaction using Solana Native SDK
   * Note: This requires a full keypair, not just a wallet adapter
   */
  async createScheduledTransaction(
    keypair: Keypair,
    contractAddress: string,
    contractABI: string[],
    functionName: string,
    functionArgs: any[]
  ) {
    try {
      // Initialize Solana user with Neon EVM mapping
      const { chainId, solanaUser } = await this.proxyApi.init(keypair)
      
      // Check SOL balance
      if (await this.connection.getBalance(solanaUser.publicKey) === 0) {
        throw new Error('Insufficient SOL balance for transaction fees')
      }

      // Get current nonce
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
        solanaPayer: solanaUser.publicKey,
        transactions: [transactionData]
      })
      
      // Create scheduled transaction
      const { scheduledTransaction } = await this.proxyApi.createScheduledTransaction({
        transactionGas,
        transactionData,
        nonce
      })

      // Check if balance account exists, if not create it
      const account = await this.connection.getAccountInfo(solanaUser.balanceAddress)
      if (account === null) {
        scheduledTransaction.instructions.unshift(
          createBalanceAccountInstruction(
            solanaUser.neonEvmProgram, 
            solanaUser.publicKey, 
            solanaUser.neonWallet, 
            chainId
          )
        )
      }

      // Get latest blockhash and sign transaction
      const { blockhash } = await this.connection.getLatestBlockhash()
      scheduledTransaction.recentBlockhash = blockhash
      scheduledTransaction.sign({ 
        publicKey: solanaUser.publicKey, 
        secretKey: keypair.secretKey 
      })
      
      // Send the signed transaction
      const signature = await this.connection.sendRawTransaction(scheduledTransaction.serialize())
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
        linkId: signature // Use Solana signature as link ID for now
      }
      
    } catch (error) {
      console.error('Error creating scheduled transaction:', error)
      throw error
    }
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

  /**
   * Create a keypair from base58 private key
   * WARNING: Only use this for development/testing
   */
  static createKeypairFromPrivateKey(privateKeyBase58: string): Keypair {
    const privateKeyBytes = bs58.decode(privateKeyBase58)
    return Keypair.fromSecretKey(privateKeyBytes)
  }
}