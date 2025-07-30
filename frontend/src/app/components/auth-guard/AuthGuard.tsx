'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import Page from '../page/Page';
import './AuthGuard.css';

interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export default function AuthGuard({ children, redirectTo = '/login' }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for auth to finish loading before checking user
    if (loading) return;
    
    if (!user) {
      router.push(redirectTo);
    }
  }, [user, loading, router, redirectTo]);

  // Show loading state while auth is loading
  if (loading) {
    return (
      <Page>
        <div className="auth-guard-loading">
          <p>Loading...</p>
        </div>
      </Page>
    );
  }

  // Don't render children if user is not authenticated
  if (!user) {
    return null;
  }

  return <>{children}</>;
} 