# YUR Framework Developer Guide

## Getting Started

### Prerequisites

- **Node.js**: >= 18.0.0
- **Python**: >= 3.8 (for backend components)
- **Docker**: Latest stable version (optional but recommended)
- **Git**: Latest version

### Development Environment Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/IAmCarnell/YUR.git
   cd YUR
   ```

2. **Install Dependencies**
   ```bash
   # Install all project dependencies
   npm run install:all
   
   # Or install individually
   npm install                    # Root dependencies
   cd frontend && npm install     # Frontend dependencies
   cd ../backend && pip install -r requirements.txt  # Backend dependencies
   ```

3. **Environment Configuration**
   ```bash
   # Copy environment templates
   cp .env.example .env
   cp frontend/.env.example frontend/.env
   cp backend/.env.example backend/.env
   
   # Edit configuration files as needed
   ```

4. **Start Development Servers**
   ```bash
   # Start all services concurrently
   npm run dev
   
   # Or start individually
   npm run dev:frontend    # Frontend on http://localhost:5173
   npm run dev:backend     # Backend on http://localhost:8000
   ```

## Project Structure

### Directory Organization

```
yur/
├── agent-framework/           # Agent orchestration system
│   ├── src/
│   │   ├── orchestration/     # Workflow management
│   │   ├── agents/           # Agent implementations
│   │   ├── security/         # Security components
│   │   └── registry/         # Agent registry
│   └── README.md
├── analytics/                 # Metrics and monitoring
│   ├── src/
│   │   ├── collectors/       # Data collection
│   │   ├── dashboards/       # Visualization
│   │   └── processors/       # Data processing
│   └── README.md
├── build-tools/              # Build configuration
│   └── configs/
│       └── webpack.config.js # Advanced webpack setup
├── docs/                     # Centralized documentation
│   ├── architecture.md      # System architecture
│   ├── developer-guide.md   # This file
│   ├── performance-optimization.md
│   ├── WCAG.md              # Accessibility guidelines
│   └── hardening.md         # Security hardening
├── frontend/                 # React-based web interface
│   ├── src/
│   │   ├── components/       # Reusable components
│   │   ├── pages/           # Page components
│   │   ├── scientific/      # Scientific computing UI
│   │   └── spatial/         # Spatial interface components
│   ├── public/              # Static assets
│   └── package.json
├── mobile-ui/               # Mobile-specific components
│   └── src/components/      # Touch-optimized components
├── plugins/                 # Plugin system
│   ├── src/core/           # Core plugin management
│   ├── marketplace/        # Plugin marketplace
│   └── security/           # Plugin security
├── tests/                  # Comprehensive test suites
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   ├── accessibility/     # WCAG compliance tests
│   ├── performance/       # Performance benchmarks
│   ├── security/          # Security audits
│   └── end-to-end/        # E2E workflow tests
├── xr/                    # XR/AR/VR components
│   └── src/components/    # WebXR implementations
└── yur-os/               # Spatial computing interface
    ├── web-shell/        # Main spatial interface
    ├── apps/             # Spatial applications
    │   └── docs/         # Collaborative markdown editor
    └── assets/           # 3D models, textures
