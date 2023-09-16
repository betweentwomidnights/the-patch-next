import * as THREE from 'three';
import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, SoftShadows } from '@react-three/drei';
import { Bloom } from '@react-three/postprocessing';
import { KernelSize } from 'postprocessing';
import Perlin from './Perlin'; // Assuming the Perlin class is exported from this path

const BOX_COUNT_PER_SIDE = 10; 

const Background = () => {
  const { scene } = useThree();
  scene.background = new THREE.Color(0x000000);
  return null;
};

const Boxes = ({ spectrumData }: { spectrumData: Uint8Array }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const { camera } = useThree();

  // Create an instance of Perlin noise
  const noise = new Perlin();

  useEffect(() => {
    camera.position.z = 15;
  }, [camera]);

  const randVectors = useMemo(() => {
    const vectors = [];
    for (let i = 0; i < BOX_COUNT_PER_SIDE ** 3; i++) {
      vectors.push(new THREE.Vector3(Math.random(), Math.random(), Math.random()));
    }
    return vectors;
  }, []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const smoothingFactor = 100; 
    let normalizedAverageFrequency = ((Math.sin(time) + 1) / 2) / (1 + smoothingFactor);
    let color = new THREE.Color();
    color.setHSL(normalizedAverageFrequency, 1, 0.5);

    let averageFrequency = 0;

    if (spectrumData && spectrumData.some(frequency => frequency !== 0)) {
      averageFrequency = spectrumData.reduce((a, b) => a + b, 0) / spectrumData.length;
      normalizedAverageFrequency = averageFrequency / (255 + smoothingFactor);
      color.setHSL(averageFrequency / 255, 1, 0.5);
    }

    (meshRef.current.material as THREE.MeshPhongMaterial).color = color;

    const center = new THREE.Vector3(0, 0, 0); 

    for (let x = 0; x < BOX_COUNT_PER_SIDE; x++) {
      for (let y = 0; y < BOX_COUNT_PER_SIDE; y++) {
        for (let z = 0; z < BOX_COUNT_PER_SIDE; z++) {
          const i = x * BOX_COUNT_PER_SIDE * BOX_COUNT_PER_SIDE + y * BOX_COUNT_PER_SIDE + z;

          // Use Perlin's simplex3 for a more organic movement
          const noiseFactor = noise.simplex3(x * 0.1, y * 0.1, time + z * 0.1) * 0.5; 

          dummy.position.set(x - BOX_COUNT_PER_SIDE / 2, y - BOX_COUNT_PER_SIDE / 2, z - BOX_COUNT_PER_SIDE / 2);
          dummy.position.addScaledVector(randVectors[i], noiseFactor);

          const direction = new THREE.Vector3().subVectors(dummy.position, center); 
          direction.normalize();
          direction.multiplyScalar(averageFrequency * 0.06); 
          dummy.position.add(direction);
          
          dummy.rotation.set(Math.sin(time), Math.sin(time * 0.5), Math.sin(time * 0.25));
          dummy.scale.setScalar((Math.sin(time * 0.125) + 2) / 2);
          
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

const CenterLight = ({ spectrumData }: { spectrumData: Uint8Array }) => {
  const lightRef = useRef<THREE.PointLight>(null!);

  useFrame(() => {
    let averageFrequency = 0;

    if (spectrumData && spectrumData.some(frequency => frequency !== 0)) {
      averageFrequency = spectrumData.reduce((a, b) => a + b, 0) / spectrumData.length;
    }

    const intensity = THREE.MathUtils.mapLinear(averageFrequency, 0, 255, 1, 10);

    if (lightRef.current) {
      lightRef.current.intensity = intensity;
    }
  });

  return (
    <pointLight ref={lightRef} position={[0, 0, 0]} />
  );
};

const Shaders: React.FC<{ spectrumData: Uint8Array }> = ({ spectrumData }) => {
  return (
    <div className="shaders">
      <Canvas style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }} shadows>
        <Bloom
          intensity={7.0}
          kernelSize={KernelSize.LARGE}
          luminanceThreshold={0.9}
          luminanceSmoothing={0.025}
          mipmapBlur={false}
        />
        <Shadows />
        <Background />
        <ambientLight intensity={0.1} />
        <directionalLight
          position={[5, 5, 5]}
          intensity={3}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          castShadow
        />
        <Boxes spectrumData={spectrumData} />
        <CenterLight spectrumData={spectrumData} />
        <OrbitControls />
      </Canvas>
    </div>
  );
}

export default Shaders;
