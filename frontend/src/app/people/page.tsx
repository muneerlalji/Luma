'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import Page from '../components/page/Page';
import Button from '../components/button/Button';
import { Person, getPeople } from '../services/personService';
import './page.css';

export default function People() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    fetchPeople();
  }, [user, router]);

  const fetchPeople = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      const peopleData = await getPeople(token);
      setPeople(peopleData || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch people');
      setPeople([]);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
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

        {loading ? (
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
  );
} 