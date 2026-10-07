import { useEffect } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './components/auth/LoginPage';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { markAppBooted } from './lib/bootRecovery';

// The old /audit/{token} and /supplier/{token} links were removed: they skipped
// sign-in completely and the server has no matching endpoints.

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-secondary flex items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <AppShell />;
}

function App() {
  // React mounted successfully — disarm the index.html boot watchdog so it stops
  // counting down towards a recovery reload.
  useEffect(() => {
    markAppBooted();
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
