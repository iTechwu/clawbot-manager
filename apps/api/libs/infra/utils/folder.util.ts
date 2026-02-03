export default {
  ensurePrefixEndsWithSlash(prefix: string): string {
    if (!prefix.endsWith('/')) {
      prefix += '/';
    }
    return prefix;
  },
};
