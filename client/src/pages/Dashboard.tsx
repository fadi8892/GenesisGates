import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const [name, setName] = useState('');
  const [birthplace, setBirthplace] = useState('');
  const [people, setPeople] = useState<{ id: string; name: string; birthplace: string }[]>([]);
  const navigate = useNavigate();

  const addPerson = () => {
    if (name) {
      setPeople([...people, { id: Date.now().toString(), name, birthplace }]);
      setName('');
      setBirthplace('');
    }
  };

  const publishToIPFS = async () => {
    try {
      const response = await fetch('/api/tree/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ treeData: { people } })
      });
      const { cid } = await response.json();
      alert(`Published to IPFS with CID: ${cid}`);
    } catch (error) {
      alert('Error publishing to IPFS');
    }
  };

  return (
    <section className="max-w-3xl mx-auto p-6 bg-zinc-50">
      <header className="flex items-center justify-between">
        <div className="text-lg font-medium">Genesis Gates</div>
        <div className="text-sm text-zinc-500">guest@local</div>
      </header>
      <div className="mt-6 grid gap-4">
        <div className="rounded-2xl bg-white border shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div className="font-medium">People</div>
            <div className="text-xs text-zinc-500">Local-first editing • Publish to IPFS when ready</div>
          </div>
          <div className="grid gap-2 mt-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="border rounded-xl px-3 py-2"
              />
              <input
                value={birthplace}
                onChange={(e) => setBirthplace(e.target.value)}
                placeholder="Birthplace (optional)"
                className="border rounded-xl px-3 py-2"
              />
              <button
                onClick={addPerson}
                className="rounded-xl border px-3 py-2 bg-white"
              >
                Add Person
              </button>
            </div>
            <table className="min-w-full text-sm mt-2">
              <thead>
                <tr className="text-left text-zinc-500">
                  <th className="py-2">Name</th>
                  <th>Birthplace</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {people.map((person) => (
                  <tr key={person.id}>
                    <td className="py-2">{person.name}</td>
                    <td>{person.birthplace}</td>
                    <td className="text-right">
                      <button className="text-blue-500">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="rounded-2xl bg-white border shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div className="font-medium">Publish to IPFS</div>
            <button
              onClick={publishToIPFS}
              className="rounded-xl px-4 py-2 bg-[#5850EC] text-white"
            >
              Publish Snapshot
            </button>
          </div>
          <p className="text-xs text-zinc-500 mt-2">
            This sends your current tree as a JSON snapshot to IPFS (via web3.storage).
          </p>
        </div>
      </div>
    </section>
  );
}

export default Dashboard;
