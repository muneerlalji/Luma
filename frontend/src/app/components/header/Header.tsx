'use client';
import "./Header.css"
import Image from "next/image";
import { useAuth } from '../../../context/AuthContext';
import Button from '../button/Button';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import ProfileIcon from '../../../assets/Profile.svg'

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }} onClick={() => router.push('/')}>
          <div className="header-logo">
            <Image src="/luma-logo.svg" alt="Luma Logo" width={48} height={48} />
          </div>
          <h1 className="header-title">Luma</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', position: 'relative' }}>
          {!user ? (
            <>
              <Button style={{ background: '#fff', color: '#5b21b6', minWidth: 100, fontWeight: '600' }} onClick={() => router.push('/login')}>Login</Button>
              <Button style={{ background: 'rgba(255, 255, 255, 0.2)', color: '#fff', minWidth: 100, fontWeight: '600', border: '1px solid rgba(255, 255, 255, 0.3)' }} onClick={() => router.push('/register')}>Register</Button>
            </>
          ) : (
            <>
              <Button 
                style={{ background: 'rgba(255, 255, 255, 0.2)', color: '#fff', minWidth: 140, padding: '0.75rem 1.5rem', fontWeight: '600', border: '1px solid rgba(255, 255, 255, 0.3)', whiteSpace: 'nowrap' }} 
                onClick={() => router.push('/memories')}
              >
                View Memories
              </Button>
              <Button 
                style={{ background: '#fff', color: '#5b21b6', minWidth: 140, padding: '0.75rem 1.5rem', fontWeight: '600', whiteSpace: 'nowrap' }} 
                onClick={() => router.push('/create-memory')}
              >
                Create Memory
              </Button>
              <div style={{ position: 'relative' }} ref={dropdownRef}>
                <div style={{ cursor: 'pointer' }} onClick={() => setDropdownOpen(v => !v)} title="Profile">
                  <ProfileIcon className="header-profile-icon" />
                </div>
                {dropdownOpen && (
                  <div style={{ position: 'absolute', right: 0, top: 44, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 4px 16px rgba(60,72,100,0.13)', minWidth: 140, zIndex: 10 }}>
                    <div style={{ padding: '0.75rem 1rem', cursor: 'pointer', fontWeight: 500 }} onClick={() => { setDropdownOpen(false); router.push('/profile'); }}>Profile</div>
                    <div style={{ padding: '0.75rem 1rem', cursor: 'pointer', color: '#b91c1c', fontWeight: 500 }} onClick={() => { setDropdownOpen(false); logout(); }}>Logout</div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
} 