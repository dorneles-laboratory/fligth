export interface TelemetryPoint {
  id: number;
  time: string;
  timestamp: number;
  Pitch: number;
  Roll: number;
  Radar_cm: number;
  Nivel_Perigo: number;
  Status: string;
}

export type DangerCategory = 'safe' | 'alert' | 'critical';

export interface ParseResult {
  success: boolean;
  data?: TelemetryPoint;
  raw: string;
  error?: string;
}
