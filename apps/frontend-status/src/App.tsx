import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { StatusPage } from './pages/StatusPage';
import { HistoryPage } from './pages/HistoryPage';
import { EmbedPage } from './pages/EmbedPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<StatusPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/history/:serviceId" element={<HistoryPage />} />
        <Route path="/embed" element={<EmbedPage />} />
      </Routes>
    </Router>
  );
}

export default App;