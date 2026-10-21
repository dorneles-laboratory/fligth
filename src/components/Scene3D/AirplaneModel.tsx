import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface AirplaneModelProps {
  dangerLevel?: number;
  theme?: 'dark' | 'light';
}

export const AirplaneModel: React.FC<AirplaneModelProps> = ({
  dangerLevel = 0,
  theme = 'dark',
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const leftTurbineGlowRef = useRef<THREE.Mesh>(null);
  const rightTurbineGlowRef = useRef<THREE.Mesh>(null);
  const strobeRef = useRef<THREE.PointLight>(null);

  const isLight = theme === 'light';
  const isEmergency = dangerLevel >= 50;
  const turbineColor = isEmergency ? '#ff3b30' : '#00e5ff';

  // Cores de pintura da aeronave por tema (Pintura Stealth vs Pintura Executiva Aero)
  const fuselageColor = isLight ? '#f1f5f9' : '#1e293b';
  const wingsColor = isLight ? '#e2e8f0' : '#334155';
  const accentColor = isLight ? '#0284c7' : '#0ea5e9';
  const canopyColor = isLight ? '#38bdf8' : '#00e5ff';

  useFrame((state) => {
    if (!groupRef.current) return;

    // Brilho pulsante das turbinas
    const elapsed = state.clock.getElapsedTime();
    const turbineIntensity = 1 + Math.sin(elapsed * 10) * 0.3;
    if (leftTurbineGlowRef.current) {
      (leftTurbineGlowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.7 * turbineIntensity;
    }
    if (rightTurbineGlowRef.current) {
      (rightTurbineGlowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.7 * turbineIntensity;
    }

    // Luz estroboscópica na cauda
    if (strobeRef.current) {
      strobeRef.current.intensity = Math.sin(elapsed * 6) > 0.8 ? 5 : 0.2;
    }
  });

  return (
    <group ref={groupRef}>
      {/* ====================================================================
          1. Fuselagem Principal (Materiais PBR metálicos refinados)
          ==================================================================== */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.9, 0.8, 5.2]} />
        <meshStandardMaterial
          color={fuselageColor}
          roughness={isLight ? 0.2 : 0.28}
          metalness={isLight ? 0.4 : 0.8}
        />
      </mesh>

      {/* Nariz do Avião (Cônico / Radome) */}
      <mesh position={[0, -0.02, 3.1]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.45, 1.2, 32]} />
        <meshStandardMaterial color={accentColor} roughness={0.25} metalness={0.7} />
      </mesh>

      {/* Canópia de Vidro do Cockpit */}
      <mesh position={[0, 0.38, 1.3]}>
        <boxGeometry args={[0.65, 0.4, 1.8]} />
        <meshPhysicalMaterial
          color={canopyColor}
          transparent
          opacity={0.65}
          roughness={0.1}
          metalness={0.8}
          transmission={0.4}
          reflectivity={0.9}
        />
      </mesh>

      {/* ====================================================================
          2. Asas Principais (Geometria em flecha)
          ==================================================================== */}
      <mesh position={[0, -0.05, 0.4]}>
        <boxGeometry args={[8.4, 0.08, 1.5]} />
        <meshStandardMaterial color={wingsColor} roughness={0.3} metalness={0.6} />
      </mesh>

      {/* Winglets (Pontas das Asas dobradas para cima) */}
      <mesh position={[-4.2, 0.3, 0.4]} rotation={[0, 0, 0.35]}>
        <boxGeometry args={[0.06, 0.7, 0.8]} />
        <meshStandardMaterial color={accentColor} roughness={0.2} metalness={0.8} />
      </mesh>
      <mesh position={[4.2, 0.3, 0.4]} rotation={[0, 0, -0.35]}>
        <boxGeometry args={[0.06, 0.7, 0.8]} />
        <meshStandardMaterial color={accentColor} roughness={0.2} metalness={0.8} />
      </mesh>

      {/* ====================================================================
          3. Empenagem / Cauda (Estabilizadores e Leme)
          ==================================================================== */}
      {/* Estabilizador Horizontal da Cauda */}
      <mesh position={[0, 0.1, -2.4]}>
        <boxGeometry args={[3.2, 0.06, 0.9]} />
        <meshStandardMaterial color={wingsColor} roughness={0.3} metalness={0.6} />
      </mesh>

      {/* Estabilizador Vertical (Leme) */}
      <mesh position={[0, 0.85, -2.3]}>
        <boxGeometry args={[0.1, 1.5, 1.1]} />
        <meshStandardMaterial color={accentColor} roughness={0.2} metalness={0.8} />
      </mesh>

      {/* ====================================================================
          4. Turbinas a Jato e Escape Neon
          ==================================================================== */}
      {/* Turbina Esquerda */}
      <group position={[-2.0, -0.35, 0.6]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.26, 0.26, 1.4, 32]} />
          <meshStandardMaterial color={isLight ? '#475569' : '#0f172a'} roughness={0.2} metalness={0.9} />
        </mesh>
        <mesh ref={leftTurbineGlowRef} position={[0, 0, -0.75]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.2, 0.05, 0.5, 16]} />
          <meshBasicMaterial color={turbineColor} transparent opacity={0.8} />
        </mesh>
        <pointLight position={[0, 0, -0.9]} color={turbineColor} intensity={2} distance={3} />
      </group>

      {/* Turbina Direita */}
      <group position={[2.0, -0.35, 0.6]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.26, 0.26, 1.4, 32]} />
          <meshStandardMaterial color={isLight ? '#475569' : '#0f172a'} roughness={0.2} metalness={0.9} />
        </mesh>
        <mesh ref={rightTurbineGlowRef} position={[0, 0, -0.75]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.2, 0.05, 0.5, 16]} />
          <meshBasicMaterial color={turbineColor} transparent opacity={0.8} />
        </mesh>
        <pointLight position={[0, 0, -0.9]} color={turbineColor} intensity={2} distance={3} />
      </group>

      {/* ====================================================================
          5. Luzes Regulamentares de Navegação
          ==================================================================== */}
      {/* Asa Esquerda: Luz Vermelha (Port) */}
      <mesh position={[-4.22, 0, 0.4]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
      <pointLight position={[-4.3, 0, 0.4]} color="#ef4444" intensity={2.5} distance={4} />

      {/* Asa Direita: Luz Verde (Starboard) */}
      <mesh position={[4.22, 0, 0.4]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color="#10b981" />
      </mesh>
      <pointLight position={[4.3, 0, 0.4]} color="#10b981" intensity={2.5} distance={4} />

      {/* Cauda: Luz Branca Estroboscópica */}
      <pointLight ref={strobeRef} position={[0, 1.5, -2.8]} color="#ffffff" intensity={2} distance={8} />
    </group>
  );
};
