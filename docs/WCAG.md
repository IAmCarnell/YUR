# WCAG 2.1 AA Accessibility Compliance Guide

## Overview

This document outlines the accessibility requirements and guidelines for the YUR platform to ensure WCAG 2.1 AA compliance across all components, with special focus on spatial computing interfaces, scientific visualizations, and agent framework interactions.

## Core Accessibility Principles

### 1. Perceivable
Information and UI components must be presentable to users in ways they can perceive.

#### Visual Design
- **Color Contrast**: Minimum 4.5:1 for normal text, 3:1 for large text
- **Color Independence**: Information must not rely solely on color
- **Text Alternatives**: All non-text content has text alternatives
- **Adaptable Content**: Content can be presented in different ways without losing meaning

#### Implementation
```css
/* High contrast mode support */
@media (prefers-contrast: high) {
  .mandala-node {
    border: 3px solid var(--high-contrast-border);
    background: var(--high-contrast-bg);
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .spatial-animation {
    animation: none;
    transition: none;
  }
}
```

### 2. Operable
UI components and navigation must be operable by all users.

#### Keyboard Navigation
- All interactive elements are keyboard accessible
- Logical tab order throughout the interface
- No keyboard traps
- Custom keyboard shortcuts don't conflict with assistive technology

#### Implementation
```typescript
// Keyboard navigation for mandala dock
class MandalaDockNavigation {
  private currentNode = 0;
  private nodes: HTMLElement[] = [];

  constructor(dockElement: HTMLElement) {
    this.setupKeyboardNavigation(dockElement);
  }

  private setupKeyboardNavigation(dock: HTMLElement) {
    dock.addEventListener('keydown', (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          this.navigateToNext();
          event.preventDefault();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          this.navigateToPrevious();
          event.preventDefault();
          break;
        case 'Enter':
        case ' ':
          this.activateCurrentNode();
          event.preventDefault();
          break;
        case 'Escape':
          this.exitNavigation();
          break;
      }
    });
  }

  private navigateToNext() {
    if (this.currentNode < this.nodes.length - 1) {
      this.currentNode++;
      this.focusCurrentNode();
    }
  }

  private focusCurrentNode() {
    this.nodes[this.currentNode].focus();
    this.announceToScreenReader(`Node ${this.currentNode + 1} of ${this.nodes.length}`);
  }

  private announceToScreenReader(message: string) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }
}
```

### 3. Understandable
Information and operation of UI must be understandable to users.

#### Clear Content
- Text is readable and understandable
- Content appears and operates in predictable ways
- Users are helped to avoid and correct mistakes

#### Implementation
```typescript
// Form validation with accessible error messages
class AccessibleFormValidation {
  private form: HTMLFormElement;
  
  constructor(form: HTMLFormElement) {
    this.form = form;
    this.setupValidation();
  }

  private setupValidation() {
    this.form.addEventListener('submit', (event) => {
      const errors = this.validateForm();
      if (errors.length > 0) {
        event.preventDefault();
        this.displayErrors(errors);
        this.focusFirstError();
      }
    });
  }

  private displayErrors(errors: ValidationError[]) {
    // Remove existing error messages
    const existingErrors = this.form.querySelectorAll('[role="alert"]');
    existingErrors.forEach(error => error.remove());

    errors.forEach(error => {
      const field = this.form.querySelector(error.fieldSelector) as HTMLElement;
      const errorElement = document.createElement('div');
      
      errorElement.setAttribute('role', 'alert');
      errorElement.setAttribute('aria-atomic', 'true');
      errorElement.className = 'field-error';
      errorElement.textContent = error.message;
      
      // Associate error with field
      const errorId = `error-${field.id}`;
      errorElement.id = errorId;
      field.setAttribute('aria-describedby', errorId);
      field.setAttribute('aria-invalid', 'true');
      
      field.parentNode?.insertBefore(errorElement, field.nextSibling);
    });
  }
}
```

### 4. Robust
Content must be robust enough to be interpreted by a wide variety of user agents.

#### Technical Implementation
- Valid, semantic HTML
- Compatible with assistive technologies
- Future-proof markup

## Component-Specific Accessibility Guidelines

### Mandala Dock (YUR OS)

