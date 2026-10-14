const PRIVATE_SPECIFICATION_KEY = /imei|serial|barcode|seller|aadhaar|kyc|voucher|invoice|customer|phone\s*(?:number|no\.?)|mobile\s*(?:number|no\.?)|rack|bin|unit\s*(?:id|code)/i;

const isPrivateKey = key => PRIVATE_SPECIFICATION_KEY.test(String(key || '').replace(/[_-]+/g, ' '));

export const sanitizePublicSpecifications = value => {
  if (Array.isArray(value)) {
    return value
      .filter(item => {
        const label = item && typeof item === 'object' && (item.label || item.name || item.key);
        return !label || !isPrivateKey(label);
      })
      .map(sanitizePublicSpecifications)
      .filter(item => item !== undefined && item !== null && item !== '');
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value)
      .filter(([key]) => !isPrivateKey(key))
      .map(([key, item]) => [key, sanitizePublicSpecifications(item)])
      .filter(([, item]) => item !== undefined && item !== null && item !== ''));
  }

  return value;
};
