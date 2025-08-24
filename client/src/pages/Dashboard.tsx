import { useState } from 'react';

export default function Dashboard() {
  const [tab, setTab] = useState('overview');

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <h1 className="text-2xl font-bold mb-4">Genesis Gates</h1>
      <div className="flex gap-2 mb-4">
        <button
          className={`p-2 ${tab === 'overview' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setTab('overview')}
        >
          Overview
        </button>
        <button
          className={`p-2 ${tab === 'tree' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setTab('tree')}
        >
          Family Tree
        </button>
      </div>
      {tab === 'overview' && <div>Add people to your family tree here.</div>}
      {tab === 'tree' && <div>Family tree visualization will go here.</div>}
    </div>
  );
}
