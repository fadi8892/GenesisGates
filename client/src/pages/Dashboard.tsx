import { useState, useEffect } from 'react';
import Overview from '../components/Overview';
import Tree3D from '../components/Tree3D';

export default function Dashboard() {
  const [tab, setTab] = useState('overview');
  const [treeData, setTreeData] = useState({ people: [], cid: null });

  useEffect(() => {
    const cid = localStorage.getItem('treeCid');
    if (cid) {
      fetch(`https://genesisgates.com/api/tree/${cid}`)
        .then(res => res.json())
        .then(data => setTreeData({ ...data, cid }));
    }
  }, []);

  const saveTree = async (newTree: any) => {
    const res = await fetch('https://genesisgates.com/api/tree/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ treeData: newTree }),
    });
    const { cid } = await res.json();
    localStorage.setItem('treeCid', cid);
    setTreeData({ ...newTree, cid });
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <h1 className="text-2xl font-bold mb-4">Genesis Gates</h1>
      <div className="flex gap-2 mb-4">
        <button
          className={`p-2 ${tab === 'overview' ? 'bg-blue-500 text-white' : 'bg-gray-200'} rounded`}
          onClick={() => setTab('overview')}
        >
          Overview
        </button>
        <button
          className={`p-2 ${tab === 'tree' ? 'bg-blue-500 text-white' : 'bg-gray-200'} rounded`}
          onClick={() => setTab('tree')}
        >
          Family Tree
        </button>
        <button
          className={`p-2 ${tab === 'map' ? 'bg-blue-500 text-white' : 'bg-gray-200'} rounded`}
          onClick={() => setTab('map')}
        >
          Map
        </button>
      </div>
      {tab === 'overview' && <Overview treeData={treeData} onSave={saveTree} />}
      {tab === 'tree' && <Tree3D treeData={treeData} />}
      {tab === 'map' && <div>Map visualization coming soon.</div>}
    </div>
  );
}
