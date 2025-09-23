/**
 * YUR Rewards System - Automated quest and reward management
 */

export interface Quest {
  id: string
  title: string
  description: string
  category: 'exploration' | 'collaboration' | 'productivity' | 'learning' | 'creativity'
  difficulty: 'easy' | 'medium' | 'hard' | 'epic'
  xpReward: number
  tokenReward?: number
  requirements: QuestRequirement[]
  progress: QuestProgress
  status: 'available' | 'active' | 'completed' | 'locked'
  prerequisites?: string[]
  timeLimit?: number // in seconds
  icon: string
}

export interface QuestRequirement {
  type: 'action' | 'metric' | 'achievement' | 'social'
  target: string
  value: number
  current: number
  description: string
}

export interface QuestProgress {
  startedAt?: number
  completedAt?: number
  currentStep: number
  totalSteps: number
  percentage: number
}

export interface UserStats {
  level: number
  xp: number
  xpToNextLevel: number
  totalXp: number
  tokens: number
  completedQuests: number
  activeQuests: string[]
  achievements: string[]
  streakDays: number
  lastActivity: number
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  xpReward: number
  unlockedAt?: number
}

export class YURRewards {
  private quests: Map<string, Quest> = new Map()
  private userStats: UserStats
  private achievements: Map<string, Achievement> = new Map()
  private listeners: Map<string, Function[]> = new Map()

  constructor(initialStats?: Partial<UserStats>) {
    this.userStats = {
      level: 1,
      xp: 0,
      xpToNextLevel: 100,
      totalXp: 0,
      tokens: 0,
      completedQuests: 0,
      activeQuests: [],
      achievements: [],
      streakDays: 1,
      lastActivity: Date.now(),
      ...initialStats
    }
    
    this.initializeDefaultQuests()
    this.initializeAchievements()
  }

  // Quest Management
  addQuest(quest: Quest): void {
    this.quests.set(quest.id, quest)
    this.emit('questAdded', quest)
  }

  getQuest(questId: string): Quest | undefined {
    return this.quests.get(questId)
  }

  getAvailableQuests(): Quest[] {
    return Array.from(this.quests.values()).filter(q => q.status === 'available')
  }

  getActiveQuests(): Quest[] {
    return Array.from(this.quests.values()).filter(q => q.status === 'active')
  }

  startQuest(questId: string): boolean {
    const quest = this.quests.get(questId)
    if (!quest || quest.status !== 'available') return false

    quest.status = 'active'
    quest.progress.startedAt = Date.now()
    this.userStats.activeQuests.push(questId)
    
    this.emit('questStarted', quest)
    return true
  }

  updateQuestProgress(questId: string, requirementIndex: number, progress: number): void {
    const quest = this.quests.get(questId)
    if (!quest || quest.status !== 'active') return

    quest.requirements[requirementIndex].current = Math.min(
      progress,
      quest.requirements[requirementIndex].value
    )

    // Calculate overall progress
    const totalProgress = quest.requirements.reduce((sum, req) => 
      sum + (req.current / req.value), 0
    )
    quest.progress.percentage = Math.round((totalProgress / quest.requirements.length) * 100)
    quest.progress.currentStep = Math.floor(totalProgress)

    // Check if quest is completed
    if (quest.requirements.every(req => req.current >= req.value)) {
      this.completeQuest(questId)
    }

    this.emit('questProgress', quest)
  }

  completeQuest(questId: string): void {
    const quest = this.quests.get(questId)
    if (!quest) return

    quest.status = 'completed'
    quest.progress.completedAt = Date.now()
    quest.progress.percentage = 100

    // Remove from active quests
    this.userStats.activeQuests = this.userStats.activeQuests.filter(id => id !== questId)
    this.userStats.completedQuests++

    // Award rewards
    this.awardXP(quest.xpReward)
    if (quest.tokenReward) {
      this.awardTokens(quest.tokenReward)
    }

    this.emit('questCompleted', quest)
    this.checkAchievements()
  }

  // Reward System
  awardXP(amount: number): void {
    const oldLevel = this.userStats.level
    this.userStats.xp += amount
    this.userStats.totalXp += amount

    // Level up calculation
    while (this.userStats.xp >= this.userStats.xpToNextLevel) {
      this.userStats.xp -= this.userStats.xpToNextLevel
      this.userStats.level++
      this.userStats.xpToNextLevel = this.calculateXPForLevel(this.userStats.level + 1)
    }

    if (this.userStats.level > oldLevel) {
      this.emit('levelUp', { oldLevel, newLevel: this.userStats.level })
    }
  }

  awardTokens(amount: number): void {
    this.userStats.tokens += amount
    this.emit('tokensAwarded', amount)
  }

  calculateXPForLevel(level: number): number {
    return Math.floor(100 * Math.pow(1.2, level - 1))
  }

  // Achievement System
  checkAchievements(): void {
    this.achievements.forEach(achievement => {
      if (!this.userStats.achievements.includes(achievement.id)) {
        if (this.isAchievementUnlocked(achievement)) {
          this.unlockAchievement(achievement.id)
        }
      }
    })
  }

