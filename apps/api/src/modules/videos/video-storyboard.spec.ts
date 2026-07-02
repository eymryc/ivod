import {
  buildStoryboardVtt,
  resolveStoryboardTileCount,
  buildStoryboardFfmpegFilter,
} from './video-storyboard';

describe('video-storyboard', () => {
  it('resolveStoryboardTileCount caps at 100', () => {
    expect(resolveStoryboardTileCount(60)).toBe(10);
    expect(resolveStoryboardTileCount(3600)).toBe(100);
  });

  it('buildStoryboardVtt emits xywh cues', () => {
    const vtt = buildStoryboardVtt(30);
    expect(vtt).toContain('WEBVTT');
    expect(vtt).toContain('sprite.jpg#xywh=0,0,160,90');
    expect(vtt).toContain('00:00:06.000');
  });

  it('buildStoryboardFfmpegFilter includes tile layout', () => {
    expect(buildStoryboardFfmpegFilter(25)).toContain('tile=10x3');
  });
});
