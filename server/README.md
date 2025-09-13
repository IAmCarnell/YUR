# YUR Agent Evolution System

A comprehensive agent evolution algorithm for the YUR platform backend that enables agents and Digital Twins to persistently learn new skills, gain experience, level up, unlock abilities, and evolve through quests, collaboration, and user feedback.

## Features

### Core Evolution Mechanics
- **Skill Graph/Tree System**: Hierarchical skill dependencies with prerequisites and unlocks
- **Experience & Leveling**: Progressive XP-based skill advancement with configurable thresholds
- **Quest Completion**: Structured learning objectives with rewards and criteria
- **Self-Learning Triggers**: Automatic skill acquisition from collaboration, terminal usage, and feedback
- **Digital Twin Aggregation**: Collective intelligence from all agent skills and experiences
- **Mutation Logic**: Emergent skill evolution when mastery thresholds are exceeded

### Persistent Storage
- **MongoDB Integration**: Durable storage for agents, skills, quests, and Digital Twin state
- **Flexible Storage Interface**: Pluggable storage backend for different database systems
- **State Persistence**: Full agent evolution history and learning triggers

### Extensible Architecture
- **Modular Design**: Easy addition of new skills, agent types, and learning mechanisms
- **Type-Safe Implementation**: Full TypeScript support with comprehensive interfaces
- **RESTful API**: Express.js backend with complete HTTP endpoints

## Quick Start

### Installation

```bash
cd server
npm install
```

### Configuration

1. Copy environment template:
```bash
cp .env.example .env
```

2. Configure MongoDB connection in `.env`:
```env
MONGODB_URI=mongodb://localhost:27017
DB_NAME=yur_evolution
PORT=3001
```

### Running the Server

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

### Running Tests

```bash
npm test
```

## API Documentation

### Agent Management

#### Create Agent
```http
POST /api/agents
Content-Type: application/json

{
  "name": "Alice",
  "type": "developer"
}
```

#### Get Agent
```http
GET /api/agents/{agentId}
```

#### Award Experience
```http
POST /api/agents/{agentId}/experience
Content-Type: application/json

{
  "skillId": "communication",
  "xp": 50,
  "source": "task_completion"
}
```

### Learning Triggers

#### Collaboration Learning
```http
POST /api/agents/{agentId}/collaboration
Content-Type: application/json

{
  "collaboratorId": "agent-id-2",
  "context": "code review session"
}
```

#### Terminal Learning
```http
POST /api/agents/{agentId}/terminal-learning
Content-Type: application/json

{
  "command": "git commit -m 'fix bug'",
  "output": "committed successfully",
  "success": true
}
```

#### Feedback Learning
```http
POST /api/agents/{agentId}/feedback
Content-Type: application/json

{
  "feedback": "Great communication and problem solving!",
  "rating": 5
}
```

### Quest System

#### Start Quest
```http
POST /api/agents/{agentId}/quests/{questId}/start
```

#### Complete Quest
```http
POST /api/agents/{agentId}/quests/{questId}/complete
```

## Architecture Overview

### Core Components

#### `AgentEvolutionEngine`
The main orchestrator that manages:
- Agent lifecycle and skill progression
- Learning trigger processing
- Digital Twin aggregation
- Quest management
- Mutation logic

#### `Agent` Interface
Represents an individual learning agent with:
- Unique identity and type
- Skill tree with experience tracking
- Quest progress and completion history
- Learning trigger records
- Collaboration history

#### `Skill` Interface
Defines learnable capabilities with:
- Progressive leveling system
- Prerequisite and unlock chains
- Mastery thresholds
- Source tracking
- Usage analytics

#### `DigitalTwin` Interface
Aggregates collective intelligence with:
- Cross-agent skill aggregation
- Emergent skill tracking
- Evolution event history
- Global metrics

### Storage Layer

The system uses a pluggable storage interface (`IEvolutionStorage`) with a MongoDB implementation (`MongoEvolutionStorage`). This allows for:
- Easy database migration
- Testing with mock storage
- Multi-tenancy support
- Backup and recovery

### Learning Mechanisms

#### 1. Experience-Based Learning
- Direct XP awards for skill usage
- Automatic leveling when thresholds are met
- Skill mastery tracking
- Agent-level progression

#### 2. Collaboration Learning
- Cross-agent skill transfer
- Collaboration history tracking
- Social learning bonuses
- Knowledge sharing incentives

#### 3. Environmental Learning
- Terminal command analysis
- Success/failure pattern recognition
- Contextual skill application
- Real-world interaction learning

#### 4. Feedback Learning
- User rating integration
- Sentiment analysis
- Performance correlation
- Continuous improvement loops

