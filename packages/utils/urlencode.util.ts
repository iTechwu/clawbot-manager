export default {
  urlsafeBase64Encode(jsonFlags: string): string {
    const encoded = Buffer.from(jsonFlags).toString('base64');
    return this.base64ToUrlSafe(encoded);
  },

  urlSafeBase64Decode(fromStr: string): string {
    return Buffer.from(this.urlSafeToBase64(fromStr), 'base64').toString();
  },

  base64ToUrlSafe(v: string): string {
    return v.replace(/\//g, '_').replace(/\+/g, '-');
  },

  urlSafeToBase64(v: string): string {
    return v.replace(/_/g, '/').replace(/-/g, '+');
  },
};
