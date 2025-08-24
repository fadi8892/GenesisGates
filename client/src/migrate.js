export async function migrateToIPFS() {
  const state = JSON.parse(localStorage.getItem('gg:gedcom:v2') || '{}');
  if (state.people?.length) {
    const res = await fetch('https://genesisgates.com/api/tree/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ treeData: state }),
    });
    const { cid } = await res.json();
    console.log('Migrated to IPFS with CID:', cid);
    localStorage.setItem('treeCid', cid);
    localStorage.removeItem('gg:gedcom:v2'); // Clean up
  }
}
