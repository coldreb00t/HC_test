export type UserRole = 'client' | 'trainer';

export interface UserFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  secretPhrase?: string;
}

export interface UserMetadata {
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  secretPhrase?: string;
} 