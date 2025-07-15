'use client';
import "./page.css"
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Page from "../components/page/Page";
import Button from "../components/button/Button";
import TextBox from "../components/textbox/TextBox";

export default function RegisterPage() {
  const { register, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await register(email, password, displayName);
      setSuccess('Registration successful! Please check your email to confirm your account.');
      setTimeout(() => router.push('/login'), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  }

  return (
    <Page>
      <main className="register-main">
        <div className="register-container">
          <h1 className="register-title">Register</h1>
          <form onSubmit={handleSubmit} className="register-form">
            <TextBox
              type="text"
              placeholder="Display Name"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              required
            />
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
            {error && <div className="register-error">{error}</div>}
            {success && <div className="register-success">{success}</div>}
            <Button type="submit" disabled={loading}>
              {loading ? 'Registering...' : 'Register'}
            </Button>
          </form>
          <div className="register-links">
            <div className="register-login-link">Already have an account? <Link href="/login" className="register-login-anchor">Login</Link></div>
          </div>
        </div>
      </main>
    </Page>
  );
} 