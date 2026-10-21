import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import styles from './App.module.css';
import { TelemetryPoint } from './types/telemetry';
import { parseSerialLine, formatTelemetryTime } from './utils/parseSerial';
import { Scene3D } from './components/Scene3D/Scene3D';

const MAX_POINTS = 30;
const BAUD_RATE = 115200;

// Ponto inicial neutro para telemetria inicial
const INITIAL_POINT: TelemetryPoint = {
  id: 0,
  time: '--:--:--',
  timestamp: Date.now(),
  Pitch: 0.0,
  Roll: 0.0,
  Radar_cm: 30.0,
  Nivel_Perigo: 0,
  Status: 'Aguardando Conexão USB...',
};

export const App: React.FC = () => {
  // Estado dos últimos 30 pontos de telemetria
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryPoint[]>([]);
  // Ponto mais recente para os displays instantâneos
  const [latestPoint, setLatestPoint] = useState<TelemetryPoint>(INITIAL_POINT);
  // Status da conexão USB Serial
  const [isConnected, setIsConnected] = useState<boolean>(false);
  // Modo de simulação/demonstração
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  // Tema ativo: 'dark' (Aerospace Stealth) ou 'light' (Daylight Cockpit)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('flightscope_theme');
      return saved === 'light' ? 'light' : 'dark';
    }
    return 'dark';
  });
  // Mensagens de erro/feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Suporte à Web Serial API
  const [hasWebSerialSupport, setHasWebSerialSupport] = useState<boolean>(true);

  // Referências para gerenciar o ciclo de vida da porta serial
  const portRef = useRef<SerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const keepReadingRef = useRef<boolean>(false);
  const simIntervalRef = useRef<number | null>(null);

  // Monitora eventos globais de hardware da Web Serial API (Plug / Unplug do cabo USB)
  useEffect(() => {
    if (typeof window === 'undefined' || !('serial' in navigator) || !navigator.serial) {
      setHasWebSerialSupport(false);
      return;
    }

    const handleDeviceDisconnect = (event: Event) => {
      const customEvent = event as Event & { port?: SerialPort };
      if (!portRef.current || (customEvent.port && customEvent.port === portRef.current)) {
        console.warn('Dispositivo USB desconectado fisicamente.');
        setErrorMessage('O dispositivo USB (Arduino) foi desconectado fisicamente.');
        handleDisconnect();
      }
    };

    const handleDeviceConnect = () => {
      console.info('Dispositivo USB detectado na porta.');
      // Limpa erro anterior caso o usuário tenha reconectado o cabo
      setErrorMessage(null);
    };

    navigator.serial.addEventListener('disconnect', handleDeviceDisconnect);
    navigator.serial.addEventListener('connect', handleDeviceConnect);

    return () => {
      navigator.serial?.removeEventListener('disconnect', handleDeviceDisconnect);
      navigator.serial?.removeEventListener('connect', handleDeviceConnect);
    };
  }, []);

  /**
   * Alterna entre o Tema Escuro (Stealth Dark) e Claro (Daylight Light)
   */
  const toggleTheme = () => {
    setTheme((curr) => {
      const next = curr === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') {
        localStorage.setItem('flightscope_theme', next);
      }
      return next;
    });
  };

  /**
   * Adiciona um novo ponto mantendo estritamente no máximo os últimos 30 pontos
   */
  const handleNewTelemetryPoint = useCallback((point: TelemetryPoint) => {
    setLatestPoint(point);
    setTelemetryHistory((prev) => {
      const updated = [...prev, point];
      if (updated.length > MAX_POINTS) {
        return updated.slice(updated.length - MAX_POINTS);
      }
      return updated;
    });
  }, []);

  /**
   * Conectar via Web Serial API (115200 baud rate) com leitura direta de stream e proteção contra lock
   */
  const handleConnectSerial = async () => {
    setErrorMessage(null);

    if (!('serial' in navigator) || !navigator.serial) {
      setErrorMessage(
        'Seu navegador não suporta a Web Serial API. Por favor, utilize o Google Chrome, Microsoft Edge ou Opera.'
      );
      return;
    }

    // Se já havia uma porta conectada, fecha antes para evitar erro de porta ocupada
    if (portRef.current) {
      await handleDisconnect();
    }

    try {
      // Se a simulação estava ativa, encerra
      if (isSimulating) {
        stopSimulation();
      }

      // Solicita a porta ao usuário
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: BAUD_RATE });

      portRef.current = port;
      keepReadingRef.current = true;
      setIsConnected(true);

      if (!port.readable) {
        throw new Error('A porta serial selecionada não possui stream legível.');
      }

      // Leitor direto na stream de bytes da porta (sem pipeTo intermediário que causa deadlock de lock)
      const reader = port.readable.getReader();
      readerRef.current = reader;

      const decoder = new TextDecoder('utf-8');
      let lineBuffer = '';

      // Loop assíncrono de leitura em tempo real
      while (keepReadingRef.current) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        if (value) {
          lineBuffer += decoder.decode(value, { stream: true });

          // Prevenção contra buffer overflow (ex: ruído elétrico na porta sem newlines)
          if (lineBuffer.length > 2048) {
            lineBuffer = lineBuffer.slice(-512);
          }

          const lines = lineBuffer.split(/\r?\n/);
          // O último elemento pode ser uma linha incompleta; mantemos no buffer
          lineBuffer = lines.pop() ?? '';

          for (const line of lines) {
            const parsed = parseSerialLine(line);
            if (parsed) {
              handleNewTelemetryPoint(parsed);
            }
          }
        }
      }
    } catch (err: unknown) {
      const error = err as Error;

      // Usuário cancelou a janela de seleção (NotFoundError) -> comportamento normal
      if (error.name === 'NotFoundError') {
        console.info('Seleção de porta cancelada pelo usuário.');
      } else if (error.name === 'NetworkError' || error.message.includes('open')) {
        console.error('Porta serial já aberta ou ocupada:', error);
        setErrorMessage(
          'A porta serial já está aberta ou ocupada por outro programa (ex: Monitor Serial do Arduino IDE). Feche outros programas e tente novamente.'
        );
      } else if (error.name === 'SecurityError') {
        console.error('Erro de permissão de segurança:', error);
        setErrorMessage('Permissão de acesso à porta serial negada pelas políticas de segurança do navegador.');
      } else {
        console.error('Erro na conexão serial:', error);
        setErrorMessage(`Falha na conexão serial: ${error.message}`);
      }

      await handleDisconnect();
    }
  };

  /**
   * Desconecta e libera as streams da porta serial de forma atômica e resiliente
   */
  const handleDisconnect = async () => {
    keepReadingRef.current = false;

    if (readerRef.current) {
      try {
        await readerRef.current.cancel();
      } catch {
        /* ignorar se a porta física já fechou */
      }
      try {
        readerRef.current.releaseLock();
      } catch {
        /* ignorar se já liberado */
      }
      readerRef.current = null;
    }

    if (portRef.current) {
      try {
        await portRef.current.close();
      } catch {
        /* ignorar se a porta física foi desconectada */
      }
      portRef.current = null;
    }

    setIsConnected(false);
  };

  /**
   * Modo de Simulação / Demo (permite testar o dashboard sem placa física)
   */
  const startSimulation = () => {
    handleDisconnect();
    setIsSimulating(true);
    let step = 0;

    simIntervalRef.current = window.setInterval(() => {
      step += 0.15;
      // Gera oscilações realistas de Pitch e Roll em graus
      const pitch = parseFloat((Math.sin(step) * 45 + Math.sin(step * 2.5) * 8).toFixed(1));
      const roll = parseFloat((Math.cos(step * 0.8) * 35 + Math.sin(step * 1.5) * 10).toFixed(1));

      // Gera aproximação e afastamento de obstáculos no radar (0 a 60 cm)
      const radar = parseFloat((30 + Math.sin(step * 0.5) * 26).toFixed(1));

      // Calcula o nível de perigo com base na proximidade do radar ou atitude crítica
      let nivelPerigo = 0;
      let statusStr = 'Voo Estabilizado';

      if (radar < 15 || Math.abs(pitch) > 60 || Math.abs(roll) > 50) {
        nivelPerigo = parseFloat((60 + Math.random() * 35).toFixed(0)); // >= 50 (Crítico)
        statusStr = 'ALERTA CRÍTICO: Proximidade de Solo / Stall';
      } else if (radar < 30 || Math.abs(pitch) > 35) {
        nivelPerigo = parseFloat((28 + Math.random() * 18).toFixed(0)); // >= 25 e < 50 (Alerta)
        statusStr = 'Atenção: Correção de Rota Necessária';
      } else {
        nivelPerigo = parseFloat((Math.random() * 20).toFixed(0)); // < 25 (Seguro)
        statusStr = 'Voo Normal — Parâmetros Nominais';
      }

      const simPoint: TelemetryPoint = {
        id: Math.floor(step * 100),
        time: formatTelemetryTime(new Date()),
        timestamp: Date.now(),
        Pitch: pitch,
        Roll: roll,
        Radar_cm: radar,
        Nivel_Perigo: nivelPerigo,
        Status: statusStr,
      };

      handleNewTelemetryPoint(simPoint);
    }, 200);
  };

  const stopSimulation = () => {
    if (simIntervalRef.current !== null) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    setIsSimulating(false);
  };

  // Limpeza de recursos ao desmontar componente
  useEffect(() => {
    return () => {
      stopSimulation();
      handleDisconnect();
    };
  }, []);

  /**
   * Determina a classe CSS do Painel de Status de acordo com o Nivel_Perigo
   * < 25: Verde (Seguro)
   * >= 25 e < 50: Amarelo (Alerta)
   * >= 50: Vermelho com animação de piscar (Crítico)
   */
  const getDangerStatusClass = (dangerLevel: number): string => {
    if (dangerLevel < 25) {
      return styles.statusSafe;
    }
    if (dangerLevel >= 25 && dangerLevel < 50) {
      return styles.statusAlert;
    }
    return styles.statusCritical;
  };

  /**
   * Ícone representativo de acordo com o nível
   */
  const getDangerIcon = (dangerLevel: number): string => {
    if (dangerLevel < 25) return '🛡️';
    if (dangerLevel >= 25 && dangerLevel < 50) return '⚠️';
    return '🚨';
  };

  // Cores dinâmicas de gráficos por tema
  const isLight = theme === 'light';
  const chartGridColor = isLight ? '#e2e8f0' : '#1e293b';
  const chartAxisColor = isLight ? '#cbd5e1' : '#475569';
  const chartTickColor = isLight ? '#475569' : '#94a3b8';
  const pitchColor = isLight ? '#0284c7' : '#00e5ff';
  const rollColor = isLight ? '#7c3aed' : '#c084fc';
  const radarColor = isLight ? '#059669' : '#10b981';

  return (
    <div className={`${styles.dashboard} ${theme === 'light' ? styles.themeLight : styles.themeDark}`}>
      {/* ====================================================================
          1. Cabeçalho (Header)
          ==================================================================== */}
      <header className={styles.header}>
        <div className={styles.brandGroup}>
          <div className={styles.brandIcon} aria-hidden="true">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
            </svg>
          </div>
          <div className={styles.titleContainer}>
            <h1 className={styles.mainTitle}>FlightScope</h1>
            <p className={styles.subTitle}>Telemetria de Voo Serial 115200 Baud</p>
          </div>
        </div>

        <div className={styles.headerControls}>
          {/* Botão de Alternância de Tema */}
          <button
            type="button"
            className={styles.themeToggleBtn}
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Mudar para Tema Claro (Daylight)' : 'Mudar para Tema Escuro (Stealth)'}
          >
            {theme === 'dark' ? (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
                Modo Claro
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
                Modo Escuro
              </>
            )}
          </button>

          {/* Indicador de Status da Conexão */}
          {(isConnected || isSimulating) && (
            <div className={styles.connectionBadge}>
              <span className={styles.statusIndicatorDot} />
              <span>{isSimulating ? 'MODO DEMO ATIVO' : 'USB CONECTADO (115200)'}</span>
            </div>
          )}

          {/* Botão Conectar USB: desaparece após conectado */}
          {!isConnected && !isSimulating && (
            <button
              type="button"
              className={styles.connectBtn}
              onClick={handleConnectSerial}
              title="Estabelecer conexão com Arduino via Web Serial API"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                <path d="M2 12h20" />
              </svg>
              Conectar USB
            </button>
          )}

          {/* Botão de Desconexão quando conectado via USB */}
          {isConnected && (
            <button
              type="button"
              className={styles.disconnectBtn}
              onClick={handleDisconnect}
              title="Encerrar conexão serial"
            >
              Desconectar USB
            </button>
          )}

          {/* Botão de Simulação / Demonstração */}
          <button
            type="button"
            className={`${styles.simBtn} ${isSimulating ? styles.simBtnActive : ''}`}
            onClick={isSimulating ? stopSimulation : startSimulation}
            title={isSimulating ? 'Parar gerador de dados' : 'Testar com dados simulados'}
          >
            {isSimulating ? '⏹ Parar Demo' : '▶ Simular Dados'}
          </button>
        </div>
      </header>

      {/* Alerta de Suporte de Navegador */}
      {!hasWebSerialSupport && (
        <div className={styles.browserWarning}>
          <strong>Aviso:</strong> A Web Serial API não foi detectada neste navegador. Para conectar via cabo USB,
          utilize o Google Chrome, Microsoft Edge ou Opera. Você ainda pode clicar em <em>"Simular Dados"</em> para
          visualizar todas as funções do painel.
        </div>
      )}

      {/* Mensagem de Erro de Conexão */}
      {errorMessage && (
        <div className={styles.browserWarning}>
          <strong>Erro de Comunicação:</strong> {errorMessage}
        </div>
      )}

      {/* ====================================================================
          Simulador 3D Imersivo em Tempo Real (React Three Fiber / Three.js)
          ==================================================================== */}
      <Scene3D telemetry={latestPoint} theme={theme} />

      {/* ====================================================================
          2. Painel de Status (Barra Destacada Dinâmica)
          ==================================================================== */}
      <section
        className={`${styles.statusBar} ${getDangerStatusClass(latestPoint.Nivel_Perigo)}`}
        aria-live="polite"
      >
        <div className={styles.statusTextGroup}>
          <div className={styles.statusIconBadge}>
            {getDangerIcon(latestPoint.Nivel_Perigo)}
          </div>
          <div className={styles.statusContent}>
            <span className={styles.statusLabel}>Status do Sistema</span>
            <span className={styles.statusValue}>{latestPoint.Status}</span>
          </div>
        </div>

        <div className={styles.statusMetaGroup}>
          <div className={styles.dangerLevelBox}>
            <span className={styles.dangerLevelTitle}>Nível de Perigo</span>
            <span className={styles.dangerLevelScore}>
              {latestPoint.Nivel_Perigo.toFixed(0)}%
            </span>
          </div>
        </div>
      </section>

      {/* ====================================================================
          HUD Rápido: Métricas Instantâneas
          ==================================================================== */}
      <section className={styles.hudGrid} aria-label="Métricas Instantâneas">
        {/* Card Pitch */}
        <div className={styles.hudCard}>
          <div className={styles.hudCardHeader}>
            <span className={styles.hudCardLabel}>Pitch (Arfagem)</span>
            <span className={styles.hudCardUnit}>Graus (°)</span>
          </div>
          <div className={`${styles.hudCardValue} ${styles.hudCardValuePitch}`}>
            {latestPoint.Pitch >= 0 ? `+${latestPoint.Pitch.toFixed(1)}` : latestPoint.Pitch.toFixed(1)}°
          </div>
          <div className={styles.hudCardFooter}>
            <span>Faixa Nominal: -90° a +90°</span>
            <span>{latestPoint.Pitch > 0 ? '▲ Subindo' : latestPoint.Pitch < 0 ? '▼ Descendo' : '● Nivelado'}</span>
          </div>
        </div>

        {/* Card Roll */}
        <div className={styles.hudCard}>
          <div className={styles.hudCardHeader}>
            <span className={styles.hudCardLabel}>Roll (Rolamento)</span>
            <span className={styles.hudCardUnit}>Graus (°)</span>
          </div>
          <div className={`${styles.hudCardValue} ${styles.hudCardValueRoll}`}>
            {latestPoint.Roll >= 0 ? `+${latestPoint.Roll.toFixed(1)}` : latestPoint.Roll.toFixed(1)}°
          </div>
          <div className={styles.hudCardFooter}>
            <span>Faixa Nominal: -90° a +90°</span>
            <span>{latestPoint.Roll > 0 ? '↷ Direita' : latestPoint.Roll < 0 ? '↶ Esquerda' : '● Nivelado'}</span>
          </div>
        </div>

        {/* Card Radar_cm */}
        <div className={styles.hudCard}>
          <div className={styles.hudCardHeader}>
            <span className={styles.hudCardLabel}>Radar de Altitude</span>
            <span className={styles.hudCardUnit}>Centímetros</span>
          </div>
          <div className={`${styles.hudCardValue} ${styles.hudCardValueRadar}`}>
            {latestPoint.Radar_cm.toFixed(1)} <span style={{ fontSize: '1rem', color: '#64748b' }}>cm</span>
          </div>
          <div className={styles.hudCardFooter}>
            <span>Range: 0 a 60 cm</span>
            <span>{(latestPoint.Radar_cm / 100).toFixed(2)} m</span>
          </div>
        </div>

        {/* Card Nível de Perigo */}
        <div className={styles.hudCard}>
          <div className={styles.hudCardHeader}>
            <span className={styles.hudCardLabel}>Índice de Risco</span>
            <span className={styles.hudCardUnit}>0 — 100</span>
          </div>
          <div className={`${styles.hudCardValue} ${styles.hudCardValueDanger}`}>
            {latestPoint.Nivel_Perigo.toFixed(0)}
          </div>
          <div className={styles.hudCardFooter}>
            <span>
              {latestPoint.Nivel_Perigo < 25
                ? '🟢 Faixa Segura'
                : latestPoint.Nivel_Perigo < 50
                ? '🟡 Faixa de Alerta'
                : '🔴 Faixa Crítica'}
            </span>
            <span>{telemetryHistory.length}/{MAX_POINTS} pts</span>
          </div>
        </div>
      </section>

      {/* ====================================================================
          3. Gráficos em Tempo Real (Recharts)
          ==================================================================== */}
      <main className={styles.chartsSection}>
        {/* Gráfico 1: Pitch e Roll juntos (Eixo Y fixo entre -90 e 90) */}
        <article className={styles.chartCard}>
          <header className={styles.chartCardHeader}>
            <div className={styles.chartTitleGroup}>
              <h2 className={styles.chartTitle}>Atitude de Voo (Pitch &amp; Roll)</h2>
              <span className={styles.chartBadge}>Eixo Y: [-90°, +90°]</span>
            </div>
            <div className={styles.chartLegendCustom}>
              <div className={styles.legendItem}>
                <span className={styles.legendColorBox} style={{ backgroundColor: pitchColor }} />
                <span>Pitch (Arfagem)</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendColorBox} style={{ backgroundColor: rollColor }} />
                <span>Roll (Rolamento)</span>
              </div>
            </div>
          </header>

          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={telemetryHistory}
                margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} opacity={0.8} />
                <XAxis
                  dataKey="time"
                  stroke={chartAxisColor}
                  tick={{ fill: chartTickColor, fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  tickLine={{ stroke: chartGridColor }}
                />
                <YAxis
                  domain={[-90, 90]}
                  ticks={[-90, -60, -30, 0, 30, 60, 90]}
                  stroke={chartAxisColor}
                  tick={{ fill: chartTickColor, fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  tickLine={{ stroke: chartGridColor }}
                  unit="°"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as TelemetryPoint;
                      return (
                        <div className={styles.customTooltip}>
                          <div className={styles.tooltipTitle}>Hora: {data.time}</div>
                          <div className={styles.tooltipRow} style={{ color: pitchColor }}>
                            <span>Pitch:</span>
                            <strong>{data.Pitch.toFixed(1)}°</strong>
                          </div>
                          <div className={styles.tooltipRow} style={{ color: rollColor }}>
                            <span>Roll:</span>
                            <strong>{data.Roll.toFixed(1)}°</strong>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {/* Linha de referência horizontal neutra (0°) */}
                <ReferenceLine y={0} stroke={chartGridColor} strokeDasharray="2 2" />
                {/* Linha de Pitch com isAnimationActive={false} para tempo real */}
                <Line
                  type="monotone"
                  dataKey="Pitch"
                  name="Pitch (°)"
                  stroke={pitchColor}
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
                {/* Linha de Roll com isAnimationActive={false} para tempo real */}
                <Line
                  type="monotone"
                  dataKey="Roll"
                  name="Roll (°)"
                  stroke={rollColor}
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        {/* Gráfico 2: Radar_cm (Eixo Y fixo entre 0 e 60) */}
        <article className={styles.chartCard}>
          <header className={styles.chartCardHeader}>
            <div className={styles.chartTitleGroup}>
              <h2 className={styles.chartTitle}>Altímetro Radar (Radar_cm)</h2>
              <span className={styles.chartBadge}>Eixo Y: [0 cm, 60 cm]</span>
            </div>
            <div className={styles.chartLegendCustom}>
              <div className={styles.legendItem}>
                <span className={styles.legendColorBox} style={{ backgroundColor: radarColor }} />
                <span>Radar (cm)</span>
              </div>
            </div>
          </header>

          <div className={styles.chartWrapperRadar}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={telemetryHistory}
                margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} opacity={0.8} />
                <XAxis
                  dataKey="time"
                  stroke={chartAxisColor}
                  tick={{ fill: chartTickColor, fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  tickLine={{ stroke: chartGridColor }}
                />
                <YAxis
                  domain={[0, 60]}
                  ticks={[0, 15, 30, 45, 60]}
                  stroke={chartAxisColor}
                  tick={{ fill: chartTickColor, fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  tickLine={{ stroke: chartGridColor }}
                  unit="cm"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as TelemetryPoint;
                      return (
                        <div className={styles.customTooltip}>
                          <div className={styles.tooltipTitle}>Hora: {data.time}</div>
                          <div className={styles.tooltipRow} style={{ color: radarColor }}>
                            <span>Radar:</span>
                            <strong>{data.Radar_cm.toFixed(1)} cm</strong>
                          </div>
                          <div className={styles.tooltipRow} style={{ color: chartTickColor }}>
                            <span>Nível de Perigo:</span>
                            <strong>{data.Nivel_Perigo.toFixed(0)}</strong>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {/* Linhas de referência de Alerta e Crítico */}
                <ReferenceLine y={25} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Alerta (25cm)', fill: '#f59e0b', fontSize: 10, position: 'insideTopLeft' }} />
                <ReferenceLine y={10} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Crítico (10cm)', fill: '#ef4444', fontSize: 10, position: 'insideTopLeft' }} />
                {/* Linha do Radar_cm com isAnimationActive={false} para fluidez em tempo real */}
                <Line
                  type="monotone"
                  dataKey="Radar_cm"
                  name="Radar (cm)"
                  stroke={radarColor}
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
      </main>

      {/* ====================================================================
          Rodapé / Status de Buffer
          ==================================================================== */}
      <footer className={styles.footer}>
        <div>
          FlightScope Telemetry Engine • Arduino Serial Parser (115200 bps)
        </div>
        <div className={styles.footerMetrics}>
          <span>Buffer: {telemetryHistory.length} / {MAX_POINTS} frames</span>
          <span>Último sync: {latestPoint.time}</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
