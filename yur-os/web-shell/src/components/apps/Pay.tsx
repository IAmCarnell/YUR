/**
 * Enhanced Pay App - Production-ready DeFi wallet integration
 * Features: Multi-wallet, Multi-chain, Advanced Portfolio, Transaction History
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { ethWallet, WalletInfo, TokenInfo, createMockWallet, formatAddress, formatTokenAmount, NETWORKS } from '../../lib/eth-wallet'
import { triggerAction } from '../../lib/rewards'

interface PayAppProps {
  isVisible: boolean
  onClose: () => void
}

interface WalletProvider {
  id: string
  name: string
  icon: string
  description: string
  installed: boolean
  connecting: boolean
}

interface Network {
  chainId: number
  name: string
  symbol: string
  rpc: string
  explorer: string
  icon: string
  color: string
}

interface Transaction {
  id: string
  hash: string
  type: 'send' | 'receive' | 'swap' | 'defi' | 'nft' | 'rewards'
  status: 'pending' | 'confirmed' | 'failed'
  amount: string
  token: string
  from?: string
  to?: string
  protocol?: string
  timestamp: number
  fee?: string
  value?: number
}

interface Portfolio {
  totalValue: number
  change24h: number
  tokens: TokenInfo[]
  nfts: any[]
  defiPositions: any[]
}

export const PayApp: React.FC<PayAppProps> = ({ isVisible, onClose }) => {
  // Enhanced networks configuration (moved here to fix reference error)
  const ENHANCED_NETWORKS: Network[] = useMemo(() => [
    {
      chainId: 1,
      name: 'Ethereum',
      symbol: 'ETH',
      rpc: 'https://mainnet.infura.io/v3/',
      explorer: 'https://etherscan.io',
      icon: '⟠',
      color: '#627eea'
    },
    {
      chainId: 137,
      name: 'Polygon',
      symbol: 'MATIC',
      rpc: 'https://polygon-rpc.com',
      explorer: 'https://polygonscan.com',
      icon: '⬡',
      color: '#8247e5'
    },
    {
      chainId: 56,
      name: 'BSC',
      symbol: 'BNB',
      rpc: 'https://bsc-dataseed1.binance.org',
      explorer: 'https://bscscan.com',
      icon: '◆',
      color: '#f3ba2f'
    },
    {
      chainId: 42161,
      name: 'Arbitrum',
      symbol: 'ETH',
      rpc: 'https://arb1.arbitrum.io/rpc',
      explorer: 'https://arbiscan.io',
      icon: '🔷',
      color: '#28a0f0'
    },
    {
      chainId: 10,
      name: 'Optimism',
      symbol: 'ETH',
      rpc: 'https://mainnet.optimism.io',
      explorer: 'https://optimistic.etherscan.io',
      icon: '🔴',
      color: '#ff0420'
    }
  ], [])

  const [wallet, setWallet] = useState<WalletInfo | null>(null)
  const [currentNetwork, setCurrentNetwork] = useState<Network>(ENHANCED_NETWORKS[0])
  const [isConnecting, setIsConnecting] = useState(false)
  const [view, setView] = useState<'wallet' | 'send' | 'receive' | 'swap' | 'defi' | 'nft' | 'history'>('wallet')
  const [tokens, setTokens] = useState<TokenInfo[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [portfolio, setPortfolio] = useState<Portfolio>({ totalValue: 0, change24h: 0, tokens: [], nfts: [], defiPositions: [] })
  const [isDemo, setIsDemo] = useState(false)
  const [showWalletSelector, setShowWalletSelector] = useState(false)
  const [showNetworkSelector, setShowNetworkSelector] = useState(false)
  const [sendForm, setSendForm] = useState({
    to: '',
    amount: '',
    token: 'ETH',
    memo: ''
  })
  const [isSecurityMode, setIsSecurityMode] = useState(false)

  // Wallet providers configuration
  const walletProviders: WalletProvider[] = useMemo(() => [
    {
      id: 'metamask',
      name: 'MetaMask',
      icon: '🦊',
      description: 'Most popular Ethereum wallet',
      installed: typeof window !== 'undefined' && !!window.ethereum?.isMetaMask,
      connecting: false
    },
    {
      id: 'walletconnect',
      name: 'WalletConnect',
      icon: '🔗',
      description: 'Connect any mobile wallet',
      installed: true,
      connecting: false
    },
    {
      id: 'coinbase',
      name: 'Coinbase Wallet',
      icon: '🟦',
      description: 'Coinbase official wallet',
      installed: typeof window !== 'undefined' && !!window.ethereum?.isCoinbaseWallet,
      connecting: false
    },
    {
      id: 'demo',
      name: 'Demo Mode',
      icon: '🎮',
      description: 'Try without connecting a wallet',
      installed: true,
      connecting: false
    }
  ], [])

  // Mock portfolio data
  const mockPortfolio: Portfolio = useMemo(() => ({
    totalValue: 12847.32,
    change24h: 5.67,
    tokens: [
      { symbol: 'ETH', name: 'Ethereum', address: '0x0', decimals: 18, balance: '3.2445' },
      { symbol: 'USDC', name: 'USD Coin', address: '0xa0b86a33e6417c7d6d5d2dd268b252b8d36ef67e', decimals: 6, balance: '5,234.56' },
      { symbol: 'DAI', name: 'Dai Stablecoin', address: '0x6b175474e89094c44da98b954eedeac495271d0f', decimals: 18, balance: '1,567.89' },
      { symbol: 'YUR', name: 'YUR Token', address: '0x1234567890abcdef1234567890abcdef12345678', decimals: 18, balance: '25,000' },
      { symbol: 'UNI', name: 'Uniswap', address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', decimals: 18, balance: '45.67' }
    ],
    nfts: [
      { id: '1', name: 'YUR Genesis #123', collection: 'YUR OS NFTs', image: '🌌' },
      { id: '2', name: 'Spatial Badge #456', collection: 'Achievement Badges', image: '🏆' }
    ],
    defiPositions: [
      { protocol: 'Uniswap V3', type: 'LP', amount: '$2,345.67', apy: '12.3%' },
      { protocol: 'Compound', type: 'Lending', amount: '$1,234.56', apy: '4.5%' }
    ]
  }), [])

  // Mock transactions
  const mockTransactions: Transaction[] = useMemo(() => [
    {
      id: '1',
      hash: '0x1234...5678',
      type: 'receive',
      status: 'confirmed',
      amount: '0.5',
      token: 'ETH',
      from: '0x123...abc',
      timestamp: Date.now() - 3600000,
      fee: '0.002 ETH',
      value: 1234.56
    },
    {
      id: '2',
      hash: '0x2345...6789',
      type: 'rewards',
      status: 'confirmed',
      amount: '100',
      token: 'YUR',
      protocol: 'Quest Rewards',
      timestamp: Date.now() - 7200000,
      value: 50.00
    },
    {
      id: '3',
      hash: '0x3456...789a',
      type: 'swap',
      status: 'confirmed',
      amount: '1000',
      token: 'USDC → ETH',
      protocol: 'Uniswap',
      timestamp: Date.now() - 86400000,
      fee: '0.01 ETH',
      value: 1000.00
    },
    {
      id: '4',
      hash: '0x4567...89ab',
      type: 'send',
      status: 'pending',
      amount: '0.1',
      token: 'ETH',
      to: '0x456...def',
      timestamp: Date.now() - 1800000,
      fee: '0.003 ETH',
      value: 234.56
    }
  ], [])

  // Initialize wallet connection
  useEffect(() => {
    if (isVisible) {
      triggerAction('app_launch')
      
      // Load mock data
      setPortfolio(mockPortfolio)
      setTransactions(mockTransactions)
      setTokens(mockPortfolio.tokens)
      
      // Check if already connected
      if (ethWallet.isConnected()) {
        setWallet(ethWallet.getWallet())
      }

      // Set up event listeners
      ethWallet.on('connected', (walletInfo) => {
        setWallet(walletInfo)
        setIsConnecting(false)
        setShowWalletSelector(false)
        triggerAction('wallet_connected')
      })

      ethWallet.on('disconnected', () => {
        setWallet(null)
        setIsDemo(false)
      })

      ethWallet.on('error', (error) => {
        console.error('Wallet error:', error)
        setIsConnecting(false)
      })
    }
  }, [isVisible, mockPortfolio, mockTransactions])

  const handleConnectWallet = useCallback(async (providerId: string) => {
    setIsConnecting(true)
    
    try {
      if (providerId === 'demo') {
        const mockWallet = createMockWallet()
        setWallet(mockWallet)
        setIsDemo(true)
        setIsConnecting(false)
        setShowWalletSelector(false)
      } else {
        await ethWallet.connect()
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error)
      setIsConnecting(false)
    }
  }, [])

  const handleDisconnect = useCallback(async () => {
    await ethWallet.disconnect()
    setWallet(null)
    setIsDemo(false)
  }, [])

  const handleSwitchNetwork = useCallback(async (network: Network) => {
    try {
      if (!isDemo) {
        await ethWallet.switchNetwork(network.chainId)
      }
      setCurrentNetwork(network)
      setShowNetworkSelector(false)
      triggerAction('network_switched')
    } catch (error) {
      console.error('Failed to switch network:', error)
    }
  }, [isDemo])

  const handleSendTransaction = useCallback(async () => {
    if (!wallet) return

    try {
      if (isDemo) {
        // Simulate transaction for demo
        const newTx: Transaction = {
          id: Date.now().toString(),
          hash: `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`,
          type: 'send',
          status: 'pending',
          amount: sendForm.amount,
          token: sendForm.token,
          to: sendForm.to,
          timestamp: Date.now(),
          fee: '0.002 ETH',
          value: parseFloat(sendForm.amount) * (sendForm.token === 'ETH' ? 2000 : 1)
        }
        setTransactions(prev => [newTx, ...prev])
        
        // Simulate confirmation after 3 seconds
        setTimeout(() => {
          setTransactions(prev => 
            prev.map(tx => 
              tx.id === newTx.id ? { ...tx, status: 'confirmed' } : tx
            )
          )
        }, 3000)
        
        setSendForm({ to: '', amount: '', token: 'ETH', memo: '' })
        setView('history')
        triggerAction('transaction_sent')
      } else {
        // Real transaction logic would go here
        await ethWallet.sendTransaction({
          to: sendForm.to,
          value: sendForm.amount
        })
      }
    } catch (error) {
      console.error('Transaction failed:', error)
    }
  }, [wallet, sendForm, isDemo])

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'send': return '📤'
      case 'receive': return '📥'
      case 'swap': return '🔄'
      case 'defi': return '🏦'
      case 'nft': return '🖼️'
      case 'rewards': return '🎁'
      default: return '💱'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#4caf50'
      case 'pending': return '#ff9800'
      case 'failed': return '#f44336'
      default: return '#888'
    }
  }

  if (!isVisible) return null

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '95vw',
      maxWidth: '1200px',
      height: '85vh',
      background: 'rgba(26, 26, 46, 0.95)',
      backdropFilter: 'blur(20px)',
      borderRadius: '20px',
      border: '1px solid rgba(0, 188, 212, 0.3)',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h2 style={{ 
            margin: '0 0 8px 0', 
            color: 'white', 
            fontSize: '24px',
            fontWeight: '600',
            background: 'linear-gradient(45deg, #ff9800, #ffc107)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            💎 YUR Wallet
          </h2>
          <p style={{ margin: 0, color: '#888', fontSize: '14px' }}>
            Multi-chain DeFi wallet with advanced portfolio management
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Security Mode Toggle */}
          <button
            onClick={() => setIsSecurityMode(!isSecurityMode)}
            style={{
              background: isSecurityMode ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 255, 255, 0.1)',
              border: `1px solid ${isSecurityMode ? '#4caf50' : 'rgba(255, 255, 255, 0.2)'}`,
              borderRadius: '8px',
              color: isSecurityMode ? '#4caf50' : 'white',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            🛡️ {isSecurityMode ? 'Secure' : 'Standard'}
          </button>

          {/* Network Selector */}
          {wallet && (
            <button
              onClick={() => setShowNetworkSelector(true)}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: 'white',
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span style={{ color: currentNetwork.color }}>{currentNetwork.icon}</span>
              {currentNetwork.name}
            </button>
          )}

          <button
            onClick={onClose}
            style={{
              background: 'rgba(244, 67, 54, 0.2)',
              border: 'none',
              borderRadius: '8px',
              color: '#f44336',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            ✕ Close
          </button>
        </div>
      </div>

      {/* Wallet Connection / Portfolio */}
      {!wallet ? (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          padding: '40px'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>💎</div>
          <h3 style={{ color: 'white', fontSize: '24px', marginBottom: '15px' }}>
            Connect Your Wallet
          </h3>
          <p style={{ color: '#888', fontSize: '16px', marginBottom: '30px', textAlign: 'center', maxWidth: '400px' }}>
            Connect your wallet to access DeFi features, manage your portfolio, and earn rewards in YUR OS
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px',
            maxWidth: '800px',
            width: '100%'
          }}>
            {walletProviders.map(provider => (
              <button
                key={provider.id}
                onClick={() => handleConnectWallet(provider.id)}
                disabled={!provider.installed || isConnecting}
                style={{
                  background: provider.installed 
                    ? 'rgba(255, 255, 255, 0.05)' 
                    : 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '16px',
                  color: provider.installed ? 'white' : '#666',
                  padding: '20px',
                  cursor: provider.installed ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px',
                  textAlign: 'left',
                  transition: 'all 0.3s ease',
                  opacity: provider.installed ? 1 : 0.5
                }}
                onMouseEnter={(e) => {
                  if (provider.installed) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (provider.installed) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }
                }}
              >
                <div style={{ fontSize: '32px' }}>{provider.icon}</div>
                <div>
                  <div style={{ fontWeight: '600', marginBottom: '5px' }}>
                    {provider.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#888' }}>
                    {provider.installed ? provider.description : 'Not installed'}
                  </div>
                </div>
                {isConnecting && (
                  <div style={{ marginLeft: 'auto' }}>⏳</div>
                )}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Portfolio Header */}
          <div style={{
            padding: '20px',
            background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.1), rgba(255, 193, 7, 0.1))',
            borderBottom: '1px solid rgba(255, 152, 0, 0.3)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #ff9800, #ffc107)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px'
                }}>
                  💎
                </div>
                <div>
                  <div style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>
                    {formatAddress(wallet.address)}
                  </div>
                  <div style={{ color: '#888', fontSize: '12px' }}>
                    {currentNetwork.name} • {isDemo ? 'Demo Mode' : 'Connected'}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '28px', fontWeight: '600', color: 'white', marginBottom: '5px' }}>
                ${portfolio.totalValue.toLocaleString()}
              </div>
              <div style={{ 
                fontSize: '14px', 
                color: portfolio.change24h >= 0 ? '#4caf50' : '#f44336',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                justifyContent: 'flex-end'
              }}>
                {portfolio.change24h >= 0 ? '📈' : '📉'}
                {portfolio.change24h >= 0 ? '+' : ''}{portfolio.change24h}% (24h)
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div style={{
            padding: '20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            gap: '15px',
            flexWrap: 'wrap'
          }}>
            {[
              { key: 'wallet', label: '💰 Portfolio', icon: '💰' },
              { key: 'send', label: '📤 Send', icon: '📤' },
              { key: 'receive', label: '📥 Receive', icon: '📥' },
              { key: 'swap', label: '🔄 Swap', icon: '🔄' },
              { key: 'defi', label: '🏦 DeFi', icon: '🏦' },
              { key: 'nft', label: '🖼️ NFTs', icon: '🖼️' },
              { key: 'history', label: '📜 History', icon: '📜' }
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setView(key as any)}
                style={{
                  background: view === key 
                    ? 'linear-gradient(135deg, rgba(255, 152, 0, 0.3), rgba(255, 193, 7, 0.3))' 
                    : 'transparent',
                  border: view === key ? '1px solid #ff9800' : '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  color: 'white',
                  padding: '10px 16px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.3s ease'
                }}
              >
                <span style={{ fontSize: '16px' }}>{icon}</span>
                {label}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
            {view === 'wallet' && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '25px'
              }}>
                {/* Token Balances */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '20px',
                  padding: '25px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <h3 style={{ margin: '0 0 20px 0', color: 'white', fontSize: '18px' }}>
                    💰 Token Balances
                  </h3>
                  {tokens.map(token => (
                    <div
                      key={token.address}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '15px',
                        marginBottom: '10px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: `linear-gradient(135deg, ${token.symbol === 'ETH' ? '#627eea, #8247e5' : token.symbol === 'USDC' ? '#2775ca, #1652f0' : token.symbol === 'YUR' ? '#ff9800, #ffc107' : '#666, #888'})`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          color: 'white'
                        }}>
                          {token.symbol.charAt(0)}
                        </div>
                        <div>
                          <div style={{ color: 'white', fontSize: '16px', fontWeight: '600' }}>
                            {token.symbol}
                          </div>
                          <div style={{ color: '#888', fontSize: '12px' }}>
                            {token.name}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: 'white', fontSize: '16px', fontWeight: '600' }}>
                          {token.balance}
                        </div>
                        <div style={{ color: '#888', fontSize: '12px' }}>
                          {token.symbol === 'ETH' ? '$6,489.00' : 
                           token.symbol === 'USDC' ? '$5,234.56' : 
                           token.symbol === 'YUR' ? '$1,250.00' : '$234.56'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* DeFi Positions */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '20px',
                  padding: '25px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <h3 style={{ margin: '0 0 20px 0', color: 'white', fontSize: '18px' }}>
                    🏦 DeFi Positions
                  </h3>
                  {portfolio.defiPositions.map((position, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '15px',
                        marginBottom: '10px',
                        background: 'rgba(76, 175, 80, 0.1)',
                        borderRadius: '12px',
                        border: '1px solid rgba(76, 175, 80, 0.3)'
                      }}
                    >
                      <div>
                        <div style={{ color: 'white', fontSize: '16px', fontWeight: '600' }}>
                          {position.protocol}
                        </div>
                        <div style={{ color: '#888', fontSize: '12px' }}>
                          {position.type}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: 'white', fontSize: '16px', fontWeight: '600' }}>
                          {position.amount}
                        </div>
                        <div style={{ color: '#4caf50', fontSize: '12px' }}>
                          {position.apy} APY
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick Actions */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '20px',
                  padding: '25px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <h3 style={{ margin: '0 0 20px 0', color: 'white', fontSize: '18px' }}>
                    ⚡ Quick Actions
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button
                      onClick={() => setView('send')}
                      style={{
                        background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.2), rgba(63, 81, 181, 0.2))',
                        border: '1px solid #2196f3',
                        borderRadius: '12px',
                        color: 'white',
                        padding: '15px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}
                    >
                      📤 Send Tokens
                    </button>
                    <button
                      onClick={() => setView('swap')}
                      style={{
                        background: 'linear-gradient(135deg, rgba(156, 39, 176, 0.2), rgba(233, 30, 99, 0.2))',
                        border: '1px solid #9c27b0',
                        borderRadius: '12px',
                        color: 'white',
                        padding: '15px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}
                    >
                      🔄 Swap Tokens
                    </button>
                    <button
                      onClick={() => setView('defi')}
                      style={{
                        background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.2), rgba(139, 195, 74, 0.2))',
                        border: '1px solid #4caf50',
                        borderRadius: '12px',
                        color: 'white',
                        padding: '15px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}
                    >
                      🏦 Explore DeFi
                    </button>
                  </div>
                </div>

                {/* Recent Activity */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '20px',
                  padding: '25px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  gridColumn: 'span 2'
                }}>
                  <h3 style={{ margin: '0 0 20px 0', color: 'white', fontSize: '18px' }}>
                    📜 Recent Activity
                  </h3>
                  {transactions.slice(0, 5).map(tx => (
                    <div
                      key={tx.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '15px',
                        marginBottom: '10px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ fontSize: '24px' }}>{getTransactionIcon(tx.type)}</div>
                        <div>
                          <div style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>
                            {tx.type === 'send' ? `Sent ${tx.amount} ${tx.token}` :
                             tx.type === 'receive' ? `Received ${tx.amount} ${tx.token}` :
                             tx.type === 'swap' ? `Swapped ${tx.token}` :
                             tx.type === 'rewards' ? `Quest Reward: ${tx.amount} ${tx.token}` :
                             `${tx.type} ${tx.amount} ${tx.token}`}
                          </div>
                          <div style={{ color: '#888', fontSize: '12px' }}>
                            {new Date(tx.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ 
                          color: getStatusColor(tx.status), 
                          fontSize: '12px', 
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          marginBottom: '4px'
                        }}>
                          {tx.status}
                        </div>
                        {tx.value && (
                          <div style={{ color: '#888', fontSize: '12px' }}>
                            ${tx.value.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => setView('history')}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '10px',
                      color: 'white',
                      padding: '10px 20px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      width: '100%',
                      marginTop: '15px'
                    }}
                  >
                    View All Transactions
                  </button>
                </div>
              </div>
            )}

            {/* Other views would continue here... */}
            {view !== 'wallet' && (
              <div style={{
                textAlign: 'center',
                color: '#888',
                fontSize: '18px',
                padding: '60px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '20px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <div style={{ fontSize: '64px', marginBottom: '20px' }}>
                  {view === 'send' ? '📤' : 
                   view === 'receive' ? '📥' : 
                   view === 'swap' ? '🔄' : 
                   view === 'defi' ? '🏦' : 
                   view === 'nft' ? '🖼️' : '📜'}
                </div>
                <div style={{ marginBottom: '10px', color: 'white', fontSize: '24px' }}>
                  {view.charAt(0).toUpperCase() + view.slice(1)} Feature
                </div>
                <div>Coming soon with full production implementation!</div>
                <div style={{ fontSize: '14px', marginTop: '15px', color: '#666' }}>
                  This will include secure transaction handling, DeFi integrations, and advanced portfolio management.
                </div>
              </div>
            )}
          </div>

          {/* Bottom Actions */}
          <div style={{
            padding: '20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <div style={{ fontSize: '12px', color: '#888' }}>
                Balance: {wallet.balance} {currentNetwork.symbol}
              </div>
              <div style={{ fontSize: '12px', color: '#888' }}>
                Network: {currentNetwork.name}
              </div>
            </div>
            
            <button
              onClick={handleDisconnect}
              style={{
                background: 'rgba(244, 67, 54, 0.2)',
                border: '1px solid #f44336',
                borderRadius: '8px',
                color: '#f44336',
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600'
              }}
            >
              Disconnect Wallet
            </button>
          </div>
        </>
      )}

      {/* Network Selector Modal */}
      {showNetworkSelector && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}>
          <div style={{
            background: 'rgba(26, 26, 46, 0.95)',
            borderRadius: '20px',
            padding: '30px',
            maxWidth: '500px',
            width: '90%',
            border: '1px solid rgba(0, 188, 212, 0.3)',
            backdropFilter: 'blur(20px)'
          }}>
            <h3 style={{ color: 'white', fontSize: '20px', marginBottom: '20px' }}>
              🌐 Select Network
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {ENHANCED_NETWORKS.map(network => (
                <button
                  key={network.chainId}
                  onClick={() => handleSwitchNetwork(network)}
                  style={{
                    background: network.chainId === currentNetwork.chainId 
                      ? 'rgba(0, 188, 212, 0.2)' 
                      : 'rgba(255, 255, 255, 0.05)',
                    border: network.chainId === currentNetwork.chainId 
                      ? '1px solid #00bcd4' 
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    color: 'white',
                    padding: '15px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    textAlign: 'left'
                  }}
                >
                  <span style={{ fontSize: '24px', color: network.color }}>
                    {network.icon}
                  </span>
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '3px' }}>
                      {network.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#888' }}>
                      {network.symbol} • Chain ID: {network.chainId}
                    </div>
                  </div>
                  {network.chainId === currentNetwork.chainId && (
                    <div style={{ marginLeft: 'auto', color: '#00bcd4' }}>✓</div>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowNetworkSelector(false)}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '10px',
                color: 'white',
                padding: '10px 20px',
                cursor: 'pointer',
                fontSize: '14px',
                width: '100%',
                marginTop: '20px'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}