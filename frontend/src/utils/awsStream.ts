export type AwsRow = { t: number; ap: number; ws: number; wd: number; rh: number };

function lerpAngle(a: number, b: number, t: number) {
  const diff = ((b - a + 540) % 360) - 180;
  return (a + diff * t + 360) % 360;
}

function lerp(a: number, b: number, t: number) {
  return +(a + (b - a) * t).toFixed(1);
}

function interpolateRows(a: AwsRow, b: AwsRow, steps: number): AwsRow[] {
  const result: AwsRow[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    result.push({
      t:  lerp(a.t,  b.t,  t),
      ap: lerp(a.ap, b.ap, t),
      ws: Math.max(0, lerp(a.ws, b.ws, t)),
      wd: Math.round(lerpAngle(a.wd, b.wd, t)),
      rh: Math.min(100, Math.max(0, lerp(a.rh, b.rh, t))),
    });
  }
  return result;
}

function buildSmoothedStream(rows: AwsRow[], steps = 10): AwsRow[] {
  const out: AwsRow[] = [];
  for (let i = 0; i < rows.length - 1; i++) {
    out.push(...interpolateRows(rows[i], rows[i + 1], steps));
  }
  return out;
}

type StreamListener = (data: AwsRow) => void;
const listeners = { maitri: new Set<StreamListener>(), bharati: new Set<StreamListener>() };
let streamData: { maitri: AwsRow[]; bharati: AwsRow[] } = { maitri: [], bharati: [] };
let idx = { maitri: 0, bharati: 0 };
let currentData: { maitri: AwsRow | null; bharati: AwsRow | null } = { maitri: null, bharati: null };
let initialized = false;

export function initAwsStream() {
  if (initialized) return;
  initialized = true;

  fetch('/aws_dataset.json')
    .then(r => r.json())
    .then((d: { maitri: AwsRow[]; bharati: AwsRow[] }) => {
      streamData = {
        maitri: buildSmoothedStream(d.maitri, 10),
        bharati: buildSmoothedStream(d.bharati, 10),
      };
      idx.bharati = Math.floor(streamData.bharati.length * 0.6);

      setInterval(() => {
        ['maitri', 'bharati'].forEach((st) => {
          const station = st as 'maitri' | 'bharati';
          const stream = streamData[station];
          if (!stream.length) return;
          const row = stream[idx[station] % stream.length];
          idx[station]++;
          currentData[station] = row;
          listeners[station].forEach(fn => fn(row));
        });
      }, 2000);
    })
    .catch(() => { initialized = false; });
}

export function subscribeAwsStream(station: 'maitri' | 'bharati', fn: StreamListener) {
  listeners[station].add(fn);
  if (currentData[station]) fn(currentData[station]!);
  return () => { listeners[station].delete(fn); };
}
