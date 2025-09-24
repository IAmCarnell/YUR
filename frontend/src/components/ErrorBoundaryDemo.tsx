import React, { useState } from 'react';
import { Button, Card, CardContent, Typography, Box } from '@mui/material';
import { ErrorBoundary, withErrorBoundary } from '../utils/ErrorBoundary';

/**
 * Component that can be forced to throw an error for demonstration
 */
function BuggyComponent({ shouldCrash }: { shouldCrash: boolean }) {
  if (shouldCrash) {
    throw new Error('Intentional error for demonstration purposes');
  }
  
  return (
    <Typography color="success.main">
      ✅ Component is working normally
    </Typography>
  );
}

/**
 * Wrapped component with error boundary
 */
const SafeBuggyComponent = withErrorBoundary(BuggyComponent, {
  onError: (error, _errorInfo) => {
    console.log('Caught error in SafeBuggyComponent:', error.message);
  }
});

/**
 * Demo component showing error boundary functionality
 */
export function ErrorBoundaryDemo() {
  const [shouldCrash, setShouldCrash] = useState(false);
  const [isolatedCrash, setIsolatedCrash] = useState(false);

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Error Boundary Demonstration
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
        This demonstrates the error boundary system that provides graceful error handling
        and recovery mechanisms throughout the YUR Framework.
      </Typography>

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: '1fr 1fr' }}>
        {/* Unprotected Component */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Unprotected Component
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
              This component has no error boundary. If it crashes, it will take down the entire app.
            </Typography>
            
            <Box sx={{ mb: 2, minHeight: 50, display: 'flex', alignItems: 'center' }}>
              <BuggyComponent shouldCrash={shouldCrash} />
            </Box>
            
            <Button 
              variant="contained" 
              color="error"
              onClick={() => setShouldCrash(!shouldCrash)}
              size="small"
            >
              {shouldCrash ? 'Fix Component' : 'Break Component'}
            </Button>
          </CardContent>
        </Card>

        {/* Protected Component */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Protected Component
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
              This component is wrapped with an error boundary. Errors are contained and recoverable.
            </Typography>
            
            <Box sx={{ mb: 2, minHeight: 50 }}>
              <SafeBuggyComponent shouldCrash={isolatedCrash} />
            </Box>
            
            <Button 
              variant="contained" 
              color="warning"
              onClick={() => setIsolatedCrash(!isolatedCrash)}
              size="small"
            >
              {isolatedCrash ? 'Fix Component' : 'Break Component'}
            </Button>
          </CardContent>
        </Card>
      </Box>

      {/* Manual Error Boundary */}
      <Card variant="outlined" sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Manual Error Boundary
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            This shows an error boundary with custom fallback UI.
          </Typography>
          
          <ErrorBoundary
            fallback={
              <Box sx={{ p: 2, bgcolor: 'error.light', color: 'error.contrastText', borderRadius: 1 }}>
                <Typography variant="h6">🚨 Custom Error UI</Typography>
                <Typography variant="body2">
                  This is a custom fallback interface that shows when the component fails.
                </Typography>
              </Box>
            }
            onError={(error) => console.log('Custom boundary caught:', error.message)}
          >
            <Box sx={{ p: 2, minHeight: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isolatedCrash ? (
                <BuggyComponent shouldCrash={true} />
              ) : (
                <Typography color="primary">
                  🛡️ Component protected by custom error boundary
                </Typography>
              )}
            </Box>
          </ErrorBoundary>
        </CardContent>
      </Card>

      {/* Information */}
      <Card variant="outlined" sx={{ mt: 3, bgcolor: 'info.light' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Production Hardening Features
          </Typography>
          <Box component="ul" sx={{ pl: 2 }}>
            <li>
              <Typography variant="body2">
                <strong>Isolated Failures:</strong> Errors don't propagate up the component tree
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                <strong>Graceful Recovery:</strong> Users can retry failed operations
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                <strong>Error Reporting:</strong> Automatic logging and monitoring integration
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                <strong>Custom Fallbacks:</strong> Context-appropriate error interfaces
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                <strong>Development Support:</strong> Detailed error information in dev mode
              </Typography>
            </li>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}