#### Spatial Navigation Accessibility
```typescript
// Accessible spatial navigation
interface SpatialNode {
  id: string;
  position: { x: number; y: number; z: number };
  label: string;
  description: string;
  category: string;
}

class AccessibleMandalaDock {
  private nodes: SpatialNode[] = [];
  private currentFocus = 0;

  render() {
    return (
      <div 
        role="application"
        aria-label="Spatial Application Dock"
        aria-describedby="mandala-instructions"
        onKeyDown={this.handleKeyNavigation}
      >
        <div id="mandala-instructions" className="sr-only">
          Use arrow keys to navigate between applications. 
          Press Enter to launch an application.
          Press Escape to exit navigation mode.
        </div>
        
        {this.nodes.map((node, index) => (
          <button
            key={node.id}
            role="menuitem"
            tabIndex={index === this.currentFocus ? 0 : -1}
            aria-selected={index === this.currentFocus}
            aria-label={`${node.label} - ${node.description}`}
            aria-describedby={`node-${node.id}-details`}
            className="mandala-node"
            style={{
              transform: `translate3d(${node.position.x}px, ${node.position.y}px, ${node.position.z}px)`
            }}
          >
            <span className="node-icon" aria-hidden="true">
              {this.getNodeIcon(node.category)}
            </span>
            <span className="node-label">{node.label}</span>
            <div id={`node-${node.id}-details`} className="sr-only">
              {node.description}
            </div>
          </button>
        ))}
      </div>
    );
  }
}
```

#### Touch Accessibility
- Minimum touch target size: 44px × 44px
- Touch targets don't overlap
- Gesture alternatives provided
- Haptic feedback for spatial interactions

### Scientific Visualizations

#### Alternative Data Representations
```typescript
// Accessible data visualization
class AccessibleVisualization {
  private data: DataPoint[];
  private chartType: 'line' | 'bar' | 'scatter';

  renderAccessibleChart() {
    return (
      <div className="visualization-container">
        {/* Visual chart */}
        <div 
          role="img" 
          aria-labelledby="chart-title"
          aria-describedby="chart-description"
        >
          {this.renderVisualChart()}
        </div>
        
        {/* Text alternatives */}
        <div className="chart-alternatives">
          <h3 id="chart-title">{this.getChartTitle()}</h3>
          <p id="chart-description">{this.getChartDescription()}</p>
          
          {/* Data table alternative */}
          <details>
            <summary>View data table</summary>
            <table>
              <caption>Data table for {this.getChartTitle()}</caption>
              <thead>
                <tr>
                  <th scope="col">X Value</th>
                  <th scope="col">Y Value</th>
                  <th scope="col">Description</th>
                </tr>
              </thead>
              <tbody>
                {this.data.map((point, index) => (
                  <tr key={index}>
                    <td>{point.x}</td>
                    <td>{point.y}</td>
                    <td>{point.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
          
          {/* Audio description */}
          <details>
            <summary>Audio description</summary>
            <button onClick={() => this.playAudioDescription()}>
              Play audio description of chart
            </button>
          </details>
        </div>
      </div>
    );
  }

  private playAudioDescription() {
    const description = this.generateAudioDescription();
    this.speakText(description);
  }

  private generateAudioDescription(): string {
    const trend = this.analyzeTrend();
    const extremes = this.findExtremes();
    
    return `This ${this.chartType} chart shows ${this.data.length} data points. 
            The overall trend is ${trend}. 
            The highest value is ${extremes.max} and the lowest is ${extremes.min}.`;
  }
}
```

### XR/AR Components

#### Non-XR Alternatives
```typescript
// Inclusive XR implementation
class InclusiveXRExperience {
  private hasXRSupport: boolean;
  private hasXRDevice: boolean;

  async initialize() {
    this.hasXRSupport = 'xr' in navigator;
    
    if (this.hasXRSupport) {
      try {
        const session = await navigator.xr.requestSession('immersive-vr');
        this.hasXRDevice = true;
      } catch {
        this.hasXRDevice = false;
      }
    }

    this.renderExperience();
  }

  renderExperience() {
    return (
      <div className="xr-experience">
        {/* XR mode toggle */}
        <div className="experience-controls">
          <button 
            disabled={!this.hasXRSupport}
            onClick={this.enterXR}
            aria-describedby="xr-description"
          >
            {this.hasXRSupport ? 'Enter VR Mode' : 'VR Not Supported'}
          </button>
          
          <div id="xr-description" className="sr-only">
            {this.hasXRSupport 
              ? 'Experience the 3D environment in virtual reality'
              : 'VR is not supported on this device. The 2D interface provides the same functionality.'
            }
          </div>
        </div>

        {/* Always provide 2D fallback */}
        <div className="experience-2d" aria-label="2D Interface">
          {this.render2DInterface()}
        </div>

        {/* XR mode (when active) */}
        {this.state.isXRActive && (
          <div className="experience-xr" aria-hidden="true">
            {this.renderXRInterface()}
          </div>
        )}

        {/* Audio descriptions for XR content */}
        <div className="xr-audio-descriptions">
          <button onClick={this.toggleAudioDescriptions}>
            {this.state.audioDescriptionsEnabled ? 'Disable' : 'Enable'} Audio Descriptions
          </button>
        </div>
      </div>
    );
  }
}
```

