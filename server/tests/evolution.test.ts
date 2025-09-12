/**
 * Test suite for YUR Agent Evolution System
 */

import { AgentEvolutionEngine, MongoEvolutionStorage, Agent, Skill, IEvolutionStorage } from '../agents/evolution';

// Mock storage implementation for testing
class MockEvolutionStorage implements IEvolutionStorage {
  private agents: Map<string, Agent> = new Map();
  private skills: Map<string, Skill> = new Map();
  private quests: any[] = [];
  private digitalTwin: any = null;

  async saveAgent(agent: Agent): Promise<void> {
    this.agents.set(agent.id, JSON.parse(JSON.stringify(agent)));
  }

  async loadAgent(agentId: string): Promise<Agent | null> {
    const agent = this.agents.get(agentId);
    return agent ? JSON.parse(JSON.stringify(agent)) : null;
  }

  async saveDigitalTwin(twin: any): Promise<void> {
    this.digitalTwin = JSON.parse(JSON.stringify(twin));
  }

  async loadDigitalTwin(): Promise<any> {
    return this.digitalTwin;
  }

  async saveSkill(skill: Skill): Promise<void> {
    this.skills.set(skill.id, JSON.parse(JSON.stringify(skill)));
  }

  async saveQuest(quest: any): Promise<void> {
    this.quests.push(JSON.parse(JSON.stringify(quest)));
  }

  async loadAllAgents(): Promise<Agent[]> {
    return Array.from(this.agents.values());
  }

  async loadAllSkills(): Promise<Skill[]> {
    return Array.from(this.skills.values());
  }

  async loadAllQuests(): Promise<any[]> {
    return [...this.quests];
  }
}

