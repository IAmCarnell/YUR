/**
 * YUR Backend Server
 * 
 * Express server integrating the Agent Evolution System with REST API endpoints
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';
import { AgentEvolutionEngine, MongoEvolutionStorage, demonstrateEvolution } from './agents/evolution';
import { createEnhancementServices, EnhancementServices } from './services';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Initialize Evolution Engine and Enhancement Services
const storage = new MongoEvolutionStorage(MONGODB_URI);
const evolutionEngine = new AgentEvolutionEngine(storage);
const enhancementServices = createEnhancementServices(storage);

// ===== API ROUTES =====

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Agent routes
app.post('/api/agents', async (req, res) => {
  try {
    const { name, type } = req.body;
    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }
    
    const agent = await evolutionEngine.createAgent(name, type);
    res.status(201).json(agent);
  } catch (error) {
    console.error('Error creating agent:', error);
    res.status(500).json({ error: 'Failed to create agent' });
  }
});

app.get('/api/agents/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const agent = await evolutionEngine.getAgent(agentId);
    
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Convert Map to Object for JSON serialization
    const agentResponse = {
      ...agent,
      skills: Object.fromEntries(agent.skills)
    };
    
    res.json(agentResponse);
  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(500).json({ error: 'Failed to fetch agent' });
  }
});

// Award experience
app.post('/api/agents/:agentId/experience', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { skillId, xp, source } = req.body;
    
    if (!skillId || !xp || !source) {
      return res.status(400).json({ error: 'skillId, xp, and source are required' });
    }
    
    const success = await evolutionEngine.awardExperience(agentId, skillId, xp, source);
    
    if (!success) {
      return res.status(400).json({ error: 'Failed to award experience' });
    }
    
    res.json({ success: true, message: 'Experience awarded successfully' });
  } catch (error) {
    console.error('Error awarding experience:', error);
    res.status(500).json({ error: 'Failed to award experience' });
  }
});

// Learning triggers
app.post('/api/agents/:agentId/collaboration', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { collaboratorId, context } = req.body;
    
    if (!collaboratorId || !context) {
      return res.status(400).json({ error: 'collaboratorId and context are required' });
    }
    
    await evolutionEngine.triggerCollaborationLearning(agentId, collaboratorId, context);
    res.json({ success: true, message: 'Collaboration learning triggered' });
  } catch (error) {
    console.error('Error triggering collaboration learning:', error);
    res.status(500).json({ error: 'Failed to trigger collaboration learning' });
  }
});

app.post('/api/agents/:agentId/terminal-learning', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { command, output, success } = req.body;
    
    if (!command || output === undefined || success === undefined) {
      return res.status(400).json({ error: 'command, output, and success are required' });
    }
    
    await evolutionEngine.triggerTerminalLearning(agentId, command, output, success);
    res.json({ success: true, message: 'Terminal learning triggered' });
  } catch (error) {
    console.error('Error triggering terminal learning:', error);
    res.status(500).json({ error: 'Failed to trigger terminal learning' });
  }
});

app.post('/api/agents/:agentId/feedback', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { feedback, rating } = req.body;
    
    if (!feedback || !rating) {
      return res.status(400).json({ error: 'feedback and rating are required' });
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'rating must be between 1 and 5' });
    }
    
    await evolutionEngine.triggerFeedbackLearning(agentId, feedback, rating);
    res.json({ success: true, message: 'Feedback learning triggered' });
  } catch (error) {
    console.error('Error triggering feedback learning:', error);
    res.status(500).json({ error: 'Failed to trigger feedback learning' });
  }
});

// Quest routes
app.post('/api/agents/:agentId/quests/:questId/start', async (req, res) => {
  try {
    const { agentId, questId } = req.params;
    
    const success = await evolutionEngine.startQuest(agentId, questId);
    
    if (!success) {
      return res.status(400).json({ error: 'Failed to start quest' });
    }
    
    res.json({ success: true, message: 'Quest started successfully' });
  } catch (error) {
    console.error('Error starting quest:', error);
    res.status(500).json({ error: 'Failed to start quest' });
  }
});

app.post('/api/agents/:agentId/quests/:questId/complete', async (req, res) => {
  try {
    const { agentId, questId } = req.params;
    
    const success = await evolutionEngine.completeQuest(agentId, questId);
    
    if (!success) {
      return res.status(400).json({ error: 'Failed to complete quest' });
    }
    
    res.json({ success: true, message: 'Quest completed successfully' });
  } catch (error) {
    console.error('Error completing quest:', error);
    res.status(500).json({ error: 'Failed to complete quest' });
  }
});

// Demo route
app.post('/api/demo/evolution', async (req, res) => {
  try {
    await demonstrateEvolution();
    res.json({ success: true, message: 'Evolution demonstration completed' });
  } catch (error) {
    console.error('Error running evolution demo:', error);
    res.status(500).json({ error: 'Failed to run evolution demo' });
  }
});

// ===== ENHANCEMENT FEATURES API ROUTES (Issues #2-#5) =====

// Issue #2: Embedding integration and suggestions
app.get('/api/suggestions/:nodeId', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { nodeType = 'agent', topN = 5 } = req.query;
    
    if (!['agent', 'skill', 'quest', 'other'].includes(nodeType as string)) {
      return res.status(400).json({ error: 'Invalid nodeType. Must be agent, skill, quest, or other' });
    }
    
    const suggestions = await enhancementServices.generateSuggestions(
      nodeId,
      nodeType as 'agent' | 'skill' | 'quest' | 'other',
      parseInt(topN as string)
    );
    
    res.json(suggestions);
  } catch (error) {
    console.error('Error generating suggestions:', error);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
});

// Batch compute embeddings
app.post('/api/embeddings/batch-compute', async (req, res) => {
  try {
    const result = await enhancementServices.batchComputeEmbeddings();
    res.json(result);
  } catch (error) {
    console.error('Error computing embeddings:', error);
    res.status(500).json({ error: 'Failed to compute embeddings' });
  }
});

// Issue #3: Ontology merging and isomorphic detection
app.get('/api/ontology/isomorphic-candidates', async (req, res) => {
  try {
    const candidates = await enhancementServices.detectIsomorphicCandidates();
    res.json(candidates);
  } catch (error) {
    console.error('Error detecting isomorphic candidates:', error);
    res.status(500).json({ error: 'Failed to detect isomorphic candidates' });
  }
});

// Issue #4: Quantum states
app.post('/api/quantum/update-states', async (req, res) => {
  try {
    const agents = await storage.loadAllAgents();
    const result = await enhancementServices.updateQuantumStates(agents);
    res.json(result);
  } catch (error) {
    console.error('Error updating quantum states:', error);
    res.status(500).json({ error: 'Failed to update quantum states' });
  }
});

app.get('/api/quantum/states/:nodeId', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const state = await storage.loadQuantumState(nodeId);
    
    if (!state) {
      return res.status(404).json({ error: 'Quantum state not found' });
    }
    
    // Include visualization parameters
    const visualParams = enhancementServices.quantum.calculateVisualizationParams(state.uncertainty);
    
    res.json({
      ...state,
      visualizationParams: visualParams
    });
  } catch (error) {
    console.error('Error fetching quantum state:', error);
    res.status(500).json({ error: 'Failed to fetch quantum state' });
  }
});

app.post('/api/quantum/collapse/:nodeId', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { resolvedState, animationDuration = 1000 } = req.body;
    
    const collapsedState = enhancementServices.quantum.collapseQuantumState(
      nodeId,
      resolvedState,
      animationDuration
    );
    
    if (!collapsedState) {
      return res.status(404).json({ error: 'Quantum state not found' });
    }
    
    // Save updated state
    await storage.saveQuantumState(collapsedState);
    
    res.json(collapsedState);
  } catch (error) {
    console.error('Error collapsing quantum state:', error);
    res.status(500).json({ error: 'Failed to collapse quantum state' });
  }
});

// Issue #5: Knowledge staking
app.post('/api/stake', async (req, res) => {
  try {
    const { userId, sourceNodeId, targetNodeId, linkId, amount, claimType, evidence } = req.body;
    
    if (!userId || !sourceNodeId || !amount || !claimType) {
      return res.status(400).json({ 
        error: 'userId, sourceNodeId, amount, and claimType are required' 
      });
    }
    
    if (!['relevance', 'link_strength', 'accuracy', 'quality'].includes(claimType)) {
      return res.status(400).json({ 
        error: 'Invalid claimType. Must be relevance, link_strength, accuracy, or quality' 
      });
    }
    
    const stake = await enhancementServices.createStake(
      userId,
      sourceNodeId,
      targetNodeId,
      linkId,
      amount,
      claimType,
      evidence
    );
    
    if (!stake) {
      return res.status(400).json({ error: 'Failed to create stake' });
    }
    
    res.status(201).json(stake);
  } catch (error) {
    console.error('Error creating stake:', error);
    res.status(500).json({ error: 'Failed to create stake' });
  }
});

app.post('/api/slash', async (req, res) => {
  try {
    const { stakeId, reason, slasherUserId } = req.body;
    
    if (!stakeId || !reason) {
      return res.status(400).json({ error: 'stakeId and reason are required' });
    }
    
    const success = await enhancementServices.staking.slashStake(stakeId, reason, slasherUserId);
    
    if (!success) {
      return res.status(400).json({ error: 'Failed to slash stake' });
    }
    
    res.json({ success: true, message: 'Stake slashed successfully' });
  } catch (error) {
    console.error('Error slashing stake:', error);
    res.status(500).json({ error: 'Failed to slash stake' });
  }
});

app.get('/api/stakes/:nodeId', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const stakes = await storage.loadStakesByNode(nodeId);
    
    // Calculate consensus if stakes exist
    const consensus = stakes.length > 0 ? 
      enhancementServices.staking.calculateConsensus(stakes) : null;
    
    res.json({
      nodeId,
      stakes,
      consensus,
      retrievedAt: new Date()
    });
  } catch (error) {
    console.error('Error fetching stakes:', error);
    res.status(500).json({ error: 'Failed to fetch stakes' });
  }
});

app.get('/api/users/:userId/reputation', async (req, res) => {
  try {
    const { userId } = req.params;
    const reputation = await enhancementServices.staking.getUserReputation(userId);
    res.json(reputation);
  } catch (error) {
    console.error('Error fetching user reputation:', error);
    res.status(500).json({ error: 'Failed to fetch user reputation' });
  }
});

app.get('/api/stakes/recommendations/:userId/:nodeId', async (req, res) => {
  try {
    const { userId, nodeId } = req.params;
    const { claimType = 'relevance' } = req.query;
    
    const recommendations = await enhancementServices.staking.getStakeRecommendations(
      userId,
      nodeId,
      claimType as 'relevance' | 'link_strength' | 'accuracy' | 'quality'
    );
    
    res.json(recommendations);
  } catch (error) {
    console.error('Error generating stake recommendations:', error);
    res.status(500).json({ error: 'Failed to generate stake recommendations' });
  }
});

// Debug/monitoring endpoints
app.get('/api/node-status/:nodeId', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const status = await enhancementServices.getNodeStatus(nodeId);
    res.json(status);
  } catch (error) {
    console.error('Error fetching node status:', error);
    res.status(500).json({ error: 'Failed to fetch node status' });
  }
});

app.get('/api/stats/staking', async (req, res) => {
  try {
    const stats = enhancementServices.staking.getStakingStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching staking stats:', error);
    res.status(500).json({ error: 'Failed to fetch staking stats' });
  }
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`YUR Backend Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`MongoDB URI: ${MONGODB_URI}`);
});

export default app;