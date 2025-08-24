import { useState } from 'react';

export default function Overview({ treeData, onSave }: { treeData: any, onSave: (data: any) => void }) {
  const [name, setName] = useState('');
  const [sex, setSex] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthPlace, setBirthPlace] = useState('');

  const addPerson = () => {
    const newPerson = { id: Date.now().toString(), name, sex, birthDate, birthPlace };
    const newTree = { ...treeData, people: [...(treeData.people || []), newPerson] };
    onSave(newTree);
    setName(''); setSex(''); setBirthDate(''); setBirthPlace('');
  };

  return (
    <div>
      <h2 className="text-xl mb-2">Add Person</h2>
      <input
        className="p-2 border rounded mb-2 w-full"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <select
        className="p-2 border rounded mb-2 w-full"
        value={sex}
        onChange={(e) => setSex(e.target.value)}
      >
        <option value="">Sex</option>
        <option value="M">Male</option>
        <option value="F">Female</option>
        <option value="U">Unknown</option>
      </select>
      <input
        className="p-2 border rounded mb-2 w-full"
        placeholder="Birth Date (YYYY-MM-DD)"
        value={birthDate}
        onChange={(e) => setBirthDate(e.target.value)}
      />
      <input
        className="p-2 border rounded mb-2 w-full"
        placeholder="Birth Place"
        value={birthPlace}
        onChange={(e) => setBirthPlace(e.target.value)}
      />
      <button className="p-2 bg-blue-500 text-white rounded" onClick={addPerson}>
        Add
      </button>
      <ul className="mt-4">
        {(treeData.people || []).map((person: any) => (
          <li key={person.id}>
            {person.name} ({person.sex}, b. {person.birthDate || 'Unknown'} in {person.birthPlace || 'Unknown'})
          </li>
        ))}
      </ul>
    </div>
  );
}
