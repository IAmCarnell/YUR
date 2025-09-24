/**
 * Quests Component - Gamified reward and quest management interface
 */

import React, { useState, useEffect } from 'react'
import { rewardsSystem, Quest, Achievement, UserStats, triggerAction } from '../lib/rewards'

interface QuestsProps {
  isVisible: boolean
  onClose: () => void
}

export const Quests: React.FC<QuestsProps> = ({ isVisible, onClose }) => {
  const [userStats, setUserStats] = useState<UserStats>(rewardsSystem.getUserStats())
  const [activeQuests, setActiveQuests] = useState<Quest[]>(rewardsSystem.getActiveQuests())
  const [availableQuests, setAvailableQuests] = useState<Quest[]>(rewardsSystem.getAvailableQuests())
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null)
  const [view, setView] = useState<'overview' | 'active' | 'available' | 'achievements'>('overview')
  const [notifications, setNotifications] = useState<string[]>([])

  // Update stats and quests
  const refreshData = () => {
    setUserStats(rewardsSystem.getUserStats())
    setActiveQuests(rewardsSystem.getActiveQuests())
    setAvailableQuests(rewardsSystem.getAvailableQuests())
  }

  // Set up event listeners
  useEffect(() => {
    if (isVisible) {
      triggerAction('app_launch')

      const handleQuestStarted = (quest: Quest) => {
        setNotifications(prev => [...prev, `Quest started: ${quest.title}`])
        refreshData()
      }

      const handleQuestCompleted = (quest: Quest) => {
        setNotifications(prev => [...prev, `Quest completed: ${quest.title}! +${quest.xpReward} XP`])
        refreshData()
      }

      const handleLevelUp = ({ oldLevel, newLevel }: { oldLevel: number; newLevel: number }) => {
        setNotifications(prev => [...prev, `Level up! You are now level ${newLevel}!`])
        refreshData()
      }

      const handleAchievementUnlocked = (achievement: Achievement) => {
        setNotifications(prev => [...prev, `Achievement unlocked: ${achievement.title}!`])
        refreshData()
      }

      rewardsSystem.on('questStarted', handleQuestStarted)
      rewardsSystem.on('questCompleted', handleQuestCompleted)
      rewardsSystem.on('levelUp', handleLevelUp)
      rewardsSystem.on('achievementUnlocked', handleAchievementUnlocked)

      refreshData()

      return () => {
        // In a real implementation, you'd remove event listeners here
      }
    }
  }, [isVisible])

  // Clear notifications after some time
  useEffect(() => {
    if (notifications.length > 0) {
      const timer = setTimeout(() => {
        setNotifications(prev => prev.slice(1))
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [notifications])

  const handleStartQuest = (questId: string) => {
    rewardsSystem.startQuest(questId)
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

  if (!isVisible) return null

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '90%',
      maxWidth: '1000px',
      height: '85%',
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
            transform: `translateY(${index * 60}px)`,
            animation: 'slideIn 0.3s ease-out'
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
            fontSize: '24px',
            fontWeight: '600'
          }}>
            ⚡ Quest Center
          </h2>
          <p style={{ margin: 0, color: '#888', fontSize: '14px' }}>
            Complete quests to earn XP, tokens, and unlock achievements
          </p>
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

      {/* User Stats Header */}
      <div style={{
        padding: '20px',
        background: 'rgba(0, 188, 212, 0.1)',
        borderBottom: '1px solid rgba(0, 188, 212, 0.3)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: `conic-gradient(#00bcd4 0deg, #00bcd4 ${(userStats.xp / userStats.xpToNextLevel) * 360}deg, rgba(255,255,255,0.2) ${(userStats.xp / userStats.xpToNextLevel) * 360}deg, rgba(255,255,255,0.2) 360deg)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            fontWeight: 'bold',
            color: 'white'
          }}>
            {userStats.level}
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: 'white' }}>
              Level {userStats.level}
            </div>
            <div style={{ fontSize: '12px', color: '#888' }}>
              {userStats.xp} / {userStats.xpToNextLevel} XP to next level
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '30px', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '20px', fontWeight: '600', color: '#ffc107' }}>
              {userStats.tokens} 💎
            </div>
            <div style={{ fontSize: '12px', color: '#888' }}>Tokens</div>
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: '600', color: '#4caf50' }}>
              {userStats.completedQuests}
            </div>
            <div style={{ fontSize: '12px', color: '#888' }}>Completed</div>
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: '600', color: '#9c27b0' }}>
              {userStats.achievements.length}
            </div>
            <div style={{ fontSize: '12px', color: '#888' }}>Achievements</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        gap: '10px'
      }}>
        {[
          { key: 'overview', label: '📊 Overview' },
          { key: 'active', label: '🎯 Active', count: activeQuests.length },
          { key: 'available', label: '📋 Available', count: availableQuests.length },
          { key: 'achievements', label: '🏆 Achievements', count: userStats.achievements.length }
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setView(key as any)}
            style={{
              background: view === key ? 'rgba(0, 188, 212, 0.2)' : 'transparent',
              border: view === key ? '1px solid #00bcd4' : '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: 'white',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            {label}
            {count !== undefined && (
              <span style={{
                background: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                padding: '2px 8px',
                fontSize: '12px'
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px'
          }}>
            {/* Quick Stats */}
            <div style={{
              background: 'rgba(76, 175, 80, 0.1)',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid rgba(76, 175, 80, 0.3)'
            }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#4caf50', fontSize: '18px' }}>
                🎯 Active Quests
              </h3>
              {activeQuests.slice(0, 3).map(quest => (
                <div key={quest.id} style={{ marginBottom: '12px' }}>
                  <div style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>
                    {quest.title}
                  </div>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    height: '4px',
                    marginTop: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      background: '#4caf50',
                      height: '100%',
                      width: `${quest.progress.percentage}%`,
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                    {quest.progress.percentage}% complete
                  </div>
                </div>
              ))}
            </div>

            {/* Recent Achievements */}
            <div style={{
              background: 'rgba(156, 39, 176, 0.1)',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid rgba(156, 39, 176, 0.3)'
            }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#9c27b0', fontSize: '18px' }}>
                🏆 Recent Achievements
              </h3>
              {userStats.achievements.length > 0 ? (
                <div>Recent achievements would be shown here</div>
              ) : (
                <div style={{ color: '#888', fontSize: '14px' }}>
                  No achievements yet. Complete quests to unlock them!
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div style={{
              background: 'rgba(255, 152, 0, 0.1)',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid rgba(255, 152, 0, 0.3)'
            }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#ff9800', fontSize: '18px' }}>
                ⚡ Quick Actions
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  onClick={() => setView('available')}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: 'white',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    textAlign: 'left'
                  }}
                >
                  📋 Browse Available Quests
                </button>
                <button
                  onClick={() => triggerAction('daily_login')}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: 'white',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    textAlign: 'left'
                  }}
                >
                  🎁 Claim Daily Bonus
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'active' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
            gap: '20px'
          }}>
            {activeQuests.map(quest => (
              <div
                key={quest.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '16px',
                  padding: '20px',
                  border: '2px solid rgba(76, 175, 80, 0.3)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '32px' }}>{getCategoryIcon(quest.category)}</div>
                  <div>
                    <h3 style={{ 
                      margin: '0 0 4px 0', 
                      color: 'white', 
                      fontSize: '18px',
                      fontWeight: '600'
                    }}>
                      {quest.title}
                    </h3>
                    <div style={{ 
                      fontSize: '12px', 
                      color: getDifficultyColor(quest.difficulty),
                      fontWeight: '600',
                      textTransform: 'uppercase'
                    }}>
                      {quest.difficulty} • {quest.category}
                    </div>
                  </div>
                </div>

                <p style={{ 
                  margin: '0 0 16px 0', 
                  color: '#ccc', 
                  fontSize: '14px',
                  lineHeight: '1.4'
                }}>
                  {quest.description}
                </p>

                {/* Progress Bars */}
                <div style={{ marginBottom: '16px' }}>
                  {quest.requirements.map((req, index) => (
                    <div key={index} style={{ marginBottom: '8px' }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        fontSize: '12px',
                        color: '#888',
                        marginBottom: '4px'
                      }}>
                        <span>{req.description}</span>
                        <span>{req.current} / {req.value}</span>
                      </div>
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        height: '6px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          background: '#4caf50',
                          height: '100%',
                          width: `${Math.min(100, (req.current / req.value) * 100)}%`,
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Rewards */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  padding: '12px'
                }}>
                  <div style={{ fontSize: '12px', color: '#888' }}>
                    Rewards: +{quest.xpReward} XP{quest.tokenReward ? `, +${quest.tokenReward} 💎` : ''}
                  </div>
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: '#4caf50'
                  }}>
                    {quest.progress.percentage}% Complete
                  </div>
                </div>
              </div>
            ))}

            {activeQuests.length === 0 && (
              <div style={{
                textAlign: 'center',
                color: '#888',
                fontSize: '16px',
                padding: '40px',
                gridColumn: '1 / -1'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
                <div>No active quests</div>
                <button
                  onClick={() => setView('available')}
                  style={{
                    background: '#00bcd4',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    padding: '10px 20px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    marginTop: '16px'
                  }}
                >
                  Start Your First Quest
                </button>
              </div>
            )}
          </div>
        )}

        {view === 'available' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '20px'
          }}>
            {availableQuests.map(quest => (
              <div
                key={quest.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '16px',
                  padding: '20px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onClick={() => setSelectedQuest(quest)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '32px' }}>{getCategoryIcon(quest.category)}</div>
                  <div>
                    <h3 style={{ 
                      margin: '0 0 4px 0', 
                      color: 'white', 
                      fontSize: '18px',
                      fontWeight: '600'
                    }}>
                      {quest.title}
                    </h3>
                    <div style={{ 
                      fontSize: '12px', 
                      color: getDifficultyColor(quest.difficulty),
                      fontWeight: '600',
                      textTransform: 'uppercase'
                    }}>
                      {quest.difficulty} • {quest.category}
                    </div>
                  </div>
                </div>

                <p style={{ 
                  margin: '0 0 16px 0', 
                  color: '#ccc', 
                  fontSize: '14px',
                  lineHeight: '1.4'
                }}>
                  {quest.description}
                </p>

                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center'
                }}>
                  <div style={{ fontSize: '12px', color: '#888' }}>
                    Rewards: +{quest.xpReward} XP{quest.tokenReward ? `, +${quest.tokenReward} 💎` : ''}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleStartQuest(quest.id)
                    }}
                    style={{
                      background: '#00bcd4',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      padding: '6px 12px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}
                  >
                    Start Quest
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'achievements' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px'
          }}>
            {userStats.achievements.length === 0 && (
              <div style={{
                textAlign: 'center',
                color: '#888',
                fontSize: '16px',
                padding: '40px',
                gridColumn: '1 / -1'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏆</div>
                <div>No achievements unlocked yet</div>
                <div style={{ fontSize: '14px', marginTop: '8px' }}>
                  Complete quests and explore YUR OS to unlock achievements!
                </div>
              </div>
            )}
          </div>
        )}
      </div>

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
      `}</style>
    </div>
  )
}