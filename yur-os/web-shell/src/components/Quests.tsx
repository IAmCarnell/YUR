/**
 * Enhanced Quests Component - Production-ready gamified reward system
 * Features: Leaderboards, Social Quests, NFT Badges, Viral Mechanics
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { rewardsSystem, Quest, Achievement, UserStats, triggerAction } from '../lib/rewards'

interface QuestsProps {
  isVisible: boolean
  onClose: () => void
}

interface LeaderboardEntry {
  id: string
  name: string
  level: number
  xp: number
  avatar: string
  badges: string[]
  streak: number
}

interface SocialQuest extends Quest {
  isViral: boolean
  participantCount: number
  shareBonus: number
  communityGoal?: {
    target: number
    current: number
    reward: {
      xp: number
      tokens: number
      badge?: string
    }
  }
}

interface Badge {
  id: string
  name: string
  description: string
  icon: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic'
  nftReady: boolean
  unlockedAt?: number
  attributes?: {
    power?: number
    luck?: number
    wisdom?: number
  }
}

export const Quests: React.FC<QuestsProps> = ({ isVisible, onClose }) => {
  const [userStats, setUserStats] = useState<UserStats>(rewardsSystem.getUserStats())
  const [activeQuests, setActiveQuests] = useState<Quest[]>(rewardsSystem.getActiveQuests())
  const [availableQuests, setAvailableQuests] = useState<Quest[]>(rewardsSystem.getAvailableQuests())
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null)
  const [view, setView] = useState<'overview' | 'active' | 'available' | 'leaderboard' | 'badges' | 'social'>('overview')
  const [notifications, setNotifications] = useState<string[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [badges, setBadges] = useState<Badge[]>([])
  const [socialQuests, setSocialQuests] = useState<SocialQuest[]>([])
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all')
  const [showShareModal, setShowShareModal] = useState<Quest | null>(null)

  // Mock data for production features
  const mockLeaderboard: LeaderboardEntry[] = useMemo(() => [
    { id: '1', name: 'SpatialMaster', level: 15, xp: 12500, avatar: '🌟', badges: ['🏆', '⚡', '🎯'], streak: 7 },
    { id: '2', name: 'VRExplorer', level: 12, xp: 9800, avatar: '🥽', badges: ['🗺️', '👑'], streak: 5 },
    { id: '3', name: 'CodeNinja', level: 11, xp: 8900, avatar: '💻', badges: ['🚀', '⭐'], streak: 12 },
    { id: '4', name: 'MandalaSeeker', level: 10, xp: 7500, avatar: '🌸', badges: ['🧘'], streak: 3 },
    { id: '5', name: 'You', level: userStats.level, xp: userStats.totalXp, avatar: '👤', badges: ['🔥'], streak: userStats.streakDays },
  ], [userStats])

  const mockBadges: Badge[] = useMemo(() => [
    {
      id: 'first-quest',
      name: 'Beginner Explorer',
      description: 'Complete your first quest in YUR OS',
      icon: '🏆',
      rarity: 'common',
      nftReady: true,
      unlockedAt: userStats.completedQuests > 0 ? Date.now() - 86400000 : undefined,
      attributes: { power: 1 }
    },
    {
      id: 'collaborator',
      name: 'Team Player',
      description: 'Participate in collaborative features',
      icon: '🤝',
      rarity: 'rare',
      nftReady: true,
      attributes: { wisdom: 2, luck: 1 }
    },
    {
      id: 'ar-pioneer',
      name: 'Reality Hacker',
      description: 'Master of augmented reality features',
      icon: '🥽',
      rarity: 'epic',
      nftReady: true,
      attributes: { power: 3, wisdom: 2 }
    },
    {
      id: 'viral-champion',
      name: 'Viral Champion',
      description: 'Shared YUR OS with 100+ people',
      icon: '🚀',
      rarity: 'legendary',
      nftReady: true,
      attributes: { luck: 5, power: 3, wisdom: 2 }
    },
    {
      id: 'mandala-master',
      name: 'Sacred Geometry Master',
      description: 'Unlock all fractal navigation secrets',
      icon: '🌌',
      rarity: 'mythic',
      nftReady: true,
      attributes: { power: 10, wisdom: 8, luck: 5 }
    }
  ], [userStats.completedQuests])

  const mockSocialQuests: SocialQuest[] = useMemo(() => [
    {
      id: 'viral-share',
      title: 'Spread the YUR Magic',
      description: 'Share YUR OS with friends and earn viral bonuses for each signup',
      category: 'collaboration',
      difficulty: 'easy',
      xpReward: 100,
      tokenReward: 50,
      isViral: true,
      participantCount: 1247,
      shareBonus: 25,
      requirements: [
        {
          type: 'social',
          target: 'referrals',
          value: 5,
          current: 0,
          description: 'Refer 5 friends to YUR OS'
        }
      ],
      progress: { currentStep: 0, totalSteps: 1, percentage: 0 },
      status: 'available',
      icon: '📱',
      communityGoal: {
        target: 10000,
        current: 7532,
        reward: {
          xp: 1000,
          tokens: 500,
          badge: 'Community Builder'
        }
      }
    },
    {
      id: 'global-collaboration',
      title: 'Global Collaboration Day',
      description: 'Join thousands of users in a worldwide collaborative session',
      category: 'collaboration',
      difficulty: 'medium',
      xpReward: 250,
      tokenReward: 100,
      isViral: true,
      participantCount: 4521,
      shareBonus: 0,
      requirements: [
        {
          type: 'social',
          target: 'collab_time',
          value: 30,
          current: 0,
          description: 'Collaborate for 30 minutes during the event'
        }
      ],
      progress: { currentStep: 0, totalSteps: 1, percentage: 0 },
      status: 'available',
      icon: '🌍',
      timeLimit: Date.now() + 86400000 // 24 hours
    }
  ], [])

  // Update stats and quests
  const refreshData = useCallback(() => {
    setUserStats(rewardsSystem.getUserStats())
    setActiveQuests(rewardsSystem.getActiveQuests())
    setAvailableQuests(rewardsSystem.getAvailableQuests())
    setLeaderboard(mockLeaderboard.sort((a, b) => b.xp - a.xp))
    setBadges(mockBadges)
    setSocialQuests(mockSocialQuests)
  }, [mockLeaderboard, mockBadges, mockSocialQuests])

  // Set up event listeners
  useEffect(() => {
    if (isVisible) {
      triggerAction('app_launch')

      const handleQuestStarted = (quest: Quest) => {
        setNotifications(prev => [
          ...prev, 
          `🎯 Quest started: ${quest.title}`,
          ...(quest.difficulty === 'epic' ? ['🎉 Epic quest! Double XP for completion!'] : [])
        ])
        refreshData()
      }

      const handleQuestCompleted = (quest: Quest) => {
        setNotifications(prev => [
          ...prev, 
          `✅ Quest completed: ${quest.title}! +${quest.xpReward} XP`,
          ...(quest.tokenReward ? [`💎 +${quest.tokenReward} tokens earned!`] : []),
          '🎊 Share your achievement for bonus rewards!'
        ])
        refreshData()
      }

      const handleLevelUp = ({ oldLevel, newLevel }: { oldLevel: number; newLevel: number }) => {
        setNotifications(prev => [
          ...prev, 
          `🎉 LEVEL UP! You are now level ${newLevel}!`,
          '🎁 New quests and badges unlocked!',
          '🚀 Share your progress to inspire others!'
        ])
        refreshData()
      }

      const handleAchievementUnlocked = (achievement: Achievement) => {
        setNotifications(prev => [
          ...prev, 
          `🏆 Achievement unlocked: ${achievement.title}!`,
          '💎 Badge earned! Check your collection.',
          '🌟 Mint as NFT for eternal glory!'
        ])
        refreshData()
      }

      rewardsSystem.on('questStarted', handleQuestStarted)
      rewardsSystem.on('questCompleted', handleQuestCompleted)
      rewardsSystem.on('levelUp', handleLevelUp)
      rewardsSystem.on('achievementUnlocked', handleAchievementUnlocked)

      refreshData()

      return () => {
        // Cleanup event listeners
      }
    }
  }, [isVisible, refreshData])

  // Clear notifications after some time
  useEffect(() => {
    if (notifications.length > 0) {
      const timer = setTimeout(() => {
        setNotifications(prev => prev.slice(1))
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [notifications])

  const handleStartQuest = (questId: string) => {
    rewardsSystem.startQuest(questId)
  }

  const handleShareQuest = (quest: Quest) => {
    setShowShareModal(quest)
  }

  const handleCloseShareModal = () => {
    setShowShareModal(null)
  }

  const handleShare = (platform: string, quest: Quest) => {
    const shareText = `🌌 Just started "${quest.title}" in YUR OS! Join me in this spatial computing adventure. #YUROS #SpatialComputing #Quests`
    const shareUrl = `https://yur-os.com/quest/${quest.id}`
    
    switch (platform) {
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`)
        break
      case 'discord':
        navigator.clipboard.writeText(`${shareText} ${shareUrl}`)
        setNotifications(prev => [...prev, '📋 Share link copied to clipboard!'])
        break
      case 'copy':
        navigator.clipboard.writeText(shareUrl)
        setNotifications(prev => [...prev, '📋 Quest link copied to clipboard!'])
        break
    }
    
    // Award sharing bonus
    triggerAction('share_quest')
    setNotifications(prev => [...prev, '🎁 +25 XP for sharing!'])
    handleCloseShareModal()
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '#4caf50'
      case 'medium': return '#ff9800'
      case 'hard': return '#f44336'
      case 'epic': return '#9c27b0'
      default: return '#888'
    }
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return '#888'
      case 'rare': return '#2196f3'
      case 'epic': return '#9c27b0'
      case 'legendary': return '#ff9800'
      case 'mythic': return '#f44336'
      default: return '#888'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'exploration': return '🗺️'
      case 'collaboration': return '🤝'
      case 'productivity': return '⚡'
      case 'learning': return '📚'
      case 'creativity': return '🎨'
      default: return '⭐'
    }
  }

  const filteredQuests = useMemo(() => {
    return availableQuests.filter(quest => {
      const matchesCategory = filterCategory === 'all' || quest.category === filterCategory
      const matchesDifficulty = filterDifficulty === 'all' || quest.difficulty === filterDifficulty
      return matchesCategory && matchesDifficulty
    })
  }, [availableQuests, filterCategory, filterDifficulty])

  if (!isVisible) return null

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '95vw',
      maxWidth: '1400px',
      height: '90vh',
      background: 'rgba(26, 26, 46, 0.95)',
      backdropFilter: 'blur(15px)',
      borderRadius: '20px',
      border: '1px solid rgba(0, 188, 212, 0.3)',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Notifications */}
      {notifications.map((notification, index) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(76, 175, 80, 0.9)',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '600',
            zIndex: 1001,
            transform: `translateY(${index * 70}px)`,
            animation: 'slideIn 0.3s ease-out',
            maxWidth: '300px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}
        >
          {notification}
        </div>
      ))}

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
            fontSize: '28px',
            fontWeight: '600',
            background: 'linear-gradient(45deg, #00bcd4, #ff9800)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            ⚡ YUR Quest Center
          </h2>
          <p style={{ margin: 0, color: '#888', fontSize: '14px' }}>
            Complete quests, earn rewards, and climb the leaderboard in the spatial metaverse
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{
            background: 'rgba(255, 152, 0, 0.2)',
            borderRadius: '20px',
            padding: '8px 16px',
            fontSize: '14px',
            color: '#ff9800',
            fontWeight: '600'
          }}>
            🔥 {userStats.streakDays} day streak
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            ✕ Close
          </button>
        </div>
      </div>

      {/* Enhanced User Stats Header */}
      <div style={{
        padding: '20px',
        background: 'linear-gradient(135deg, rgba(0, 188, 212, 0.1), rgba(255, 152, 0, 0.1))',
        borderBottom: '1px solid rgba(0, 188, 212, 0.3)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: `conic-gradient(#00bcd4 0deg, #00bcd4 ${(userStats.xp / userStats.xpToNextLevel) * 360}deg, rgba(255,255,255,0.2) ${(userStats.xp / userStats.xpToNextLevel) * 360}deg, rgba(255,255,255,0.2) 360deg)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            fontWeight: 'bold',
            color: 'white',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              inset: '4px',
              borderRadius: '50%',
              background: 'rgba(26, 26, 46, 0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {userStats.level}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '600', color: 'white', marginBottom: '4px' }}>
              Level {userStats.level} Explorer
            </div>
            <div style={{ fontSize: '14px', color: '#888', marginBottom: '8px' }}>
              {userStats.xp} / {userStats.xpToNextLevel} XP to next level
            </div>
            <div style={{
              background: 'rgba(0, 188, 212, 0.2)',
              borderRadius: '10px',
              height: '8px',
              width: '200px',
              overflow: 'hidden'
            }}>
              <div style={{
                background: 'linear-gradient(90deg, #00bcd4, #ff9800)',
                height: '100%',
                width: `${(userStats.xp / userStats.xpToNextLevel) * 100}%`,
                borderRadius: '10px',
                transition: 'width 0.5s ease'
              }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '40px', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#ffc107' }}>
              {userStats.tokens} 💎
            </div>
            <div style={{ fontSize: '12px', color: '#888' }}>Tokens</div>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#4caf50' }}>
              {userStats.completedQuests}
            </div>
            <div style={{ fontSize: '12px', color: '#888' }}>Completed</div>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#9c27b0' }}>
              {badges.filter(b => b.unlockedAt).length}
            </div>
            <div style={{ fontSize: '12px', color: '#888' }}>Badges</div>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#ff5722' }}>
              #{leaderboard.findIndex(l => l.name === 'You') + 1}
            </div>
            <div style={{ fontSize: '12px', color: '#888' }}>Rank</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap'
      }}>
        {[
          { key: 'overview', label: '📊 Overview', icon: '📊' },
          { key: 'active', label: '🎯 Active', count: activeQuests.length, icon: '🎯' },
          { key: 'available', label: '📋 Available', count: filteredQuests.length, icon: '📋' },
          { key: 'social', label: '🌍 Social', count: socialQuests.length, icon: '🌍' },
          { key: 'leaderboard', label: '🏆 Leaderboard', icon: '🏆' },
          { key: 'badges', label: '🎖️ Badges', count: badges.filter(b => b.unlockedAt).length, icon: '🎖️' }
        ].map(({ key, label, count, icon }) => (
          <button
            key={key}
            onClick={() => setView(key as any)}
            style={{
              background: view === key 
                ? 'linear-gradient(135deg, rgba(0, 188, 212, 0.3), rgba(255, 152, 0, 0.3))' 
                : 'transparent',
              border: view === key ? '1px solid #00bcd4' : '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              color: 'white',
              padding: '12px 18px',
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
            {count !== undefined && (
              <span style={{
                background: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                padding: '2px 8px',
                fontSize: '12px',
                minWidth: '20px',
                textAlign: 'center'
              }}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        {view === 'overview' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
            gap: '25px'
          }}>
            {/* Today's Challenges */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.1), rgba(139, 195, 74, 0.1))',
              borderRadius: '20px',
              padding: '25px',
              border: '1px solid rgba(76, 175, 80, 0.3)'
            }}>
              <h3 style={{ margin: '0 0 20px 0', color: '#4caf50', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>🎯</span>
                Today's Challenges
              </h3>
              {activeQuests.slice(0, 3).map(quest => (
                <div key={quest.id} style={{ marginBottom: '16px', padding: '15px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px' }}>
                  <div style={{ color: 'white', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                    {getCategoryIcon(quest.category)} {quest.title}
                  </div>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    height: '6px',
                    marginTop: '8px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      background: 'linear-gradient(90deg, #4caf50, #8bc34a)',
                      height: '100%',
                      width: `${quest.progress.percentage}%`,
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                  <div style={{ fontSize: '13px', color: '#888', marginTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{quest.progress.percentage}% complete</span>
                    <span>+{quest.xpReward} XP</span>
                  </div>
                </div>
              ))}
              {activeQuests.length === 0 && (
                <div style={{ textAlign: 'center', color: '#888', padding: '20px' }}>
                  <div style={{ fontSize: '32px', marginBottom: '10px' }}>🎯</div>
                  <div>No active challenges</div>
                  <button
                    onClick={() => setView('available')}
                    style={{
                      background: '#4caf50',
                      border: 'none',
                      borderRadius: '10px',
                      color: 'white',
                      padding: '10px 20px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      marginTop: '12px'
                    }}
                  >
                    Start Your First Quest
                  </button>
                </div>
              )}
            </div>

            {/* Viral Quests */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(255, 87, 34, 0.1), rgba(255, 152, 0, 0.1))',
              borderRadius: '20px',
              padding: '25px',
              border: '1px solid rgba(255, 87, 34, 0.3)'
            }}>
              <h3 style={{ margin: '0 0 20px 0', color: '#ff5722', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>🚀</span>
                Viral Challenges
              </h3>
              {socialQuests.filter(q => q.isViral).slice(0, 2).map(quest => (
                <div key={quest.id} style={{ marginBottom: '16px', padding: '15px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px' }}>
                  <div style={{ color: 'white', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                    {quest.icon} {quest.title}
                  </div>
                  <div style={{ fontSize: '13px', color: '#ff9800', marginBottom: '8px' }}>
                    🔥 {quest.participantCount.toLocaleString()} participants
                  </div>
                  {quest.communityGoal && (
                    <div style={{
                      background: 'rgba(255, 152, 0, 0.1)',
                      borderRadius: '8px',
                      padding: '8px',
                      marginTop: '8px'
                    }}>
                      <div style={{ fontSize: '12px', color: '#ff9800', marginBottom: '4px' }}>
                        Community Goal: {quest.communityGoal.current.toLocaleString()} / {quest.communityGoal.target.toLocaleString()}
                      </div>
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '4px',
                        height: '4px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          background: '#ff9800',
                          height: '100%',
                          width: `${(quest.communityGoal.current / quest.communityGoal.target) * 100}%`
                        }} />
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => handleStartQuest(quest.id)}
                    style={{
                      background: 'linear-gradient(135deg, #ff5722, #ff9800)',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '600',
                      marginTop: '10px'
                    }}
                  >
                    Join Challenge
                  </button>
                </div>
              ))}
            </div>

            {/* Recent Badges */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(156, 39, 176, 0.1), rgba(233, 30, 99, 0.1))',
              borderRadius: '20px',
              padding: '25px',
              border: '1px solid rgba(156, 39, 176, 0.3)'
            }}>
              <h3 style={{ margin: '0 0 20px 0', color: '#9c27b0', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>🎖️</span>
                Badge Collection
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '15px' }}>
                {badges.slice(0, 6).map(badge => (
                  <div
                    key={badge.id}
                    style={{
                      textAlign: 'center',
                      padding: '15px 10px',
                      background: badge.unlockedAt 
                        ? `rgba(${getRarityColor(badge.rarity).slice(1).match(/.{2}/g)?.map(hex => parseInt(hex, 16)).join(', ')}, 0.2)` 
                        : 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '12px',
                      border: badge.unlockedAt 
                        ? `1px solid ${getRarityColor(badge.rarity)}` 
                        : '1px solid rgba(255, 255, 255, 0.1)',
                      opacity: badge.unlockedAt ? 1 : 0.5,
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>
                      {badge.unlockedAt ? badge.icon : '🔒'}
                    </div>
                    <div style={{ fontSize: '11px', color: badge.unlockedAt ? 'white' : '#666', fontWeight: '600' }}>
                      {badge.name}
                    </div>
                    {badge.nftReady && badge.unlockedAt && (
                      <div style={{ fontSize: '9px', color: '#ff9800', marginTop: '4px' }}>
                        NFT Ready
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setView('badges')}
                style={{
                  background: 'rgba(156, 39, 176, 0.2)',
                  border: '1px solid #9c27b0',
                  borderRadius: '10px',
                  color: '#9c27b0',
                  padding: '10px 20px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  width: '100%',
                  marginTop: '15px'
                }}
              >
                View Full Collection
              </button>
            </div>

            {/* Leaderboard Preview */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.1), rgba(255, 152, 0, 0.1))',
              borderRadius: '20px',
              padding: '25px',
              border: '1px solid rgba(255, 193, 7, 0.3)'
            }}>
              <h3 style={{ margin: '0 0 20px 0', color: '#ffc107', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>🏆</span>
                Top Explorers
              </h3>
              {leaderboard.slice(0, 5).map((entry, index) => (
                <div
                  key={entry.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    padding: '12px',
                    marginBottom: '10px',
                    background: entry.name === 'You' 
                      ? 'rgba(0, 188, 212, 0.2)' 
                      : 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    border: entry.name === 'You' ? '1px solid #00bcd4' : 'none'
                  }}
                >
                  <div style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: index < 3 
                      ? ['#ffd700', '#c0c0c0', '#cd7f32'][index] 
                      : 'rgba(255, 255, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: 'white'
                  }}>
                    {index + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>
                      {entry.avatar} {entry.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#888' }}>
                      Level {entry.level} • {entry.xp.toLocaleString()} XP
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {entry.badges.slice(0, 3).map((badge, i) => (
                      <span key={i} style={{ fontSize: '16px' }}>{badge}</span>
                    ))}
                  </div>
                </div>
              ))}
              <button
                onClick={() => setView('leaderboard')}
                style={{
                  background: 'rgba(255, 193, 7, 0.2)',
                  border: '1px solid #ffc107',
                  borderRadius: '10px',
                  color: '#ffc107',
                  padding: '10px 20px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  width: '100%',
                  marginTop: '15px'
                }}
              >
                View Full Leaderboard
              </button>
            </div>
          </div>
        )}

        {/* Other views would continue here... */}
        {view !== 'overview' && (
          <div style={{
            textAlign: 'center',
            color: '#888',
            fontSize: '18px',
            padding: '60px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🚧</div>
            <div style={{ marginBottom: '10px', color: 'white', fontSize: '24px' }}>
              {view.charAt(0).toUpperCase() + view.slice(1)} View
            </div>
            <div>Coming soon with full production features!</div>
            <div style={{ fontSize: '14px', marginTop: '15px', color: '#666' }}>
              This view will include advanced {view} management, analytics, and social features.
            </div>
          </div>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && (
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
            <h3 style={{ color: 'white', fontSize: '20px', marginBottom: '15px' }}>
              🚀 Share Your Quest
            </h3>
            <p style={{ color: '#888', fontSize: '14px', marginBottom: '25px' }}>
              Share "{showShareModal.title}" with friends and earn bonus XP for each person who joins!
            </p>
            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
              <button
                onClick={() => handleShare('twitter', showShareModal)}
                style={{
                  flex: 1,
                  background: '#1da1f2',
                  border: 'none',
                  borderRadius: '10px',
                  color: 'white',
                  padding: '12px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                🐦 Twitter
              </button>
              <button
                onClick={() => handleShare('discord', showShareModal)}
                style={{
                  flex: 1,
                  background: '#5865f2',
                  border: 'none',
                  borderRadius: '10px',
                  color: 'white',
                  padding: '12px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                💬 Discord
              </button>
              <button
                onClick={() => handleShare('copy', showShareModal)}
                style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '10px',
                  color: 'white',
                  padding: '12px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                📋 Copy Link
              </button>
            </div>
            <button
              onClick={handleCloseShareModal}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '10px',
                color: 'white',
                padding: '10px 20px',
                cursor: 'pointer',
                fontSize: '14px',
                width: '100%'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(0, 188, 212, 0.5); }
          50% { box-shadow: 0 0 30px rgba(0, 188, 212, 0.8); }
        }
      `}</style>
    </div>
  )
}