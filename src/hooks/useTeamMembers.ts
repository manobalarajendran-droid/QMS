import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/apiClient';
import { useAuth } from './useAuth';

/**
 * The people who can be given a task or named as an owner: every account on
 * the QMS server (GET /api/users). Empty in offline mode.
 */

export interface TeamMember {
  id: string;
  name: string;
  email: string;
}

interface ServerUser {
  id: string;
  email: string;
  name: string | null;
}

export function useTeamMembers(): TeamMember[] {
  const { isAuthenticated, isOffline } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    if (!isAuthenticated || isOffline) {
      setMembers([]);
      return;
    }
    let cancelled = false;
    apiFetch<{ users: ServerUser[] }>('/users')
      .then(({ users }) => {
        if (cancelled) return;
        setMembers(
          users
            .map((u) => ({ id: u.id, email: u.email, name: u.name || u.email.split('@')[0] }))
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
      })
      .catch((error) => console.warn('[team] could not load users:', error));
    return () => { cancelled = true; };
  }, [isAuthenticated, isOffline]);

  return members;
}
