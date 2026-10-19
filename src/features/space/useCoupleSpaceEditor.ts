import { useEffect, useRef, useState } from 'react';

import { requireSupabase } from '@/services/supabase/client';
import type { CoupleOutfit, CoupleSpace, PetType, RoomTheme } from '@/types/domain';

import { careForPet, getCoupleSpace, updateCoupleSpace } from './spaceApi';

export type CoupleSpaceDraft = {
  roomTheme: RoomTheme;
  petType: PetType;
  petName: string;
  coupleOutfit: CoupleOutfit;
};

const defaultDraft: CoupleSpaceDraft = {
  roomTheme: 'sunset',
  petType: 'cat',
  petName: 'Mochi',
  coupleOutfit: 'classic',
};

export function useCoupleSpaceEditor(coupleId: string, fallbackError: string) {
  const [space, setSpace] = useState<CoupleSpace | null>(null);
  const [draft, setDraftState] = useState(defaultDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [conflictSpace, setConflictSpace] = useState<CoupleSpace | null>(null);
  const dirty = useRef(false);
  const remotePending = useRef(false);

  function applySpace(value: CoupleSpace) {
    setSpace(value);
    setDraftState({
      roomTheme: value.room_theme,
      petType: value.pet_type,
      petName: value.pet_name,
      coupleOutfit: value.couple_outfit,
    });
    dirty.current = false;
  }

  useEffect(() => {
    let active = true;
    void getCoupleSpace()
      .then((value) => {
        if (active) applySpace(value);
      })
      .catch((nextError) => {
        if (active) setError(nextError instanceof Error ? nextError.message : fallbackError);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const client = requireSupabase();
    const channel = client
      .channel(`space-editor:${coupleId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'couple_spaces', filter: `couple_id=eq.${coupleId}` },
        () => {
          if (dirty.current) remotePending.current = true;
          else void getCoupleSpace().then((value) => active && applySpace(value));
        },
      )
      .subscribe();

    return () => {
      active = false;
      void client.removeChannel(channel);
    };
  }, [coupleId, fallbackError]);

  function updateDraft(patch: Partial<CoupleSpaceDraft>) {
    dirty.current = true;
    setDraftState((current) => ({ ...current, ...patch }));
  }

  async function save() {
    if (!space || conflictSpace) return;
    try {
      setSaving(true);
      setError('');
      const saved = await updateCoupleSpace({
          ...draft,
          expectedUpdatedAt: space.updated_at,
        });
      applySpace(saved);
      if (remotePending.current) {
        remotePending.current = false;
        applySpace(await getCoupleSpace());
      }
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : fallbackError;
      setError(message);
      if (message.includes('Shared space changed')) {
        const latest = await getCoupleSpace().catch(() => null);
        if (latest) {
          setSpace(latest);
          setConflictSpace(latest);
          remotePending.current = false;
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function care() {
    if (conflictSpace) return;
    try {
      setError('');
      setSpace(await careForPet());
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : fallbackError);
    }
  }

  async function reloadAfterConflict() {
    if (!conflictSpace) return;
    try {
      applySpace(await getCoupleSpace());
      setConflictSpace(null);
      setError('');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : fallbackError);
    }
  }

  return {
    space,
    draft,
    loading,
    saving,
    error,
    hasConflict: Boolean(conflictSpace),
    updateDraft,
    save,
    care,
    reloadAfterConflict,
  };
}
