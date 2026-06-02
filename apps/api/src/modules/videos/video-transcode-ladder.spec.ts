import {
  buildLadderFilterGraph,
  buildSinglePassFfmpegArgs,
  buildScaleFormatChain,
  isSinglePassLadderEnabled,
} from './video-transcode-ladder';
import { RENDITION_PROFILES } from './video-pipeline.constants';

describe('video-transcode-ladder', () => {
  const meta = {
    displayWidth: 1280,
    displayHeight: 720,
    frameRate: 25,
    durationSec: 120,
    isHDR: false,
    audioChannels: 2,
  };

  it('buildScaleFormatChain SDR', () => {
    expect(buildScaleFormatChain(720, false)).toContain('scale=-2:720');
    expect(buildScaleFormatChain(720, false)).toContain('yuv420p');
  });

  it('buildLadderFilterGraph multi renditions with audio split', () => {
    const profiles = RENDITION_PROFILES.filter((p) =>
      ['360p', '720p'].includes(p.name),
    );
    const graph = buildLadderFilterGraph(profiles, meta);
    expect(graph.filterComplex).toContain('split=2');
    expect(graph.filterComplex).toContain('loudnorm');
    expect(graph.filterComplex).toContain('asplit=2');
    expect(graph.videoLabels).toHaveLength(2);
    expect(graph.audioLabels).toHaveLength(2);
  });

  it('buildSinglePassFfmpegArgs produces multiple HLS outputs', () => {
    const profiles = RENDITION_PROFILES.filter((p) => p.name === '360p');
    const args = buildSinglePassFfmpegArgs({
      sourceFile: '/tmp/source.mp4',
      tmpDir: '/tmp/out',
      profiles,
      meta,
      videoEncoderArgs: () => ['-preset', 'medium', '-crf', '23'],
    });
    expect(args).toContain('-filter_complex');
    expect(args.filter((a) => a === 'hls').length).toBe(1);
    expect(args.some((a) => String(a).includes('index.m3u8'))).toBe(true);
  });

  it('isSinglePassLadderEnabled defaults true', () => {
    const prev = process.env.VIDEO_SINGLE_PASS_LADDER;
    delete process.env.VIDEO_SINGLE_PASS_LADDER;
    expect(isSinglePassLadderEnabled()).toBe(true);
    process.env.VIDEO_SINGLE_PASS_LADDER = 'false';
    expect(isSinglePassLadderEnabled()).toBe(false);
    if (prev !== undefined) process.env.VIDEO_SINGLE_PASS_LADDER = prev;
    else delete process.env.VIDEO_SINGLE_PASS_LADDER;
  });
});
