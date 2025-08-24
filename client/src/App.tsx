import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { migrateToIPFS } from './migrate';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';

function App() {
  useEffect(() => {
    migrateToIPFS();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
