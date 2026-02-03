export default {
  parse(data: string, defaultValue: any): any {
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultValue;
    }
  },
};
