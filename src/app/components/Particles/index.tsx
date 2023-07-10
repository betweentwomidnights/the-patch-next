import { useRef, useEffect } from 'react';
import { Canvas, useFrame, Vector3 } from '@react-three/fiber';
import * as THREE from 'three';
import useShaderMaterial from '../../hooks/useShaderMaterial';
import useParticleGrid from '../../hooks/useParticleGrid';
import useAnimatedParticles from '../../hooks/useAnimatedParticles';

const vertexShader = `
uniform vec2 uvOffset;
uniform vec2 uvScale;
varying vec2 vUv;

void main() {
  vUv = uv * uvScale + uvOffset;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform sampler2D map;
varying vec2 vUv;

void main() {
  vec4 texture = texture2D(map, vUv);
  gl_FragColor = texture;
}
`;

interface ParticlePointsProps {
    texture: THREE.Texture;
    fallbackTexture: THREE.Texture;
    gridCount: number;
    spectrumData: Uint8Array;
    isLoadingImage: boolean;
    isTransitioningOut: boolean;
    setIsTransitioningOut: React.Dispatch<React.SetStateAction<boolean>>;
    isPending: boolean;
  }

const ParticlePoints: React.FC<ParticlePointsProps> = ({
  texture,
  fallbackTexture,
  gridCount,
  spectrumData,
  isLoadingImage,
  isTransitioningOut,
  setIsTransitioningOut,
  isPending
}) => {
  const groupRef = useRef<THREE.Group | null>(null);

  const shaderMaterial = useShaderMaterial({ texture, fallbackTexture, vertexShader, fragmentShader });
  const particles = useParticleGrid({ gridCount });
  const animatedParticles = useAnimatedParticles({
    particles,
    spectrumData, 
    uniforms: shaderMaterial?.uniforms, 
    isLoadingImage, 
    isTransitioningOut, 
    setIsTransitioningOut,
    isPending 
  });

  useEffect(() => {
    // Update the map uniform of the shaderMaterial when the texture changes
    if (shaderMaterial && shaderMaterial.uniforms.map.value !== texture) {
      shaderMaterial.uniforms.map.value = texture;
    }
  }, [texture, shaderMaterial]);

  useFrame(() => {
    if (groupRef.current && spectrumData && shaderMaterial?.uniforms?.map?.value) {
      // Calculate the average intensity
      const averageIntensity = spectrumData.reduce((sum, intensity) => sum + intensity, 0) / spectrumData.length;
      // Scale the intensity to be between 0 and 1
      const scaledIntensity = averageIntensity / 255;
  
      // Scale the group
      groupRef.current.scale.set(1 + scaledIntensity, 1 + scaledIntensity, 1 + scaledIntensity);
    } 
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {animatedParticles.map((particle, idx) => {
        const uvOffset = [idx % gridCount / gridCount, 1 - (Math.floor(idx / gridCount) + 1) / gridCount];
        const uvScale = [1 / gridCount, 1 / gridCount];
        return (
            <mesh key={idx} position={particle.position as [number, number, number]}>
            <planeGeometry attach="geometry" args={[1 / (gridCount - 1), 1 / (gridCount - 1)]} />
            <shaderMaterial
              attach="material"
              uniforms={{ ...shaderMaterial.uniforms, uvOffset: { value: new THREE.Vector2(...uvOffset) }, uvScale: { value: new THREE.Vector2(...uvScale) } }}
              vertexShader={vertexShader}
              fragmentShader={fragmentShader}
              transparent={true}
              blending={THREE.AdditiveBlending}
              depthTest={true}
            />
          </mesh>
        );
      })}
    </group>
  );
};

interface ParticlesImageProps {
  canvasClassName?: string;
  texture: THREE.Texture;
  fallbackTexture: THREE.Texture;
  spectrumData: Uint8Array;
  gridCount: number;
  isLoadingImage: boolean;
  isTransitioningOut: boolean;
  setIsTransitioningOut: React.Dispatch<React.SetStateAction<boolean>>;
  isPending: boolean;
}

export const ParticlesImage: React.FC<ParticlesImageProps> = ({
  canvasClassName = 'particles-image',
  texture,
  spectrumData,
  gridCount,
  isLoadingImage,
  isTransitioningOut,
  setIsTransitioningOut,
  isPending
}) => {
    const cameraProps: { position: Vector3, rotation: Vector3 } = {
        position: [0, 0, 1],
        rotation: [0, 0, Math.PI / 2], // Rotate 90 degrees clockwise around the z-axis
      };

  return (
    <Canvas className={canvasClassName} camera={cameraProps as any}>
      <ambientLight />
      <ParticlePoints 
        texture={texture} 
        fallbackTexture={texture} // provide fallback texture
        gridCount={gridCount} 
        spectrumData={spectrumData} 
        isLoadingImage={isLoadingImage} 
        isPending={isPending} 
        isTransitioningOut={isTransitioningOut} 
        setIsTransitioningOut={setIsTransitioningOut} 
      />
    </Canvas>
  );
};

export default ParticlesImage;
