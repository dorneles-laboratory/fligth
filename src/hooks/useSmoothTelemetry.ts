import { useState, useEffect, useRef } from 'react';
import { TelemetryPoint } from '../types/telemetry';

/**
 * Hook de Interpolação Matemática em Tempo Real (Dead-Reckoning & Damped Smoothing)
 * 
 * Resolve a discrepância entre a frequência discreta de envio do Arduino (~5 a 10 Hz)
 * e a taxa de renderização dos monitores modernos (60 a 144 Hz).
 * 
 * Calcula os pontos intermediários nos tempos faltantes através de amortecimento
 * exponencial independente de taxa de quadros (critically damped exponential smoothing).
 */
export function useSmoothTelemetry(rawPoint: TelemetryPoint): TelemetryPoint {
  // Ponto suavizado mantido como ref para alta performance
  const smoothRef = useRef({
    Pitch: rawPoint.Pitch,
    Roll: rawPoint.Roll,
    Radar_cm: rawPoint.Radar_cm,
    Nivel_Perigo: rawPoint.Nivel_Perigo,
  });

  const lastRawRef = useRef(rawPoint);
  const lastPacketTimeRef = useRef(performance.now());
  const estimatedIntervalRef = useRef(100); // ms entre pacotes

  // Estado que atualiza o componente a cada quadro de animação (RAF)
  const [smoothTelemetry, setSmoothTelemetry] = useState<TelemetryPoint>(rawPoint);

  // Monitora a chegada de novos pacotes seriais reais
  useEffect(() => {
    const now = performance.now();
    const packetDelta = Math.max(10, Math.min(500, now - lastPacketTimeRef.current));
    lastPacketTimeRef.current = now;

    // Média móvel da taxa de amostragem do hardware
    estimatedIntervalRef.current = estimatedIntervalRef.current * 0.7 + packetDelta * 0.3;
    lastRawRef.current = rawPoint;
  }, [rawPoint]);

  // Loop de alta frequência independente do hardware (60 - 144 FPS)
  useEffect(() => {
    let animId: number;
    let lastFrameTime = performance.now();

    const renderLoop = (time: number) => {
      // Delta de tempo entre quadros da tela em segundos (seguro contra background tabs)
      const delta = Math.min(0.064, (time - lastFrameTime) / 1000);
      lastFrameTime = time;

      const current = smoothRef.current;
      const target = lastRawRef.current;

      // Lambda adaptativo: se o Arduino envia mais rápido, aumenta a taxa de convergência
      // Intervalo ~100ms -> lambda ~12; Intervalo ~200ms -> lambda ~9
      const intervalSec = estimatedIntervalRef.current / 1000;
      const lambda = Math.max(8, Math.min(22, 1.8 / intervalSec));

      // Amortecimento exponencial delta-independente: x(t) = target + (x - target) * exp(-lambda * dt)
      const factor = 1 - Math.exp(-lambda * delta);

      // Interpolação suave dos parâmetros com proteção rigorosa contra NaN
      const targetPitch = Number.isFinite(target.Pitch) ? target.Pitch : current.Pitch;
      const targetRoll = Number.isFinite(target.Roll) ? target.Roll : current.Roll;
      const targetRadar = Number.isFinite(target.Radar_cm) ? target.Radar_cm : current.Radar_cm;
      const targetDanger = Number.isFinite(target.Nivel_Perigo) ? target.Nivel_Perigo : current.Nivel_Perigo;

      current.Pitch += (targetPitch - current.Pitch) * factor;
      current.Roll += (targetRoll - current.Roll) * factor;
      current.Radar_cm += (targetRadar - current.Radar_cm) * factor;
      current.Nivel_Perigo += (targetDanger - current.Nivel_Perigo) * factor;

      setSmoothTelemetry({
        id: target.id,
        time: target.time,
        timestamp: target.timestamp,
        Pitch: current.Pitch,
        Roll: current.Roll,
        Radar_cm: current.Radar_cm,
        Nivel_Perigo: current.Nivel_Perigo,
        Status: target.Status,
      });

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, []);

  return smoothTelemetry;
}
