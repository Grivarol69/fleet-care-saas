export type MantMapperItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type MantMapperCandidate = {
  id: string;
  name: string;
  description?: string | null;
  categoryName: string;
};

export type MantMapperMapping = {
  ocrDescription: string;
  mantItemId: string | null;
  confidence: number;
};

export type MantMapperOutcome =
  | { ok: true; mappings: MantMapperMapping[] }
  | {
      ok: false;
      reason: 'no_api_key' | 'haiku_error' | 'malformed_response';
      mappings: MantMapperMapping[];
    };
