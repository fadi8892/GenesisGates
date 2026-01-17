export interface LifeEvent {
  id: string;
  title: string; // e.g., "Marriage", "Graduation"
  date: string;
  location: string;
  description?: string;
}

export interface FamilyMemberData {
  label: string;      // Display Name
  role?: string;      // e.g., "Patriarch", "Mother"
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  bio?: string;
  gender?: 'male' | 'female' | 'other';
  lifeEvents?: LifeEvent[];
  // You can add 'photos', 'sources' here later
}