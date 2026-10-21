import React, { useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import styles from './Scene3D.module.css';
import { TelemetryPoint } from '../../types/telemetry';
import { AirplaneModel } from './AirplaneModel';
import { FlightEnvironment } from './FlightEnvironment';
import { CockpitDashboard } from './CockpitDashboard';
import { InstrumentHUD } from './InstrumentHUD';
import { RadarObstacle } from './RadarObstacle';
import { useSmoothTelemetry } from '../../hooks/useSmoothTelemetry';

interface Scene3DProps {
  telemetry: TelemetryPoint;
  theme?: 'dark' | 'light';
}

export type CameraViewMode = 'external' | 'cockpit';

/**
 * Gerenciador da Câmera: controla a transição suave entre a visão externa e a visão de cabine.
 * Na visão do cockpit, sincroniza rigorosamente 1:1 com a orientação da aeronave na mesma velocidade exata.
 */
const FlightCameraRig: React.FC<{
  mode: CameraViewMode;
  pitch: number;
  roll: number;
}> = ({ mode, pitch, roll }) => {
  const currentCamPos = useRef(new THREE.Vector3(0, 2.4, -8.5));
  const currentLookAt = useRef(new THREE.Vector3(0, 0.4, 3.5));

  useFrame((state, delta) => {
    const pitchRad = THREE.MathUtils.degToRad(pitch);
    const rollRad = THREE.MathUtils.degToRad(roll);
    const elapsed = state.clock.getElapsedTime();
    const aircraftPosY = Math.sin(elapsed * 2) * 0.08;

    if (mode === 'external') {
      // =====================================================================
      // Câmera Externa: persegue o avião de trás e acima com inclinação sutil
      // =====================================================================
      const targetPosX = Math.sin(-rollRad * 0.3) * -2.2;
      const targetPosY = aircraftPosY + 2.3 + Math.sin(-pitchRad * 0.4) * 1.2;
      const targetPosZ = -8.5;

      currentCamPos.current.x = THREE.MathUtils.damp(currentCamPos.current.x, targetPosX, 8, delta);
      currentCamPos.current.y = THREE.MathUtils.damp(currentCamPos.current.y, targetPosY, 8, delta);
      currentCamPos.current.z = THREE.MathUtils.damp(currentCamPos.current.z, targetPosZ, 8, delta);

      // Ponto de foco à frente do avião
      currentLookAt.current.x = THREE.MathUtils.damp(currentLookAt.current.x, 0, 8, delta);
      currentLookAt.current.y = THREE.MathUtils.damp(currentLookAt.current.y, aircraftPosY + 0.4, 8, delta);
      currentLookAt.current.z = THREE.MathUtils.damp(currentLookAt.current.z, 2.5, 8, delta);

      state.camera.position.copy(currentCamPos.current);
      state.camera.up.set(0, 1, 0);
      state.camera.lookAt(currentLookAt.current);
      // Rotação sutil no eixo local de visão (roll) sem quebrar o vetor UP da câmera
      state.camera.rotateZ(-rollRad * 0.3);
    } else {
      // =====================================================================
      // Câmera Cockpit: acoplada 1:1 à aeronave, acompanhando na mesma velocidade
      // =====================================================================
      // Quaternion com a orientação exata da aeronave (-pitchRad em X, -rollRad em Z)
      const q = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(-pitchRad, 0, -rollRad, 'XYZ')
      );

      const aircraftPos = new THREE.Vector3(0, aircraftPosY, 0);

      // Coordenadas locais do olho do piloto dentro da cabine
      const localEye = new THREE.Vector3(0, 0.44, 1.35);
      // Ponto focal à frente no eixo longitudinal do caça (+Z)
      const localTarget = new THREE.Vector3(0, 0.44, 40);
      // Vetor UP local da aeronave (+Y)
      const localUp = new THREE.Vector3(0, 1, 0);

      // Transformação para coordenadas de mundo garantindo acompanhamento 1:1 na mesma velocidade
      const worldEye = localEye.clone().applyQuaternion(q).add(aircraftPos);
      const worldTarget = localTarget.clone().applyQuaternion(q).add(aircraftPos);
      const worldUp = localUp.clone().applyQuaternion(q);

      state.camera.position.copy(worldEye);
      state.camera.up.copy(worldUp);
      state.camera.lookAt(worldTarget);
    }
  });

  return <PerspectiveCamera makeDefault fov={mode === 'external' ? 60 : 75} near={0.1} far={500000} />;
};

/**
 * Rig Unificado da Aeronave: gerencia a atitude de voo em 6DOF (Pitch, Roll, Sustentação)
 * garantindo que a aeronave, o painel do cockpit e a visão acompanhem rigorosamente na mesma velocidade.
 */
