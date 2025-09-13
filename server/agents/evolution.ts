/**
 * YUR Agent Evolution System
 * 
 * Implements a detailed agent evolution algorithm for the YUR platform backend.
 * Agents and the Digital Twin persistently learn new skills, gain experience (XP),
 * level up skills, unlock new abilities, and evolve based on quests, tasks, and user feedback.
 */

// ===== CORE INTERFACES AND TYPES =====

/**
 * Represents a skill in the agent's skill tree
 */
export interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  level: number;
  experience: number;
  totalExperience: number; // Total XP ever gained (never decreases)
  experienceToNext: number;
  maxLevel: number;
  prerequisites: string[]; // Other skill IDs required
  unlocks: string[]; // Skills this skill unlocks
  masteryThreshold: number; // XP needed to consider "mastered"
  isMastered: boolean;
  learnedFrom: string[]; // Sources of learning (quest, collaboration, feedback, etc.)
  lastUsed: Date;
  timesMastered: number; // How many times this skill has been mastered (for mutation)
  embedding?: number[]; // Embedding vector for semantic similarity
  suggestedLinks?: SuggestedLink[]; // Suggested conceptual linkages
  suggestionLog?: SuggestionLog[]; // Log of accepted/rejected suggestions
}

/**
 * Represents a quest that can be completed to gain XP and skills
 */
export interface Quest {
  id: string;
  name: string;
  description: string;
  type: 'learning' | 'collaboration' | 'feedback' | 'terminal' | 'gpt' | 'custom';
  difficulty: number; // 1-10
  requiredSkills: string[]; // Skills needed to attempt
  rewardXP: number;
  rewardSkills: string[]; // Skills that can be learned/improved
  isCompleted: boolean;
  completedAt?: Date;
  completionCriteria: QuestCriteria;
}

/**
 * Criteria for quest completion
 */
export interface QuestCriteria {
  type: 'xp_threshold' | 'skill_usage' | 'collaboration_count' | 'feedback_score' | 'custom';
  target: number;
  currentProgress: number;
  metadata?: Record<string, any>;
}

/**
 * Represents learning triggers that automatically generate new skills or XP
 */
export interface LearningTrigger {
  id: string;
  type: 'collaboration' | 'terminal_command' | 'gpt_interaction' | 'feedback_received' | 'pattern_recognition';
  source: string; // What triggered the learning
  skillsGenerated: string[]; // New skills created
  xpAwarded: number;
  triggeredAt: Date;
  metadata: Record<string, any>;
}

/**
 * Represents an individual agent with skills and evolution state
 */
export interface Agent {
  id: string;
  name: string;
  type: string; // Agent type/role
  skills: Map<string, Skill>;
  totalXP: number;
  level: number; // Overall agent level
  completedQuests: string[];
  activeQuests: string[];
  learningTriggers: LearningTrigger[];
  createdAt: Date;
  lastActive: Date;
  mutationCount: number; // How many times agent has evolved/mutated
  collaborationHistory: string[]; // Other agent IDs collaborated with
  embedding?: number[]; // Embedding vector for agent/node
  suggestedLinks?: SuggestedLink[]; // Suggested conceptual linkages
  suggestionLog?: SuggestionLog[]; // Log of accepted/rejected suggestions
}

/**
 * Represents a suggested conceptual linkage between nodes/skills
 */
export interface SuggestedLink {
  sourceId: string;
  targetId: string;
  similarity: number;
  accepted?: boolean;
  timestamp: Date;
}

/**
 * Log entry for user feedback on suggested links
 */
export interface SuggestionLog {
  link: SuggestedLink;
  action: 'accepted' | 'rejected' | 'modified';
  userId?: string;
  timestamp: Date;
}

// ===== NEW INTERFACES FOR ENHANCEMENT ISSUES #2-#5 =====

/**
 * Issue #2: Embedding integration
 * Represents an embedding record for semantic similarity
 */
