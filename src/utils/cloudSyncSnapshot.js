const serializePayload = payload => JSON.stringify(payload ?? []);

export const resolveCloudSnapshot = ({ marker, localPayload, cloudPayload, cloudVersion }) => {
  if (!marker || localPayload == null) return { action: 'use-cloud' };
  if (serializePayload(localPayload) === serializePayload(cloudPayload)) return { action: 'use-cloud' };

  const hasMatchingBase = marker.baseVersion != null && Number(marker.baseVersion) === Number(cloudVersion);
  return { action: hasMatchingBase ? 'restore-local' : 'conflict' };
};
