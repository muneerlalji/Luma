'use client';
import "./page.css"
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import axios from 'axios';
import Page from "../components/page/Page";

export default function ConfirmEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Missing token');
      return;
    }
    axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/confirm?token=${encodeURIComponent(token)}`)
      .then(() => {
        setMessage('Email confirmed! You can now log in.');
        setTimeout(() => router.push('/login'), 2000);
      })
      .catch((err) => setError(err.message));
  }, [token, router]);

  return (
    <Page>
      <main className="confirm-main">
        <div className="confirm-container">
          <h1 className="confirm-title">Confirm Email</h1>
          {error && <div className="confirm-error">{error}</div>}
          {message && <div className="confirm-message">{message}</div>}
          {!error && !message && <div>Confirming...</div>}
        </div>
      </main>
    </Page>
  );
} 