### Agent Framework UI

#### Accessible Agent Status
```typescript
// Accessible agent monitoring
class AccessibleAgentStatus {
  private agents: Agent[];

  renderAgentDashboard() {
    return (
      <div role="region" aria-labelledby="agent-dashboard-title">
        <h2 id="agent-dashboard-title">Agent Status Dashboard</h2>
        
        {/* Live region for status updates */}
        <div 
          aria-live="polite"
          aria-atomic="false"
          id="agent-announcements"
          className="sr-only"
        >
          {this.state.lastAnnouncement}
        </div>

        <table aria-describedby="agent-table-description">
          <caption id="agent-table-description">
            Current status of {this.agents.length} agents. 
            Updates automatically every 30 seconds.
          </caption>
          
          <thead>
            <tr>
              <th scope="col">Agent Name</th>
              <th scope="col">Status</th>
              <th scope="col">Current Task</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          
          <tbody>
            {this.agents.map(agent => (
              <tr key={agent.id}>
                <th scope="row">{agent.name}</th>
                <td>
                  <span 
                    className={`status-indicator status-${agent.status}`}
                    aria-label={`Status: ${agent.status}`}
                  >
                    {agent.status}
                  </span>
                </td>
                <td>{agent.currentTask || 'None'}</td>
                <td>
                  <button 
                    onClick={() => this.pauseAgent(agent)}
                    aria-describedby={`agent-${agent.id}-pause-description`}
                  >
                    Pause
                  </button>
                  <div id={`agent-${agent.id}-pause-description`} className="sr-only">
                    Pause {agent.name} agent
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  private announceStatusChange(agent: Agent, newStatus: string) {
    const announcement = `${agent.name} status changed to ${newStatus}`;
    this.setState({ lastAnnouncement: announcement });
  }
}
```

## Testing and Validation

### Automated Testing
```typescript
// Accessibility test suite
describe('Accessibility Compliance', () => {
  test('should have no axe violations', async () => {
    const { container } = render(<YURApplication />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('should support keyboard navigation', async () => {
    render(<MandalaDock />);
    const dock = screen.getByRole('application');
    
    // Tab to first element
    userEvent.tab();
    expect(dock.querySelector('[tabindex="0"]')).toHaveFocus();
    
    // Arrow key navigation
    userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('menuitem', { name: /second node/i })).toHaveFocus();
  });

  test('should provide text alternatives', () => {
    render(<ScientificVisualization data={mockData} />);
    
    // Chart should have text alternative
    expect(screen.getByRole('img')).toHaveAttribute('aria-describedby');
    
    // Data table should be available
    expect(screen.getByRole('table')).toBeInTheDocument();
  });
});
```

### Manual Testing Checklist

#### Screen Reader Testing
- [ ] NVDA (Windows)
- [ ] JAWS (Windows)  
- [ ] VoiceOver (macOS/iOS)
- [ ] TalkBack (Android)

#### Keyboard Testing
- [ ] Tab navigation works logically
- [ ] All interactive elements reachable
- [ ] No keyboard traps
- [ ] Custom shortcuts documented

#### Visual Testing
- [ ] 4.5:1 contrast ratio met
- [ ] Text scales to 200% without horizontal scrolling
- [ ] Focus indicators visible
- [ ] Content readable without color

## Documentation Requirements

All new features must include:
- Accessibility impact assessment
- Keyboard interaction documentation  
- Screen reader compatibility notes
- High contrast mode considerations
- Mobile touch accessibility requirements

## Regular Audits

- **Monthly**: Automated accessibility testing in CI/CD
- **Quarterly**: Manual testing with assistive technologies
- **Annually**: Third-party accessibility audit
- **Per Release**: WCAG compliance verification

## Accessibility Team Contacts

For questions or guidance on accessibility implementation:
- **Lead Accessibility Engineer**: [Contact Information]
- **UX Accessibility Specialist**: [Contact Information]
- **QA Accessibility Tester**: [Contact Information]

---

