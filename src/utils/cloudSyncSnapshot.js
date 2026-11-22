const serializePayload = payload => JSON.stringify(payload ?? []);

// Decide whether a cloud pull is safe to apply when this device has an
// outstanding local write. Keeping this policy pure makes recovery behavior
// testable without a live Supabase connection.
export const resolveCloudSnapshot = ({ marker, localPayload, cloudPayload, cloudVersion }) => {
  if (!marker || localPayload == null) return { action: 'use-cloud' };
  if (serializePayload(localPayload) === serializePayload(cloudPayload)) return { action: 'use-cloud' };

  const hasMatchingBase = marker.baseVersion != null && Number(marker.baseVersion) === Number(cloudVersion);
  return { action: hasMatchingBase ? 'restore-local' : 'conflict' };
};
