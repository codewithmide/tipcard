'use client'

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useWallet } from '@solana/wallet-adapter-react'
import { Link, ExternalLink } from 'lucide-react'

export const Header = () => {
  const { publicKey } = useWallet()

  return (
    <header className="bg-card border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-neon-400 to-neon-600 rounded-lg flex items-center justify-center">
              <Link className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold">TipCard</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <a
              href="https://neonevm.org"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>Powered by Neon EVM</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            
            <WalletMultiButton />
          </div>
        </div>
        
        {publicKey && (
          <div className="mt-2 text-sm text-muted-foreground">
            Connected: {publicKey.toBase58().slice(0, 8)}...{publicKey.toBase58().slice(-8)}
          </div>
        )}
      </div>
    </header>
  )
}