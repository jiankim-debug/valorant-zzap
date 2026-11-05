import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export type OperatorLook = {
  name: string;
  role: string;
  color: string;
  sigil: string;
};

type OperatorModelProps = {
  operator: OperatorLook;
  index: number;
  selected?: boolean;
  idle?: boolean;
  scale?: number;
};

/**
 * Original, reusable low-poly 3D field operative. It is intentionally built
 * from procedural meshes so the game needs no external model or image assets.
 */
export default function OperatorModel({ operator, index, selected = false, idle = true, scale = 1 }: OperatorModelProps) {
  const root = useRef<THREE.Group>(null);
  const accent = operator.color;
  const cloth = ['#26343a', '#30283d', '#34382d', '#392733', '#20263b'][index % 5];
  const armor = ['#52656a', '#625777', '#79643c', '#765063', '#48527d'][index % 5];
  const skin = ['#d3a68e', '#c99580', '#b57c63', '#c58a73', '#273049'][index % 5];

  useFrame(({ clock }, delta) => {
    if (!root.current || !idle) return;
    const t = clock.getElapsedTime() + index * 0.83;
    root.current.position.y = Math.sin(t * 1.15) * 0.025;
    root.current.rotation.y = Math.sin(t * 0.42) * 0.035;
    root.current.rotation.z = THREE.MathUtils.damp(root.current.rotation.z, Math.sin(t * 0.7) * 0.012, 4, delta);
  });

  return (
    <group ref={root} scale={scale}>
      {/* boots */}
      <mesh position={[-0.22, 0.17, 0.08]} castShadow><boxGeometry args={[0.31, 0.27, 0.48]} /><meshStandardMaterial color="#11171a" roughness={0.78} /></mesh>
      <mesh position={[0.22, 0.17, 0.08]} castShadow><boxGeometry args={[0.31, 0.27, 0.48]} /><meshStandardMaterial color="#11171a" roughness={0.78} /></mesh>
      <mesh position={[-0.22, 0.31, 0.25]}><boxGeometry args={[0.2, 0.045, 0.03]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.25} /></mesh>
      <mesh position={[0.22, 0.31, 0.25]}><boxGeometry args={[0.2, 0.045, 0.03]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.25} /></mesh>

      {/* trouser legs, reinforced knees, and articulated shin plates */}
      <mesh position={[-0.22, 0.61, 0]} castShadow><capsuleGeometry args={[0.145, 0.52, 5, 9]} /><meshStandardMaterial color={cloth} roughness={0.9} /></mesh>
      <mesh position={[0.22, 0.61, 0]} castShadow><capsuleGeometry args={[0.145, 0.52, 5, 9]} /><meshStandardMaterial color={cloth} roughness={0.9} /></mesh>
      <mesh position={[-0.22, 0.56, 0.135]} castShadow><boxGeometry args={[0.29, 0.2, 0.1]} /><meshStandardMaterial color={armor} metalness={0.2} roughness={0.58} /></mesh>
      <mesh position={[0.22, 0.56, 0.135]} castShadow><boxGeometry args={[0.29, 0.2, 0.1]} /><meshStandardMaterial color={armor} metalness={0.2} roughness={0.58} /></mesh>
      <mesh position={[-0.22, 0.39, 0.12]}><boxGeometry args={[0.24, 0.055, 0.035]} /><meshStandardMaterial color="#11191d" /></mesh>
      <mesh position={[0.22, 0.39, 0.12]}><boxGeometry args={[0.24, 0.055, 0.035]} /><meshStandardMaterial color="#11191d" /></mesh>
      {/* waist, layered torso, harness and shoulder armor */}
      <mesh position={[0, 1.04, 0]} castShadow><capsuleGeometry args={[0.31, 0.34, 5, 10]} /><meshStandardMaterial color={cloth} roughness={0.8} /></mesh>
      <mesh position={[0, 0.96, 0.04]} castShadow><boxGeometry args={[0.71, 0.12, 0.48]} /><meshStandardMaterial color="#151c20" metalness={0.22} roughness={0.62} /></mesh>
      <mesh position={[0.24, 0.96, 0.3]} castShadow><boxGeometry args={[0.16, 0.17, 0.12]} /><meshStandardMaterial color={armor} /></mesh>
      <mesh position={[-0.24, 0.96, 0.3]} castShadow><boxGeometry args={[0.16, 0.17, 0.12]} /><meshStandardMaterial color={armor} /></mesh>
      <mesh position={[0, 1.36, 0]} castShadow><capsuleGeometry args={[0.34, 0.45, 6, 12]} /><meshStandardMaterial color={cloth} roughness={0.72} /></mesh>
      <mesh position={[0, 1.4, 0.274]} castShadow><boxGeometry args={[0.51, 0.42, 0.13]} /><meshStandardMaterial color={armor} metalness={0.3} roughness={0.48} /></mesh>
      <mesh position={[0, 1.39, 0.35]}><boxGeometry args={[0.075, 0.47, 0.035]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={selected ? 0.75 : 0.35} /></mesh>
      <mesh position={[-0.11, 1.48, 0.352]}><boxGeometry args={[0.1, 0.12, 0.025]} /><meshStandardMaterial color="#172024" metalness={0.3} /></mesh>
      <mesh position={[0.12, 1.48, 0.352]}><boxGeometry args={[0.1, 0.12, 0.025]} /><meshStandardMaterial color="#172024" metalness={0.3} /></mesh>
      <mesh position={[-0.4, 1.58, 0]} castShadow><sphereGeometry args={[0.22, 12, 10]} /><meshStandardMaterial color={armor} metalness={0.22} roughness={0.48} /></mesh>
      <mesh position={[0.4, 1.58, 0]} castShadow><sphereGeometry args={[0.22, 12, 10]} /><meshStandardMaterial color={armor} metalness={0.22} roughness={0.48} /></mesh>
      <mesh position={[-0.4, 1.58, 0.185]}><boxGeometry args={[0.17, 0.12, 0.035]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.25} /></mesh>
      <mesh position={[0.4, 1.58, 0.185]}><boxGeometry args={[0.17, 0.12, 0.035]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.25} /></mesh>
      {/* utility harness and field pack */}
      <mesh position={[-0.19, 1.39, 0.354]} rotation={[0, 0, -0.3]}><boxGeometry args={[0.065, 0.54, 0.04]} /><meshStandardMaterial color="#11181c" metalness={0.28} /></mesh>
      <mesh position={[0.2, 1.39, 0.354]} rotation={[0, 0, 0.3]}><boxGeometry args={[0.065, 0.54, 0.04]} /><meshStandardMaterial color="#11181c" metalness={0.28} /></mesh>
      <mesh position={[0, 1.39, -0.29]} castShadow><boxGeometry args={[0.42, 0.58, 0.22]} /><meshStandardMaterial color={index === 1 ? '#362b48' : '#263238'} roughness={0.85} /></mesh>
      <mesh position={[0, 1.42, -0.414]}><boxGeometry args={[0.16, 0.37, 0.025]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.3} /></mesh>
      {/* arms, forearm guards, gloves */}
      <mesh position={[-0.54, 1.24, 0]} rotation={[0, 0, -0.1]} castShadow><capsuleGeometry args={[0.125, 0.48, 5, 9]} /><meshStandardMaterial color={cloth} /></mesh>
      <mesh position={[0.54, 1.24, 0]} rotation={[0, 0, 0.1]} castShadow><capsuleGeometry args={[0.125, 0.48, 5, 9]} /><meshStandardMaterial color={cloth} /></mesh>
      <mesh position={[-0.56, 1.05, 0.08]} rotation={[0, 0, -0.1]} castShadow><boxGeometry args={[0.2, 0.24, 0.24]} /><meshStandardMaterial color={armor} metalness={0.28} roughness={0.48} /></mesh>
      <mesh position={[0.56, 1.05, 0.08]} rotation={[0, 0, 0.1]} castShadow><boxGeometry args={[0.2, 0.24, 0.24]} /><meshStandardMaterial color={armor} metalness={0.28} roughness={0.48} /></mesh>
      <mesh position={[-0.56, 0.87, 0.06]}><sphereGeometry args={[0.11, 10, 8]} /><meshStandardMaterial color="#161c20" /></mesh>
      <mesh position={[0.56, 0.87, 0.06]}><sphereGeometry args={[0.11, 10, 8]} /><meshStandardMaterial color="#161c20" /></mesh>
      {/* neck, face and character-specific head silhouette */}
      <mesh position={[0, 1.76, 0]}><cylinderGeometry args={[0.11, 0.14, 0.18, 10]} /><meshStandardMaterial color={skin} roughness={0.88} /></mesh>
      <mesh position={[0, 2.0, 0]} castShadow><sphereGeometry args={[0.235, 16, 14]} /><meshStandardMaterial color={skin} roughness={0.82} /></mesh>
      {index === 4 ? <>
        <mesh position={[0, 2.05, 0.17]}><boxGeometry args={[0.36, 0.13, 0.09]} /><meshStandardMaterial color="#11182a" /></mesh>
        <mesh position={[-0.09, 2.055, 0.222]}><boxGeometry args={[0.095, 0.035, 0.025]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2} /></mesh>
        <mesh position={[0.09, 2.055, 0.222]}><boxGeometry args={[0.095, 0.035, 0.025]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2} /></mesh>
        <mesh position={[0, 2.22, -0.02]} castShadow><coneGeometry args={[0.36, 0.55, 6]} /><meshStandardMaterial color="#242b48" roughness={0.8} side={THREE.DoubleSide} /></mesh>
        <mesh position={[0, 1.4, -0.52]} rotation={[0.1, 0, 0]}><coneGeometry args={[0.46, 1.1, 6, 1, true]} /><meshStandardMaterial color="#2b3153" side={THREE.DoubleSide} transparent opacity={0.82} roughness={0.92} /></mesh>
      </> : <>
        {/* distinctive swept hair / headgear silhouettes */}
        <mesh position={[0, 2.19, -0.035]} castShadow>
          {index === 2 ? <capsuleGeometry args={[0.25, 0.18, 4, 10]} /> : <sphereGeometry args={[0.27, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.52]} />}
          <meshStandardMaterial color={['#d9e3ed', '#4b3b58', '#34493e', '#25222d'][index]} roughness={0.76} side={THREE.DoubleSide} />
        </mesh>
        {index === 0 && <mesh position={[-0.18, 2.32, -0.12]} rotation={[0, 0, -0.48]}><coneGeometry args={[0.095, 0.54, 6]} /><meshStandardMaterial color="#d9e3ed" /></mesh>}
        {index === 2 && <mesh position={[0, 2.27, 0.005]}><torusGeometry args={[0.21, 0.045, 6, 16, Math.PI]} /><meshStandardMaterial color="#819585" metalness={0.2} /></mesh>}
        <mesh position={[0, 2.015, 0.205]}><boxGeometry args={[0.34, 0.035, 0.025]} /><meshStandardMaterial color="#20272b" /></mesh>
        <mesh position={[-0.09, 2.017, 0.222]}><sphereGeometry args={[0.022, 8, 8]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.3} /></mesh>
        <mesh position={[0.09, 2.017, 0.222]}><sphereGeometry args={[0.022, 8, 8]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.3} /></mesh>
      </>}
      {/* role-specific equipment: wind blade, medic module, drone, energy core */}
      {index === 0 && <mesh position={[-0.76, 1.75, -0.04]} rotation={[0.2, 0, -0.45]}><octahedronGeometry args={[0.17, 0]} /><meshStandardMaterial color="#b9fff0" emissive={accent} emissiveIntensity={0.8} metalness={0.4} /></mesh>}
      {index === 1 && <><mesh position={[0.64, 1.38, -0.01]}><cylinderGeometry args={[0.14, 0.14, 0.28, 12]} /><meshStandardMaterial color="#292238" metalness={0.4} /></mesh><mesh position={[0.64, 1.38, 0.15]}><circleGeometry args={[0.085, 12]} /><meshBasicMaterial color="#e4d3ff" /></mesh></>}
      {index === 2 && <><mesh position={[0.76, 1.48, 0]}><boxGeometry args={[0.32, 0.23, 0.28]} /><meshStandardMaterial color="#33352e" metalness={0.5} /></mesh><mesh position={[0.76, 1.48, 0.15]}><sphereGeometry args={[0.055, 8, 8]} /><meshBasicMaterial color={accent} /></mesh></>}
      {index === 3 && <mesh position={[0.3, 1.37, 0.36]}><octahedronGeometry args={[0.12, 1]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.4} metalness={0.4} /></mesh>}
      <mesh position={[0, 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.55, 32]} /><meshBasicMaterial color={accent} transparent opacity={selected ? 0.32 : 0.11} /></mesh>
    </group>
  );
}