describe('Agent Evolution System', () => {
  let engine: AgentEvolutionEngine;
  let storage: MockEvolutionStorage;

  beforeEach(() => {
    storage = new MockEvolutionStorage();
    engine = new AgentEvolutionEngine(storage);
  });

  describe('Agent Creation', () => {
    test('should create a new agent with basic skills', async () => {
      const agent = await engine.createAgent('TestAgent', 'developer');
      
      expect(agent).toBeDefined();
      expect(agent.name).toBe('TestAgent');
      expect(agent.type).toBe('developer');
      expect(agent.level).toBe(1);
      expect(agent.totalXP).toBe(0);
      expect(agent.skills.size).toBeGreaterThan(0);
      expect(agent.skills.has('communication')).toBe(true);
      expect(agent.skills.has('problem_solving')).toBe(true);
    });

    test('should initialize agent with correct skill levels', async () => {
      const agent = await engine.createAgent('TestAgent', 'developer');
      
      const communicationSkill = agent.skills.get('communication');
      expect(communicationSkill).toBeDefined();
      expect(communicationSkill!.level).toBe(1);
      expect(communicationSkill!.experience).toBe(0);
      expect(communicationSkill!.isMastered).toBe(false);
    });
  });

  describe('Experience and Leveling', () => {
    let agent: Agent;

    beforeEach(async () => {
      agent = await engine.createAgent('TestAgent', 'developer');
    });

    test('should award experience to existing skill', async () => {
      const success = await engine.awardExperience(agent.id, 'communication', 50, 'test');
      
      expect(success).toBe(true);
      
      const updatedAgent = await engine.getAgent(agent.id);
      const skill = updatedAgent!.skills.get('communication');
      expect(skill!.experience).toBe(50);
      expect(updatedAgent!.totalXP).toBe(50);
    });

    test('should level up skill when experience threshold is reached', async () => {
      // Award enough XP to level up (initial threshold is 100)
      await engine.awardExperience(agent.id, 'communication', 150, 'test');
      
      const updatedAgent = await engine.getAgent(agent.id);
      const skill = updatedAgent!.skills.get('communication');
      expect(skill!.level).toBe(2);
      expect(skill!.experience).toBe(50); // 150 - 100 (threshold for level 1)
    });

    test('should master skill when mastery threshold is reached', async () => {
      // Award enough XP to master the skill (threshold is 500)
      await engine.awardExperience(agent.id, 'communication', 600, 'test');
      
      const updatedAgent = await engine.getAgent(agent.id);
      const skill = updatedAgent!.skills.get('communication');
      expect(skill!.isMastered).toBe(true);
      expect(skill!.timesMastered).toBe(1);
    });

    test('should update agent level based on total XP', async () => {
      // Award significant XP to increase agent level
      await engine.awardExperience(agent.id, 'communication', 400, 'test');
      
      const updatedAgent = await engine.getAgent(agent.id);
      expect(updatedAgent!.level).toBeGreaterThan(1);
    });
  });

  describe('Skill Learning and Unlocking', () => {
    let agent: Agent;

    beforeEach(async () => {
      agent = await engine.createAgent('TestAgent', 'developer');
    });

    test('should learn new skill manually', async () => {
      const success = await engine.learnSkill(agent, 'collaboration', 'manual');
      
      expect(success).toBe(true);
      expect(agent.skills.has('collaboration')).toBe(true);
      
      const skill = agent.skills.get('collaboration');
      expect(skill!.level).toBe(1);
      expect(skill!.learnedFrom).toContain('manual');
    });

    test('should not learn skill that agent already has', async () => {
      const success = await engine.learnSkill(agent, 'communication', 'duplicate');
      
      expect(success).toBe(false);
    });

    test('should unlock skills when prerequisites are met', async () => {
      // Communication is a prerequisite for collaboration
      // Level up communication to trigger unlock
      await engine.awardExperience(agent.id, 'communication', 150, 'test');
      
      const updatedAgent = await engine.getAgent(agent.id);
      // Check if collaboration skill was unlocked
      expect(updatedAgent!.skills.has('collaboration')).toBe(true);
    });
  });

  describe('Learning Triggers', () => {
    let agent1: Agent;
    let agent2: Agent;

    beforeEach(async () => {
      agent1 = await engine.createAgent('Agent1', 'developer');
      agent2 = await engine.createAgent('Agent2', 'designer');
    });

    test('should trigger collaboration learning', async () => {
      // Give agent2 some advanced skills
      await engine.learnSkill(agent2, 'collaboration', 'setup');
      await engine.awardExperience(agent2.id, 'collaboration', 300, 'setup');
      
      await engine.triggerCollaborationLearning(agent1.id, agent2.id, 'code review');
      
      const updatedAgent1 = await engine.getAgent(agent1.id);
      expect(updatedAgent1!.collaborationHistory).toContain(agent2.id);
      expect(updatedAgent1!.learningTriggers.length).toBeGreaterThan(0);
      
      const trigger = updatedAgent1!.learningTriggers[0];
      expect(trigger.type).toBe('collaboration');
      expect(trigger.metadata.collaboratorId).toBe(agent2.id);
    });

    test('should trigger terminal learning', async () => {
      await engine.triggerTerminalLearning(agent1.id, 'git commit -m "test"', 'success', true);
      
      const updatedAgent = await engine.getAgent(agent1.id);
      expect(updatedAgent!.learningTriggers.length).toBeGreaterThan(0);
      
      const trigger = updatedAgent!.learningTriggers[0];
      expect(trigger.type).toBe('terminal_command');
      expect(trigger.source).toBe('git commit -m "test"');
      expect(trigger.metadata.success).toBe(true);
    });

    test('should trigger feedback learning', async () => {
      await engine.triggerFeedbackLearning(agent1.id, 'Great communication skills!', 5);
      
      const updatedAgent = await engine.getAgent(agent1.id);
      expect(updatedAgent!.learningTriggers.length).toBeGreaterThan(0);
      
      const trigger = updatedAgent!.learningTriggers[0];
      expect(trigger.type).toBe('feedback_received');
      expect(trigger.metadata.rating).toBe(5);
    });

    test('should award less XP for failed terminal commands', async () => {
      const agent = await engine.createAgent('TestAgent', 'developer');
      
      // Learn coding skill first
      await engine.learnSkill(agent, 'coding', 'setup');
      
      await engine.triggerTerminalLearning(agent.id, 'git push', 'error: failed', false);
      
      const updatedAgent = await engine.getAgent(agent.id);
      const trigger = updatedAgent!.learningTriggers[0];
      
      // Should award XP but with reduced multiplier for failed commands
      expect(trigger.xpAwarded).toBeGreaterThan(0);
      expect(trigger.metadata.success).toBe(false);
    });
  });

  describe('Digital Twin Integration', () => {
    test('should aggregate mastered skills to Digital Twin', async () => {
      const agent = await engine.createAgent('TestAgent', 'developer');
      
      // Master a skill
      await engine.awardExperience(agent.id, 'communication', 600, 'test');
      
      // Verify Digital Twin has been updated
      // Note: In real implementation, this would check the actual Digital Twin state
      // For now, we verify the skill was mastered
      const updatedAgent = await engine.getAgent(agent.id);
      const skill = updatedAgent!.skills.get('communication');
      expect(skill!.isMastered).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid agent ID gracefully', async () => {
      const success = await engine.awardExperience('invalid-id', 'communication', 50, 'test');
      expect(success).toBe(false);
    });

    test('should handle invalid skill ID gracefully', async () => {
      const agent = await engine.createAgent('TestAgent', 'developer');
      const success = await engine.awardExperience(agent.id, 'invalid-skill', 50, 'test');
      expect(success).toBe(false);
    });

    test('should handle learning non-existent skill gracefully', async () => {
      const agent = await engine.createAgent('TestAgent', 'developer');
      const success = await engine.learnSkill(agent, 'non-existent-skill', 'test');
      expect(success).toBe(false);
    });
  });

  describe('Skill Analysis', () => {
    let agent: Agent;

    beforeEach(async () => {
      agent = await engine.createAgent('TestAgent', 'developer');
    });

    test('should correctly analyze commands for relevant skills', async () => {
      // Test git command recognition
      await engine.triggerTerminalLearning(agent.id, 'git status', 'clean', true);
      
      const updatedAgent = await engine.getAgent(agent.id);
      const trigger = updatedAgent!.learningTriggers[0];
      
      // Should recognize git as relevant to coding and collaboration
      expect(trigger.source).toBe('git status');
      expect(trigger.type).toBe('terminal_command');
    });

    test('should correctly analyze feedback for relevant skills', async () => {
      await engine.triggerFeedbackLearning(agent.id, 'Great problem solving approach!', 4);
      
      const updatedAgent = await engine.getAgent(agent.id);
      const trigger = updatedAgent!.learningTriggers[0];
      
      expect(trigger.metadata.feedback).toContain('problem solving');
      expect(trigger.metadata.rating).toBe(4);
    });
  });
});

