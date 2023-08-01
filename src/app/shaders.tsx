import * as THREE from 'three';
import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, SoftShadows } from '@react-three/drei';

const BOX_COUNT_PER_SIDE = 10; // 10 boxes on each side of the grid

const Background = () => {
  const { scene } = useThree();
  scene.background = new THREE.Color(0x000000);
  return null;
};

const Boxes = ({ spectrumData }: { spectrumData: Uint8Array }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const { camera } = useThree();

  useEffect(() => {
    camera.position.z = 15;
  }, [camera]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const defaultFrequency = 1.0;
    const smoothingFactor = 30;
    let normalizedAverageFrequency = ((Math.sin(time) + 1) / 2) * defaultFrequency / (1 + smoothingFactor);
    let color = new THREE.Color();
    color.setHSL(defaultFrequency, 1, 0.5);
  
    if (spectrumData && spectrumData.some(frequency => frequency !== 0)) {
      const averageFrequency = spectrumData.reduce((a, b) => a + b, 0) / spectrumData.length;
      normalizedAverageFrequency = averageFrequency / (255 + smoothingFactor);
      color.setHSL(averageFrequency / 255, 1, 0.5);
    }
  
    (meshRef.current.material as THREE.MeshPhongMaterial).color = color;
  
    for (let x = 0; x < BOX_COUNT_PER_SIDE; x++) {
      for (let y = 0; y < BOX_COUNT_PER_SIDE; y++) {
        for (let z = 0; z < BOX_COUNT_PER_SIDE; z++) {
          const i = x * BOX_COUNT_PER_SIDE * BOX_COUNT_PER_SIDE + y * BOX_COUNT_PER_SIDE + z;
          const t = (time + i * 0.01) * normalizedAverageFrequency;
          dummy.position.set(x - BOX_COUNT_PER_SIDE / 2, y - BOX_COUNT_PER_SIDE / 2, z - BOX_COUNT_PER_SIDE / 2);
          dummy.position.add(new THREE.Vector3(Math.sin(t), Math.cos(t), Math.sin(t)));
          dummy.rotation.set(Math.sin(t) * Math.PI, Math.sin(t) * Math.PI, Math.sin(t) * Math.PI);
          dummy.scale.setScalar(Math.sin(t) + 1);
          dummy.updateMatrix();
          meshRef.current.setMatrixAt(i, dummy.matrix);
        }
      }
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });
  

  return (
    <instancedMesh ref={meshRef} args={[null as any, null as any, BOX_COUNT_PER_SIDE ** 3]} castShadow receiveShadow>
      <boxGeometry attach="geometry" args={[0.7, 0.7, 0.7]} />
      <meshPhongMaterial attach="material" color="white" />
    </instancedMesh>
  );
};

const Shadows = () => {
  SoftShadows({});
  return null;
};

const Shaders: React.FC<{ spectrumData: Uint8Array }> = ({ spectrumData }) => {
  return (
    <div className="shaders">
      <Canvas style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }} shadows>
        <Shadows />
        <Background />
        <ambientLight intensity={0.1} />
        <directionalLight
          position={[5, 5, 5]}
          intensity={1.5}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          castShadow
        />
        <Boxes spectrumData={spectrumData} />
        <OrbitControls />
      </Canvas>
    </div>
  );
}

export default Shaders;
