import * as THREE from 'three';
import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, SoftShadows } from '@react-three/drei';
import { Bloom, EffectComposer, EffectComposerContext } from '@react-three/postprocessing';
import { KernelSize, BloomEffect } from 'postprocessing';
import Perlin from './Perlin';


interface SpectrumDataWithTime {
  magnitudes: Uint8Array;
  timeStamp: number;
  deltaTime: number;
}

const BOX_COUNT_PER_SIDE = 16; // Slightly increased for more detail
const FREQUENCY_BANDS = 4; // We'll split the spectrum into bass, low-mid, high-mid, treble

const Background = () => {
  const { scene } = useThree();
  scene.background = new THREE.Color(0x000000);
  return null;
};

interface DynamicEffectsProps {
  kickDensity: number;
}

const DynamicEffects: React.FC<DynamicEffectsProps> = ({ kickDensity }) => {
  // Instead of trying to manipulate the effect directly,
  // we'll use the intensity prop and recalculate values based on kick density
  const baseIntensity = 2.0;
  const dynamicIntensity = baseIntensity + kickDensity * 2;
  const dynamicThreshold = Math.max(0.3, 0.6 - kickDensity * 0.3);
  const dynamicSmoothing = 0.3 + kickDensity * 0.2;

  return (
    <EffectComposer>
      <Bloom
        intensity={dynamicIntensity}
        kernelSize={KernelSize.LARGE}
        luminanceThreshold={dynamicThreshold}
        luminanceSmoothing={dynamicSmoothing}
        mipmapBlur
      />
    </EffectComposer>
  );
};

// Helper function to split frequency data into bands
const getFrequencyBands = (spectrumData: Uint8Array) => {
  if (!spectrumData.length) return [0, 0, 0, 0];
  
  // With 2048 FFT size and 44100Hz sample rate:
  // Each bin represents ~21.5Hz (44100/2048)
  // We'll focus on very specific frequency ranges
  
  // Sub-bass kick drum (20-60 Hz)
  const kickStartBin = Math.max(1, Math.floor(20 / 21.5));  // Avoid DC offset at bin 0
  const kickEndBin = Math.floor(60 / 21.5);
  const kickBand = Array.from(spectrumData.slice(kickStartBin, kickEndBin))
    .reduce((a, b) => a + b, 0) / (kickEndBin - kickStartBin);
  
  // Upper bass (60-150 Hz)
  const bassEndBin = Math.floor(150 / 21.5);
  const bassBand = Array.from(spectrumData.slice(kickEndBin, bassEndBin))
    .reduce((a, b) => a + b, 0) / (bassEndBin - kickEndBin);
  
  // Low-mids (150-600 Hz)
  const lowMidEndBin = Math.floor(600 / 21.5);
  const lowMidBand = Array.from(spectrumData.slice(bassEndBin, lowMidEndBin))
    .reduce((a, b) => a + b, 0) / (lowMidEndBin - bassEndBin);
  
  // Rest of spectrum (600+ Hz)
  const highBand = Array.from(spectrumData.slice(lowMidEndBin))
    .reduce((a, b) => a + b, 0) / (spectrumData.length - lowMidEndBin);
  
  return [kickBand, bassBand, lowMidBand, highBand];
};

interface BoxesProps {
  spectrumData: SpectrumDataWithTime;
}

