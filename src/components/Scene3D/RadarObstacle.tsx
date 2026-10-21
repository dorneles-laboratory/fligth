import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface RadarObstacleProps {
  radar_cm: number;
  dangerLevel: number;
}

export const RadarObstacle: React.FC<RadarObstacleProps> = ({ radar_cm, dangerLevel }) => {
  const wallGroupRef = useRef<THREE.Group>(null);
  const ringRef1 = useRef<THREE.Mesh>(null);
  const ringRef2 = useRef<THREE.Mesh>(null);
  const laserBeamRef = useRef<THREE.Mesh>(null);

  // Calcula a posição Z da parede no mundo 3D
  // Nariz do avião está em Z = 3.1
  // radar_cm = 5cm -> Z = 5.2 (muito perto)
  // radar_cm = 60cm -> Z = 28.0 (distância segura)
  const targetZ = 4.8 + (Math.max(2, Math.min(60, radar_cm)) / 60) * 22;

  // Cor da barreira baseada na proximidade (mão do usuário se aproximando)
  const isClose = radar_cm < 18 || dangerLevel >= 50;
  const isMedium = radar_cm >= 18 && radar_cm < 35;
  const wallColor = isClose ? '#ef4444' : isMedium ? '#f59e0b' : '#00e5ff';

  useFrame((state, delta) => {
    if (!wallGroupRef.current) return;

    // Interpolação suave delta-independente no eixo Z acompanhando a mão do usuário
    wallGroupRef.current.position.z = THREE.MathUtils.damp(
      wallGroupRef.current.position.z,
      targetZ,
      16,
      delta
    );

    const elapsed = state.clock.getElapsedTime();

    // Animação de pulso e rotação dos anéis de detecção de proximidade
    if (ringRef1.current) {
      ringRef1.current.rotation.z += delta * 1.5;
      const s = 1 + Math.sin(elapsed * 6) * 0.08;
      ringRef1.current.scale.set(s, s, 1);
    }
    if (ringRef2.current) {
      ringRef2.current.rotation.z -= delta * 2.0;
    }

    // Atualiza o comprimento do feixe de laser do sensor emitido para frente
    if (laserBeamRef.current) {
      const beamLength = Math.max(0.1, wallGroupRef.current.position.z - 3.1);
      laserBeamRef.current.scale.y = beamLength;
      laserBeamRef.current.position.z = 3.1 + beamLength / 2;
    }
  });

  return (
    <>
      {/* ====================================================================
          1. Feixe Laser LiDAR emitido sob o nariz até o obstáculo
          ==================================================================== */}
      <mesh ref={laserBeamRef} position={[0, -0.22, 10]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 1, 8]} />
        <meshBasicMaterial
          color={wallColor}
          transparent
          opacity={isClose ? 0.75 : 0.25}
        />
      </mesh>

      {/* ====================================================================
          2. Parede / Barreira Holográfica de Proximidade (Mão do Usuário)
          ==================================================================== */}
      <group ref={wallGroupRef} position={[0, 0, targetZ]}>
        {/* Painel Central Translúcido da Barreira */}
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[14, 9]} />
          <meshStandardMaterial
            color={wallColor}
            transparent
            opacity={isClose ? 0.35 : isMedium ? 0.2 : 0.1}
            roughness={0.2}
            metalness={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Grade Wireframe Holográfica (Efeito LiDAR / Sonar) */}
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[14, 9, 28, 18]} />
          <meshBasicMaterial
            color={wallColor}
            wireframe
            transparent
            opacity={isClose ? 0.75 : 0.4}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Moldura Externa de Contenção de Perigo */}
        <mesh position={[0, 0, 0.04]}>
          <ringGeometry args={[4.2, 4.4, 32]} />
          <meshBasicMaterial color={wallColor} side={THREE.DoubleSide} />
        </mesh>

        {/* Anel de Escaneamento 1 com Linhas Táticas */}
        <mesh ref={ringRef1} position={[0, 0, 0.05]}>
          <ringGeometry args={[2.8, 3.0, 6]} />
          <meshBasicMaterial
            color={wallColor}
            wireframe
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Anel de Escaneamento 2 com Mira Central */}
        <mesh ref={ringRef2} position={[0, 0, 0.06]}>
          <ringGeometry args={[1.2, 1.35, 16]} />
          <meshBasicMaterial color={wallColor} side={THREE.DoubleSide} />
        </mesh>

        {/* Retículo de Impacto (Mira em X no Ponto Central) */}
        <group position={[0, 0, 0.07]}>
          <mesh rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.08, 1.8, 0.02]} />
            <meshBasicMaterial color={wallColor} />
          </mesh>
          <mesh rotation={[0, 0, -Math.PI / 4]}>
            <boxGeometry args={[0.08, 1.8, 0.02]} />
            <meshBasicMaterial color={wallColor} />
          </mesh>
        </group>

        {/* Luz Punctual no Ponto de Colisão / Obstáculo */}
        <pointLight
          position={[0, 0, -0.5]}
          color={wallColor}
          intensity={isClose ? 4 : 1.5}
          distance={12}
        />

        {/* Placas Laterais de Aviso (Bandeiras de Perigo da Parede) */}
        {[-6, 6].map((x, i) => (
          <mesh key={i} position={[x, 0, 0.05]}>
            <boxGeometry args={[0.5, 8.5, 0.05]} />
            <meshStandardMaterial
              color={wallColor}
              emissive={wallColor}
              emissiveIntensity={isClose ? 0.8 : 0.2}
            />
          </mesh>
        ))}
      </group>
    </>
  );
};