  isAchievementUnlocked(achievement: Achievement): boolean {
    switch (achievement.id) {
      case 'first-quest':
        return this.userStats.completedQuests >= 1
      case 'level-5':
        return this.userStats.level >= 5
      case 'quest-master':
        return this.userStats.completedQuests >= 10
      case 'collaborator':
        return this.userStats.activeQuests.some(qId => {
          const quest = this.quests.get(qId)
          return quest?.category === 'collaboration'
        })
      default:
        return false
    }
  }

  unlockAchievement(achievementId: string): void {
    const achievement = this.achievements.get(achievementId)
    if (!achievement) return

    achievement.unlockedAt = Date.now()
    this.userStats.achievements.push(achievementId)
    this.awardXP(achievement.xpReward)
    
    this.emit('achievementUnlocked', achievement)
  }

  // Event System
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(callback)
  }

  emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event) || []
    callbacks.forEach(callback => callback(data))
  }

  // User Stats
  getUserStats(): UserStats {
    return { ...this.userStats }
  }

  updateActivity(): void {
    this.userStats.lastActivity = Date.now()
  }

  // Initialize default quests and achievements
  private initializeDefaultQuests(): void {
    const defaultQuests: Quest[] = [
      {
        id: 'welcome',
        title: 'Welcome to YUR OS',
        description: 'Complete your first exploration of the spatial interface',
        category: 'exploration',
        difficulty: 'easy',
        xpReward: 50,
        tokenReward: 10,
        requirements: [
          {
            type: 'action',
            target: 'app_launch',
            value: 3,
            current: 0,
            description: 'Launch 3 different apps'
          }
        ],
        progress: { currentStep: 0, totalSteps: 1, percentage: 0 },
        status: 'available',
        icon: '🚀'
      },
      {
        id: 'collaborative-docs',
        title: 'Team Player',
        description: 'Collaborate on a document with another user',
        category: 'collaboration',
        difficulty: 'medium',
        xpReward: 100,
        tokenReward: 25,
        requirements: [
          {
            type: 'action',
            target: 'collab_session',
            value: 1,
            current: 0,
            description: 'Join a collaborative session'
          },
          {
            type: 'metric',
            target: 'words_typed',
            value: 50,
            current: 0,
            description: 'Type 50 words in shared document'
          }
        ],
        progress: { currentStep: 0, totalSteps: 2, percentage: 0 },
        status: 'available',
        icon: '🤝'
      },
      {
        id: 'ar-explorer',
        title: 'Reality Hacker',
        description: 'Experience augmented reality features',
        category: 'exploration',
        difficulty: 'hard',
        xpReward: 200,
        tokenReward: 50,
        requirements: [
          {
            type: 'action',
            target: 'ar_mode',
            value: 1,
            current: 0,
            description: 'Activate AR mode'
          },
          {
            type: 'metric',
            target: 'ar_interactions',
            value: 10,
            current: 0,
            description: 'Perform 10 AR interactions'
          }
        ],
        progress: { currentStep: 0, totalSteps: 2, percentage: 0 },
        status: 'available',
        icon: '🥽'
      }
    ]

    defaultQuests.forEach(quest => this.addQuest(quest))
  }

  private initializeAchievements(): void {
    const defaultAchievements: Achievement[] = [
      {
        id: 'first-quest',
        title: 'Getting Started',
        description: 'Complete your first quest',
        icon: '🏆',
        rarity: 'common',
        xpReward: 25
      },
      {
        id: 'level-5',
        title: 'Rising Star',
        description: 'Reach level 5',
        icon: '⭐',
        rarity: 'rare',
        xpReward: 100
      },
      {
        id: 'quest-master',
        title: 'Quest Master',
        description: 'Complete 10 quests',
        icon: '👑',
        rarity: 'epic',
        xpReward: 500
      },
      {
        id: 'collaborator',
        title: 'Team Spirit',
        description: 'Participate in collaborative features',
        icon: '🤝',
        rarity: 'rare',
        xpReward: 150
      }
    ]

    defaultAchievements.forEach(achievement => 
      this.achievements.set(achievement.id, achievement)
    )
  }
}

// Global rewards instance
export const rewardsSystem = new YURRewards()

// Helper functions for common reward triggers
export function triggerAction(action: string, value: number = 1): void {
  rewardsSystem.getActiveQuests().forEach(quest => {
    quest.requirements.forEach((req, index) => {
      if (req.type === 'action' && req.target === action) {
        rewardsSystem.updateQuestProgress(quest.id, index, req.current + value)
      }
    })
  })
}

export function updateMetric(metric: string, value: number): void {
  rewardsSystem.getActiveQuests().forEach(quest => {
    quest.requirements.forEach((req, index) => {
      if (req.type === 'metric' && req.target === metric) {
        rewardsSystem.updateQuestProgress(quest.id, index, value)
      }
    })
  })
}