export default {
  formatFrame(frame = '00:00:00.000'): number {
    const parts = frame.split(':');
    return (
      parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2])
    );
  },

  frameToTime(frame: number): string {
    const totalSeconds = Math.floor(frame);
    const decimalPart = frame - totalSeconds;
    const hours = Math.floor(totalSeconds / 3600)
      .toString()
      .padStart(2, '0');
    const minutes = Math.floor((totalSeconds % 3600) / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}.${decimalPart.toFixed(3).slice(2)}`;
  },
};
