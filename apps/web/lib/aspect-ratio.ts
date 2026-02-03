export const getAspectRatioClass = (ratio: string): string => {
  const aspectRatioMap: Record<string, string> = {
    '1:1': 'aspect-square',
    '3:4': 'aspect-[3/4]',
    '4:3': 'aspect-[4/3]',
    '16:9': 'aspect-[16/9]',
    '9:16': 'aspect-[9/16]',
  };
  return aspectRatioMap[ratio] || 'aspect-square';
};
