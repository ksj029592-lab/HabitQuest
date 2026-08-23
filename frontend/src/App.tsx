/**
 * 메인 App 컴포넌트
 */
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { PersonaSelectionPage, HomePage, RankingPage } from '@pages';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<PersonaSelectionPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/ranking" element={<RankingPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
