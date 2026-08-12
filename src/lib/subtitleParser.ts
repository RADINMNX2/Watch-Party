export interface SubtitleCue {
  id: number;
  start: number; // in seconds
  end: number;   // in seconds
  text: string;
}

export function parseSRT(data: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  const normalized = data.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split(/\n\n+/);

  let idCounter = 1;

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;

    let timeLineIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        timeLineIdx = i;
        break;
      }
    }

    if (timeLineIdx === -1) continue;

    const timeLine = lines[timeLineIdx];
    const textLines = lines.slice(timeLineIdx + 1);

    const timeMatch = timeLine.match(/(\d+:\d+:\d+[,.]\d+)\s*-->\s*(\d+:\d+:\d+[,.]\d+)/);
    if (!timeMatch) continue;

    const start = parseTimestamp(timeMatch[1]);
    const end = parseTimestamp(timeMatch[2]);
    const rawText = textLines.join('\n');
    const cleanText = cleanSubtitleText(rawText);

    if (cleanText) {
      cues.push({
        id: idCounter++,
        start,
        end,
        text: cleanText,
      });
    }
  }

  return cues;
}

export function parseVTT(data: string): SubtitleCue[] {
  // Strip WEBVTT header and use SRT-like block parsing
  const cleanData = data.replace(/^WEBVTT.*?\n\n/i, '');
  return parseSRT(cleanData);
}

export function parseASS(data: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  const lines = data.split(/\r?\n/);
  let idCounter = 1;

  for (const line of lines) {
    if (line.startsWith('Dialogue:')) {
      const parts = line.substring(9).split(',');
      if (parts.length >= 10) {
        const startStr = parts[1].trim();
        const endStr = parts[2].trim();
        const textStr = parts.slice(9).join(',');

        const start = parseTimestamp(startStr);
        const end = parseTimestamp(endStr);
        const cleanText = cleanSubtitleText(textStr.replace(/\\N/g, '\n').replace(/\\n/g, '\n'));

        if (cleanText) {
          cues.push({
            id: idCounter++,
            start,
            end,
            text: cleanText,
          });
        }
      }
    }
  }

  return cues;
}

function parseTimestamp(timeStr: string): number {
  const parts = timeStr.trim().replace(',', '.').split(':');
  if (parts.length === 3) {
    const hours = parseFloat(parts[0]);
    const minutes = parseFloat(parts[1]);
    const seconds = parseFloat(parts[2]);
    return hours * 3600 + minutes * 60 + seconds;
  } else if (parts.length === 2) {
    const minutes = parseFloat(parts[0]);
    const seconds = parseFloat(parts[1]);
    return minutes * 60 + seconds;
  }
  return 0;
}

function cleanSubtitleText(text: string): string {
  return text
    .replace(/<[^>]*>/g, '') // strip HTML tags
    .replace(/\{[^}]*\}/g, '') // strip ASS style codes
    .trim();
}

export function parseSubtitleFile(fileName: string, content: string): SubtitleCue[] {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'ass' || ext === 'ssa') {
    return parseASS(content);
  } else if (ext === 'vtt') {
    return parseVTT(content);
  } else {
    return parseSRT(content);
  }
}
