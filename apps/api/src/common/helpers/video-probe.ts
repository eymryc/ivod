import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

interface ProbeStream {
  codec_type?: string;
  duration?: string;
}

interface ProbeResult {
  streams?: ProbeStream[];
  format?: { duration?: string };
}

/** Durée en secondes via ffprobe (même source que le pipeline vidéo principal). */
export async function probeVideoDurationSec(
  filePath: string,
  ffprobePath = process.env.FFPROBE_PATH ?? 'ffprobe',
): Promise<number | null> {
  const { stdout } = await execFileAsync(ffprobePath, [
    '-v',
    'quiet',
    '-print_format',
    'json',
    '-show_streams',
    '-show_format',
    filePath,
  ]);

  const data: ProbeResult = JSON.parse(stdout);
  const video = data.streams?.find((s) => s.codec_type === 'video');
  const raw = video?.duration ?? data.format?.duration;
  if (!raw) return null;

  const duration = Math.round(parseFloat(raw));
  return duration > 0 ? duration : null;
}
