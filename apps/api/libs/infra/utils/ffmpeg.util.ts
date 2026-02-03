export const isHDR = (ffmpegInfo: any): boolean => {
  const hdrStandards = {
    colorPrimaries: ['bt2020', 'smpte2084', 'arib-std-b67'],
    colorTransfers: ['smpte2084', 'arib-std-b67'],
  };
  return ffmpegInfo.streams.some(
    (stream: any) =>
      hdrStandards.colorPrimaries.includes(stream.color_primaries) ||
      hdrStandards.colorTransfers.includes(stream.color_transfer),
  );
};

export const getVideoFrameRate = (ffmpegInfo: any): string | undefined => {
  // 平均帧率
  let rFrameRate: string | undefined = ffmpegInfo?.streams[0]?.r_frame_rate;
  if (!rFrameRate) {
    rFrameRate = ffmpegInfo?.streams[0]?.frame_rate;
  }
  if (!rFrameRate) {
    const nbFrames = ffmpegInfo?.streams[0]?.nb_frames;
    const duration =
      ffmpegInfo?.format?.duration || ffmpegInfo?.streams[0]?.duration;
    if (nbFrames && duration) {
      rFrameRate =
        (parseInt(nbFrames) / parseFloat(duration)).toFixed(4) + ':1';
    }
  }
  return rFrameRate;
};
