/**
 * Test suite for Enhancement Services (Issues #2-#5)
 */

import { 
  EmbeddingService, 
  MockEmbeddingProvider, 
  OpenAIEmbeddingProvider 
} from '../services/embedding';
import { 
  OntologyService,
  OntologyNode 
} from '../services/ontology';
import { 
  QuantumService 
} from '../services/quantum';
import { 
  StakingService 
} from '../services/staking';
import { Agent, Skill } from '../agents/evolution';

describe('Enhancement Services', () => {
  
  describe('Issue #2: Embedding Service', () => {
    let embeddingService: EmbeddingService;

    beforeEach(() => {
      embeddingService = new EmbeddingService(new MockEmbeddingProvider());
    });

    test('should generate deterministic embeddings', async () => {
      const embedding1 = await embeddingService.generateEmbedding('test1', 'skill', 'JavaScript', 'Programming language');
      const embedding2 = await embeddingService.generateEmbedding('test1', 'skill', 'JavaScript', 'Programming language');
      
      expect(embedding1.embedding).toEqual(embedding2.embedding);
      expect(embedding1.embedding.length).toBe(384); // Mock provider dimensions
    });

    test('should calculate cosine similarity correctly', () => {
      const vector1 = [1, 0, 0];
      const vector2 = [1, 0, 0];
      const vector3 = [0, 1, 0];
      
      const similarity1 = embeddingService.cosineSimilarity(vector1, vector2);
      const similarity2 = embeddingService.cosineSimilarity(vector1, vector3);
      
      expect(similarity1).toBeCloseTo(1.0, 5); // Same vectors
      expect(similarity2).toBeCloseTo(0.0, 5); // Orthogonal vectors
    });

    test('should find similar nodes correctly', async () => {
      const targetEmbedding = await embeddingService.generateEmbedding('target', 'skill', 'JavaScript', 'Programming');
      const similar1 = await embeddingService.generateEmbedding('sim1', 'skill', 'TypeScript', 'Programming');
      const similar2 = await embeddingService.generateEmbedding('sim2', 'skill', 'Cooking', 'Food preparation');
      
      const suggestions = await embeddingService.findSimilarNodes(
        targetEmbedding,
        [similar1, similar2],
        2
      );
      
      expect(suggestions).toHaveLength(2);
      expect(suggestions[0].sourceId).toBe('target');
      expect(suggestions[0].similarity).toBeGreaterThan(suggestions[1].similarity);
    });

    test('should generate agent embeddings from skills', async () => {
      const mockAgent: Agent = {
        id: 'agent1',
        name: 'TestAgent',
        type: 'developer',
        skills: new Map([
          ['js', { id: 'js', name: 'JavaScript', description: 'Programming language' } as Skill],
          ['react', { id: 'react', name: 'React', description: 'UI library' } as Skill]
        ]),
        totalXP: 100,
        level: 2,
        completedQuests: [],
        activeQuests: [],
        learningTriggers: [],
        createdAt: new Date(),
        lastActive: new Date(),
        mutationCount: 0,
        collaborationHistory: []
      };

      const embedding = await embeddingService.generateAgentEmbedding(mockAgent);
      
      expect(embedding.nodeId).toBe('agent1');
      expect(embedding.nodeType).toBe('agent');
      expect(embedding.metadata.label).toBe('TestAgent');
    });

    test('should batch generate embeddings', async () => {
      const nodes = [
        { nodeId: 'n1', nodeType: 'skill' as const, label: 'JavaScript', description: 'Programming' },
        { nodeId: 'n2', nodeType: 'skill' as const, label: 'Python', description: 'Programming' },
        { nodeId: 'n3', nodeType: 'agent' as const, label: 'TestAgent', description: 'Developer' }
      ];

      const embeddings = await embeddingService.batchGenerateEmbeddings(nodes);
      
      expect(embeddings).toHaveLength(3);
      expect(embeddings[0].nodeId).toBe('n1');
      expect(embeddings[1].nodeId).toBe('n2');
      expect(embeddings[2].nodeId).toBe('n3');
    });
  });

  describe('Issue #3: Ontology Service', () => {
    let ontologyService: OntologyService;

    beforeEach(() => {
      ontologyService = new OntologyService();
    });

    test('should generate consistent subtree hashes', () => {
      const node1: OntologyNode = {
        id: 'test1',
        label: 'Programming',
        type: 'skill',
        children: [
          { id: 'js', label: 'JavaScript', type: 'skill', children: [] },
          { id: 'py', label: 'Python', type: 'skill', children: [] }
        ]
      };

      const node2: OntologyNode = {
        id: 'test2',
        label: 'Programming',
        type: 'skill',
        children: [
          { id: 'js2', label: 'JavaScript', type: 'skill', children: [] },
          { id: 'py2', label: 'Python', type: 'skill', children: [] }
        ]
      };

      const hash1 = ontologyService.generateSubtreeHash(node1);
      const hash2 = ontologyService.generateSubtreeHash(node2);
      
      expect(hash1).toBe(hash2); // Same structure should produce same hash
    });

    test('should create subtree hash records', () => {
      const node: OntologyNode = {
        id: 'test',
        label: 'Programming',
        type: 'skill',
        children: [
          { id: 'js', label: 'JavaScript', type: 'skill', children: [] }
        ]
      };

      const record = ontologyService.createSubtreeHashRecord(node);
      
      expect(record.nodeId).toBe('test');
      expect(record.depth).toBe(1);
      expect(record.childrenCount).toBe(1);
      expect(record.metadata.nodeLabel).toBe('Programming');
      expect(record.metadata.childrenLabels).toEqual(['JavaScript']);
    });

    test('should detect isomorphic groups', () => {
      const hashRecords = [
        { id: '1', nodeId: 'n1', hash: 'abc123', depth: 1, childrenCount: 2, metadata: { nodeLabel: 'Test1', childrenLabels: [], generatedAt: new Date() } },
        { id: '2', nodeId: 'n2', hash: 'abc123', depth: 1, childrenCount: 2, metadata: { nodeLabel: 'Test2', childrenLabels: [], generatedAt: new Date() } },
        { id: '3', nodeId: 'n3', hash: 'def456', depth: 1, childrenCount: 1, metadata: { nodeLabel: 'Test3', childrenLabels: [], generatedAt: new Date() } }
      ];

      const groups = ontologyService.detectIsomorphicGroups(hashRecords);
      
      expect(groups).toHaveLength(1); // Only one group with multiple nodes
      expect(groups[0].nodeIds).toEqual(['n1', 'n2']);
      expect(groups[0].hash).toBe('abc123');
    });

    test('should build ontology from agents', () => {
      const mockAgents: Agent[] = [
        {
          id: 'agent1',
          name: 'Developer',
          type: 'developer',
          skills: new Map([
            ['js', { id: 'js', name: 'JavaScript', description: 'Programming', category: 'technical' } as Skill],
            ['comm', { id: 'comm', name: 'Communication', description: 'Soft skill', category: 'soft' } as Skill]
          ]),
          totalXP: 100,
          level: 2,
          completedQuests: [],
          activeQuests: [],
          learningTriggers: [],
          createdAt: new Date(),
          lastActive: new Date(),
          mutationCount: 0,
          collaborationHistory: []
        }
      ];

      const ontologyNodes = ontologyService.buildOntologyFromAgents(mockAgents);
      
      expect(ontologyNodes).toHaveLength(1);
      expect(ontologyNodes[0].id).toBe('agent1');
      expect(ontologyNodes[0].label).toBe('Developer');
      expect(ontologyNodes[0].children.length).toBe(2); // Two categories: technical, soft
    });

    test('should generate ontology statistics', () => {
      const nodes: OntologyNode[] = [
        {
          id: 'root',
          label: 'Root',
          type: 'agent',
          children: [
            { id: 'child1', label: 'Child1', type: 'skill', children: [] },
            { id: 'child2', label: 'Child2', type: 'skill', children: [] }
          ]
        }
      ];

      const stats = ontologyService.generateOntologyStats(nodes);
      
      expect(stats.totalNodes).toBe(3);
      expect(stats.maxDepth).toBe(1);
      expect(stats.nodesByType.agent).toBe(1);
      expect(stats.nodesByType.skill).toBe(2);
    });
  });

  describe('Issue #4: Quantum Service', () => {
    let quantumService: QuantumService;

    beforeEach(() => {
      quantumService = new QuantumService();
    });

    test('should calculate agent uncertainty correctly', () => {
      const mockAgent: Agent = {
        id: 'agent1',
        name: 'TestAgent',
        type: 'developer',
        skills: new Map(),
        totalXP: 100,
        level: 2,
        completedQuests: [],
        activeQuests: [],
        learningTriggers: [],
        createdAt: new Date(),
        lastActive: new Date(),
        mutationCount: 0,
        collaborationHistory: []
      };

      const uncertainty = quantumService.calculateAgentUncertainty(
        mockAgent,
        [0.8, 0.9], // High similarity scores
        { totalStaked: 100, consensus: 0.8 }, // Good consensus
        5 // 5 days old
      );

      expect(uncertainty).toBeGreaterThan(0);
      expect(uncertainty).toBeLessThan(1);
    });

    test('should calculate skill uncertainty', () => {
      const mockSkill: Skill = {
        id: 'js',
        name: 'JavaScript',
        description: 'Programming language',
        category: 'technical',
        level: 3,
        experience: 150,
        totalExperience: 150,
        experienceToNext: 100,
        maxLevel: 10,
        prerequisites: [],
        unlocks: [],
        masteryThreshold: 500,
        isMastered: false,
        learnedFrom: ['initial'],
        lastUsed: new Date(),
        timesMastered: 0
      };

      const uncertainty = quantumService.calculateSkillUncertainty(mockSkill, 5, 0.7);
      
      expect(uncertainty).toBeGreaterThan(0);
      expect(uncertainty).toBeLessThan(1);
    });

    test('should create and manage quantum states', () => {
      const state = quantumService.createQuantumState('node1', 0.5);
      
      expect(state.nodeId).toBe('node1');
      expect(state.uncertainty).toBe(0.5);
      expect(state.collapsedState).toBeUndefined();
      
      const retrievedState = quantumService.getQuantumState('node1');
      expect(retrievedState).toEqual(state);
    });

    test('should collapse quantum states', () => {
      quantumService.createQuantumState('node1', 0.8);
      
      const collapsedState = quantumService.collapseQuantumState('node1', { resolved: true });
      
      expect(collapsedState).not.toBeNull();
      expect(collapsedState!.uncertainty).toBeLessThan(0.8);
      expect(collapsedState!.collapsedState).toEqual({ resolved: true });
      expect(collapsedState!.lastCollapsed).toBeDefined();
    });

    test('should calculate visualization parameters', () => {
      const params = quantumService.calculateVisualizationParams(0.7);
      
      expect(params.cloudRadius).toBeGreaterThan(10);
      expect(params.opacity).toBeGreaterThan(0.2);
      expect(params.particleCount).toBeGreaterThan(5);
      expect(params.animationSpeed).toBeGreaterThan(0.5);
      expect(params.colors).toHaveLength(2);
    });

    test('should batch update quantum states', () => {
      const updates = [
        { nodeId: 'n1', uncertainty: 0.3 },
        { nodeId: 'n2', uncertainty: 0.7 },
        { nodeId: 'n3', uncertainty: 0.1 }
      ];

      const results = quantumService.batchUpdateQuantumStates(updates);
      
      expect(results).toHaveLength(3);
      expect(results[0].uncertainty).toBe(0.3);
      expect(results[1].uncertainty).toBe(0.7);
      expect(results[2].uncertainty).toBe(0.1);
    });

    test('should calculate entanglement between nodes', () => {
      quantumService.createQuantumState('n1', 0.6);
      quantumService.createQuantumState('n2', 0.4);
      
      const entanglement = quantumService.calculateEntanglement('n1', 'n2', {
        type: 'collaboration',
        strength: 0.8
      });
      
      expect(entanglement).toBeGreaterThan(0);
      expect(entanglement).toBeLessThanOrEqual(1);
    });
  });

  describe('Issue #5: Staking Service', () => {
    let stakingService: StakingService;

    beforeEach(() => {
      stakingService = new StakingService();
    });

    test('should create valid stakes', async () => {
      const stake = await stakingService.createStake(
        'user1',
        'node1',
        'node2',
        undefined,
        50,
        'relevance',
        'This connection is relevant because...'
      );

      expect(stake).not.toBeNull();
      expect(stake!.userId).toBe('user1');
      expect(stake!.sourceNodeId).toBe('node1');
      expect(stake!.amount).toBe(50);
      expect(stake!.claimType).toBe('relevance');
      expect(stake!.status).toBe('active');
    });

    test('should validate stake amounts', async () => {
      // Should fail for amount too small
      const stake1 = await stakingService.createStake('user1', 'node1', undefined, undefined, 0, 'relevance');
      expect(stake1).toBeNull();

      // Should fail for amount too large
      const stake2 = await stakingService.createStake('user1', 'node1', undefined, undefined, 2000, 'relevance');
      expect(stake2).toBeNull();

      // Should succeed for valid amount
      const stake3 = await stakingService.createStake('user1', 'node1', undefined, undefined, 50, 'relevance');
      expect(stake3).not.toBeNull();
    });

    test('should slash stakes correctly', async () => {
      const stake = await stakingService.createStake('user1', 'node1', undefined, undefined, 100, 'relevance');
      expect(stake).not.toBeNull();

      const success = await stakingService.slashStake(stake!.id, 'False claim detected');
      expect(success).toBe(true);

      const slashedStake = stakingService.getStakesByUser('user1')[0];
      expect(slashedStake.status).toBe('slashed');
      expect(slashedStake.slashReason).toBe('False claim detected');
    });

    test('should resolve stakes', async () => {
      const stake = await stakingService.createStake('user1', 'node1', undefined, undefined, 100, 'relevance');
      expect(stake).not.toBeNull();

      const success = await stakingService.resolveStake(stake!.id, true);
      expect(success).toBe(true);

      const resolvedStake = stakingService.getStakesByUser('user1')[0];
      expect(resolvedStake.status).toBe('resolved');
    });

    test('should calculate consensus correctly', async () => {
      // Create supporting stakes
      const stake1 = await stakingService.createStake('user1', 'node1', undefined, undefined, 100, 'relevance');
      const stake2 = await stakingService.createStake('user2', 'node1', undefined, undefined, 50, 'accuracy');
      
      expect(stake1).not.toBeNull();
      expect(stake2).not.toBeNull();

      const stakes = stakingService.getStakesByNode('node1');
      const consensus = stakingService.calculateConsensus(stakes);

      expect(consensus.support).toBeGreaterThan(0);
      expect(consensus.totalStaked).toBe(150);
      expect(consensus.stakeholderCount).toBe(2);
      expect(consensus.confidence).toBeGreaterThan(0);
    });

    test('should manage user reputation', async () => {
      const reputation = await stakingService.getUserReputation('user1');
      
      expect(reputation.userId).toBe('user1');
      expect(reputation.reputation).toBe(100); // Starting reputation
      expect(reputation.totalStaked).toBe(0);
      expect(reputation.stakes).toHaveLength(0);
    });

    test('should provide stake recommendations', async () => {
      const recommendations = await stakingService.getStakeRecommendations('user1', 'node1', 'relevance');
      
      expect(recommendations.recommendedAmount).toBeGreaterThan(0);
      expect(recommendations.maxAllowedAmount).toBeGreaterThan(0);
      expect(['low', 'medium', 'high']).toContain(recommendations.riskLevel);
      expect(recommendations.explanation).toBeTruthy();
    });

    test('should generate staking statistics', async () => {
      await stakingService.createStake('user1', 'node1', undefined, undefined, 100, 'relevance');
      await stakingService.createStake('user2', 'node2', undefined, undefined, 50, 'accuracy');
      
      const stats = stakingService.getStakingStats();
      
      expect(stats.totalStakes).toBe(2);
      expect(stats.activeStakes).toBe(2);
      expect(stats.totalStakedAmount).toBe(150);
      expect(stats.averageStakeAmount).toBe(75);
      expect(stats.topStakers).toHaveLength(2);
    });

    test('should prevent duplicate stakes from same user', async () => {
      const stake1 = await stakingService.createStake('user1', 'node1', undefined, undefined, 50, 'relevance');
      expect(stake1).not.toBeNull();

      const stake2 = await stakingService.createStake('user1', 'node1', undefined, undefined, 30, 'accuracy');
      expect(stake2).toBeNull(); // Should fail due to existing stake
    });

    test('should apply reputation decay', async () => {
      const reputation = await stakingService.getUserReputation('user1');
      const originalReputation = reputation.reputation;
      
      // Manually set old last activity
      reputation.lastActivity = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
      
      stakingService.applyReputationDecay();
      
      const updatedReputation = await stakingService.getUserReputation('user1');
      expect(updatedReputation.reputation).toBeLessThan(originalReputation);
    });
  });
});