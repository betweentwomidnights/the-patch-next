import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface AnimatedParticleProps {
  particles: {
    position: number[];
    initialPosition: number[];
    uv: number[];
  }[];
  spectrumData: Uint8Array | null;
  uniforms: {
    map: {
      value: THREE.Texture | null;
    };
    uvOffset: {
      value: THREE.Vector2;
    };
    uvScale: {
      value: THREE.Vector2;
    };
  } | null;
  isLoadingImage: boolean;
  isTransitioningOut: boolean;
  setIsTransitioningOut: React.Dispatch<React.SetStateAction<boolean>>;
  isPending: boolean;
}

const ANIMATION_STATE = {
  OUT: 'OUT',
  IN: 'IN',
  IDLE: 'IDLE'
};

const useAnimatedParticles = ({
  particles,
  spectrumData,
  uniforms,
  isLoadingImage,
  setIsTransitioningOut,
  isPending
}: AnimatedParticleProps) => {
  const particlesRef = useRef(particles);
  const animationStateRef = useRef(ANIMATION_STATE.OUT);
  const THRESHOLD_DISTANCE_OUT = .5;
  const THRESHOLD_DISTANCE_IN = .5;

  useEffect(() => {
    particlesRef.current = particles.map(p => ({...p, position: [...p.position], initialPosition: [...p.initialPosition]}));
    animationStateRef.current = ANIMATION_STATE.OUT;
  }, [particles]);

  useFrame(() => {
    if (particlesRef.current && uniforms) {
      particlesRef.current.forEach((particle, idx) => {
        const { initialPosition, position } = particle;
        let audioIntensity = 0;

        if (spectrumData) {
          const x = Math.floor((idx % (spectrumData.length / 2)) / 2);
          const y = Math.floor((idx / (spectrumData.length / 2)) / 2);
          const idxSpectrum = y * Math.sqrt(spectrumData.length) + x;
          audioIntensity = spectrumData[idxSpectrum % spectrumData.length];
        }

        const direction = new THREE.Vector3(...position).normalize();
        const speed = 0.4;

        const offset = audioIntensity / 255;
        const movement = [
          (initialPosition[0] + initialPosition[0] * offset - position[0]) * .8,
          (initialPosition[1] + initialPosition[1] * offset - position[1]) * .8,
          (initialPosition[2] + initialPosition[2] * offset - position[2]) * .8  
        ];

        switch (animationStateRef.current) {
          case ANIMATION_STATE.OUT:
            particle.position = [
              position[0] + direction.x * speed,
              position[1] + direction.y * speed,
              position[2] + direction.z * speed,
            ];
            break;
          case ANIMATION_STATE.IN:
          case ANIMATION_STATE.IDLE:
            particle.position = [
              position[0] + movement[0],
              position[1] + movement[1],
              position[2] + movement[2]
            ];
            break;
          default:
            console.warn(`Unexpected animation state: ${animationStateRef.current}`);
            break;
        }
      });

      const allOutOfFrame = particlesRef.current.every(particle => {
        const distanceToOrigin = new THREE.Vector3(...particle.position).length();
        return distanceToOrigin >= THRESHOLD_DISTANCE_OUT;
      });

      const allInFrame = particlesRef.current.every(particle => {
        const distanceToOrigin = new THREE.Vector3(...particle.position).length();
        return distanceToOrigin <= THRESHOLD_DISTANCE_IN;
      });

      if (animationStateRef.current === ANIMATION_STATE.OUT && allOutOfFrame) {
        animationStateRef.current = ANIMATION_STATE.IN;
      } else if (animationStateRef.current === ANIMATION_STATE.IN && allInFrame) {
        animationStateRef.current = ANIMATION_STATE.IDLE;
      }
    }
  });

  return particlesRef.current || particles;
};

export default useAnimatedParticles;
