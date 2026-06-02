import { buildMasterPlaylistBody } from './video-hls-manifest';

describe('buildMasterPlaylistBody', () => {
  it('includes subtitle EXT-X-MEDIA and SUBTITLES on variants', () => {
    const body = buildMasterPlaylistBody(
      [
        {
          videoBitrate: 3_000_000,
          audioBitrate: 128_000,
          width: 1280,
          height: 720,
          codecs: 'avc1.640020,mp4a.40.2',
          playlistPath: 'hls/asset1/720p/index.m3u8',
        },
      ],
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

  it('includes audio EXT-X-MEDIA and AUDIO on variants', () => {
    const body = buildMasterPlaylistBody(
      [
        {
          videoBitrate: 3_000_000,
          audioBitrate: 128_000,
          width: 1280,
          height: 720,
          codecs: 'avc1.640020,mp4a.40.2',
          playlistPath: 'hls/asset1/720p/index.m3u8',
        },
      ],
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
});
