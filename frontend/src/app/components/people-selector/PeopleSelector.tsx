'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Person, getPeople } from '../../services/personService';
import './PeopleSelector.css';

interface PeopleSelectorProps {
  selectedPeople: string[];
  onPeopleChange: (peopleIds: string[]) => void;
}

export default function PeopleSelector({ selectedPeople, onPeopleChange }: PeopleSelectorProps) {
  const { token } = useAuth();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) {
      fetchPeople();
    }
  }, [token]);

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

  const handlePersonToggle = (personId: string) => {
    const newSelected = selectedPeople.includes(personId)
      ? selectedPeople.filter(id => id !== personId)
      : [...selectedPeople, personId];
    
    onPeopleChange(newSelected);
  };

  const getSelectedPeopleNames = () => {
    return people
      .filter(person => selectedPeople.includes(person.id))
      .map(person => `${person.firstName} ${person.lastName}`)
      .join(', ');
  };

  if (loading) {
    return <div className="people-selector-loading">Loading people...</div>;
  }

  if (error) {
    return <div className="people-selector-error">{error}</div>;
  }

  return (
    <div className="people-selector">
      <label className="people-selector-label">Tag People (Optional)</label>
      
      {!people || people.length === 0 ? (
        <div className="people-selector-empty">
          <p>No people added yet. <a href="/people/create" className="add-person-link">Add people</a> to tag them in memories.</p>
        </div>
      ) : (
        <>
          <div className="people-selector-summary">
            {selectedPeople.length > 0 ? (
              <span className="selected-count">
                {selectedPeople.length} person{selectedPeople.length !== 1 ? 's' : ''} selected: {getSelectedPeopleNames()}
              </span>
            ) : (
              <span className="no-selection">No people selected</span>
            )}
          </div>
          
          <div className="people-selector-grid">
            {people.map((person) => (
              <div
                key={person.id}
                className={`person-option ${selectedPeople.includes(person.id) ? 'selected' : ''}`}
                onClick={() => handlePersonToggle(person.id)}
              >
                <div className="person-option-photo">
                  {person.photoUrl ? (
                    <img src={person.photoUrl} alt={`${person.firstName} ${person.lastName}`} />
                  ) : (
                    <div className="person-option-placeholder">
                      {person.firstName.charAt(0)}{person.lastName.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="person-option-info">
                  <span className="person-option-name">
                    {person.firstName} {person.lastName}
                  </span>
                  <span className="person-option-relationship">
                    {person.relationship}
                  </span>
                </div>
                <div className="person-option-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedPeople.includes(person.id)}
                    onChange={() => handlePersonToggle(person.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
} 