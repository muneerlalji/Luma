'use client';
import "./Header.css"
import Image from "next/image";
import { useAuth } from '../../../context/AuthContext';
import Button from '../button/Button';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';

export default function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  return (
    <header className="header">
      <div className="header-inner" style={{ justifyContent: 'space-between', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="header-logo">
            <Image src="/luma-logo.svg" alt="Luma Logo" width={48} height={48} />
          </div>
          <h1 className="header-title">Luma</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', position: 'relative' }}>
          {!user ? (
            <>
              <Button style={{ background: '#2563eb', minWidth: 100 }} onClick={() => router.push('/login')}>Login</Button>
              <Button style={{ background: '#7c3aed', minWidth: 100 }} onClick={() => router.push('/register')}>Register</Button>
            </>
          ) : (
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <div style={{ cursor: 'pointer' }} onClick={() => setDropdownOpen(v => !v)} title="Profile">
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="18" cy="18" r="18" fill="#ede9fe" />
                  <circle cx="18" cy="15" r="6" fill="#7c3aed" />
                  <ellipse cx="18" cy="27" rx="9" ry="5" fill="#a78bfa" />
                </svg>
              </div>
              {dropdownOpen && (
                <div style={{ position: 'absolute', right: 0, top: 44, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 4px 16px rgba(60,72,100,0.13)', minWidth: 140, zIndex: 10 }}>
                  <div style={{ padding: '0.75rem 1rem', cursor: 'pointer', fontWeight: 500 }} onClick={() => { setDropdownOpen(false); router.push('/profile'); }}>Profile</div>
                  <div style={{ padding: '0.75rem 1rem', cursor: 'pointer', color: '#b91c1c', fontWeight: 500 }} onClick={() => { setDropdownOpen(false); logout(); }}>Logout</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
} 