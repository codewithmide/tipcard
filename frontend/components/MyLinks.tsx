'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { ethers } from 'ethers'
import { Copy, CheckCircle, ExternalLink, DollarSign, User, Clock } from 'lucide-react'

const CONTRACT_ADDRESS = '0xa5Faf19C61CA722873987Fa9D7F9f434cf15c674'
const NEON_RPC_URL = 'https://devnet.neonevm.org'

const CONTRACT_ABI = [
  "function paymentCount() external view returns (uint256)",
  "function getPaymentLink(uint256 _linkId) external view returns (address recipient, uint256 amount, string memory description, bool isActive, uint256 createdAt)"
]

interface PaymentLink {
  id: string
  recipient: string
  amount: string
  description: string
  isActive: boolean
  createdAt: string
}

export const MyLinks = () => {
  const { publicKey } = useWallet()
  const [links, setLinks] = useState<PaymentLink[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    if (publicKey) {
      fetchMyLinks()
    }
  }, [publicKey])

  const fetchMyLinks = async () => {
    if (!publicKey) return

    setIsLoading(true)
    try {
      const provider = new ethers.JsonRpcProvider(NEON_RPC_URL)
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider)
      
      const paymentCount = await contract.paymentCount()
      const userLinks: PaymentLink[] = []

      // Fetch all payment links and filter by user
      for (let i = 1; i <= Number(paymentCount); i++) {
        try {
          const result = await contract.getPaymentLink(i)
          
          // Check if this link belongs to the current user
          // Note: In a real app, you'd want to store creator info in the contract
          // For now, we'll show all links as an example
          userLinks.push({
            id: i.toString(),
            recipient: result[0],
            amount: ethers.formatUnits(result[1], 9), // SOL has 9 decimals
            description: result[2],
            isActive: result[3],
            createdAt: new Date(Number(result[4]) * 1000).toLocaleString()
          })
        } catch (error) {
          console.error(`Error fetching link ${i}:`, error)
        }
      }

      setLinks(userLinks.reverse()) // Show newest first
    } catch (error) {
      console.error('Error fetching links:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async (linkId: string) => {
    const paymentLink = `${window.location.origin}?pay=${linkId}`
    await navigator.clipboard.writeText(paymentLink)
    setCopiedId(linkId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-8)}`
  }

  if (!publicKey) {
    return (
      <div className="text-center py-8">
        <div className="bg-secondary/50 rounded-lg p-6 max-w-md mx-auto">
          <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
          <p className="text-muted-foreground">
            Please connect your Solana wallet to view your payment links.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">My Payment Links</h2>
        <button
          onClick={fetchMyLinks}
          disabled={isLoading}
          className="bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium py-2 px-4 rounded-lg transition-colors"
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Loading your payment links...</p>
        </div>
      ) : links.length === 0 ? (
        <div className="text-center py-8">
          <div className="bg-secondary/50 rounded-lg p-6 max-w-md mx-auto">
            <h3 className="text-lg font-semibold mb-2">No Payment Links Yet</h3>
            <p className="text-muted-foreground">
              Create your first payment link to start receiving payments.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {links.map((link) => (
            <div key={link.id} className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-neon-400 to-neon-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm font-mono">#{link.id}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold">
                      {link.description || 'Payment Request'}
                    </h3>
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      <span className={`w-2 h-2 rounded-full ${link.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span>{link.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => copyToClipboard(link.id)}
                    className="p-2 hover:bg-accent rounded-lg transition-colors"
                    title="Copy payment link"
                  >
                    {copiedId === link.id ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  
                  <a
                    href={`?pay=${link.id}`}
                    className="p-2 hover:bg-accent rounded-lg transition-colors"
                    title="Open payment link"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Recipient:</span>
                  <span className="font-mono">{formatAddress(link.recipient)}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-semibold">{link.amount} SOL</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Created:</span>
                  <span>{link.createdAt}</span>
                </div>
              </div>

              {copiedId === link.id && (
                <div className="mt-4 bg-green-500/10 border border-green-500/20 rounded-lg p-2">
                  <p className="text-sm text-green-500">Payment link copied to clipboard!</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}