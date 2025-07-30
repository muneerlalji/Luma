'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import Page from '../components/page/Page';
import Button from '../components/button/Button';
import { Person, getPeople } from '../services/personService';
import AuthGuard from '../components/auth-guard/AuthGuard';
import './page.css';

export default function People() {
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [people, setPeople] = useState<Person[]>([]);
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [error, setError] = useState('');

  const fetchPeople = async (token: string) => {
    try {
      setLoadingPeople(true);
      const peopleData = await getPeople(token);
      setPeople(peopleData || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch people');
      setPeople([]);
    } finally {
      setLoadingPeople(false);
    }
  };

  // Only fetch data when auth is done loading and we have a token
  useEffect(() => {
    if (!authLoading && token && loadingPeople) {
      fetchPeople(token);
    }
  }, [authLoading, token, loadingPeople]);

  return (
    <AuthGuard>
      <Page>
        <div className="people-container">
          <div className="people-header">
            <div>
              <h1>People</h1>
              <p>Keep track of the people in your life</p>
            </div>
            <Button
              onClick={() => router.push('/people/create')}
              style={{ background: '#2563eb' }}
            >
              Add New Person
            </Button>
          </div>

          {error && <p className="error-message">{error}</p>}

          {loadingPeople ? (
            <div className="loading">Loading people...</div>
          ) : !people || people.length === 0 ? (
            <div className="empty-state">
              <p>No people added yet.</p>
              <Button
                onClick={() => router.push('/people/create')}
                style={{ background: '#2563eb' }}
              >
                Add Your First Person
              </Button>
            </div>
          ) : (
            <div className="people-grid">
              {people.map((person) => (
                <div key={person.id} className="person-card">
                  <div className="person-photo">
                    {person.photoUrl ? (
                      <img src={person.photoUrl} alt={`${person.firstName} ${person.lastName}`} />
                    ) : (
                      <div className="person-placeholder">
                        {person.firstName.charAt(0)}{person.lastName.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="person-info">
                    <h3>{person.firstName} {person.lastName}</h3>
                    <p className="relationship">{person.relationship}</p>
                    <p className="email">{person.email}</p>
                    <p className="phone">{person.phone}</p>
                    {person.notes && (
                      <p className="notes">{person.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Page>
    </AuthGuard>
  );
} 