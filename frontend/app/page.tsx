'use client'

import { useState } from 'react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { MyLinks } from '@/components/MyLinks'
import { SimplePaymentLink } from '@/components/SimplePaymentLink'
import { SimplePaymentProcessor } from '@/components/SimplePaymentProcessor'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'create' | 'pay' | 'history'>('create')

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-neon-400 to-neon-600 bg-clip-text text-transparent">
              TipCard
            </h1>
            <p className="text-lg text-muted-foreground">
              Create instant crypto payment links powered by Neon EVM and Solana
            </p>
          </div>

          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex space-x-1 mb-6 overflow-x-auto">
              <button
                onClick={() => setActiveTab('create')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'create'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                Create Payment Link
              </button>
              <button
                onClick={() => setActiveTab('pay')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'pay'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                Pay
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'history'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                History
              </button>
            </div>

            {activeTab === 'create' && <SimplePaymentLink />}
            {activeTab === 'pay' && <SimplePaymentProcessor />}
            {activeTab === 'history' && <MyLinks />}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}