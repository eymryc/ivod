import { buildMasterPlaylistBody } from './video-hls-manifest';

const BASE_RENDITION = {
  videoBitrate: 3_000_000,
  audioBitrate: 128_000,
  width: 1280,
  height: 720,
  codecs: 'avc1.640020,mp4a.40.2',
  playlistPath: 'hls/asset1/720p/index.m3u8',
};

describe('buildMasterPlaylistBody', () => {
  it('émet EXT-X-VERSION:3 pour les segments MPEG-TS (défaut)', () => {
    const body = buildMasterPlaylistBody([BASE_RENDITION]);
    expect(body).toContain('#EXT-X-VERSION:3');
  });

  it('émet EXT-X-VERSION:7 pour les segments fMP4/CMAF', () => {
    const body = buildMasterPlaylistBody([BASE_RENDITION], [], [], 'fmp4');
    expect(body).toContain('#EXT-X-VERSION:7');
  });

  it('inclut toujours EXT-X-INDEPENDENT-SEGMENTS', () => {
    const ts   = buildMasterPlaylistBody([BASE_RENDITION]);
    const fmp4 = buildMasterPlaylistBody([BASE_RENDITION], [], [], 'fmp4');
    expect(ts).toContain('#EXT-X-INDEPENDENT-SEGMENTS');
    expect(fmp4).toContain('#EXT-X-INDEPENDENT-SEGMENTS');
  });

  it('inclut les sous-titres EXT-X-MEDIA et SUBTITLES sur les variants', () => {
    const body = buildMasterPlaylistBody(
      [BASE_RENDITION],
      [
        {
          languageCode: 'fr',
          label: 'Français',
          objectKey: 'subtitles/c1/fr.vtt',
          isDefault: true,
        },
      ],
    );

    expect(body).toContain('TYPE=SUBTITLES');
    expect(body).toContain('URI="subtitles/c1/fr.vtt"');
    expect(body).toContain('SUBTITLES="subs"');
  });

  it('inclut les pistes audio EXT-X-MEDIA et AUDIO sur les variants', () => {
    const body = buildMasterPlaylistBody(
      [BASE_RENDITION],
      [],
      [
        {
          languageCode: 'fr',
          label: 'Français',
          playlistPath: 'hls/asset1/audio/fr/index.m3u8',
          isDefault: true,
        },
      ],
    );

    expect(body).toContain('TYPE=AUDIO');
    expect(body).toContain('AUDIO="aud"');
  });

  it('inclut FRAME-RATE quand la rendition fournit frameRate', () => {
    const body = buildMasterPlaylistBody([
      { ...BASE_RENDITION, frameRate: 29.97 },
    ]);
    expect(body).toContain('FRAME-RATE=29.970');
  });

  it('omet FRAME-RATE quand frameRate est absent', () => {
    const body = buildMasterPlaylistBody([BASE_RENDITION]);
    expect(body).not.toContain('FRAME-RATE');
  });
});
