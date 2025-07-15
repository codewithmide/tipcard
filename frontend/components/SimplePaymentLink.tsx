'use client'

import { useState, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { Copy, CheckCircle, Link, DollarSign, Shield, Users, Coins, AlertCircle, Zap } from 'lucide-react'
import { SimpleWalletSigner } from '@/utils/simple-wallet-signer'
import { solanaTipCardContract } from '@/utils/contract'
import { PublicKey } from '@solana/web3.js'

export const SimplePaymentLink = () => {
  const { publicKey, wallet } = useWallet()
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [isFlexible, setIsFlexible] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [createdLink, setCreatedLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [solBalance, setSolBalance] = useState<number>(0)
  const [checkingBalance, setCheckingBalance] = useState(false)
  const [txResults, setTxResults] = useState<any>(null)

  const signer = new SimpleWalletSigner()

  // Check SOL balance when wallet connects
  useEffect(() => {
    if (publicKey) {
      checkBalance()
    }
  }, [publicKey])

  const checkBalance = async () => {
    if (!publicKey) return
    
    setCheckingBalance(true)
    try {
      const balance = await signer.getSOLBalance(publicKey)
      setSolBalance(balance)
    } catch (error) {
      console.error('Error checking balance:', error)
    } finally {
      setCheckingBalance(false)
    }
  }

  const requestAirdrop = async () => {
    if (!publicKey) return
    
    setIsLoading(true)
    try {
      const result = await signer.requestAirdrop(publicKey)
      if (result.success) {
        alert('Airdrop successful! Check your wallet balance.')
        checkBalance()
      }
    } catch (error) {
      alert(`Airdrop failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateLink = async () => {
    if (!publicKey || !wallet?.adapter) return

    // For flexible links, amount can be empty
    if (!isFlexible && !amount) {
      alert('Please enter an amount for fixed payment links')
      return
    }

    setIsLoading(true)
    try {
      // Check SOL balance first
      const { balance, hasEnough } = await signer.checkSOLBalance(publicKey)
      
      if (!hasEnough) {
        alert(`Insufficient SOL balance. You have ${balance.toFixed(4)} SOL but need at least 0.001 SOL for transaction fees. Please add SOL to your wallet or use the airdrop button.`)
        return
      }

      // Connect wallet to contract (for Neon EVM integration)
      if (wallet.adapter.publicKey && (window as any).ethereum) {
        await solanaTipCardContract.connectWallet((window as any).ethereum)
      } else {
        alert('Please connect a wallet that supports both Solana and EVM (like Metamask with Neon).')
        return
      }

      const amountValue = amount ? parseFloat(amount) : 0
      
      // Create payment link using the actual smart contract
      const result = await solanaTipCardContract.createPaymentLink(
        amountValue,
        isFlexible,
        description || 'Payment request'
      )
      
      // Create shareable payment link
      const paymentLink = solanaTipCardContract.createPaymentURL(result.linkId)
      
      setCreatedLink(paymentLink)
      setTxResults({
        type: 'contract_link',
        linkId: result.linkId,
        txHash: result.txHash,
        creator: publicKey.toBase58(),
        amount: amountValue,
        isFlexible,
        description: description || 'Payment request'
      })
      
      // Reset form
      setAmount('')
      setDescription('')
      
    } catch (error) {
      console.error('Error creating payment link:', error)
      alert(`Failed to create payment link: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async () => {
    if (createdLink) {
      await navigator.clipboard.writeText(createdLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!publicKey) {
    return (
      <div className="text-center py-8">
        <div className="bg-secondary/50 rounded-lg p-6 max-w-md mx-auto">
          <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
          <p className="text-muted-foreground">
            Please connect your Solana wallet to create payment links.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Balance Check */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-blue-500" />
            <span className="font-medium text-blue-500">SOL Balance</span>
          </div>
          <button
            onClick={checkBalance}
            disabled={checkingBalance}
            className="text-blue-500 hover:text-blue-400 text-sm"
          >
            {checkingBalance ? 'Checking...' : 'Refresh'}
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-lg font-semibold">
            {solBalance.toFixed(4)} SOL
          </span>
          {solBalance < 0.001 && (
            <button
              onClick={requestAirdrop}
              disabled={isLoading}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
            >
              Get Test SOL
            </button>
          )}
        </div>
        {solBalance < 0.001 && (
          <p className="text-xs text-red-500 mt-1">
            ⚠️ Insufficient SOL for transaction fees. Use "Get Test SOL" button.
          </p>
        )}
      </div>

      {/* How it works */}
      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-2">
          <Users className="w-5 h-5 text-green-500" />
          <span className="font-medium text-green-500">How Payment Links Work</span>
        </div>
        <div className="text-sm text-green-600 dark:text-green-400 space-y-1">
          <p>• <strong>You create</strong> a payment link for people to pay YOU</p>
          <p>• <strong>Anyone with the link</strong> can send SOL to your wallet</p>
          <p>• <strong>You receive</strong> all payments directly: {publicKey.toBase58().slice(0, 8)}...{publicKey.toBase58().slice(-8)}</p>
        </div>
      </div>

      {/* Payment Type Selection */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Payment Type
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={() => setIsFlexible(true)}
              className={`p-4 rounded-lg border text-left transition-colors ${
                isFlexible
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card hover:bg-accent'
              }`}
            >
              <div className="flex items-center space-x-2 mb-1">
                <Coins className="w-5 h-5" />
                <span className="font-medium">Flexible Amount</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Payers can choose how much to send
              </p>
            </button>
            
            <button
              onClick={() => setIsFlexible(false)}
              className={`p-4 rounded-lg border text-left transition-colors ${
                !isFlexible
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card hover:bg-accent'
              }`}
            >
              <div className="flex items-center space-x-2 mb-1">
                <DollarSign className="w-5 h-5" />
                <span className="font-medium">Fixed Amount</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Set a specific amount to request
              </p>
            </button>
          </div>
        </div>

        {/* Amount Input */}
        {!isFlexible && (
          <div>
            <label className="block text-sm font-medium mb-2">
              Amount (SOL) *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                step="0.001"
                className="w-full p-3 pl-10 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              This exact amount will be requested from payers
            </p>
          </div>
        )}

        {isFlexible && (
          <div>
            <label className="block text-sm font-medium mb-2">
              Suggested Amount (SOL) - Optional
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00 (optional)"
                step="0.001"
                className="w-full p-3 pl-10 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Payers will see this as a suggestion but can pay any amount
            </p>
          </div>
        )}

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this payment for? (e.g., 'Coffee tip', 'Support my work', 'Invoice #123')"
            rows={3}
            className="w-full p-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
          <p className="text-xs text-muted-foreground mt-1">
            This helps payers understand what they're paying for
          </p>
        </div>
      </div>

      {/* Create Button */}
      <button
        onClick={handleCreateLink}
        disabled={(!isFlexible && !amount) || isLoading || solBalance < 0.001}
        className="w-full bg-primary hover:bg-primary/80 disabled:bg-primary/50 text-primary-foreground font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Creating Payment Link...</span>
          </>
        ) : (
          <>
            <Link className="w-5 h-5" />
            <span>Create My Payment Link</span>
          </>
        )}
      </button>

      {/* Transaction Results */}
      {txResults && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="font-medium text-green-500">Payment Link Created!</span>
          </div>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Creator:</span>
              <span className="font-mono text-xs block break-all">{txResults.creator}</span>
            </div>
            {txResults.linkId && (
              <div>
                <span className="text-muted-foreground">Link ID:</span>
                <span className="font-mono text-xs block break-all">{txResults.linkId}</span>
              </div>
            )}
            {txResults.txHash && (
              <div>
                <span className="text-muted-foreground">Transaction:</span>
                <span className="font-mono text-xs block break-all">{txResults.txHash}</span>
              </div>
            )}
            <div className="pt-2 border-t border-green-500/20">
              <span className="text-muted-foreground">Payment Settings:</span>
              <span className="text-xs block">
                {txResults.isFlexible ? 'Flexible amount' : `Fixed ${txResults.amount} SOL`} • 
                {txResults.description ? ` "${txResults.description}"` : ' No description'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Created Link */}
      {createdLink && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Link className="w-5 h-5 text-blue-500" />
            <span className="font-medium text-blue-500">Share Your Payment Link</span>
          </div>
          <div className="bg-secondary rounded-lg p-3 mb-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono break-all">{createdLink}</span>
              <button
                onClick={copyToClipboard}
                className="ml-2 p-1 hover:bg-accent rounded"
              >
                {copied ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
            <p>✅ Anyone with this link can send SOL to your wallet</p>
            <p>✅ Payments go directly to: {publicKey.toBase58().slice(0, 8)}...{publicKey.toBase58().slice(-8)}</p>
            <p>✅ Powered by SolanaTipCard smart contract on Neon EVM</p>
          </div>
        </div>
      )}
    </div>
  )
}