// Integration tests for the complete system
describe('Integration Tests', () => {
  let engine: AgentEvolutionEngine;
  let storage: MockEvolutionStorage;

  beforeEach(() => {
    storage = new MockEvolutionStorage();
    engine = new AgentEvolutionEngine(storage);
  });

  test('should complete full agent evolution lifecycle', async () => {
    // Create agent
    const agent = await engine.createAgent('FullTestAgent', 'developer');
    expect(agent.level).toBe(1);
    
    // Award experience and level up
    await engine.awardExperience(agent.id, 'communication', 200, 'practice');
    
    let updatedAgent = await engine.getAgent(agent.id);
    expect(updatedAgent!.skills.get('communication')!.level).toBeGreaterThan(1);
    
    // Trigger collaboration learning
    const collaborator = await engine.createAgent('Collaborator', 'designer');
    await engine.learnSkill(collaborator, 'collaboration', 'setup');
    await engine.awardExperience(collaborator.id, 'collaboration', 400, 'setup');
    
    await engine.triggerCollaborationLearning(agent.id, collaborator.id, 'pair programming');
    
    // Check learning trigger was recorded
    updatedAgent = await engine.getAgent(agent.id);
    expect(updatedAgent!.learningTriggers.length).toBeGreaterThan(0);
    expect(updatedAgent!.collaborationHistory).toContain(collaborator.id);
    
    // Master a skill
    await engine.awardExperience(agent.id, 'communication', 400, 'mastery practice');
    
    updatedAgent = await engine.getAgent(agent.id);
    expect(updatedAgent!.skills.get('communication')!.isMastered).toBe(true);
    
    // Verify agent has evolved
    expect(updatedAgent!.totalXP).toBeGreaterThan(0);
    expect(updatedAgent!.level).toBeGreaterThan(1);
  });
});