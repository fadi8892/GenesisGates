import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

function LandingPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');

  const handleLogin = () => {
    if (code === 'TEST123') {
      localStorage.setItem('token', 'mock-token');
      navigate('/dashboard');
    } else {
      alert('Invalid code');
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-zinc-50">
      <div className="w-full max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-semibold">Genesis Gates</h1>
          <p className="text-zinc-500 mt-2">Your family history — decentralized from day one.</p>
        </div>
        <div className="mt-6 grid gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter code (e.g., TEST123)"
            className="border rounded-xl px-3 py-2"
          />
          <button
            onClick={handleLogin}
            className="rounded-xl px-5 py-3 bg-[#5850EC] text-white"
          >
            Start New Tree
          </button>
        </div>
        <p className="text-xs text-zinc-500 text-center mt-2">
          No wallet needed. We’ll publish to IPFS for you.
        </p>
      </div>
    </main>
  );
}

export default LandingPage;
