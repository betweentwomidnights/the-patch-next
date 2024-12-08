import * as THREE from 'three';
import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { KernelSize } from 'postprocessing';
import Perlin from './Perlin';

const BOX_COUNT_PER_SIDE = 12;
const FREQUENCY_BANDS = 4;

interface ShadersProps {
  spectrumData: Uint8Array;
  isAudioInitialized?: boolean;
}

const Background = () => {
  const { scene } = useThree();
  scene.background = new THREE.Color(0x000000);
  return null;
};

const getFrequencyBands = (spectrumData: Uint8Array) => {
  if (!spectrumData.length) return [0, 0, 0, 0];
  
  const bandSize = Math.floor(spectrumData.length / FREQUENCY_BANDS);
  const bands = [];
  
  for (let i = 0; i < FREQUENCY_BANDS; i++) {
    const start = i * bandSize;
    const end = start + bandSize;
    const average = Array.from(spectrumData.slice(start, end))
      .reduce((a, b) => a + b, 0) / bandSize;
    bands.push(average);
  }
  
  return bands;
};

const Boxes = ({ spectrumData }: { spectrumData: Uint8Array }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const { camera } = useThree();
  const noise = new Perlin();

  const positionArrays = useMemo(() => ({
    current: new Float32Array(BOX_COUNT_PER_SIDE ** 3 * 3),
    target: new Float32Array(BOX_COUNT_PER_SIDE ** 3 * 3)
  }), []);

  const rotationArrays = useMemo(() => ({
    current: new Float32Array(BOX_COUNT_PER_SIDE ** 3 * 3),
    target: new Float32Array(BOX_COUNT_PER_SIDE ** 3 * 3)
  }), []);

  useEffect(() => {
    camera.position.z = 20;
  }, [camera]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    const [bass, lowMid, highMid, treble] = getFrequencyBands(spectrumData);
    
    const normalizedBass = bass / 255;
    const normalizedLowMid = lowMid / 255;
    const normalizedHighMid = highMid / 255;
    const normalizedTreble = treble / 255;

    const baseHue = (time * 0.05) % 1;
    const color = new THREE.Color();
    color.setHSL(
      (baseHue + normalizedLowMid * 0.2) % 1,
      0.5 + normalizedHighMid * 0.5,
      0.3 + normalizedTreble * 0.4
    );
    (meshRef.current.material as THREE.MeshPhongMaterial).color = color;

    const halfSide = BOX_COUNT_PER_SIDE / 2;

    for (let x = 0; x < BOX_COUNT_PER_SIDE; x++) {
      for (let y = 0; y < BOX_COUNT_PER_SIDE; y++) {
        for (let z = 0; z < BOX_COUNT_PER_SIDE; z++) {
          const i = x * BOX_COUNT_PER_SIDE * BOX_COUNT_PER_SIDE + y * BOX_COUNT_PER_SIDE + z;
          
          const baseX = x - halfSide;
          const baseY = y - halfSide;
          const baseZ = z - halfSide;

          const distance = Math.sqrt(baseX * baseX + baseY * baseY + baseZ * baseZ);
          const normalizedDistance = distance / (Math.sqrt(3) * halfSide);

          const noiseScale = 0.15;
          const noiseTime = time * 0.5;
          const noiseFactor = noise.simplex3(
            x * noiseScale + noiseTime,
            y * noiseScale + noiseTime,
            z * noiseScale + noiseTime
          );

          const bassInfluence = Math.sin(distance - time * 2) * normalizedBass * 2;
          const midInfluence = Math.cos(distance - time) * normalizedHighMid;
          
          dummy.position.set(
            baseX + noiseFactor * normalizedLowMid + bassInfluence,
            baseY + noiseFactor * normalizedHighMid + midInfluence,
            baseZ + noiseFactor * normalizedTreble
          );

          const scale = 0.7 + 
            Math.sin(normalizedDistance * Math.PI + time) * 0.2 * normalizedBass +
            normalizedTreble * 0.3;
          dummy.scale.setScalar(scale);

          dummy.rotation.set(
            normalizedLowMid * Math.PI * normalizedDistance,
            normalizedHighMid * Math.PI * 2 * normalizedDistance,
            normalizedTreble * Math.PI * normalizedDistance
          );

          const idx = i * 3;
          for (let j = 0; j < 3; j++) {
            positionArrays.current[idx + j] = positionArrays.current[idx + j] + 
              (dummy.position.toArray()[j] - positionArrays.current[idx + j]) * 0.1;
          }

          const currentRotation = new THREE.Euler(
            dummy.rotation.x,
            dummy.rotation.y,
            dummy.rotation.z
          );

          rotationArrays.current[idx] = rotationArrays.current[idx] + 
            (currentRotation.x - rotationArrays.current[idx]) * 0.1;
          rotationArrays.current[idx + 1] = rotationArrays.current[idx + 1] + 
            (currentRotation.y - rotationArrays.current[idx + 1]) * 0.1;
          rotationArrays.current[idx + 2] = rotationArrays.current[idx + 2] + 
            (currentRotation.z - rotationArrays.current[idx + 2]) * 0.1;

          dummy.position.fromArray(positionArrays.current, idx);
          dummy.rotation.set(
            rotationArrays.current[idx],
            rotationArrays.current[idx + 1],
            rotationArrays.current[idx + 2]
          );

          dummy.updateMatrix();
          meshRef.current.setMatrixAt(i, dummy.matrix);
        }
      }
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh 
      ref={meshRef} 
      args={[null as any, null as any, BOX_COUNT_PER_SIDE ** 3]} 
      castShadow 
      receiveShadow
    >
      <boxGeometry attach="geometry" args={[0.7, 0.7, 0.7]}>
        <bufferAttribute 
          attach="attributes-color"
          array={new Float32Array(BOX_COUNT_PER_SIDE ** 3 * 3)}
          count={BOX_COUNT_PER_SIDE ** 3}
          itemSize={3}
        />
      </boxGeometry>
      <meshPhongMaterial 
        attach="material" 
        color="white"
        vertexColors
        shininess={50}
      />
    </instancedMesh>
  );
};

const CenterLight = ({ spectrumData }: { spectrumData: Uint8Array }) => {
  const lightRef = useRef<THREE.PointLight>(null!);
  const [bass] = getFrequencyBands(spectrumData);

  useFrame(() => {
    if (lightRef.current) {
      const baseIntensity = 2;
      const bassIntensity = (bass / 255) * 3;
      lightRef.current.intensity = baseIntensity + bassIntensity;
    }
  });

  return <pointLight ref={lightRef} position={[0, 0, 0]} color="#fff" />;
};

const Shaders: React.FC<ShadersProps> = ({ 
  spectrumData, 
  isAudioInitialized = false 
}) => {
  return (
    <div className="shaders">
      <Canvas 
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }} 
        shadows
        camera={{ position: [0, 0, 20], fov: 75 }}
      >
        <EffectComposer>
          <Bloom
            intensity={2.0}
            kernelSize={KernelSize.LARGE}
            luminanceThreshold={0.6}
            luminanceSmoothing={0.3}
            mipmapBlur
          />
        </EffectComposer>
        <Background />
        <ambientLight intensity={0.1} />
        <directionalLight
          position={[5, 5, 5]}
          intensity={2}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <Boxes spectrumData={spectrumData} />
        <CenterLight spectrumData={spectrumData} />
        <OrbitControls 
          enableDamping
          dampingFactor={0.05}
          rotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
}

export default Shaders;