import React from 'react';
import styles from './Scene3D.module.css';

interface InstrumentHUDProps {
  pitch: number;
  roll: number;
  radar_cm: number;
  dangerLevel: number;
  status: string;
}

export const InstrumentHUD: React.FC<InstrumentHUDProps> = ({
  pitch,
  roll,
  radar_cm,
  dangerLevel,
  status,
}) => {
  // Cor tática do HUD: Verde militar padrão (#00ff66) ou Ciano (#00e5ff), comuta para Vermelho em perigo
  const isCritical = dangerLevel >= 50 || radar_cm < 15;
  const isAlert = dangerLevel >= 25 && dangerLevel < 50;
  const hudColor = isCritical ? '#ef4444' : isAlert ? '#f59e0b' : '#00ff88';

  // Deslocamento vertical da escada de Pitch no horizonte artificial (4 px por grau)
  const pitchPixelOffset = pitch * 4;

  // Escala de Altitude Radar: 4.5 pixels por cm
  const radarScale = 4.5;

  // Velocidade simulada em nós (KTS) derivada da atitude de voo e altitude
  const currentAirspeed = Math.max(140, Math.min(420, 250 - pitch * 1.8 + (30 - radar_cm) * 0.6));
  const speedScale = 1.6;

  // Proa simulada da bússola derivada da bancagem (Roll)
  const simulatedHeading = (360 + Math.round((roll * 2.2) % 360)) % 360;

  // Lista de graduações de altitude radar de 0 a 80 cm
  const radarTicks = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80];

  // Lista de graduações de velocidade de 140 a 420 nós
  const speedTicks = [
    140, 160, 180, 200, 220, 240, 260, 280, 300, 320, 340, 360, 380, 400, 420,
  ];

  // Lista de pontos cardeais e graus da bússola
  const compassTicks = [
    { deg: 0, label: 'N' },
    { deg: 30, label: '03' },
    { deg: 60, label: '06' },
    { deg: 90, label: 'E' },
    { deg: 120, label: '12' },
    { deg: 150, label: '15' },
    { deg: 180, label: 'S' },
    { deg: 210, label: '21' },
    { deg: 240, label: '24' },
    { deg: 270, label: 'W' },
    { deg: 300, label: '30' },
    { deg: 330, label: '33' },
    { deg: 360, label: 'N' },
  ];

  return (
    <div className={styles.hudOverlay} aria-hidden="true">
      <svg className={styles.hudSvg} viewBox="-260 -210 520 420">
        <defs>
          {/* Efeito de brilho fósforo verde aviônico */}
          <filter id="hudPhosphorGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Máscara de recorte da Fita de Altitude (Radar Alt Tape) */}
          <clipPath id="radarTapeClip">
            <rect x="160" y="-115" width="85" height="230" rx="4" />
          </clipPath>

          {/* Máscara de recorte da Fita de Velocidade (Airspeed Tape) */}
          <clipPath id="speedTapeClip">
            <rect x="-245" y="-115" width="85" height="230" rx="4" />
          </clipPath>

          {/* Máscara de recorte da Bússola Superior */}
          <clipPath id="compassTapeClip">
            <rect x="-120" y="-195" width="240" height="32" rx="4" />
          </clipPath>
        </defs>

        {/* ==================================================================
            1. Grupo com Rotação de Roll (Horizonte Artificial Central)
            ================================================================== */}
        <g transform={`rotate(${-roll})`} filter="url(#hudPhosphorGlow)" stroke={hudColor} fill="none">
          {/* Escada de Pitch / Horizonte */}
          <g transform={`translate(0, ${pitchPixelOffset})`}>
            {/* Linha Zero — Horizonte Verdadeiro */}
            <line x1="-115" y1="0" x2="-35" y2="0" strokeWidth="2.5" />
            <line x1="35" y1="0" x2="115" y2="0" strokeWidth="2.5" />
            <circle cx="0" cy="0" r="3" fill={hudColor} />
            <text x="-125" y="4" fill={hudColor} fontSize="11" fontFamily="JetBrains Mono" textAnchor="end">
              00
            </text>
            <text x="125" y="4" fill={hudColor} fontSize="11" fontFamily="JetBrains Mono" textAnchor="start">
              00
            </text>

            {/* Escada de Subida (+10°, +20°, +30°) — Linhas contínuas com abas apontando para o horizonte */}
            {[-10, -20, -30].map((deg) => (
              <g key={deg} transform={`translate(0, ${deg * 4})`}>
                <line x1="-55" y1="0" x2="-25" y2="0" strokeWidth="2" />
                <line x1="-55" y1="0" x2="-55" y2="6" strokeWidth="2" />
                <line x1="25" y1="0" x2="55" y2="0" strokeWidth="2" />
                <line x1="55" y1="0" x2="55" y2="6" strokeWidth="2" />
                <text x="-65" y="4" fill={hudColor} fontSize="10" fontFamily="JetBrains Mono" textAnchor="end">
                  {Math.abs(deg)}
                </text>
                <text x="65" y="4" fill={hudColor} fontSize="10" fontFamily="JetBrains Mono" textAnchor="start">
                  {Math.abs(deg)}
                </text>
              </g>
            ))}

            {/* Escada de Descida (-10°, -20°, -30°) — Linhas tracejadas */}
            {[10, 20, 30].map((deg) => (
              <g key={deg} transform={`translate(0, ${deg * 4})`}>
                <line x1="-55" y1="0" x2="-25" y2="0" strokeWidth="2" strokeDasharray="5,4" />
                <line x1="-55" y1="0" x2="-55" y2="-6" strokeWidth="2" />
                <line x1="25" y1="0" x2="55" y2="0" strokeWidth="2" strokeDasharray="5,4" />
                <line x1="55" y1="0" x2="55" y2="-6" strokeWidth="2" />
                <text x="-65" y="4" fill={hudColor} fontSize="10" fontFamily="JetBrains Mono" textAnchor="end">
                  -{deg}
                </text>
                <text x="65" y="4" fill={hudColor} fontSize="10" fontFamily="JetBrains Mono" textAnchor="start">
                  -{deg}
                </text>
              </g>
            ))}
          </g>

          {/* Arco de Bancagem no topo (Bank Angle Scale) */}
          <path d="M -80 -125 A 148 148 0 0 1 80 -125" strokeWidth="1.5" strokeDasharray="4,6" />
          <line x1="0" y1="-148" x2="0" y2="-138" strokeWidth="2.5" />
          <line x1="-74" y1="-128" x2="-68" y2="-116" strokeWidth="2" />
          <line x1="74" y1="-128" x2="68" y2="-116" strokeWidth="2" />
          <polygon points="0,-136 -4,-128 4,-128" fill={hudColor} />
        </g>

        {/* ==================================================================
            2. Vetor de Trajetória / Flight Path Marker (Mira Fixa)
            ================================================================== */}
        <g stroke={hudColor} strokeWidth="2" fill="none" filter="url(#hudPhosphorGlow)">
          <circle cx="0" cy="0" r="5" />
          <line x1="-18" y1="0" x2="-5" y2="0" />
          <line x1="5" y1="0" x2="18" y2="0" />
          <line x1="0" y1="-5" x2="0" y2="-14" />
        </g>

        {/* ==================================================================
            3. FITA DINÂMICA DESLIZANTE DE ALTITUDE RADAR (Direita)
            ================================================================== */}
        <g id="radarAltitudeTapeGroup" filter="url(#hudPhosphorGlow)">
          {/* Janela de fundo da fita */}
          <rect
            x="160"
            y="-115"
            width="85"
            height="230"
            fill="rgba(5, 8, 17, 0.45)"
            stroke={hudColor}
            strokeWidth="1.5"
            rx="4"
          />
          <text x="202" y="-123" fill={hudColor} fontSize="10" fontWeight="bold" fontFamily="JetBrains Mono" textAnchor="middle">
            R-ALT
          </text>

          {/* Área com Máscara de Recorte para os Marcadores Deslizantes */}
          <g clipPath="url(#radarTapeClip)">
            {radarTicks.map((tickVal) => {
              // yPos: o valor atual do radar fica em y = 0.
              // Altitudes maiores ficam acima (Y negativo), menores ficam abaixo (Y positivo).
              const yPos = (radar_cm - tickVal) * radarScale;
              const isMajor = tickVal % 10 === 0;

              return (
                <g key={tickVal} transform={`translate(0, ${yPos})`}>
                  {/* Linha graduada da fita */}
                  <line
                    x1={isMajor ? '165' : '174'}
                    y1="0"
                    x2="185"
                    y2="0"
                    stroke={hudColor}
                    strokeWidth={isMajor ? 2 : 1.2}
                  />
                  {/* Número de altitude na escala */}
                  {isMajor && (
                    <text
                      x="190"
                      y="4"
                      fill={hudColor}
                      fontSize="10"
                      fontFamily="JetBrains Mono"
                      fontWeight="600"
                      textAnchor="start"
                    >
                      {tickVal}
                    </text>
                  )}
                  {/* Linha especial de solo zero (Ground Level) */}
                  {tickVal === 0 && (
                    <g>
                      <line x1="160" y1="0" x2="245" y2="0" stroke="#ef4444" strokeWidth="3" />
                      <text x="202" y="14" fill="#ef4444" fontSize="9" fontWeight="bold" fontFamily="JetBrains Mono" textAnchor="middle">
                        TERRA 0cm
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>

          {/* Marcador Digital Fixo Central (Cursor / Caret de Leitura Instantânea) */}
          <g transform="translate(154, 0)">
            <polygon
              points="0,0 12,-16 90,-16 90,16 12,16"
              fill="rgba(5, 8, 17, 0.95)"
              stroke={hudColor}
              strokeWidth="2"
            />
            <text
              x="50"
              y="5"
              fill={hudColor}
              fontSize="16"
              fontWeight="bold"
              fontFamily="JetBrains Mono"
              textAnchor="middle"
            >
              {radar_cm.toFixed(1)}
            </text>
            <text x="50" y="14" fill={hudColor} fontSize="7.5" fontFamily="JetBrains Mono" textAnchor="middle">
              CM
            </text>
          </g>
        </g>

        {/* ==================================================================
            4. FITA DINÂMICA DESLIZANTE DE VELOCIDADE (Esquerda - Airspeed Tape)
            ================================================================== */}
        <g id="airspeedTapeGroup" filter="url(#hudPhosphorGlow)">
          {/* Janela de fundo da fita */}
          <rect
            x="-245"
            y="-115"
            width="85"
            height="230"
            fill="rgba(5, 8, 17, 0.45)"
            stroke={hudColor}
            strokeWidth="1.5"
            rx="4"
          />
          <text x="-202" y="-123" fill={hudColor} fontSize="10" fontWeight="bold" fontFamily="JetBrains Mono" textAnchor="middle">
            SPEED
          </text>

          {/* Área com Máscara de Recorte para os Marcadores de Velocidade */}
          <g clipPath="url(#speedTapeClip)">
            {speedTicks.map((spdVal) => {
              // Velocidades maiores ficam acima (Y negativo), menores abaixo
              const yPos = (currentAirspeed - spdVal) * speedScale;
              const isMajor = spdVal % 40 === 0;

              return (
                <g key={spdVal} transform={`translate(0, ${yPos})`}>
                  <line
                    x1="-185"
                    y1="0"
                    x2={isMajor ? "-165" : "-175"}
                    y2="0"
                    stroke={hudColor}
                    strokeWidth={isMajor ? 2 : 1.2}
                  />
                  {isMajor && (
                    <text
                      x="-190"
                      y="4"
                      fill={hudColor}
                      fontSize="10"
                      fontFamily="JetBrains Mono"
                      fontWeight="600"
                      textAnchor="end"
                    >
                      {spdVal}
                    </text>
                  )}
                </g>
              );
            })}
          </g>

          {/* Marcador Digital Fixo Central de Velocidade */}
          <g transform="translate(-154, 0)">
            <polygon
              points="0,0 -12,-16 -90,-16 -90,16 -12,16"
              fill="rgba(5, 8, 17, 0.95)"
              stroke={hudColor}
              strokeWidth="2"
            />
            <text
              x="-50"
              y="5"
              fill={hudColor}
              fontSize="16"
              fontWeight="bold"
              fontFamily="JetBrains Mono"
              textAnchor="middle"
            >
              {currentAirspeed.toFixed(0)}
            </text>
            <text x="-50" y="14" fill={hudColor} fontSize="7.5" fontFamily="JetBrains Mono" textAnchor="middle">
              KTS
            </text>
          </g>
        </g>

        {/* ==================================================================
            5. FITA HORIZONTAL DE BÚSSOLA / PROA (Topo - Heading Tape)
            ================================================================== */}
        <g id="headingTapeGroup" filter="url(#hudPhosphorGlow)">
          <rect
            x="-120"
            y="-195"
            width="240"
            height="32"
            fill="rgba(5, 8, 17, 0.65)"
            stroke={hudColor}
            strokeWidth="1.5"
            rx="4"
          />

          {/* Triângulo indicador da proa atual */}
          <polygon points="0,-163 -5,-170 5,-170" fill={hudColor} />

          <g clipPath="url(#compassTapeClip)">
            {compassTicks.map((tick) => {
              // Calcula posição X relativa da bússola deslizando com a rotação
              let diff = tick.deg - simulatedHeading;
              if (diff > 180) diff -= 360;
              if (diff < -180) diff += 360;
              const xPos = diff * 1.8;

              return (
                <g key={tick.deg} transform={`translate(${xPos}, -195)`}>
                  <line x1="0" y1="20" x2="0" y2="30" stroke={hudColor} strokeWidth="1.5" />
                  <text
                    x="0"
                    y="14"
                    fill={hudColor}
                    fontSize="10"
                    fontFamily="JetBrains Mono"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {tick.label}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Leitura digital da proa em graus */}
          <rect x="-24" y="-212" width="48" height="15" fill="rgba(5, 8, 17, 0.9)" stroke={hudColor} strokeWidth="1" rx="2" />
          <text x="0" y="-201" fill={hudColor} fontSize="10" fontWeight="bold" fontFamily="JetBrains Mono" textAnchor="middle">
            {('000' + simulatedHeading).slice(-3)}°
          </text>
        </g>

        {/* ==================================================================
            6. Anunciador de Status e Alertas no Topo
            ================================================================== */}
        <g transform="translate(0, -135)">
          <text
            x="0"
            y="0"
            fill={hudColor}
            fontSize="12"
            fontWeight="bold"
            fontFamily="JetBrains Mono"
            textAnchor="middle"
            letterSpacing="2"
          >
            {status.toUpperCase()}
          </text>

          {radar_cm < 18 && (
            <g transform="translate(0, 22)">
              <rect x="-140" y="-14" width="280" height="22" fill="rgba(239, 68, 68, 0.25)" stroke="#ef4444" strokeWidth="1.5" rx="3" />
              <text
                x="0"
                y="1"
                fill="#ef4444"
                fontSize="11"
                fontWeight="bold"
                fontFamily="JetBrains Mono"
                textAnchor="middle"
                className={styles.blinkWarning}
              >
                ⚠ ALERTA DE PROXIMIDADE: {radar_cm.toFixed(1)} CM ⚠
              </text>
            </g>
          )}

          {radar_cm >= 18 && dangerLevel >= 50 && (
            <text
              x="0"
              y="18"
              fill="#ef4444"
              fontSize="12"
              fontWeight="bold"
              fontFamily="JetBrains Mono"
              textAnchor="middle"
              className={styles.blinkWarning}
            >
              ⚠ ATITUDE CRÍTICA — CORRIGIR ROTA ⚠
            </text>
          )}
        </g>
      </svg>
    </div>
  );
};