For questions or guidance on accessibility implementation, refer to the [W3C WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/) or consult with the accessibility team.

## Accessibility Checklist

### Level A Requirements

- [ ] **1.1.1 Non-text Content** - All images, icons, and media have appropriate alt text
- [ ] **1.3.1 Info and Relationships** - Information structure is preserved programmatically
- [ ] **1.3.2 Meaningful Sequence** - Content order makes sense when linearized
- [ ] **1.4.1 Use of Color** - Color is not the only means of conveying information
- [ ] **2.1.1 Keyboard** - All functionality available via keyboard
- [ ] **2.1.2 No Keyboard Trap** - Keyboard focus can move away from components
- [ ] **2.2.1 Timing Adjustable** - Users can extend time limits
- [ ] **2.4.1 Bypass Blocks** - Skip navigation mechanisms provided
- [ ] **3.1.1 Language of Page** - Page language is programmatically determined
- [ ] **4.1.1 Parsing** - Markup validates and is well-formed
- [ ] **4.1.2 Name, Role, Value** - UI components have accessible names and roles

### Level AA Requirements

- [ ] **1.4.3 Contrast (Minimum)** - Text contrast ratio at least 4.5:1
- [ ] **1.4.4 Resize Text** - Text can be resized up to 200% without loss of functionality
- [ ] **1.4.5 Images of Text** - Use real text instead of images of text
- [ ] **2.4.6 Headings and Labels** - Headings and labels describe topic or purpose
- [ ] **2.4.7 Focus Visible** - Keyboard focus indicator is visible
- [ ] **3.1.2 Language of Parts** - Language changes are identified
- [ ] **3.2.3 Consistent Navigation** - Navigation is consistent across pages
- [ ] **3.2.4 Consistent Identification** - Components with same functionality are consistently identified

## Component-Specific Guidelines

### Mandala Dock (YUR OS)
- Ensure spatial navigation is keyboard accessible
- Provide high contrast mode for visual elements
- Add screen reader announcements for spatial changes
- Include touch targets of at least 44px for mobile

### Scientific Visualizations
- Provide alternative text descriptions for complex charts
- Use patterns in addition to color for data differentiation
- Ensure animations can be paused or disabled
- Provide data tables as alternatives to visual representations

### XR/AR Components
- Ensure non-XR fallbacks are available
- Provide audio descriptions for visual XR content
- Support alternative input methods beyond hand tracking
- Include comfort settings for motion sensitivity

### Agent Framework UI
- Use semantic HTML for agent status information
- Provide clear error messages and recovery options
- Ensure form controls have associated labels
- Use ARIA live regions for dynamic content updates

## Testing Tools

### Automated Testing
- [ ] axe-core integration for component testing
- [ ] Lighthouse accessibility audits in CI/CD
- [ ] Color contrast analyzers for design validation
- [ ] Keyboard navigation testing automation

### Manual Testing
- [ ] Screen reader testing (NVDA, JAWS, VoiceOver)
- [ ] Keyboard-only navigation testing
- [ ] High contrast mode validation
- [ ] Zoom testing up to 200%
- [ ] Voice control testing where applicable

## Implementation Notes

### React Components
```typescript
// Example accessible component structure
interface AccessibleComponentProps {
  'aria-label'?: string;
  'aria-describedby'?: string;
  role?: string;
}

const AccessibleButton: React.FC<AccessibleComponentProps> = ({
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  role = 'button',
  children,
  ...props
}) => (
  <button
    aria-label={ariaLabel}
    aria-describedby={ariaDescribedBy}
    role={role}
    {...props}
  >
    {children}
  </button>
);
```

### Three.js/WebGL Accessibility
```typescript
// Ensure 3D content has accessible alternatives
const AccessibleThreeScene: React.FC = () => {
  return (
    <div>
      <Canvas aria-hidden="true">
        {/* 3D content */}
      </Canvas>
      <div role="img" aria-label="3D scene description">
        {/* Alternative description of 3D content */}
      </div>
    </div>
  );
};
```

## Documentation Requirements

All new features must include:
- Accessibility impact assessment
- Keyboard interaction documentation
- Screen reader compatibility notes
- High contrast mode considerations
- Mobile touch accessibility requirements

## Regular Audits

- **Monthly**: Automated accessibility testing in CI/CD
- **Quarterly**: Manual testing with assistive technologies
- **Annually**: Third-party accessibility audit
- **Per Release**: WCAG compliance verification

---

For questions or guidance on accessibility implementation, refer to the [W3C WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/) or consult with the accessibility team.