```

## Development Workflow

### Code Quality and Standards

1. **TypeScript Configuration**
   - Strict type checking enabled
   - Path mapping for clean imports
   - Consistent formatting with Prettier

2. **Linting and Formatting**
   ```bash
   # Lint all code
   npm run lint
   
   # Format code
   npm run format
   
   # Lint-specific areas
   npm run lint:frontend
   npm run lint:backend
   ```

3. **Git Workflow**
   ```bash
   # Create feature branch
   git checkout -b feature/your-feature-name
   
   # Make changes and commit
   git add .
   git commit -m "feat: add new feature"
   
   # Push and create PR
   git push origin feature/your-feature-name
   ```

### Testing Strategy

1. **Running Tests**
   ```bash
   # Run all tests
   npm test
   
   # Run specific test suites
   npm run test:unit
   npm run test:integration
   npm run test:accessibility
   npm run test:performance
   npm run test:security
   
   # Run tests with coverage
   npm run test:coverage
   
   # Watch mode for development
   npm run test:watch
   ```

2. **Test Categories**
   - **Unit Tests**: Test individual components and functions
   - **Integration Tests**: Test API endpoints and service integration
   - **Accessibility Tests**: WCAG 2.1 AA compliance verification
   - **Performance Tests**: Benchmarking and performance regression
   - **Security Tests**: Vulnerability scanning and security audit
   - **E2E Tests**: Full user workflow testing

3. **Writing Tests**
   ```typescript
   // Unit test example
   import { describe, it, expect } from '@jest/globals';
   import { validateDimensions } from '../utils/validation';
   
   describe('validateDimensions', () => {
     it('should accept valid dimension counts', () => {
       expect(validateDimensions(100)).toBe(true);
       expect(validateDimensions(1000)).toBe(true);
     });
   
     it('should reject invalid dimension counts', () => {
       expect(validateDimensions(-1)).toBe(false);
       expect(validateDimensions(10001)).toBe(false);
     });
   });
   ```

### Building and Deployment

1. **Development Build**
   ```bash
   npm run build:dev    # Development build with source maps
   ```

2. **Production Build**
   ```bash
   npm run build        # Optimized production build
   npm run build:analyze # Build with bundle analysis
   ```

3. **Docker Deployment**
   ```bash
   # Build containers
   docker-compose build
   
   # Start services
   docker-compose up
   
   # Stop services
   docker-compose down
   ```

## Component Development

### Frontend Component Development

1. **React Component Structure**
   ```typescript
   // src/components/ExampleComponent.tsx
   import React, { useState, useEffect } from 'react';
   
   interface ExampleProps {
     title: string;
     onAction: (data: any) => void;
   }
   
   export const ExampleComponent: React.FC<ExampleProps> = ({ 
     title, 
     onAction 
   }) => {
     const [state, setState] = useState(null);
   
     useEffect(() => {
       // Component initialization
     }, []);
   
     return (
       <div className="example-component">
         <h2>{title}</h2>
         {/* Component content */}
       </div>
     );
   };
   ```

2. **Styling Guidelines**
   - Use CSS-in-JS or CSS modules
   - Follow BEM naming conventions
   - Implement responsive design
   - Support dark/light themes

3. **Accessibility Requirements**
   - Include proper ARIA labels
   - Support keyboard navigation
   - Maintain focus management
   - Test with screen readers

### Agent Development

1. **Creating a New Agent**
   ```typescript
   // agent-framework/src/agents/ExampleAgent.ts
   import { BaseAgent } from '../core/BaseAgent';
   
   export class ExampleAgent extends BaseAgent {
     async initialize(): Promise<void> {
       // Agent initialization logic
     }
   
     async executeTask(task: any): Promise<any> {
       // Task execution logic
       return { success: true, result: 'completed' };
     }
   
     async getHealth(): Promise<{ healthy: boolean; reason?: string }> {
       return { healthy: true };
     }
   }
   ```

2. **Agent Registration**
   ```typescript
   // Register agent with orchestrator
   const agent = new ExampleAgent();
   await orchestrator.registerAgent({
     id: 'example-agent',
     name: 'Example Agent',
     type: 'data_processor',
     capabilities: ['data_analysis', 'reporting'],
     // ... other configuration
   });
   ```

### Plugin Development

1. **Plugin Structure**
   ```typescript
   // plugins/example-plugin/src/index.ts
   import { Plugin, PluginContext } from '@yur/plugin-sdk';
   
   export default class ExamplePlugin implements Plugin {
     constructor(private context: PluginContext) {}
   
     async activate(): Promise<void> {
       // Plugin activation logic
       const api = this.context.getAPI();
       
       // Register UI components
       api['yur.ui.register']({
         component: 'ExampleComponent',
         position: 'sidebar'
       });
     }
   
     async deactivate(): Promise<void> {
       // Cleanup logic
     }
   
     getInfo() {
       return {
         name: 'Example Plugin',
         version: '1.0.0',
         description: 'An example plugin'
       };
     }
   }
   ```

2. **Plugin Manifest**
   ```json
   {
     "id": "example-plugin",
     "name": "Example Plugin",
     "version": "1.0.0",
     "author": "Developer Name",
     "description": "Plugin description",
     "main": "dist/index.js",
     "permissions": [
       "yur.ui.register",
       "yur.storage.read"
     ],
     "category": "utility",
     "platforms": ["web", "mobile"]
   }
   ```

## Performance Optimization

### Frontend Performance

1. **Code Splitting**
   ```typescript
   // Lazy load components
   const HeavyComponent = lazy(() => import('./HeavyComponent'));
   
   // Route-based splitting
   const routes = [
     {
       path: '/scientific',
       component: lazy(() => import('./pages/Scientific'))
     }
   ];
   ```

2. **Bundle Optimization**
   - Use webpack-bundle-analyzer to identify large bundles
   - Implement tree shaking for unused code
   - Optimize third-party library imports

3. **Runtime Performance**
   ```typescript
   // Use React.memo for expensive components
   const ExpensiveComponent = React.memo(({ data }) => {
     // Expensive rendering logic
   });
   
   // Optimize re-renders with useCallback
   const handleClick = useCallback((id: string) => {
     // Event handler logic
   }, [dependency]);
   ```

### Backend Performance

1. **Database Optimization**
   - Use proper indexing
   - Implement query optimization
   - Use connection pooling

2. **Caching Strategy**
   - Implement Redis for session storage
   - Use memory caching for frequently accessed data
   - Implement CDN for static assets

### Monitoring Performance

1. **Performance Metrics**
   ```typescript
   // Track component performance
   const startTime = performance.now();
   // ... expensive operation
   const duration = performance.now() - startTime;
   
   metricsCollector.trackPerformance('operation_name', duration);
   ```

2. **Bundle Analysis**
   ```bash
   # Analyze bundle size
   ANALYZE=true npm run build
   
   # Performance budget check
   npm run build:check-size
   ```

## Security Guidelines

### Input Validation

1. **Frontend Validation**
   ```typescript
   const validateInput = (input: string): boolean => {
     // Sanitize and validate user input
     const sanitized = input.trim().replace(/<script[^>]*>.*?<\/script>/gi, '');
     return sanitized.length > 0 && sanitized.length < 1000;
   };
   ```

2. **Backend Validation**
   ```python
   from pydantic import BaseModel, validator
   
   class SimulationRequest(BaseModel):
       dimensions: int
       simulation_type: str
   
       @validator('dimensions')
       def validate_dimensions(cls, v):
           if v <= 0 or v > 10000:
               raise ValueError('Invalid dimension count')
           return v
   ```

### Authentication and Authorization

1. **API Security**
   ```typescript
   // JWT token validation
   const validateToken = (token: string): boolean => {
     try {
       const decoded = jwt.verify(token, process.env.JWT_SECRET);
       return !!decoded;
     } catch {
       return false;
     }
   };
   ```

2. **Role-based Access Control**
   ```typescript
   const hasPermission = (user: User, permission: string): boolean => {
     return user.roles.some(role => 
       role.permissions.includes(permission)
     );
   };
   ```

## Debugging and Troubleshooting

### Development Tools

1. **Browser DevTools**
   - Use React Developer Tools
   - Performance profiling
   - Network analysis
   - Console debugging

2. **VS Code Extensions**
   - TypeScript support
   - ESLint integration
   - Prettier formatting
   - Jest test runner

### Common Issues and Solutions

1. **Build Issues**
   ```bash
   # Clear node_modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   
   # Clear build cache
   npm run clean
   ```

2. **Test Issues**
   ```bash
   # Update test snapshots
   npm test -- --updateSnapshot
   
   # Run tests in debug mode
   npm test -- --debug
   ```

3. **Performance Issues**
   - Profile components with React DevTools
   - Use webpack-bundle-analyzer
   - Monitor memory usage
   - Check for memory leaks

## Contributing Guidelines

### Code Review Process

1. **Pull Request Checklist**
   - [ ] Tests pass locally
   - [ ] Code follows style guidelines
   - [ ] Documentation updated
   - [ ] Accessibility tested
   - [ ] Performance impact assessed

2. **Review Criteria**
   - Code quality and maintainability
   - Test coverage and quality
   - Security considerations
   - Performance impact
   - Documentation completeness

### Best Practices

1. **Code Organization**
   - Keep components small and focused
   - Use consistent naming conventions
   - Implement proper error handling
   - Write self-documenting code

2. **Testing Best Practices**
   - Write tests first (TDD)
   - Test behavior, not implementation
   - Use descriptive test names
   - Maintain high test coverage

3. **Documentation**
   - Update documentation with code changes
   - Include code examples
   - Document complex business logic
   - Maintain API documentation

## Resources and References

### Documentation Links
- [Architecture Overview](./architecture.md)
- [Performance Optimization](./performance-optimization.md)
- [Accessibility Guidelines](./WCAG.md)
- [Security Hardening](./hardening.md)

### External Resources
- [React Documentation](https://reactjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [WebXR Specification](https://www.w3.org/TR/webxr/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

### Community and Support
- GitHub Issues: [Report bugs and request features](https://github.com/IAmCarnell/YUR/issues)
- Discussions: [Community discussions](https://github.com/IAmCarnell/YUR/discussions)
- Contributing: [Contribution guidelines](../CONTRIBUTING.md)

---

This developer guide provides comprehensive information for contributing to the YUR Framework. For specific questions or issues, please refer to the community resources or create an issue in the GitHub repository.