#### 5. Emergent Learning
- Skill mutation at mastery milestones
- Pattern recognition across agents
- Novel skill combination discovery
- Digital Twin emergence tracking

## Skill System

### Default Skills

The system initializes with foundational skills:

- **Communication** (Social)
  - Prerequisites: None
  - Unlocks: Collaboration, Teaching
  - Category: Social interaction and clarity

- **Problem Solving** (Cognitive)
  - Prerequisites: None
  - Unlocks: Debugging, Optimization
  - Category: Analytical thinking

- **Collaboration** (Social)
  - Prerequisites: Communication
  - Unlocks: Team Leadership, Knowledge Sharing
  - Category: Multi-agent coordination

- **Programming** (Technical)
  - Prerequisites: Problem Solving
  - Unlocks: Debugging, Code Review, Architecture
  - Category: Software development

### Skill Properties

Each skill includes:
- **Level**: Current skill level (1-max)
- **Experience**: Accumulated XP
- **Mastery Status**: Whether skill is mastered
- **Prerequisites**: Required skills to unlock
- **Unlock Chain**: Skills this enables
- **Learning Sources**: How skill was acquired
- **Usage Tracking**: Last used timestamp and frequency

### Skill Evolution

Skills can evolve through:
1. **Linear Progression**: Traditional XP-based leveling
2. **Mastery Unlocks**: New skills when others are mastered
3. **Mutation Events**: Novel skills from repeated mastery
4. **Collaboration Transfer**: Learning from other agents
5. **Environmental Adaptation**: Context-specific skill development

## Digital Twin Integration

The Digital Twin serves as a collective intelligence layer that:

### Aggregates Agent Learning
- Combines mastered skills from all agents
- Calculates average and maximum skill levels
- Tracks skill distribution across agent population
- Identifies learning patterns and trends

### Enables Emergence
- Detects when multiple agents master similar skills
- Triggers mutation events for novel skill creation
- Records evolution history for analysis
- Facilitates knowledge transfer between agents

### Provides Global Intelligence
- Offers system-wide skill recommendations
- Identifies skill gaps in agent population
- Suggests optimal learning paths
- Enables predictive skill development

## Extension Points

The system is designed for extensibility:

### Adding New Skills
```typescript
const newSkill: Skill = {
  id: 'machine_learning',
  name: 'Machine Learning',
  description: 'Ability to build and train ML models',
  category: 'technical',
  prerequisites: ['coding', 'problem_solving'],
  unlocks: ['ai_research', 'data_science'],
  masteryThreshold: 1200,
  // ... other properties
};

// Add to engine's skill catalog
engine.addSkill(newSkill);
```

### Custom Learning Triggers
```typescript
// Implement custom trigger logic
await engine.triggerCustomLearning(agentId, {
  type: 'custom_event',
  source: 'external_system',
  skillsAffected: ['domain_specific_skill'],
  xpMultiplier: 1.5,
  metadata: { customData: 'value' }
});
```

### New Agent Types
```typescript
// Agents can have different starting skills based on type
const specialistAgent = await engine.createAgent('Dr. Smith', 'researcher');
// Automatically gets research-specific starting skills
```

### Storage Backends
```typescript
// Implement IEvolutionStorage for different databases
class PostgresEvolutionStorage implements IEvolutionStorage {
  // Custom implementation for PostgreSQL
}

const engine = new AgentEvolutionEngine(new PostgresEvolutionStorage(config));
```

## Testing

The system includes comprehensive test coverage:

### Unit Tests
- Individual component testing
- Skill progression validation
- Learning trigger verification
- Error handling coverage

### Integration Tests
- Full evolution lifecycle testing
- Multi-agent interaction scenarios
- Storage integration validation
- API endpoint testing

### Performance Tests
- Large-scale agent simulation
- Concurrent learning scenarios
- Database performance validation
- Memory usage optimization

Run tests with:
```bash
npm test
npm run test:coverage
npm run test:integration
```

## Production Considerations

### Scaling
- Horizontal scaling through stateless design
- Database indexing for performance
- Caching layer for frequently accessed data
- Background processing for heavy operations

### Security
- Input validation on all endpoints
- Rate limiting for API calls
- Authentication and authorization integration
- Data encryption at rest

### Monitoring
- Learning progress analytics
- System performance metrics
- Error tracking and alerting
- Usage pattern analysis

### Backup & Recovery
- Regular database backups
- Point-in-time recovery capability
- Migration scripts for schema updates
- Disaster recovery procedures

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Ensure all tests pass
5. Submit a pull request

### Development Guidelines
- Follow TypeScript best practices
- Maintain test coverage above 90%
- Document new features and APIs
- Use semantic versioning for releases

## License

MIT License - see LICENSE file for details.