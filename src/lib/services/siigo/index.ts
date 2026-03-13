export { createSiigoClient } from './siigo-api-client';
export type { SiigoClient } from './siigo-api-client';

export { encryptAccessKey, decryptAccessKey, validateSiigoEncryptionKey } from './siigo-crypto';

export { throwSiigoError, isSiigoError } from './siigo-errors';
export type { SiigoError, SiigoErrorKind } from './siigo-errors';

export * from './siigo-types';

// siigo-sync-service exports added in Phase 2
export { SiigoSyncService } from './siigo-sync-service';
