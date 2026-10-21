import type { TelemetryPoint } from '../types/telemetry';

let pointCounter = 0;

/**
 * Expressão regular estrita para os formatos com vírgula (,) ou pipe (|):
 * "Pitch:10.5,Roll:-5.2,Radar_cm:30.0,Nivel_Perigo:0,Status:Voo Normal"
 * "Pitch:10.5 | Roll:-5.2 | Radar_cm:30.0 | Nivel_Perigo:0 | Status:Voo estabilizado e seguro"
 */
const STRICT_SERIAL_REGEX =
  /Pitch:\s*([+-]?\d+(?:\.\d+)?)\s*[,|]\s*Roll:\s*([+-]?\d+(?:\.\d+)?)\s*[,|]\s*Radar_cm:\s*([+-]?\d+(?:\.\d+)?)\s*[,|]\s*Nivel_Perigo:\s*([+-]?\d+(?:\.\d+)?)\s*[,|]\s*Status:\s*([^\r\n]+)/i;

/**
 * Formata um timestamp para formato legível de telemetria "HH:mm:ss.S"
 */
export function formatTelemetryTime(date: Date = new Date()): string {
  const pad = (n: number, z = 2) => ('00' + n).slice(-z);
  const h = pad(date.getHours());
  const m = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  const ms = Math.floor(date.getMilliseconds() / 100);
  return `${h}:${m}:${s}.${ms}`;
}

/**
 * Realiza o parse da linha serial vinda do Arduino via Regex
 */
export function parseSerialLine(line: string): TelemetryPoint | null {
  const cleanLine = line.trim();
  if (!cleanLine) return null;

  // Tentativa 1: Regex estrito com suporte a separadores vírgula (,) ou pipe (|)
  const strictMatch = cleanLine.match(STRICT_SERIAL_REGEX);

  if (strictMatch) {
    const pitch = parseFloat(strictMatch[1]);
    const roll = parseFloat(strictMatch[2]);
    const radar = parseFloat(strictMatch[3]);
    const danger = parseFloat(strictMatch[4]);
    const rawStatus = strictMatch[5].replace(/[|,\s]+$/, '').trim();

    if (
      Number.isFinite(pitch) &&
      Number.isFinite(roll) &&
      Number.isFinite(radar) &&
      Number.isFinite(danger)
    ) {
      const now = new Date();
      return {
        id: ++pointCounter,
        time: formatTelemetryTime(now),
        timestamp: now.getTime(),
        Pitch: Math.max(-180, Math.min(180, pitch)),
        Roll: Math.max(-180, Math.min(180, roll)),
        Radar_cm: Math.max(0, Math.min(100, radar)),
        Nivel_Perigo: Math.max(0, Math.min(100, danger)),
        Status: rawStatus || 'Voo Normal',
      };
    }
  }

  // Tentativa 2: Extração individual flexível por campos com Regex
  const pitchMatch = cleanLine.match(/Pitch:\s*([+-]?\d+(?:\.\d+)?)/i);
  const rollMatch = cleanLine.match(/Roll:\s*([+-]?\d+(?:\.\d+)?)/i);
  const radarMatch = cleanLine.match(/Radar_cm:\s*([+-]?\d+(?:\.\d+)?)/i);
  const dangerMatch = cleanLine.match(/Nivel_Perigo:\s*([+-]?\d+(?:\.\d+)?)/i);
  const statusMatch = cleanLine.match(/Status:\s*([^,\r\n|]+)/i);

  if (pitchMatch && rollMatch && radarMatch && dangerMatch && statusMatch) {
    const pitch = parseFloat(pitchMatch[1]);
    const roll = parseFloat(rollMatch[1]);
    const radar = parseFloat(radarMatch[1]);
    const danger = parseFloat(dangerMatch[1]);
    const rawStatus = statusMatch[1].replace(/[|,\s]+$/, '').trim();

    if (
      Number.isFinite(pitch) &&
      Number.isFinite(roll) &&
      Number.isFinite(radar) &&
      Number.isFinite(danger)
    ) {
      const now = new Date();
      return {
        id: ++pointCounter,
        time: formatTelemetryTime(now),
        timestamp: now.getTime(),
        Pitch: Math.max(-180, Math.min(180, pitch)),
        Roll: Math.max(-180, Math.min(180, roll)),
        Radar_cm: Math.max(0, Math.min(100, radar)),
        Nivel_Perigo: Math.max(0, Math.min(100, danger)),
        Status: rawStatus || 'Voo Normal',
      };
    }
  }

  return null;
}