const Boxes: React.FC<BoxesProps> = ({ spectrumData }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const noise = new Perlin();
  
  // Base refs for animation
  const intensityRef = useRef<number>(0);
  const noiseTimeRef = useRef<number>(0);
  const prevAudioTimeRef = useRef<number>(0);
  
  // Noise progression refs
  const noiseSpeedRef = useRef<number>(0);
  const targetNoiseSpeedRef = useRef<number>(0);
  
  // Kick detection refs
  const lastBassRef = useRef<number>(0);
  const kickImpulseRef = useRef<number>(0);
  const kickRotationRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  
  // Audio activity tracking refs
  const lastAudioTimeRef = useRef<number>(0);
  const isActiveRef = useRef<boolean>(false);
  const restPositionsRef = useRef<Float32Array | null>(null);

  // Kick density tracking
  const kickTimestampsRef = useRef<number[]>([]);
  const kickDensityRef = useRef<number>(0);
  const [kickDensity, setKickDensity] = useState<number>(0);

  // Position and rotation arrays
  const positionArrays = useMemo(() => ({
    current: new Float32Array(BOX_COUNT_PER_SIDE ** 3 * 3),
    target: new Float32Array(BOX_COUNT_PER_SIDE ** 3 * 3)
  }), []);

  const rotationArrays = useMemo(() => ({
    current: new Float32Array(BOX_COUNT_PER_SIDE ** 3 * 3),
    target: new Float32Array(BOX_COUNT_PER_SIDE ** 3 * 3)
  }), []);

  const restRotationsRef = useRef<Float32Array | null>(null);
  const rotationResetSpeedRef = useRef<number>(0.15);  // Adjustable reset speed

  useFrame((state) => {
    const audioTime = spectrumData.timeStamp;
    const audioDelta = audioTime - prevAudioTimeRef.current;
    prevAudioTimeRef.current = audioTime;
    
    // Get frequency bands from magnitudes array
    const [kickBand, bassBand, lowMidBand, highBand] = getFrequencyBands(spectrumData.magnitudes);
    
    // Check for audio activity
    const totalEnergy = kickBand + bassBand + lowMidBand + highBand;
    const activityThreshold = 10;
    const hasActivity = totalEnergy > activityThreshold;
    
    // Update activity state
    if (hasActivity) {
      lastAudioTimeRef.current = audioTime;
      isActiveRef.current = true;
    } else {
      if (audioTime - lastAudioTimeRef.current > 0.5) {
        isActiveRef.current = false;
      }
    }
    
    // Calculate base audio energy (0-1 range)
    const baseAudioEnergy = isActiveRef.current 
      ? (kickBand + bassBand + lowMidBand + highBand) / (255 * 4) 
      : 0;

    // Update noise speed based on audio energy
    targetNoiseSpeedRef.current = baseAudioEnergy * 0.2;
    const speedLerpFactor = isActiveRef.current ? 0.1 : 0.02;
    noiseSpeedRef.current += (targetNoiseSpeedRef.current - noiseSpeedRef.current) * speedLerpFactor;

    // Update noise time based on audio timing
    if (isActiveRef.current && audioDelta > 0) {
      noiseTimeRef.current = (noiseTimeRef.current + audioDelta * noiseSpeedRef.current) % (Math.PI * 2);
    }

    // Process kick detection with density tracking
    if (isActiveRef.current) {
      const kickThreshold = 180
      const bassValue = kickBand;
      const relativeDelta = bassValue / (lastBassRef.current + 1);
      const isKick = bassValue > kickThreshold && relativeDelta > 1.1;
      
      if (isKick) {
        // Track kick density
        kickTimestampsRef.current.push(audioTime);
        
        // Remove kicks older than 500ms
        const recentWindow = 0.5; // 500ms window
        kickTimestampsRef.current = kickTimestampsRef.current.filter(
          time => audioTime - time <= recentWindow
        );
        
        // Calculate kick density (0-1 range)
        const maxKicksInWindow = 8; // Adjust based on your needs
        kickDensityRef.current = Math.min(
          kickTimestampsRef.current.length / maxKicksInWindow,
          1
        );
        
        // Update kick density state for effects
        setKickDensity(kickDensityRef.current);
        
        // Enhanced kick impulse based on density
        kickImpulseRef.current = 1.0 + kickDensityRef.current * 0.5;
        
        kickRotationRef.current.set(
          (Math.random() - 0.1) * Math.PI * 2,
          (Math.random() - 0.1) * Math.PI * 2,
          (Math.random() - 0.1) * Math.PI * 2
        );
      } else {
        kickImpulseRef.current *= 0.5;
      }
      
      lastBassRef.current = bassValue;
    }

    // Handle inactive state
    if (!isActiveRef.current) {
      // Initialize rest positions if not already done
      if (!restPositionsRef.current) {
        restPositionsRef.current = new Float32Array(BOX_COUNT_PER_SIDE ** 3 * 3);
        restRotationsRef.current = new Float32Array(BOX_COUNT_PER_SIDE ** 3 * 3);
        
        // Initialize both position and rotation rest states
        for (let i = 0; i < BOX_COUNT_PER_SIDE ** 3; i++) {
          const idx = i * 3;
          
          // Position initialization (existing code)
          const x = (i % BOX_COUNT_PER_SIDE) - BOX_COUNT_PER_SIDE / 2;
          const y = (Math.floor(i / BOX_COUNT_PER_SIDE) % BOX_COUNT_PER_SIDE) - BOX_COUNT_PER_SIDE / 2;
          const z = (Math.floor(i / (BOX_COUNT_PER_SIDE * BOX_COUNT_PER_SIDE))) - BOX_COUNT_PER_SIDE / 2;
          
          restPositionsRef.current[idx] = x;
          restPositionsRef.current[idx + 1] = y;
          restPositionsRef.current[idx + 2] = z;
          
          // Initialize rest rotations to 0
          restRotationsRef.current[idx] = 0;
          restRotationsRef.current[idx + 1] = 0;
          restRotationsRef.current[idx + 2] = 0;
        }
      }
      
      const inactiveTime = audioTime - lastAudioTimeRef.current;
      const returnForce = Math.min(inactiveTime * 2, 1);
      
      for (let i = 0; i < BOX_COUNT_PER_SIDE ** 3; i++) {
        const idx = i * 3;
        
        // Position reset (with smooth interpolation)
        for (let j = 0; j < 3; j++) {
          positionArrays.current[idx + j] += 
            (restPositionsRef.current![idx + j] - positionArrays.current[idx + j]) * 
            returnForce * 0.1;
        }
        
        // Rotation reset (with smooth interpolation)
        for (let j = 0; j < 3; j++) {
          const targetRotation = restRotationsRef.current![idx + j];
          const currentRotation = rotationArrays.current[idx + j];
          
          // Calculate shortest path to target rotation
          let rotationDiff = targetRotation - currentRotation;
          rotationDiff = ((rotationDiff + Math.PI) % (Math.PI * 2)) - Math.PI;
          
          rotationArrays.current[idx + j] += 
            rotationDiff * returnForce * rotationResetSpeedRef.current;
        }
      }
      
      kickImpulseRef.current *= 0.8;
      intensityRef.current *= 0.8;
      kickDensityRef.current *= 0.9; // Decay kick density during inactive periods
    }

    // Update boxes
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

          // Enhanced swirl motion based on kick density
          const swirlIntensity = 0.1 * (1 + kickDensityRef.current * 2);
          const swirlSpeed = 2 * (1 + kickDensityRef.current);
          const kickSwirl = kickImpulseRef.current * Math.sin(distance * 2 + noiseTimeRef.current * 2);
          
          const swirlX = Math.sin(noiseTimeRef.current * swirlSpeed + kickSwirl) * distance * swirlIntensity;
          const swirlY = Math.cos(noiseTimeRef.current * swirlSpeed + kickSwirl) * distance * swirlIntensity;

          // Noise calculation with circular motion
          const noiseScale = 0.1;
          const baseNoiseFactor = (
            noise.simplex3(
              x * noiseScale + Math.sin(noiseTimeRef.current) * 2,
              y * noiseScale + Math.cos(noiseTimeRef.current) * 2,
              z * noiseScale + Math.sin(noiseTimeRef.current * 0.5) * 2
            ) * 0.5 +
            noise.simplex3(
              x * noiseScale * 2 + Math.cos(noiseTimeRef.current * 1.1) * 2,
              y * noiseScale * 2 + Math.sin(noiseTimeRef.current * 1.1) * 2,
              z * noiseScale * 2 + Math.cos(noiseTimeRef.current * 0.6) * 2
            ) * 0.25
          ) * noiseSpeedRef.current;

          // Add kick influence
          const kickNoiseOffset = kickImpulseRef.current * Math.sin(distance * 2 + noiseTimeRef.current * 3);
          const noiseFactor = baseNoiseFactor + kickNoiseOffset;
          
          // Position calculation with enhanced swirl
          dummy.position.set(
            baseX + noiseFactor * (1 + (bassBand / 255) * 0.2) + swirlX * kickImpulseRef.current,
            baseY + noiseFactor * (1 + (lowMidBand / 255) * 0.2) + swirlY * kickImpulseRef.current,
            baseZ + noiseFactor * (1 + (highBand / 255) * 0.2)
          );

          // Enhanced scale calculation
          const kickScale = 1 + kickImpulseRef.current * 0.2 * Math.sin(distance * 2 - noiseTimeRef.current * 3);
          const scale = (0.5 + 
            Math.sin(normalizedDistance * Math.PI) * 0.1 * intensityRef.current +
            (highBand / 255) * 0.1 * intensityRef.current) * kickScale;
          
          dummy.scale.setScalar(scale);

          const kickRotX = kickRotationRef.current.x * kickImpulseRef.current * normalizedDistance;
          const kickRotY = kickRotationRef.current.y * kickImpulseRef.current * normalizedDistance;
          const kickRotZ = kickRotationRef.current.z * kickImpulseRef.current * normalizedDistance;
          
          const rotationIntensity = Math.PI * 0.2 * (1 + kickDensityRef.current);
          const noiseRotation = isActiveRef.current ? noiseTimeRef.current * 0.1 : 0;

          dummy.rotation.set(
            noiseFactor * rotationIntensity * intensityRef.current + kickRotX,
            noiseFactor * rotationIntensity * intensityRef.current + noiseRotation + kickRotY,
            noiseFactor * rotationIntensity * intensityRef.current + kickRotZ
          );

          // Apply smoothing
          const idx = i * 3;
          const kickSmoothingBoost = kickImpulseRef.current * 0.2;
          const smoothingFactor = 0.1 + kickSmoothingBoost;
          
          // Position smoothing
          for (let j = 0; j < 3; j++) {
            positionArrays.current[idx + j] += 
              (dummy.position.toArray()[j] - positionArrays.current[idx + j]) * smoothingFactor;
          }

          // Rotation smoothing
          rotationArrays.current[idx] += 
            (dummy.rotation.x - rotationArrays.current[idx]) * smoothingFactor;
          rotationArrays.current[idx + 1] += 
            (dummy.rotation.y - rotationArrays.current[idx + 1]) * smoothingFactor;
          rotationArrays.current[idx + 2] += 
            (dummy.rotation.z - rotationArrays.current[idx + 2]) * smoothingFactor;

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
      <DynamicEffects kickDensity={kickDensity} />
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

const CenterLight = ({ spectrumData }: { spectrumData: SpectrumDataWithTime }) => {
  const lightRef = useRef<THREE.PointLight>(null!);
  const lastBassRef = useRef(0);
  const kickIntensityRef = useRef(0);
  const prevAudioTimeRef = useRef(0);
  
  useFrame(() => {
    const [bass] = getFrequencyBands(spectrumData.magnitudes);
    const audioTime = spectrumData.timeStamp;
    const audioDelta = audioTime - prevAudioTimeRef.current;
    prevAudioTimeRef.current = audioTime;
    
    // Kick detection
    const kickThreshold = 150;
    const bassValue = bass;
    const isKick = bassValue > kickThreshold && bassValue > lastBassRef.current * 1.2;
    lastBassRef.current = bassValue;
    
    if (isKick) {
      kickIntensityRef.current = 1.0;
    } else {
      // Use audio timing for decay
      kickIntensityRef.current *= Math.pow(0.9, audioDelta * 60);
    }
    
    if (lightRef.current) {
      const baseIntensity = 2;
      const bassIntensity = (bass / 255) * 3;
      const kickBoost = kickIntensityRef.current * 5;
      lightRef.current.intensity = baseIntensity + bassIntensity + kickBoost;
      
      const hue = (kickIntensityRef.current * 0.1) % 1;
      const saturation = 0.1 + kickIntensityRef.current * 0.2;
      const lightness = 0.5 + kickIntensityRef.current * 0.5;
      
      const color = new THREE.Color();
      color.setHSL(hue, saturation, lightness);
      lightRef.current.color = color;
    }
  });

  return <pointLight ref={lightRef} position={[0, 0, 0]} color="#fff" />;
};

const Shaders: React.FC<{ spectrumData: SpectrumDataWithTime }> = ({ spectrumData }) => {
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