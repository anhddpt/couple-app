import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { env } from '@/config/env';
import { getActiveCoupleState, getAvatar, getAvatarState, getProfile } from '@/features/profile/profileApi';
import { unregisterCurrentPushDevice } from '@/services/notifications';
import { supabase } from '@/services/supabase/client';
import type { Avatar, AvatarState, CoupleSummary, Profile } from '@/types/domain';

type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  avatar: Avatar | null;
  avatarState: AvatarState | null;
  couple: CoupleSummary | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatar, setAvatar] = useState<Avatar | null>(null);
  const [avatarState, setAvatarState] = useState<AvatarState | null>(null);
  const [couple, setCouple] = useState<CoupleSummary | null>(null);
  const loadGeneration = useRef(0);

  async function loadForSession(nextSession: Session | null) {
    const generation = ++loadGeneration.current;
    setSession(nextSession);

    if (!nextSession) {
      setProfile(null);
      setAvatar(null);
      setAvatarState(null);
      setCouple(null);
      return;
    }

    const userId = nextSession.user.id;
    const nextProfile = await getProfile(userId);
    if (generation !== loadGeneration.current) return;
    setProfile(nextProfile);

    if (!nextProfile) {
      setAvatar(null);
      setAvatarState(null);
      setCouple(null);
      return;
    }

    const [nextAvatar, nextAvatarState, nextCouple] = await Promise.all([
      getAvatar(userId),
      getAvatarState(userId),
      getActiveCoupleState(),
    ]);
    if (generation !== loadGeneration.current) return;
    setAvatar(nextAvatar);
    setAvatarState(nextAvatarState);
    setCouple(nextCouple);
  }

  async function refresh() {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    await loadForSession(data.session);
  }

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    void supabase.auth.getSession().then(async ({ data }) => {
      try {
        await loadForSession(data.session);
      } finally {
        setLoading(false);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void loadForSession(nextSession);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const value: AuthContextValue = {
    configured: env.isSupabaseConfigured,
    loading,
    session,
    profile,
    avatar,
    avatarState,
    couple,
    refresh,
    signOut: async () => {
      await unregisterCurrentPushDevice();
      await supabase?.auth.signOut({ scope: 'local' });
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}
