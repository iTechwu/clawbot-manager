export default {
  toString(arr: ArrayBuffer | string): string | undefined {
    if (typeof arr === 'string') {
      return arr;
    }
    return new TextDecoder().decode(arr) as string;
  },
};
