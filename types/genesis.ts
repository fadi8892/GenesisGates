export interface TreeMember {
  id: string;
  tree_id: string;
  label: string;
  pos_x: number;
  pos_y: number;
  bio?: string;
  lat?: number;
  lng?: number;
  dna_color?: string;
}

export interface TreeEdge {
  id: string;
  tree_id: string;
  source: string;
  target: string;
}

export interface UserRole {
  role: 'admin' | 'viewer';
  email?: string;
}