import type { Metadata, Session } from '@/lib/opencode/model';

export type SessionMetadataRecord = Metadata;

type OpencodeSilverMetadata = {
  kind?: 'review';
  originalSessionID?: string;
  reviewSessionID?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

export const getSessionMetadata = (session: Session | null | undefined): SessionMetadataRecord => (
  session?.metadata ?? {}
);

const getOpencodeSilverMetadata = (metadata: SessionMetadataRecord): OpencodeSilverMetadata => {
  const value = metadata.opencodesilver;
  return isRecord(value) ? value as OpencodeSilverMetadata : {};
};

export const getReviewSessionID = (session: Session | null | undefined): string | null => {
  const value = getOpencodeSilverMetadata(getSessionMetadata(session)).reviewSessionID;
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
};

export const getOriginalSessionID = (session: Session | null | undefined): string | null => {
  const value = getOpencodeSilverMetadata(getSessionMetadata(session)).originalSessionID;
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
};

export const isReviewSession = (session: Session | null | undefined): boolean =>
  getOpencodeSilverMetadata(getSessionMetadata(session)).kind === 'review' && Boolean(getOriginalSessionID(session));

export const withReviewSessionLink = (
  metadata: SessionMetadataRecord,
  reviewSessionID: string,
): SessionMetadataRecord => {
  const current = getOpencodeSilverMetadata(metadata);
  return {
    ...metadata,
    opencodesilver: {
      ...current,
      reviewSessionID,
    },
  };
};

export const withReviewSessionMarker = (
  metadata: SessionMetadataRecord,
  originalSessionID: string,
): SessionMetadataRecord => {
  const current = getOpencodeSilverMetadata(metadata);
  return {
    ...metadata,
    opencodesilver: {
      ...current,
      kind: 'review' as const,
      originalSessionID,
    },
  };
};

export const withoutReviewSessionLink = (
  metadata: SessionMetadataRecord,
  reviewSessionID: string,
): SessionMetadataRecord => {
  const current = getOpencodeSilverMetadata(metadata);
  if (current.reviewSessionID !== reviewSessionID) return metadata;

  const restOpencodeSilver = { ...current };
  delete restOpencodeSilver.reviewSessionID;
  const next: SessionMetadataRecord = { ...metadata };
  if (Object.keys(restOpencodeSilver).length > 0) {
    next.opencodesilver = restOpencodeSilver;
  } else {
    delete next.opencodesilver;
  }
  return next;
};
