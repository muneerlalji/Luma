'use client';
import "./page.css"
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Page from "../components/page/Page";
import Button from "../components/button/Button";
import TextBox from "../components/textbox/TextBox";

export default function LoginPage() {
  const { login, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      router.push('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  }

  return (
    <Page>
      <main className="login-main">
        <div className="login-container">
          <h1 className="login-title">Login</h1>
          <form onSubmit={handleSubmit} className="login-form">
            <TextBox
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <TextBox
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            {error && <div className="login-error">{error}</div>}
            <Button type="submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
          <div className="login-links">
            <Link href="/forgot-password" className="login-forgot-link">Forgot password?</Link>
            <div className="login-register-link">Don&apos;t have an account? <Link href="/register" className="login-register-anchor">Register</Link></div>
          </div>
        </div>
      </main>
    </Page>
  );
} 