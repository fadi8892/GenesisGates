'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, TreeDeciduous, Lock, Upload, Loader2, Trash2, AlertCircle } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { parseGedcom } from '@/lib/gedcom';

export default function Dashboard() {
  const [trees, setTrees] = useState<any[]>([]);
  const [tier, setTier] = useState('free');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false); // For add/delete spinners
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const router = useRouter();
  const supabase = createClient();

  // Helper to split array into chunks (Prevents Database Crash on large files)
  const chunkArray = (arr: any[], size: number) => {
    return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
      arr.slice(i * size, i * size + size)
    );
  };

  // 1. Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');

      // Get Profile (for limit)
      const { data: profile } = await supabase.from('profiles').select('tier').eq('id', user.id).single();
      // Get Trees
      const { data: userTrees, error } = await supabase.from('trees').select('*').order('created_at', { ascending: false });

      if (error) console.error("Error fetching trees:", error);

      setTier(profile?.tier || 'free');
      setTrees(userTrees || []);
      setLoading(false);
    };
    fetchData();
  }, [router, supabase]);

  const limit = tier === 'free' ? 2 : 10;
  const canCreate = trees.length < limit;

  // 2. Handle Create Tree (Manual)
  const handleCreate = async () => {
    if(!canCreate) return;
    setActionLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('trees')
        .insert({ user_id: user?.id, name: 'New Family Tree' })
        .select()
        .single();

      if (error) throw error;
      if (data) router.push(`/dashboard/tree/${data.id}`);
      
    } catch (err: any) {
      alert("Error creating tree: " + err.message);
      setActionLoading(false);
    }
  };

  // 3. Handle Delete Tree
  const handleDelete = async (e: React.MouseEvent, treeId: string) => {
    e.preventDefault(); // Prevent clicking the card
    e.stopPropagation();

    if (!confirm("Are you sure? This will delete the tree and all its members permanently.")) return;

    setActionLoading(true);
    
    // RLS policies set up previously will auto-cascade delete nodes/edges
    const { error } = await supabase.from('trees').delete().eq('id', treeId);

    if (error) {
      alert("Failed to delete: " + error.message);
    } else {
      // Remove from UI immediately
      setTrees(prev => prev.filter(t => t.id !== treeId));
    }
    setActionLoading(false);
  };

  // 4. Handle GEDCOM Import (With Batching)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const text = await file.text();
    
    try {
      // 1. Parse Data
      const { nodes, edges } = parseGedcom(text);
      console.log(`Ready to upload: ${nodes.length} nodes, ${edges.length} edges`);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      // 2. Create Tree Container
      const { data: newTree, error: treeError } = await supabase
        .from('trees')
        .insert({ user_id: user?.id, name: file.name.replace('.ged', '') })
        .select()
        .single();

      if (treeError) throw treeError;

      if (newTree) {
        // 3. Prepare Data
        const dbNodes = nodes.map(n => ({
          id: n.id,
          tree_id: newTree.id,
          type: n.type,
          position_x: n.position.x,
          position_y: n.position.y,
          data: n.data
        }));
        
        const dbEdges = edges.map(edge => ({
          id: edge.id,
          tree_id: newTree.id,
          source: edge.source,
          target: edge.target
        }));

        // 4. BATCH UPLOAD (Fixes 400 Error)
        // Upload Nodes in chunks of 100
        const nodeChunks = chunkArray(dbNodes, 100);
        let nProgress = 0;
        for (const chunk of nodeChunks) {
            const { error } = await supabase.from('nodes').insert(chunk);
            if (error) console.error("Node Chunk Error:", error);
            nProgress += chunk.length;
            console.log(`Uploaded nodes: ${nProgress}/${dbNodes.length}`);
        }

        // Upload Edges in chunks of 100
        const edgeChunks = chunkArray(dbEdges, 100);
        let eProgress = 0;
        for (const chunk of edgeChunks) {
            const { error } = await supabase.from('edges').insert(chunk);
            if (error) console.error("Edge Chunk Error:", error);
            eProgress += chunk.length;
            console.log(`Uploaded edges: ${eProgress}/${dbEdges.length}`);
        }

        router.push(`/dashboard/tree/${newTree.id}`);
      }
    } catch (err: any) {
      console.error(err);
      alert("Import Failed: " + err.message);
    } finally {
      setImporting(false);
      // Reset input so same file can be selected again if needed
      if(fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-900 gap-2">
      <Loader2 className="animate-spin text-accent" /> Loading Dashboard...
    </div>
  );

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-50 text-gray-900">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-bold">Your Family Trees</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${tier === 'pro' ? 'bg-accent/20 text-accent' : 'bg-gray-200 text-gray-700'}`}>
                {tier} Plan
              </span>
              <span className="text-gray-500 text-sm">
                ({trees.length} / {limit} trees used)
              </span>
            </div>
          </div>
          
          <div className="flex gap-3">
             <input type="file" accept=".ged" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />

             {/* Import Button */}
             <button 
               onClick={() => canCreate ? fileInputRef.current?.click() : alert("Limit Reached. Please upgrade or delete a tree.")}
               disabled={importing || actionLoading}
               className="flex items-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold transition-all disabled:opacity-50 border border-gray-300"
             >
               {importing ? <Loader2 className="animate-spin w-5 h-5" /> : <Upload className="w-5 h-5" />}
               <span className="hidden sm:inline">{importing ? "Importing..." : "Import GEDCOM"}</span>
             </button>

             {/* Create Button */}
             <button 
               onClick={handleCreate}
               disabled={!canCreate || actionLoading}
               className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-[0_0_15px_-5px_var(--color-accent)] ${
                 canCreate 
                  ? 'bg-accent hover:bg-accent-hover text-white' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none border border-gray-300'
               }`}
             >
                {actionLoading ? <Loader2 className="animate-spin w-5 h-5" /> : (
                  canCreate ? <><Plus className="w-5 h-5" /> Create New</> : <><Lock className="w-5 h-5" /> Limit Reached</>
                )}
             </button>
          </div>
        </div>

        {/* Tree Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trees.map((tree) => (
            <Link 
              key={tree.id} 
              href={`/dashboard/tree/${tree.id}`}
              className="group relative glass-panel p-6 hover:border-accent/50 transition-all cursor-pointer h-64 flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border border-accent/20">
                    <TreeDeciduous className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="text-xl font-bold truncate max-w-[200px]">{tree.name}</h3>
                  <p className="text-sm text-gray-500">Created {new Date(tree.created_at).toLocaleDateString()}</p>
                </div>
                
                {/* DELETE BUTTON */}
                <button 
                  onClick={(e) => handleDelete(e, tree.id)}
                  className="p-2 bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-600 rounded-lg transition-colors z-20"
                  title="Delete Tree"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="text-accent text-sm font-bold flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                Open Canvas <span className="text-lg leading-none">→</span>
              </div>
            </Link>
          ))}

          {/* Empty State */}
          {trees.length === 0 && (
            <div className="col-span-full py-24 text-center border-2 border-dashed border-gray-300 rounded-2xl bg-gray-100">
              <TreeDeciduous className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-500">No trees yet</h3>
              <p className="text-gray-400 mb-6">Create your first tree manually or import a file.</p>
              <button onClick={handleCreate} className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-800 font-medium transition-colors">
                Create Now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}