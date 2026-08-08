/**
 * 페르소나 선택 페이지
 */
import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PersonaSelector } from '@components';
import { useSessionStore } from '@store';
import { personaApi } from '@api';
import { TestPersona } from '@types';

export const PersonaSelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const setSession = useSessionStore((state) => state.setSession);

  const handlePersonaSelected = useCallback(
    async (persona: TestPersona) => {
      try {
        const response = await personaApi.selectPersona(persona.id);
        if (response.success && response.data) {
          setSession(response.data);
          navigate('/home');
        }
      } catch (error) {
        console.error('Failed to select persona:', error);
      }
    },
    [navigate, setSession]
  );

  return <PersonaSelector onPersonaSelected={handlePersonaSelected} />;
};
