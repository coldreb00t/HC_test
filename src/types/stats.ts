import type { ReactNode } from 'react';

export interface Achievement {
  title: string;
  description: string;
  icon: ReactNode;
  value: string;
  color: string;
  bgImage?: string;
  motivationalPhrase: string;
}

export interface UserStats {
  workouts: {
    totalCount: number;
    completedCount: number;
    totalVolume: number;
  };
  activities: {
    totalMinutes: number;
    types: {[key: string]: number};
  };
  measurements: {
    currentWeight: number | null;
    initialWeight: number | null;
    weightChange: number | null;
  };
  achievements: {
    total: number;
    completed: number;
  };
} 