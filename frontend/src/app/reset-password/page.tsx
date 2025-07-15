'use client';
import "./page.css"
import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import Page from "../components/page/Page";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/reset-password`, { token, password });
      setMessage('Password reset successful! Redirecting to login...');
      setTimeout(() => router.push('/login'), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page>
      <main className="reset-main">
        <div className="reset-container">
          <h1 className="reset-title">Reset Password</h1>
          <form onSubmit={handleSubmit} className="reset-form">
            <input
              type="password"
              placeholder="New Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="reset-input"
              required
            />
            {error && <div className="reset-error">{error}</div>}
            {message && <div className="reset-message">{message}</div>}
            <button type="submit" className="reset-btn" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
          <div className="reset-links">
            <Link href="/login" className="reset-back-link">Back to Login</Link>
          </div>
        </div>
      </main>
    </Page>
  );
} 