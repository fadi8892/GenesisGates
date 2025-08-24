import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const [code, setCode] = useState('');
  const navigate = useNavigate();

  const handleUnlock = async () => {
    try {
      const res = await fetch('https://genesisgates.com/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('token', data.token);
        navigate('/dashboard');
      } else {
        alert('Invalid code');
      }
    } catch {
      alert('Verification failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold mb-4">Genesis Gates</h1>
        <p className="text-gray-600 mb-6">Your family history. Decentralized. Immortalized.</p>
        <input
          className="w-full p-2 border rounded mb-4"
          placeholder="Enter Access Code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button
          className="w-full p-2 bg-blue-500 text-white rounded"
          onClick={handleUnlock}
        >
          Unlock
        </button>
      </div>
    </div>
  );
}
