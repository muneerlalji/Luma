'use client';
import "./page.css"
import { useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import Page from "../components/page/Page";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/forgot-password`, { email });
      setMessage('If the email exists, a reset link has been sent.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page>
      <main className="forgot-main">
        <div className="forgot-container">
          <h1 className="forgot-title">Forgot Password</h1>
          <form onSubmit={handleSubmit} className="forgot-form">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="forgot-input"
              required
            />
            {error && <div className="forgot-error">{error}</div>}
            {message && <div className="forgot-message">{message}</div>}
            <button type="submit" className="forgot-btn" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
          <div className="forgot-links">
            <Link href="/login" className="forgot-back-link">Back to Login</Link>
          </div>
        </div>
      </main>
    </Page>
  );
} 