export interface EmbeddingRecord {
  id: string;
  nodeId: string; // Reference to agent, skill, or other entity
  nodeType: 'agent' | 'skill' | 'quest' | 'other';
  embedding: number[]; // Vector representation
  metadata: {
    label: string;
    description?: string;
    generatedBy: 'openai' | 'local' | 'mock';
    modelVersion?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Issue #3: Ontology merging and isomorphic subtree detection
 * Represents a subtree hash record for detecting isomorphic structures
 */
export interface SubtreeHashRecord {
  id: string;
  nodeId: string;
  hash: string; // Canonical hash of the subtree
  depth: number; // How deep the subtree goes
  childrenCount: number;
  metadata: {
    nodeLabel: string;
    childrenLabels: string[];
    generatedAt: Date;
  };
}

/**
 * Represents a group of isomorphic nodes
 */
export interface IsomorphicGroup {
  id: string;
  hash: string;
  nodeIds: string[]; // All nodes with the same subtree structure
  depth: number;
  confidence: number; // 0-1 confidence score
  detectedAt: Date;
  reviewed?: boolean; // Whether a human has reviewed this group
}

/**
 * Issue #4: Quantum-inspired UI mode
 * Represents uncertainty/entropy data for quantum visualization
 */
export interface QuantumState {
  nodeId: string;
  uncertainty: number; // 0-1, higher = more uncertain/probability cloud
  collapsedState?: any; // Resolved state after collapse interaction
  lastCollapsed?: Date;
  probabilityDistribution?: {[key: string]: number}; // For multi-state uncertainty
}

/**
 * Issue #5: Knowledge staking and slashing
 * Represents a stake placed on a relevance claim
 */
export interface Stake {
  id: string;
  userId: string;
  sourceNodeId: string;
  targetNodeId?: string; // Optional for node-specific stakes
  linkId?: string; // Optional for link-specific stakes
  amount: number; // Stake amount in points
  claimType: 'relevance' | 'link_strength' | 'accuracy' | 'quality';
  status: 'active' | 'slashed' | 'resolved' | 'withdrawn';
  createdAt: Date;
  resolvedAt?: Date;
  slashReason?: string;
  evidence?: string; // Supporting evidence for the claim
}

/**
 * User reputation and staking history
 */
export interface UserReputation {
  userId: string;
  totalStaked: number;
  totalSlashed: number;
  successfulStakes: number;
  reputation: number; // Derived score
  stakes: Stake[];
  lastActivity: Date;
}

/**
 * The Digital Twin that aggregates skills from all agents
 */
export interface DigitalTwin {
  id: string;
  name: string;
  aggregatedSkills: Map<string, AggregatedSkill>;
  totalAgents: number;
  totalSkillsMastered: number;
  globalXP: number;
  emergentSkills: string[]; // Skills that emerged from mutations
  lastAggregation: Date;
  evolutionHistory: EvolutionEvent[];
}

/**
 * Aggregated skill from multiple agents
 */
export interface AggregatedSkill {
  skillId: string;
  averageLevel: number;
  maxLevel: number;
  masteredByAgents: string[]; // Agent IDs that have mastered this skill
  totalUsageCount: number;
  emergentVariations: string[]; // Mutated versions of this skill
  lastEvolution: Date;
}

/**
 * Evolution event in the Digital Twin
 */
export interface EvolutionEvent {
  id: string;
  type: 'skill_mastery' | 'mutation' | 'emergence' | 'collaboration_discovery';
  agentId?: string;
  skillId: string;
  description: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

// ===== CORE EVOLUTION ENGINE =====

/**
 * Main Agent Evolution Engine
 */
export class AgentEvolutionEngine {
  private agents: Map<string, Agent> = new Map();
  private digitalTwin: DigitalTwin;
  private skillCatalog: Map<string, Skill> = new Map();
  private questCatalog: Map<string, Quest> = new Map();
  private storage: IEvolutionStorage;

  constructor(storage: IEvolutionStorage) {
    this.storage = storage;
    this.digitalTwin = this.initializeDigitalTwin();
    this.initializeSkillCatalog();
  }

  // ===== AGENT MANAGEMENT =====

  /**
   * Create a new agent
   */
  async createAgent(name: string, type: string): Promise<Agent> {
    const agent: Agent = {
      id: this.generateId(),
      name,
      type,
      skills: new Map(),
      totalXP: 0,
      level: 1,
      completedQuests: [],
      activeQuests: [],
      learningTriggers: [],
      createdAt: new Date(),
      lastActive: new Date(),
      mutationCount: 0,
      collaborationHistory: []
    };

    // Give agent basic skills based on type
    this.initializeAgentSkills(agent);
    
    this.agents.set(agent.id, agent);
    await this.storage.saveAgent(agent);
    
    return agent;
  }

  /**
   * Get agent by ID
   */
  async getAgent(agentId: string): Promise<Agent | null> {
    let agent = this.agents.get(agentId);
    if (!agent) {
      const loadedAgent = await this.storage.loadAgent(agentId);
      if (loadedAgent) {
        this.agents.set(agentId, loadedAgent);
        agent = loadedAgent;
      }
    }
    return agent || null;
  }

  // ===== SKILL MANAGEMENT =====

  /**
   * Award experience to an agent for a specific skill
   */
  async awardExperience(agentId: string, skillId: string, xp: number, source: string): Promise<boolean> {
    const agent = await this.getAgent(agentId);
    if (!agent) return false;

    const skill = agent.skills.get(skillId);
    if (!skill) return false;

    // Add XP to skill
    skill.experience += xp;
    skill.totalExperience += xp;
    skill.lastUsed = new Date();
    agent.totalXP += xp;

    // Check for mastery (based on total experience)
    if (!skill.isMastered && skill.totalExperience >= skill.masteryThreshold) {
      await this.masterSkill(agent, skill);
    }

    // Check for level up
    while (skill.experience >= skill.experienceToNext && skill.level < skill.maxLevel) {
      await this.levelUpSkill(agent, skill);
    }

    // Update agent level based on total XP
    await this.updateAgentLevel(agent);

    // Save changes
    await this.storage.saveAgent(agent);

    return true;
  }

  /**
   * Level up a skill
   */
  private async levelUpSkill(agent: Agent, skill: Skill): Promise<void> {
    skill.level++;
    skill.experience -= skill.experienceToNext;
    skill.experienceToNext = this.calculateExperienceToNext(skill.level);

    // Unlock new skills if this was a prerequisite
    await this.checkUnlockSkills(agent, skill.id);

    console.log(`Agent ${agent.name} leveled up skill ${skill.name} to level ${skill.level}`);
  }

  /**
   * Master a skill
   */
  private async masterSkill(agent: Agent, skill: Skill): Promise<void> {
    skill.isMastered = true;
    skill.timesMastered++;

    // Add to Digital Twin
    await this.aggregateSkillToTwin(agent.id, skill);

    // Check for mutation opportunity
    if (skill.timesMastered >= 3) {
      await this.attemptSkillMutation(agent, skill);
    }

    console.log(`Agent ${agent.name} mastered skill ${skill.name}`);
  }

  /**
   * Check and unlock skills that have this skill as prerequisite
   */
  private async checkUnlockSkills(agent: Agent, unlockedSkillId: string): Promise<void> {
    for (const [skillId, skillTemplate] of this.skillCatalog) {
      if (skillTemplate.prerequisites.includes(unlockedSkillId) && !agent.skills.has(skillId)) {
        // Check if all prerequisites are met
        const prerequisitesMet = skillTemplate.prerequisites.every(prereqId => 
          agent.skills.has(prereqId) && agent.skills.get(prereqId)!.level > 0
        );

        if (prerequisitesMet) {
          await this.learnSkill(agent, skillId);
        }
      }
    }
  }

  /**
   * Learn a new skill
   */
  async learnSkill(agent: Agent, skillId: string, source: string = 'unlock'): Promise<boolean> {
    const skillTemplate = this.skillCatalog.get(skillId);
    if (!skillTemplate || agent.skills.has(skillId)) return false;

    const newSkill: Skill = {
      ...skillTemplate,
      level: 1,
      experience: 0,
      totalExperience: 0,
      experienceToNext: this.calculateExperienceToNext(1),
      isMastered: false,
      learnedFrom: [source],
      lastUsed: new Date(),
      timesMastered: 0
    };

    agent.skills.set(skillId, newSkill);
    await this.storage.saveAgent(agent);

    console.log(`Agent ${agent.name} learned new skill ${newSkill.name} from ${source}`);
    return true;
  }

  // ===== QUEST SYSTEM =====

  /**
   * Start a quest for an agent
   */
  async startQuest(agentId: string, questId: string): Promise<boolean> {
    const agent = await this.getAgent(agentId);
    const quest = this.questCatalog.get(questId);
    
    if (!agent || !quest || agent.activeQuests.includes(questId)) return false;

    // Check prerequisites
    const hasRequiredSkills = quest.requiredSkills.every(skillId => 
      agent.skills.has(skillId) && agent.skills.get(skillId)!.level > 0
    );

    if (!hasRequiredSkills) return false;

    agent.activeQuests.push(questId);
    await this.storage.saveAgent(agent);

    console.log(`Agent ${agent.name} started quest ${quest.name}`);
    return true;
  }

  /**
   * Complete a quest
   */
  async completeQuest(agentId: string, questId: string): Promise<boolean> {
    const agent = await this.getAgent(agentId);
    const quest = this.questCatalog.get(questId);
    
    if (!agent || !quest || !agent.activeQuests.includes(questId)) return false;

    // Check completion criteria
    if (!this.checkQuestCompletion(quest)) return false;

    // Remove from active quests
    agent.activeQuests = agent.activeQuests.filter(id => id !== questId);
    agent.completedQuests.push(questId);

    // Award rewards
    agent.totalXP += quest.rewardXP;

    // Award skill XP and learn new skills
    for (const skillId of quest.rewardSkills) {
      if (agent.skills.has(skillId)) {
        await this.awardExperience(agentId, skillId, quest.rewardXP / quest.rewardSkills.length, `quest:${questId}`);
      } else {
        await this.learnSkill(agent, skillId, `quest:${questId}`);
      }
    }

    quest.isCompleted = true;
    quest.completedAt = new Date();

    await this.storage.saveAgent(agent);
    await this.storage.saveQuest(quest);

    console.log(`Agent ${agent.name} completed quest ${quest.name}`);
    return true;
  }

  /**
   * Check if quest completion criteria are met
   */
  private checkQuestCompletion(quest: Quest): boolean {
    const { type, target, currentProgress } = quest.completionCriteria;
    
    switch (type) {
      case 'xp_threshold':
      case 'skill_usage':
      case 'collaboration_count':
      case 'feedback_score':
        return currentProgress >= target;
      case 'custom':
        // Custom logic based on metadata
        return true; // Implement custom logic as needed
      default:
        return false;
    }
  }

  // ===== LEARNING TRIGGERS =====

  /**
   * Trigger learning from collaboration
   */
  async triggerCollaborationLearning(agentId: string, collaboratorId: string, context: string): Promise<void> {
    const agent = await this.getAgent(agentId);
    const collaborator = await this.getAgent(collaboratorId);
    
    if (!agent || !collaborator) return;

    // Add to collaboration history
    if (!agent.collaborationHistory.includes(collaboratorId)) {
      agent.collaborationHistory.push(collaboratorId);
    }

    // Find skills that collaborator has but agent doesn't
    const skillsToLearn: string[] = [];
    for (const [skillId, skill] of collaborator.skills) {
      if (!agent.skills.has(skillId) && skill.level > 2) {
        skillsToLearn.push(skillId);
      }
    }

    // Learn some skills and award XP
    const xpAwarded = Math.min(50, skillsToLearn.length * 10);
    for (const skillId of skillsToLearn.slice(0, 2)) { // Limit to 2 skills per collaboration
      await this.learnSkill(agent, skillId, `collaboration:${collaboratorId}`);
    }

    // Create learning trigger record
    const trigger: LearningTrigger = {
      id: this.generateId(),
      type: 'collaboration',
      source: `collaboration with ${collaborator.name}`,
      skillsGenerated: skillsToLearn.slice(0, 2),
      xpAwarded,
      triggeredAt: new Date(),
      metadata: { collaboratorId, context }
    };

    agent.learningTriggers.push(trigger);
    agent.totalXP += xpAwarded;

    await this.storage.saveAgent(agent);
  }

  /**
   * Trigger learning from terminal/GPT interaction
   */
  async triggerTerminalLearning(agentId: string, command: string, output: string, success: boolean): Promise<void> {
    const agent = await this.getAgent(agentId);
    if (!agent) return;

    // Analyze command to determine relevant skills
    const relevantSkills = this.analyzeCommandForSkills(command);
    const xpMultiplier = success ? 1.0 : 0.5; // Less XP for failed commands
    const baseXP = 10;

    // Award XP to relevant skills
    for (const skillId of relevantSkills) {
      if (agent.skills.has(skillId)) {
        await this.awardExperience(agentId, skillId, baseXP * xpMultiplier, `terminal:${command}`);
      }
    }

    // Create learning trigger
    const trigger: LearningTrigger = {
      id: this.generateId(),
      type: 'terminal_command',
      source: command,
      skillsGenerated: [],
      xpAwarded: baseXP * relevantSkills.length * xpMultiplier,
      triggeredAt: new Date(),
      metadata: { command, output, success }
    };

    agent.learningTriggers.push(trigger);
    await this.storage.saveAgent(agent);
  }

  /**
   * Trigger learning from user feedback
   */
  async triggerFeedbackLearning(agentId: string, feedback: string, rating: number): Promise<void> {
    const agent = await this.getAgent(agentId);
    if (!agent) return;

    // Analyze feedback to determine skills to improve
    const skillsToImprove = this.analyzeFeedbackForSkills(feedback);
    const xpMultiplier = rating / 5.0; // Scale XP based on rating (1-5)
    const baseXP = 15;

    // Award XP based on feedback
    for (const skillId of skillsToImprove) {
      if (agent.skills.has(skillId)) {
        await this.awardExperience(agentId, skillId, baseXP * xpMultiplier, 'user_feedback');
      }
    }

    // Create learning trigger
    const trigger: LearningTrigger = {
      id: this.generateId(),
      type: 'feedback_received',
      source: 'user_feedback',
      skillsGenerated: [],
      xpAwarded: baseXP * skillsToImprove.length * xpMultiplier,
      triggeredAt: new Date(),
      metadata: { feedback, rating }
    };

    agent.learningTriggers.push(trigger);
    await this.storage.saveAgent(agent);
  }

  // ===== DIGITAL TWIN AGGREGATION =====

  /**
   * Aggregate a mastered skill to the Digital Twin
   */
  private async aggregateSkillToTwin(agentId: string, skill: Skill): Promise<void> {
    let aggregatedSkill = this.digitalTwin.aggregatedSkills.get(skill.id);
    
    if (!aggregatedSkill) {
      aggregatedSkill = {
        skillId: skill.id,
        averageLevel: skill.level,
        maxLevel: skill.level,
        masteredByAgents: [agentId],
        totalUsageCount: 1,
        emergentVariations: [],
        lastEvolution: new Date()
      };
    } else {
      // Update aggregated data
      if (!aggregatedSkill.masteredByAgents.includes(agentId)) {
        aggregatedSkill.masteredByAgents.push(agentId);
      }
      aggregatedSkill.maxLevel = Math.max(aggregatedSkill.maxLevel, skill.level);
      aggregatedSkill.totalUsageCount++;
      aggregatedSkill.lastEvolution = new Date();
      
      // Recalculate average level
      aggregatedSkill.averageLevel = await this.calculateAverageSkillLevel(skill.id);
    }

    this.digitalTwin.aggregatedSkills.set(skill.id, aggregatedSkill);
    this.digitalTwin.totalSkillsMastered++;
    this.digitalTwin.lastAggregation = new Date();

    // Record evolution event
    const evolutionEvent: EvolutionEvent = {
      id: this.generateId(),
      type: 'skill_mastery',
      agentId,
      skillId: skill.id,
      description: `Skill ${skill.name} mastered by agent and aggregated to Digital Twin`,
      timestamp: new Date(),
      metadata: { skillLevel: skill.level, agentName: (await this.getAgent(agentId))?.name }
    };

    this.digitalTwin.evolutionHistory.push(evolutionEvent);
    await this.storage.saveDigitalTwin(this.digitalTwin);
  }

  /**
   * Calculate average skill level across all agents
   */
  private async calculateAverageSkillLevel(skillId: string): Promise<number> {
    let totalLevel = 0;
    let agentCount = 0;

    for (const agent of this.agents.values()) {
      const skill = agent.skills.get(skillId);
      if (skill && skill.isMastered) {
        totalLevel += skill.level;
        agentCount++;
      }
    }

    return agentCount > 0 ? totalLevel / agentCount : 0;
  }

  // ===== MUTATION LOGIC =====

  /**
   * Attempt to mutate a skill when mastery threshold is reached multiple times
   */
  private async attemptSkillMutation(agent: Agent, skill: Skill): Promise<void> {
    const mutationChance = 0.3; // 30% chance to mutate after 3+ masteries
    
    if (Math.random() < mutationChance) {
      const mutatedSkill = await this.generateMutatedSkill(skill);
      
      if (mutatedSkill) {
        // Add to skill catalog
        this.skillCatalog.set(mutatedSkill.id, mutatedSkill);
        
        // Add to Digital Twin emergent skills
        this.digitalTwin.emergentSkills.push(mutatedSkill.id);
        
        // Add to aggregated skill variations
        const aggregatedSkill = this.digitalTwin.aggregatedSkills.get(skill.id);
        if (aggregatedSkill) {
          aggregatedSkill.emergentVariations.push(mutatedSkill.id);
        }

        // Record evolution event
        const evolutionEvent: EvolutionEvent = {
          id: this.generateId(),
          type: 'mutation',
          agentId: agent.id,
          skillId: mutatedSkill.id,
          description: `New skill ${mutatedSkill.name} emerged from mutation of ${skill.name}`,
          timestamp: new Date(),
          metadata: { originalSkillId: skill.id, mutationCount: agent.mutationCount + 1 }
        };

        this.digitalTwin.evolutionHistory.push(evolutionEvent);
        agent.mutationCount++;

        await this.storage.saveDigitalTwin(this.digitalTwin);
        await this.storage.saveAgent(agent);
        await this.storage.saveSkill(mutatedSkill);

        console.log(`Agent ${agent.name} caused mutation: ${skill.name} -> ${mutatedSkill.name}`);
      }
    }
  }

  /**
   * Generate a mutated version of a skill
   */
  private async generateMutatedSkill(originalSkill: Skill): Promise<Skill | null> {
    const mutationTypes = ['enhanced', 'specialized', 'hybrid'];
    const mutationType = mutationTypes[Math.floor(Math.random() * mutationTypes.length)];
    
    const mutatedSkill: Skill = {
      id: this.generateId(),
      name: `${originalSkill.name} (${mutationType})`,
      description: `${originalSkill.description} - Evolved through agent mutation`,
      category: originalSkill.category,
      level: 0,
      experience: 0,
      totalExperience: 0,
      experienceToNext: this.calculateExperienceToNext(1),
      maxLevel: originalSkill.maxLevel + 2, // Mutated skills can reach higher levels
      prerequisites: [originalSkill.id], // Requires original skill
      unlocks: [],
      masteryThreshold: originalSkill.masteryThreshold * 1.5,
      isMastered: false,
      learnedFrom: [`mutation:${originalSkill.id}`],
      lastUsed: new Date(),
      timesMastered: 0
    };

    return mutatedSkill;
  }

  // ===== UTILITY METHODS =====

  /**
   * Initialize the Digital Twin
   */
  private initializeDigitalTwin(): DigitalTwin {
    return {
      id: 'digital_twin_main',
      name: 'YUR Digital Twin',
      aggregatedSkills: new Map(),
      totalAgents: 0,
      totalSkillsMastered: 0,
      globalXP: 0,
      emergentSkills: [],
      lastAggregation: new Date(),
      evolutionHistory: []
    };
  }

  /**
   * Initialize basic skill catalog
   */
  private initializeSkillCatalog(): void {
    const basicSkills: Skill[] = [
      {
        id: 'communication',
        name: 'Communication',
        description: 'Ability to communicate effectively',
        category: 'social',
        level: 0,
        experience: 0,
        totalExperience: 0,
        experienceToNext: 100,
        maxLevel: 10,
        prerequisites: [],
        unlocks: ['collaboration', 'teaching'],
        masteryThreshold: 500,
        isMastered: false,
        learnedFrom: ['initial'],
        lastUsed: new Date(),
        timesMastered: 0
      },
      {
        id: 'problem_solving',
        name: 'Problem Solving',
        description: 'Ability to analyze and solve complex problems',
        category: 'cognitive',
        level: 0,
        experience: 0,
        totalExperience: 0,
        experienceToNext: 120,
        maxLevel: 10,
        prerequisites: [],
        unlocks: ['debugging', 'optimization'],
        masteryThreshold: 600,
        isMastered: false,
        learnedFrom: ['initial'],
        lastUsed: new Date(),
        timesMastered: 0
      },
      {
        id: 'collaboration',
        name: 'Collaboration',
        description: 'Ability to work effectively with other agents',
        category: 'social',
        level: 0,
        experience: 0,
        totalExperience: 0,
        experienceToNext: 150,
        maxLevel: 8,
        prerequisites: ['communication'],
        unlocks: ['team_leadership', 'knowledge_sharing'],
        masteryThreshold: 750,
        isMastered: false,
        learnedFrom: ['unlock'],
        lastUsed: new Date(),
        timesMastered: 0
      },
      {
        id: 'coding',
        name: 'Programming',
        description: 'Ability to write and understand code',
        category: 'technical',
        level: 0,
        experience: 0,
        totalExperience: 0,
        experienceToNext: 200,
        maxLevel: 12,
        prerequisites: ['problem_solving'],
        unlocks: ['debugging', 'code_review', 'architecture'],
        masteryThreshold: 1000,
        isMastered: false,
        learnedFrom: ['unlock'],
        lastUsed: new Date(),
        timesMastered: 0
      }
    ];

    for (const skill of basicSkills) {
      this.skillCatalog.set(skill.id, skill);
    }
  }

  /**
   * Initialize agent with basic skills based on type
   */
  private initializeAgentSkills(agent: Agent): void {
    const baseSkills = ['communication', 'problem_solving'];
    
    for (const skillId of baseSkills) {
      const skillTemplate = this.skillCatalog.get(skillId);
      if (skillTemplate) {
        const skill: Skill = {
          ...skillTemplate,
          level: 1,
          experience: 0,
          totalExperience: 0,
          experienceToNext: this.calculateExperienceToNext(1),
          isMastered: false,
          learnedFrom: ['initial'],
          lastUsed: new Date(),
          timesMastered: 0
        };
        agent.skills.set(skillId, skill);
      }
    }
  }

  /**
   * Calculate XP needed for next level
   */
  private calculateExperienceToNext(level: number): number {
    return Math.floor(100 * Math.pow(1.2, level - 1));
  }

  /**
   * Update agent's overall level based on total XP
   */
  private async updateAgentLevel(agent: Agent): Promise<void> {
    const newLevel = Math.floor(Math.sqrt(agent.totalXP / 100)) + 1;
    if (newLevel > agent.level) {
      agent.level = newLevel;
      console.log(`Agent ${agent.name} reached level ${agent.level}`);
    }
  }

  /**
   * Analyze command to determine relevant skills
   */
  private analyzeCommandForSkills(command: string): string[] {
    const skillMappings: Record<string, string[]> = {
      'git': ['coding', 'collaboration'],
      'npm': ['coding', 'problem_solving'],
      'node': ['coding'],
      'python': ['coding', 'problem_solving'],
      'docker': ['coding', 'system_administration'],
      'test': ['coding', 'quality_assurance'],
      'debug': ['debugging', 'problem_solving']
    };

    const relevantSkills: string[] = [];
    const lowerCommand = command.toLowerCase();
    
    for (const [keyword, skills] of Object.entries(skillMappings)) {
      if (lowerCommand.includes(keyword)) {
        relevantSkills.push(...skills);
      }
    }

    return [...new Set(relevantSkills)]; // Remove duplicates
  }

  /**
   * Analyze feedback to determine relevant skills
   */
  private analyzeFeedbackForSkills(feedback: string): string[] {
    const skillKeywords: Record<string, string[]> = {
      'communication': ['communicate', 'explain', 'clear', 'understand'],
      'problem_solving': ['solve', 'think', 'analyze', 'approach'],
      'coding': ['code', 'program', 'implement', 'technical'],
      'collaboration': ['team', 'together', 'cooperate', 'share']
    };

    const relevantSkills: string[] = [];
    const lowerFeedback = feedback.toLowerCase();
    
    for (const [skillId, keywords] of Object.entries(skillKeywords)) {
      if (keywords.some(keyword => lowerFeedback.includes(keyword))) {
        relevantSkills.push(skillId);
      }
    }

    return relevantSkills;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ===== STORAGE INTERFACE =====

/**
 * Interface for persistent storage
 */
export interface IEvolutionStorage {
  saveAgent(agent: Agent): Promise<void>;
  loadAgent(agentId: string): Promise<Agent | null>;
  saveDigitalTwin(twin: DigitalTwin): Promise<void>;
  loadDigitalTwin(): Promise<DigitalTwin | null>;
  saveSkill(skill: Skill): Promise<void>;
  saveQuest(quest: Quest): Promise<void>;
  loadAllAgents(): Promise<Agent[]>;
  loadAllSkills(): Promise<Skill[]>;
  loadAllQuests(): Promise<Quest[]>;
  
  // Issue #2: Embedding storage
  saveEmbedding(embedding: EmbeddingRecord): Promise<void>;
  loadEmbedding(nodeId: string, nodeType: string): Promise<EmbeddingRecord | null>;
  loadAllEmbeddings(): Promise<EmbeddingRecord[]>;
  
  // Issue #3: Subtree hash storage
  saveSubtreeHash(record: SubtreeHashRecord): Promise<void>;
  loadSubtreeHash(nodeId: string): Promise<SubtreeHashRecord | null>;
  loadIsomorphicGroups(): Promise<IsomorphicGroup[]>;
  saveIsomorphicGroup(group: IsomorphicGroup): Promise<void>;
  
  // Issue #4: Quantum state storage
  saveQuantumState(state: QuantumState): Promise<void>;
  loadQuantumState(nodeId: string): Promise<QuantumState | null>;
  
  // Issue #5: Staking storage
  saveStake(stake: Stake): Promise<void>;
  loadStake(stakeId: string): Promise<Stake | null>;
  loadStakesByNode(nodeId: string): Promise<Stake[]>;
  loadStakesByUser(userId: string): Promise<Stake[]>;
  saveUserReputation(reputation: UserReputation): Promise<void>;
  loadUserReputation(userId: string): Promise<UserReputation | null>;
}

// ===== MONGODB STORAGE IMPLEMENTATION =====

/**
 * MongoDB implementation of the storage interface
 */
export class MongoEvolutionStorage implements IEvolutionStorage {
  private connectionString: string;
  private dbName: string;

  constructor(connectionString: string, dbName: string = 'yur_evolution') {
    this.connectionString = connectionString;
    this.dbName = dbName;
  }

  async saveAgent(agent: Agent): Promise<void> {
    // Convert Map to Object for MongoDB storage
    const agentDoc = {
      ...agent,
      skills: Object.fromEntries(agent.skills),
      _id: agent.id
    };
    
    // In a real implementation, use MongoDB driver
    console.log(`Saving agent ${agent.id} to MongoDB`);
    // await db.collection('agents').replaceOne({ _id: agent.id }, agentDoc, { upsert: true });
  }

  async loadAgent(agentId: string): Promise<Agent | null> {
    // In a real implementation, load from MongoDB
    console.log(`Loading agent ${agentId} from MongoDB`);
    return null;
    // const doc = await db.collection('agents').findOne({ _id: agentId });
    // if (!doc) return null;
    // return { ...doc, skills: new Map(Object.entries(doc.skills)), id: doc._id };
  }

  async saveDigitalTwin(twin: DigitalTwin): Promise<void> {
    const twinDoc = {
      ...twin,
      aggregatedSkills: Object.fromEntries(twin.aggregatedSkills),
      _id: twin.id
    };
    console.log(`Saving Digital Twin to MongoDB`);
    // await db.collection('digital_twin').replaceOne({ _id: twin.id }, twinDoc, { upsert: true });
  }

  async loadDigitalTwin(): Promise<DigitalTwin | null> {
    console.log(`Loading Digital Twin from MongoDB`);
    return null;
    // const doc = await db.collection('digital_twin').findOne({});
    // if (!doc) return null;
    // return { ...doc, aggregatedSkills: new Map(Object.entries(doc.aggregatedSkills)), id: doc._id };
  }

  async saveSkill(skill: Skill): Promise<void> {
    console.log(`Saving skill ${skill.id} to MongoDB`);
    // await db.collection('skills').replaceOne({ _id: skill.id }, { ...skill, _id: skill.id }, { upsert: true });
  }

  async saveQuest(quest: Quest): Promise<void> {
    console.log(`Saving quest ${quest.id} to MongoDB`);
    // await db.collection('quests').replaceOne({ _id: quest.id }, { ...quest, _id: quest.id }, { upsert: true });
  }

  async loadAllAgents(): Promise<Agent[]> {
    console.log(`Loading all agents from MongoDB`);
    return [];
    // const docs = await db.collection('agents').find({}).toArray();
    // return docs.map(doc => ({ ...doc, skills: new Map(Object.entries(doc.skills)), id: doc._id }));
  }

  async loadAllSkills(): Promise<Skill[]> {
    console.log(`Loading all skills from MongoDB`);
    return [];
    // return await db.collection('skills').find({}).toArray();
  }

  async loadAllQuests(): Promise<Quest[]> {
    console.log(`Loading all quests from MongoDB`);
    return [];
    // return await db.collection('quests').find({}).toArray();
  }

  // Issue #2: Embedding storage methods
  async saveEmbedding(embedding: EmbeddingRecord): Promise<void> {
    console.log(`Saving embedding for ${embedding.nodeId} to MongoDB`);
    // await db.collection('embeddings').replaceOne({ nodeId: embedding.nodeId, nodeType: embedding.nodeType }, { ...embedding, _id: embedding.id }, { upsert: true });
  }

  async loadEmbedding(nodeId: string, nodeType: string): Promise<EmbeddingRecord | null> {
    console.log(`Loading embedding for ${nodeId} (${nodeType}) from MongoDB`);
    return null;
    // return await db.collection('embeddings').findOne({ nodeId, nodeType });
  }

  async loadAllEmbeddings(): Promise<EmbeddingRecord[]> {
    console.log(`Loading all embeddings from MongoDB`);
    return [];
    // return await db.collection('embeddings').find({}).toArray();
  }

  // Issue #3: Subtree hash storage methods
  async saveSubtreeHash(record: SubtreeHashRecord): Promise<void> {
    console.log(`Saving subtree hash for ${record.nodeId} to MongoDB`);
    // await db.collection('subtree_hashes').replaceOne({ nodeId: record.nodeId }, { ...record, _id: record.id }, { upsert: true });
  }

  async loadSubtreeHash(nodeId: string): Promise<SubtreeHashRecord | null> {
    console.log(`Loading subtree hash for ${nodeId} from MongoDB`);
    return null;
    // return await db.collection('subtree_hashes').findOne({ nodeId });
  }

  async loadIsomorphicGroups(): Promise<IsomorphicGroup[]> {
    console.log(`Loading isomorphic groups from MongoDB`);
    return [];
    // return await db.collection('isomorphic_groups').find({}).toArray();
  }

  async saveIsomorphicGroup(group: IsomorphicGroup): Promise<void> {
    console.log(`Saving isomorphic group ${group.id} to MongoDB`);
    // await db.collection('isomorphic_groups').replaceOne({ _id: group.id }, { ...group, _id: group.id }, { upsert: true });
  }

  // Issue #4: Quantum state storage methods
  async saveQuantumState(state: QuantumState): Promise<void> {
    console.log(`Saving quantum state for ${state.nodeId} to MongoDB`);
    // await db.collection('quantum_states').replaceOne({ nodeId: state.nodeId }, state, { upsert: true });
  }

  async loadQuantumState(nodeId: string): Promise<QuantumState | null> {
    console.log(`Loading quantum state for ${nodeId} from MongoDB`);
    return null;
    // return await db.collection('quantum_states').findOne({ nodeId });
  }

  // Issue #5: Staking storage methods
  async saveStake(stake: Stake): Promise<void> {
    console.log(`Saving stake ${stake.id} to MongoDB`);
    // await db.collection('stakes').replaceOne({ _id: stake.id }, { ...stake, _id: stake.id }, { upsert: true });
  }

  async loadStake(stakeId: string): Promise<Stake | null> {
    console.log(`Loading stake ${stakeId} from MongoDB`);
    return null;
    // return await db.collection('stakes').findOne({ _id: stakeId });
  }

  async loadStakesByNode(nodeId: string): Promise<Stake[]> {
    console.log(`Loading stakes for node ${nodeId} from MongoDB`);
    return [];
    // return await db.collection('stakes').find({ $or: [{ sourceNodeId: nodeId }, { targetNodeId: nodeId }] }).toArray();
  }

  async loadStakesByUser(userId: string): Promise<Stake[]> {
    console.log(`Loading stakes for user ${userId} from MongoDB`);
    return [];
    // return await db.collection('stakes').find({ userId }).toArray();
  }

  async saveUserReputation(reputation: UserReputation): Promise<void> {
    console.log(`Saving reputation for user ${reputation.userId} to MongoDB`);
    // await db.collection('user_reputations').replaceOne({ userId: reputation.userId }, reputation, { upsert: true });
  }

  async loadUserReputation(userId: string): Promise<UserReputation | null> {
    console.log(`Loading reputation for user ${userId} from MongoDB`);
    return null;
    // return await db.collection('user_reputations').findOne({ userId });
  }
}

// ===== EXAMPLE USAGE =====

/**
 * Example usage of the Agent Evolution Engine
 */
export async function demonstrateEvolution(): Promise<void> {
  // Initialize storage (in real app, pass MongoDB connection)
  const storage = new MongoEvolutionStorage('mongodb://localhost:27017');
  const engine = new AgentEvolutionEngine(storage);

  // Create some agents
  const agent1 = await engine.createAgent('Alice', 'developer');
  const agent2 = await engine.createAgent('Bob', 'designer');

  // Simulate learning through experience
  await engine.awardExperience(agent1.id, 'communication', 150, 'task_completion');
  await engine.awardExperience(agent1.id, 'problem_solving', 200, 'debugging_session');

  // Simulate collaboration learning
  await engine.triggerCollaborationLearning(agent1.id, agent2.id, 'code_review');

  // Simulate terminal learning
  await engine.triggerTerminalLearning(agent1.id, 'git commit -m "fix bug"', 'committed successfully', true);

  // Simulate feedback learning
  await engine.triggerFeedbackLearning(agent1.id, 'Great communication and problem solving!', 5);

  console.log('Evolution simulation completed');
}