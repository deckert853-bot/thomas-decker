
export enum TransactionType {
  INCOME = 'Einnahme',
  EXPENSE = 'Ausgabe'
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
}

export interface Profile {
  id: string;
  name: string;
  taxId: string;
  responsible: string;
  taxRate: number;
  monthFilter: string;
  webhook1: string;
  webhook2: string;
  entries: Transaction[];
}

export interface AppStore {
  activeProfileId: string;
  profiles: Record<string, Profile>;
}
