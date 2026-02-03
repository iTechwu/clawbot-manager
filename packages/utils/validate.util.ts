export default {
  isBlank(data: any, debug: boolean = false): boolean {
    if (data == null) return true;
    if (typeof data === 'string') return data.trim() === '';
    if (Array.isArray(data)) return data.length === 0;
    if (typeof data === 'object') return Object.keys(data).length === 0;
    if (typeof data === 'number') return data === 0;
    return false;
  },
  isNotBlank(data: any): boolean {
    return !this.isBlank(data);
  },
  diffStr(str1: string, str2: string): string {
    return str2
      .split('')
      .filter((char) => !str1.includes(char))
      .join('');
  },
  getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + Math.ceil(min);
  },
  isXinPianChangEmail(email: string): boolean {
    return email.endsWith('@xinpianchang.com');
  },
};