const AircraftRig: React.FC<{
  viewMode: CameraViewMode;
  smooth: TelemetryPoint;
  theme: 'dark' | 'light';
}> = ({ viewMode, smooth, theme }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const pitchRad = THREE.MathUtils.degToRad(smooth.Pitch);
    const rollRad = THREE.MathUtils.degToRad(smooth.Roll);

    // Rotação unificada e instantânea da aeronave (100% sincronizada com a visão)
    groupRef.current.rotation.x = -pitchRad;
    groupRef.current.rotation.z = -rollRad;

    // Efeito de sustentação atmosférica
    const elapsed = state.clock.getElapsedTime();
    groupRef.current.position.y = Math.sin(elapsed * 2) * 0.08;

    // Tremor tático em alta turbulência ou perigo crítico
    if (smooth.Nivel_Perigo >= 50) {
      const shakeIntensity = (smooth.Nivel_Perigo / 100) * 0.04;
      groupRef.current.position.x = (Math.random() - 0.5) * shakeIntensity;
    } else {
      groupRef.current.position.x = 0;
    }
  });

  return (
    <group ref={groupRef}>
      {viewMode === 'external' ? (
        <AirplaneModel
          dangerLevel={smooth.Nivel_Perigo}
          theme={theme}
        />
      ) : (
        <CockpitDashboard
          pitch={smooth.Pitch}
          roll={smooth.Roll}
          radar_cm={smooth.Radar_cm}
          dangerLevel={smooth.Nivel_Perigo}
          theme={theme}
        />
      )}
    </group>
  );
};

export const Scene3D: React.FC<Scene3DProps> = ({ telemetry, theme = 'dark' }) => {
  const [viewMode, setViewMode] = useState<CameraViewMode>('external');
  const [showHUD, setShowHUD] = useState<boolean>(true);

  // Interpolação de alta precisão que calcula os pontos nos intervalos vazios do serial
  const smooth = useSmoothTelemetry(telemetry);

  return (
    <section className={styles.sceneContainer} aria-label="Simulador de Voo 3D em Tempo Real">
      {/* ====================================================================
          Controles Flutuantes da Câmera
          ==================================================================== */}
      <div className={styles.viewControls}>
        <button
          type="button"
          className={`${styles.viewBtn} ${viewMode === 'external' ? styles.viewBtnActive : ''}`}
          onClick={() => setViewMode('external')}
          title="Ver o avião voando de fora (terceira pessoa)"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          Visão Externa
        </button>

        <button
          type="button"
          className={`${styles.viewBtn} ${viewMode === 'cockpit' ? styles.viewBtnActive : ''}`}
          onClick={() => setViewMode('cockpit')}
          title="Ver de dentro da cabine do piloto (primeira pessoa)"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          Visão Cockpit
        </button>

        <button
          type="button"
          className={`${styles.hudToggleBtn} ${showHUD ? styles.hudToggleBtnActive : ''}`}
          onClick={() => setShowHUD(!showHUD)}
          title="Ligar ou desligar Head-Up Display (HUD)"
        >
          HUD: {showHUD ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* ====================================================================
          Badge de Telemetria Dinâmica
          ==================================================================== */}
      <div className={styles.telemetryBadge}>
        <span className={styles.telemetryBadgeTitle}>3D FLIGHT ENGINE (60 FPS INTERP)</span>
        <span className={styles.telemetryBadgeInfo}>
          P: {smooth.Pitch >= 0 ? `+${smooth.Pitch.toFixed(1)}` : smooth.Pitch.toFixed(1)}° | R:{' '}
          {smooth.Roll >= 0 ? `+${smooth.Roll.toFixed(1)}` : smooth.Roll.toFixed(1)}°
        </span>
        <span className={styles.telemetryBadgeInfo}>ALT RADAR: {smooth.Radar_cm.toFixed(1)} cm</span>
      </div>

      {/* ====================================================================
          Overlay HUD 2D (Head-Up Display de Aviação)
          ==================================================================== */}
      {showHUD && (
        <InstrumentHUD
          pitch={smooth.Pitch}
          roll={smooth.Roll}
          radar_cm={smooth.Radar_cm}
          dangerLevel={smooth.Nivel_Perigo}
          status={smooth.Status}
        />
      )}

      {/* ====================================================================
          Canvas WebGL Three.js / React Three Fiber
          ==================================================================== */}
      <div className={styles.canvasWrapper}>
        <Canvas gl={{ antialias: true, powerPreference: 'high-performance' }}>
          {/* Rig de Câmera Reativo */}
          <FlightCameraRig
            mode={viewMode}
            pitch={smooth.Pitch}
            roll={smooth.Roll}
          />

          {/* Ambiente Atmosférico (Céu, Nuvens, Terreno e Iluminação) */}
          <FlightEnvironment
            dangerLevel={smooth.Nivel_Perigo}
            radarAltitude={smooth.Radar_cm}
            theme={theme}
          />

          {/* Barreira Holográfica / Obstáculo Proporcional à Distância da Mão no Sensor */}
          <RadarObstacle
            radar_cm={smooth.Radar_cm}
            dangerLevel={smooth.Nivel_Perigo}
          />

          {/* Rig Unificado da Aeronave e Cockpit (100% acoplados em velocidade e rotação) */}
          <AircraftRig
            viewMode={viewMode}
            smooth={smooth}
            theme={theme}
          />
        </Canvas>
      </div>
    </section>
  );
};
