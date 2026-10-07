import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateRecordId } from '../lib/idGenerator';

/**
 * A plain store of records, saved in the browser and mirrored to Supabase.
 *
 * The five modules the company asked for - change control, tasks, approvals,
 * complaints and KPIs - were all written against a Hono server on
 * localhost:3001 that is not part of what gets deployed. Every one of them
 * showed an error banner and nothing else.
 *
 * Rather than write five near-identical stores, they share this one. The
 * shape (`records` plus `setRecords`) is the same as the eleven stores that
 * already work, which is what lets `qmsSync` pick all of them up without
 * knowing anything about what is inside.
 *
 * `id`, `createdAt` and `updatedAt` are handled here so no module has to
 * remember to set them - the sync compares whole records, and a missing
 * `updatedAt` makes it impossible to tell which of two edits came last.
 */

export interface BaseRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecordStore<T extends BaseRecord> {
  records: T[];
  addRecord: (data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>) => T;
  updateRecord: (id: string, data: Partial<T>) => void;
  deleteRecord: (id: string) => void;
  setRecords: (records: T[]) => void;
}

export function createRecordStore<T extends BaseRecord>(
  storageKey: string,
  idPrefix: string,
  seed: T[] = [],
) {
  return create<RecordStore<T>>()(
    persist(
      (set, get) => ({
        records: seed,

        addRecord: (data) => {
          const now = new Date().toISOString();
          const record = {
            ...data,
            id: generateRecordId(idPrefix),
            createdAt: now,
            updatedAt: now,
          } as T;
          set({ records: [record, ...get().records] });
          return record;
        },

        updateRecord: (id, data) => {
          const now = new Date().toISOString();
          set({
            records: get().records.map((r) =>
              r.id === id ? { ...r, ...data, id: r.id, updatedAt: now } : r,
            ),
          });
        },

        deleteRecord: (id) => {
          set({ records: get().records.filter((r) => r.id !== id) });
        },

        // Used by the sync when the database has newer data. It deliberately
        // does not touch `updatedAt` - these records already carry the
        // timestamps somebody else set.
        setRecords: (records) => set({ records }),
      }),
      { name: storageKey },
    ),
  );
}
