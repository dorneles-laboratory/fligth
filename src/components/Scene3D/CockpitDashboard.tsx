import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CockpitDashboardProps {
  pitch: number;
  roll: number;
  radar_cm: number;
  dangerLevel: number;
  theme?: 'dark' | 'light';
}

export const CockpitDashboard: React.FC<CockpitDashboardProps> = ({
  pitch,
  roll,
  radar_cm,
  dangerLevel,
  theme = 'dark',
}) => {
  const stickRef = useRef<THREE.Group>(null);
  const throttleRef = useRef<THREE.Group>(null);
  const radarSweepRef = useRef<THREE.Group>(null);
  const mfdHorizonRef = useRef<THREE.Group>(null);

  const isLight = theme === 'light';
  const isCritical = dangerLevel >= 50 || radar_cm < 18;
  const isAlert = dangerLevel >= 25 && dangerLevel < 50;

  // Cor dos displays do cockpit: Verde tático (#00ff66) ou Ciano aviônico (#00e5ff)
  const mfdAccentColor = isCritical ? '#ef4444' : isAlert ? '#f59e0b' : '#00ff88';

  useFrame((state, delta) => {
    const elapsed = state.clock.getElapsedTime();

    // 1. Manete de Controle (Flight Stick): move-se realisticamente em arfagem (Pitch) e rolamento (Roll)
    if (stickRef.current) {
      const stickPitchRad = -THREE.MathUtils.degToRad(pitch * 0.4);
      const stickRollRad = -THREE.MathUtils.degToRad(roll * 0.5);
      stickRef.current.rotation.x = THREE.MathUtils.damp(stickRef.current.rotation.x, stickPitchRad, 30, delta);
      stickRef.current.rotation.z = THREE.MathUtils.damp(stickRef.current.rotation.z, stickRollRad, 30, delta);
    }

    // 2. Alavanca de Potência (Throttle Quadrant): vibra e se desloca com a velocidade
    if (throttleRef.current) {
      const throttleTargetZ = 0.55 + Math.sin(elapsed * 4) * 0.005;
      throttleRef.current.position.z = throttleTargetZ;
    }

    // 3. Linha de Varredura de Radar (Radar Sweep) girando no MFD Central
    if (radarSweepRef.current) {
      radarSweepRef.current.rotation.z -= delta * 3.5;
    }

    // 4. Horizonte Artificial no MFD Central (sincronizado 1:1 com a atitude da aeronave)
    if (mfdHorizonRef.current) {
      const targetY = -(pitch / 90) * 0.07;
      const targetRotZ = THREE.MathUtils.degToRad(-roll);
      mfdHorizonRef.current.position.y = THREE.MathUtils.damp(mfdHorizonRef.current.position.y, targetY, 30, delta);
      mfdHorizonRef.current.rotation.z = THREE.MathUtils.damp(mfdHorizonRef.current.rotation.z, targetRotZ, 30, delta);
    }
  });

  return (
    <group position={[0, 0.22, 1.25]}>
      {/* ====================================================================
          1. Painel Frontal Principal (Glareshield & Estrutura do Cockpit)
          ==================================================================== */}
      {/* Glareshield superior curvo que protege os instrumentos do reflexo solar */}
      <mesh position={[0, -0.06, 0.85]}>
        <boxGeometry args={[1.5, 0.12, 0.65]} />
        <meshStandardMaterial
          color={isLight ? '#334155' : '#0a0f1d'}
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>

      {/* Painel de instrumentos principal inclinado */}
      <mesh position={[0, -0.26, 0.82]} rotation={[-0.32, 0, 0]}>
        <boxGeometry args={[1.45, 0.55, 0.15]} />
        <meshStandardMaterial
          color={isLight ? '#1e293b' : '#050811'}
          roughness={0.7}
          metalness={0.3}
        />
      </mesh>

      {/* ====================================================================
          2. Nariz Aerodinâmico e Asas do Caça visíveis da cabine
          ==================================================================== */}
      {/* Nariz do Caça se estendendo para frente */}
      <mesh position={[0, -0.22, 1.7]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.42, 1.4, 32]} />
        <meshStandardMaterial
          color={isLight ? '#0284c7' : '#1e293b'}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>

      {/* Asas Delta do Caça visíveis através da lateral da cabine */}
      <mesh position={[0, -0.27, -0.6]}>
        <boxGeometry args={[8.4, 0.06, 1.5]} />
        <meshStandardMaterial
          color={isLight ? '#cbd5e1' : '#334155'}
          roughness={0.3}
          metalness={0.6}
        />
      </mesh>

      {/* Winglets nas pontas das asas */}
      <mesh position={[-4.2, 0.05, -0.6]} rotation={[0, 0, 0.35]}>
        <boxGeometry args={[0.06, 0.6, 0.8]} />
        <meshStandardMaterial
          color={isLight ? '#0284c7' : '#0ea5e9'}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>
      <mesh position={[4.2, 0.05, -0.6]} rotation={[0, 0, -0.35]}>
        <boxGeometry args={[0.06, 0.6, 0.8]} />
        <meshStandardMaterial
          color={isLight ? '#0284c7' : '#0ea5e9'}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* ====================================================================
          3. Unidade Óptica do HUD Combiner (Vidro Refletor do HUD a 45°)
          ==================================================================== */}
      <group position={[0, 0.08, 0.72]}>
        {/* Carcaça do Projetor Óptico no Glareshield */}
        <mesh position={[0, -0.06, 0]}>
          <boxGeometry args={[0.32, 0.06, 0.22]} />
          <meshStandardMaterial color="#020617" roughness={0.5} />
        </mesh>
        {/* Lente Colimadora com brilho verde/ciano */}
        <mesh position={[0, -0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.08, 24]} />
          <meshBasicMaterial color={mfdAccentColor} transparent opacity={0.6} />
        </mesh>
        {/* Vidro Combinador do HUD (inclinado a 45°) */}
        <mesh position={[0, 0.06, 0]} rotation={[Math.PI / 4, 0, 0]}>
          <planeGeometry args={[0.28, 0.2]} />
          <meshPhysicalMaterial
            color={mfdAccentColor}
            transparent
            opacity={0.22}
            roughness={0.05}
            transmission={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Suportes metálicos laterais do vidro do HUD */}
        {[-0.14, 0.14].map((sideX, i) => (
          <mesh key={i} position={[sideX, 0.05, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.16, 12]} />
            <meshStandardMaterial color="#475569" metalness={0.9} />
          </mesh>
        ))}
      </group>

      {/* ====================================================================
          4. COCKPIT DIGITAL: PAINEL PANORÂMICO DE 3 TELAS MFD
          ==================================================================== */}

      {/* 4.1. MFD CENTRAL: PRIMARY FLIGHT & TACTICAL RADAR DISPLAY */}
      <group position={[0, -0.16, 0.78]} rotation={[-0.32, 0, 0]}>
        {/* Moldura do MFD com Botões OSB */}
        <mesh>
          <boxGeometry args={[0.54, 0.36, 0.04]} />
          <meshStandardMaterial color="#020617" roughness={0.3} metalness={0.8} />
        </mesh>

        {/* Display Iluminado */}
        <mesh position={[0, 0, 0.025]}>
          <planeGeometry args={[0.48, 0.3]} />
          <meshBasicMaterial color="#030d1a" />
        </mesh>

        {/* Horizonte Artificial 3D no MFD Central */}
        <group ref={mfdHorizonRef} position={[0, 0, 0.03]}>
          <mesh>
            <planeGeometry args={[0.36, 0.008]} />
            <meshBasicMaterial color={mfdAccentColor} />
          </mesh>
          <mesh position={[0, 0.02, 0]}>
            <planeGeometry args={[0.18, 0.004]} />
            <meshBasicMaterial color={mfdAccentColor} />
          </mesh>
          <mesh position={[0, -0.02, 0]}>
            <planeGeometry args={[0.18, 0.004]} />
            <meshBasicMaterial color={mfdAccentColor} />
          </mesh>
        </group>

        {/* Linha de Varredura de Radar Circular */}
        <group position={[0, -0.02, 0.035]}>
          <group ref={radarSweepRef}>
            <mesh position={[0.055, 0, 0]}>
              <planeGeometry args={[0.11, 0.004]} />
              <meshBasicMaterial color={mfdAccentColor} />
            </mesh>
          </group>
          {/* Anéis de distância do radar no MFD */}
          <mesh>
            <ringGeometry args={[0.05, 0.052, 24]} />
            <meshBasicMaterial color={mfdAccentColor} transparent opacity={0.4} />
          </mesh>
          <mesh>
            <ringGeometry args={[0.11, 0.112, 24]} />
            <meshBasicMaterial color={mfdAccentColor} transparent opacity={0.4} />
          </mesh>
          {/* Alvo / Obstáculo marcado na tela do radar */}
          <mesh position={[0, (radar_cm / 60) * 0.11, 0]}>
            <circleGeometry args={[0.008, 8]} />
            <meshBasicMaterial color={isCritical ? '#ef4444' : '#f59e0b'} />
          </mesh>
        </group>

        {/* Retículo Central de Referência */}
        <mesh position={[0, 0, 0.04]}>
          <ringGeometry args={[0.015, 0.02, 16]} />
          <meshBasicMaterial color="#f59e0b" />
        </mesh>

        {/* 10 Botões Seletores OSB ao redor da borda da tela */}
        {[-0.25, 0.25].map((btnX, i) => (
          <group key={i} position={[btnX, 0, 0.02]}>
            {[-0.12, -0.06, 0, 0.06, 0.12].map((btnY, j) => (
              <mesh key={j} position={[0, btnY, 0]}>
                <boxGeometry args={[0.02, 0.02, 0.02]} />
                <meshStandardMaterial color="#334155" />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      {/* 4.2. MFD ESQUERDO: ENGINE & POWER DISPLAY (EICAS) */}
      <group position={[-0.48, -0.2, 0.74]} rotation={[-0.28, 0.22, 0]}>
        <mesh>
          <boxGeometry args={[0.42, 0.32, 0.04]} />
          <meshStandardMaterial color="#020617" roughness={0.3} metalness={0.8} />
        </mesh>
        <mesh position={[0, 0, 0.025]}>
          <planeGeometry args={[0.36, 0.26]} />
          <meshBasicMaterial color="#040b17" />
        </mesh>
        {/* Barras Digitais de Potência das Turbinas (N1 / N2) */}
        {[-0.08, 0.08].map((barX, i) => (
          <group key={i} position={[barX, 0, 0.03]}>
            <mesh position={[0, 0, 0]}>
              <planeGeometry args={[0.03, 0.18]} />
              <meshBasicMaterial color="#0f2942" />
            </mesh>
            {/* Nível da turbina preenchido */}
            <mesh position={[0, -0.045 + 0.045, 0.002]}>
              <planeGeometry args={[0.025, 0.12]} />
              <meshBasicMaterial color={mfdAccentColor} />
            </mesh>
          </group>
        ))}
      </group>

      {/* 4.3. MFD DIREITO: NAVIGATION & SENSOR TACTICAL MAP */}
      <group position={[0.48, -0.2, 0.74]} rotation={[-0.28, -0.22, 0]}>
        <mesh>
          <boxGeometry args={[0.42, 0.32, 0.04]} />
          <meshStandardMaterial color="#020617" roughness={0.3} metalness={0.8} />
        </mesh>
        <mesh position={[0, 0, 0.025]}>
          <planeGeometry args={[0.36, 0.26]} />
          <meshBasicMaterial color="#040b17" />
        </mesh>
        {/* Rosa dos Ventos / Bússola Tática no display direito */}
        <group position={[0, 0, 0.03]}>
          <mesh>
            <ringGeometry args={[0.075, 0.08, 32]} />
            <meshBasicMaterial color={mfdAccentColor} transparent opacity={0.6} />
          </mesh>
          {/* Linha indicadora de rota */}
          <mesh rotation={[0, 0, THREE.MathUtils.degToRad(-roll)]}>
            <planeGeometry args={[0.006, 0.14]} />
            <meshBasicMaterial color="#f59e0b" />
          </mesh>
        </group>
      </group>

      {/* ====================================================================
          5. JOYSTICK HOTAS MILITAR COM COIFA E BOTÕES TÁTICOS
          ==================================================================== */}
      <group ref={stickRef} position={[0, -0.38, 0.45]}>
        {/* Coifa de borracha sanfonada na base */}
        <mesh position={[0, 0, 0]}>
          <coneGeometry args={[0.09, 0.09, 16]} />
          <meshStandardMaterial color="#090d16" roughness={0.9} />
        </mesh>
        {/* Haste metálica do manche */}
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.016, 0.02, 0.22, 16]} />
          <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Empunhadura ergonômica (Grip) */}
        <group position={[0, 0.24, -0.02]} rotation={[-0.1, 0, 0]}>
          <mesh>
            <boxGeometry args={[0.05, 0.14, 0.06]} />
            <meshStandardMaterial color="#0f172a" roughness={0.5} />
          </mesh>
          {/* Botão de Liberação de Armas / Pickle Vermelho no topo */}
          <mesh position={[0.015, 0.075, -0.01]}>
            <sphereGeometry args={[0.012, 12, 12]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
          {/* Hat Switch de 4 vias (Coolie Hat cinza) */}
          <mesh position={[-0.012, 0.075, -0.01]} rotation={[0.4, 0, 0]}>
            <cylinderGeometry args={[0.01, 0.015, 0.015, 8]} />
            <meshStandardMaterial color="#64748b" metalness={0.6} />
          </mesh>
          {/* Gatilho frontal */}
          <mesh position={[0, 0.02, 0.038]} rotation={[-0.4, 0, 0]}>
            <boxGeometry args={[0.015, 0.04, 0.02]} />
            <meshStandardMaterial color="#475569" />
          </mesh>
        </group>
      </group>

      {/* ====================================================================
          6. CONSOLES LATERAIS (Manete de Potência à Esquerda + Painel à Direita)
          ==================================================================== */}
      {/* Console Lateral Esquerdo (Manete de Potência / Throttle Quadrant) */}
      <group position={[-0.56, -0.36, 0.4]} rotation={[0, 0.15, 0]}>
        <mesh>
          <boxGeometry args={[0.26, 0.18, 0.7]} />
          <meshStandardMaterial color="#090d16" roughness={0.7} />
        </mesh>
        {/* Ranhura dos manetes */}
        <mesh position={[0, 0.091, 0]}>
          <planeGeometry args={[0.08, 0.4]} />
          <meshBasicMaterial color="#020617" />
        </mesh>
        {/* Manetes duplos de aceleração */}
        <group ref={throttleRef} position={[0, 0.14, 0.05]}>
          <mesh position={[-0.02, 0, 0]}>
            <boxGeometry args={[0.025, 0.09, 0.05]} />
            <meshStandardMaterial color="#334155" metalness={0.8} />
          </mesh>
          <mesh position={[0.02, 0, 0]}>
            <boxGeometry args={[0.025, 0.09, 0.05]} />
            <meshStandardMaterial color="#334155" metalness={0.8} />
          </mesh>
        </group>
      </group>

      {/* Console Lateral Direito (Chaves de Comunicação e Painel Auxiliar) */}
      <group position={[0.56, -0.36, 0.4]} rotation={[0, -0.15, 0]}>
        <mesh>
          <boxGeometry args={[0.26, 0.18, 0.7]} />
          <meshStandardMaterial color="#090d16" roughness={0.7} />
        </mesh>
        {/* Grade de botões e switches iluminados */}
        {[-0.05, 0.05].map((swX, i) => (
          <group key={i} position={[swX, 0.092, 0]}>
            {[-0.15, -0.05, 0.05, 0.15].map((swZ, j) => (
              <mesh key={j} position={[0, 0, swZ]}>
                <boxGeometry args={[0.02, 0.015, 0.02]} />
                <meshBasicMaterial color={j % 2 === 0 ? '#00e5ff' : '#f59e0b'} />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      {/* ====================================================================
          7. ASSENTO EJETOR MILITAR (Apoio de Cabeça / Ejection Seat)
          ==================================================================== */}
      <group position={[0, -0.05, -0.15]}>
        {/* Encosto de Cabeça Acolchoado */}
        <mesh position={[0, 0.18, 0]}>
          <boxGeometry args={[0.42, 0.32, 0.18]} />
          <meshStandardMaterial color="#1c2438" roughness={0.9} />
        </mesh>
        {/* Alça Dupla de Ejeção Amarela e Preta no topo */}
        <group position={[0, 0.35, 0.02]}>
          <mesh>
            <torusGeometry args={[0.07, 0.012, 12, 24, Math.PI]} />
            <meshStandardMaterial color="#facc15" roughness={0.3} />
          </mesh>
        </group>
      </group>

      {/* ====================================================================
          8. Iluminação Interna Tática do Cockpit (Floodlight Verde/Ciano)
          ==================================================================== */}
      <pointLight
        position={[0, -0.05, 0.55]}
        color={mfdAccentColor}
        intensity={isCritical ? 1.5 : 0.8}
        distance={2.2}
      />
    </group>
  );
};
