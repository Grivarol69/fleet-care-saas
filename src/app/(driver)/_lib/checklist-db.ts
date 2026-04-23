import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'fleet-care-driver-v1';
const DB_VERSION = 1;

export type ChecklistItemDraft = {
  category: string;
  label: string;
  status: 'OK' | 'OBSERVATION' | 'CRITICAL' | null;
  notes: string;
  order: number;
};

export type ChecklistDraft = {
  id: string;
  tenantId: string;
  vehicleId: string;
  driverId: string;
  odometer: number | null;
  items: ChecklistItemDraft[];
  templateId: string | null;
  createdAt: string;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'error';
};

export type IncidentDraft = {
  id: string;
  tenantId: string;
  vehicleId: string;
  driverId: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  photoBlob: Blob | null;
  lat: number | null;
  lng: number | null;
  createdAt: string;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'error';
};

type DriverDB = {
  checklist_drafts: {
    key: string;
    value: ChecklistDraft;
    indexes: { by_sync: string };
  };
  incident_drafts: {
    key: string;
    value: IncidentDraft;
    indexes: { by_sync: string };
  };
};

let dbPromise: Promise<IDBPDatabase<DriverDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<DriverDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('checklist_drafts')) {
          const store = db.createObjectStore('checklist_drafts', {
            keyPath: 'id',
          });
          store.createIndex('by_sync', 'syncStatus');
        }
        if (!db.objectStoreNames.contains('incident_drafts')) {
          const store = db.createObjectStore('incident_drafts', {
            keyPath: 'id',
          });
          store.createIndex('by_sync', 'syncStatus');
        }
      },
    });
  }
  return dbPromise;
}

// ---- Checklist drafts ----

export async function saveChecklistDraft(draft: ChecklistDraft): Promise<void> {
  const db = await getDb();
  await db.put('checklist_drafts', draft);
}

export async function getChecklistDraft(
  id: string
): Promise<ChecklistDraft | undefined> {
  const db = await getDb();
  return db.get('checklist_drafts', id);
}

export async function getPendingChecklistDrafts(): Promise<ChecklistDraft[]> {
  const db = await getDb();
  return db.getAllFromIndex('checklist_drafts', 'by_sync', 'pending');
}

export async function deleteChecklistDraft(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('checklist_drafts', id);
}

// ---- Incident drafts ----

export async function saveIncidentDraft(draft: IncidentDraft): Promise<void> {
  const db = await getDb();
  await db.put('incident_drafts', draft);
}

export async function getPendingIncidentDrafts(): Promise<IncidentDraft[]> {
  const db = await getDb();
  return db.getAllFromIndex('incident_drafts', 'by_sync', 'pending');
}

export async function deleteIncidentDraft(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('incident_drafts', id);
}
