import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import * as THREE from 'three';

interface FlightEnvironmentProps {
  dangerLevel: number;
  radarAltitude: number;
  theme?: 'dark' | 'light';
}

export const FlightEnvironment: React.FC<FlightEnvironmentProps> = ({
  dangerLevel,
  radarAltitude,
  theme = 'dark',
}) => {
  const groundRef = useRef<THREE.Group>(null);
  const cloudsGroupRef = useRef<THREE.Group>(null);

  // Calcula a distância visual do chão com base no radar (0 a 60 cm convertido em altitude proporcional)
  const targetGroundY = -3 - (radarAltitude / 60) * 15;

  const isLight = theme === 'light';

  // Configuração solar dinâmica por tema
  // Modo Claro: Sol alto, dia limpo e brilhante
  // Modo Escuro: Pôr do sol / crepúsculo tático com luz rasante
  const sunElevation = dangerLevel >= 50 ? 4 : isLight ? 48 : 12;
  const sunPosition: [number, number, number] = isLight ? [80, sunElevation, 80] : [120, sunElevation, 100];
  const skyTurbidity = dangerLevel >= 50 ? 18 : isLight ? 3 : 8;

  useFrame((_, delta) => {
    // Simula a movimentação de voo para frente (chão deslizando no eixo Z)
    if (groundRef.current) {
      groundRef.current.position.z -= delta * 35;
      if (groundRef.current.position.z < -200) {
        groundRef.current.position.z = 200;
      }
      groundRef.current.position.y = THREE.MathUtils.lerp(
        groundRef.current.position.y,
        targetGroundY,
        0.08
      );
    }

    // Nuvens passando continuamente pelo avião
    if (cloudsGroupRef.current) {
      cloudsGroupRef.current.position.z -= delta * 50;
      if (cloudsGroupRef.current.position.z < -300) {
        cloudsGroupRef.current.position.z = 300;
      }
    }
  });

  return (
    <>
      {/* ====================================================================
          1. Céu Procedural Atmosférico Preetham Reativo ao Tema
          ==================================================================== */}
      <Sky
        distance={450000}
        sunPosition={sunPosition}
        inclination={isLight ? 0.6 : 0.4}
        azimuth={0.25}
        turbidity={skyTurbidity}
        rayleigh={dangerLevel >= 50 ? 6 : isLight ? 1.2 : 2.5}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
      />

      {/* ====================================================================
          2. Iluminação do Cenário por Tema
          ==================================================================== */}
      <ambientLight
        intensity={dangerLevel >= 50 ? 0.35 : isLight ? 0.85 : 0.55}
        color={dangerLevel >= 50 ? '#fda4af' : isLight ? '#f8fafc' : '#c7d2fe'}
      />
      <directionalLight
        position={sunPosition}
        intensity={dangerLevel >= 50 ? 1.6 : isLight ? 2.8 : 2.0}
        color={dangerLevel >= 50 ? '#fb7185' : isLight ? '#ffffff' : '#fef08a'}
        castShadow
      />
      <hemisphereLight
        args={[
          dangerLevel >= 50 ? '#991b1b' : isLight ? '#e0f2fe' : '#38bdf8',
          isLight ? '#cbd5e1' : '#0f172a',
          isLight ? 0.65 : 0.45,
        ]}
      />

      {/* ====================================================================
          3. Terreno / Solo em Movimento
          ==================================================================== */}
      <group ref={groundRef} position={[0, targetGroundY, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1200, 1200, 40, 40]} />
          <meshStandardMaterial
            color={
              dangerLevel >= 50
                ? '#1f1315'
                : isLight
                ? '#dcfce7'
                : '#091522'
            }
            roughness={0.85}
            metalness={0.1}
          />
        </mesh>
        {/* Grade de coordenadas táticas no solo */}
        <gridHelper
          args={[
            1200,
            60,
            dangerLevel >= 50 ? '#ef4444' : isLight ? '#0284c7' : '#00e5ff',
            isLight ? '#94a3b8' : '#0f2942',
          ]}
          position={[0, 0.1, 0]}
        />
      </group>

      {/* ====================================================================
          4. Nuvens Procedurais em Movimento
          ==================================================================== */}
      <group ref={cloudsGroupRef} position={[0, 0, 0]}>
        {[
          { pos: [-40, 8, -60], scale: [22, 5, 30] },
          { pos: [55, 14, 40], scale: [28, 6, 35] },
          { pos: [-70, -4, 120], scale: [35, 7, 45] },
          { pos: [80, 5, -150], scale: [40, 8, 50] },
          { pos: [0, -10, 200], scale: [30, 5, 40] },
        ].map((cloud, idx) => (
          <mesh
            key={idx}
            position={cloud.pos as [number, number, number]}
            scale={cloud.scale as [number, number, number]}
          >
            <sphereGeometry args={[1, 12, 12]} />
            <meshStandardMaterial
              color={dangerLevel >= 50 ? '#4a252b' : '#ffffff'}
              transparent
              opacity={
                dangerLevel >= 50 ? 0.35 : isLight ? 0.65 : 0.45
              }
              roughness={0.9}
            />
          </mesh>
        ))}
      </group>
    </>
  );
};
