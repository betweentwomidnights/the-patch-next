import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Particle {
  position: number[];
  initialPosition: number[];
  uv: number[];
  restlessness?: number;
  snapBackIntensity?: number;
}

interface AnimatedParticleProps {
  particles: Particle[];
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
  isTransitioningOut: boolean;
  setIsTransitioningOut: React.Dispatch<React.SetStateAction<boolean>>;
  isPending: boolean;
}

const ANIMATION_STATE = {
  OUT: 'OUT',
  IN: 'IN',
  IDLE: 'IDLE'
} as const;

type AnimationState = typeof ANIMATION_STATE[keyof typeof ANIMATION_STATE];

const THRESHOLD_DISTANCE_OUT = 0.7;
const THRESHOLD_DISTANCE_IN = 0.5;
const INITIAL_OUT_STATE: AnimationState = ANIMATION_STATE.OUT;

const useAnimatedParticles = (props: AnimatedParticleProps): Particle[] => {
  const {
    particles,
    spectrumData,
    uniforms,
    isTransitioningOut,
    setIsTransitioningOut
  } = props;

  const particlesRef = useRef<Particle[]>(particles.map(p => ({
    ...p,
    restlessness: p.restlessness || Math.random() * 0.02 - 0.01,
    snapBackIntensity: p.snapBackIntensity || 0.8 + Math.sin(Date.now() * 0.0001) * 0.2
  })));

  const animationStateRef = useRef<AnimationState>(INITIAL_OUT_STATE);

  useEffect(() => {
    if (isTransitioningOut) {
      animationStateRef.current = ANIMATION_STATE.OUT;
    }
  }, [isTransitioningOut]);

  useEffect(() => {
    particlesRef.current = particles.map(p => ({
      ...p,
      restlessness: p.restlessness || Math.random() * 0.02 - 0.01,
      snapBackIntensity: p.snapBackIntensity || 0.8 + Math.sin(Date.now() * 0.0001) * 0.2
    }));
    animationStateRef.current = INITIAL_OUT_STATE;
  }, [particles]);

  useFrame(() => {
    if (particlesRef.current && uniforms) {
      particlesRef.current.forEach((particle, idx) => {
        updateParticlePosition(particle, idx, spectrumData);
      });

      handleAnimationState();
    }
  });

  function updateParticlePosition(particle: Particle, idx: number, spectrumData: Uint8Array | null): void {
    const { initialPosition, position } = particle;
    const distanceFromCenter = new THREE.Vector3(...initialPosition).length();
    const phaseOffset = distanceFromCenter * 5.0;

    const restlessValue = Math.sin(Date.now() * 0.001 + phaseOffset) * 0.02 - 0.01;
    const snapBackValue = 0.8 + Math.sin(Date.now() * 0.0005 + phaseOffset) * 0.2;

    let audioIntensity = 0;

    if (spectrumData) {
      const idxSpectrum = idx % spectrumData.length;
      audioIntensity = spectrumData[idxSpectrum] ** 2 / (255 * 255);
    }

    const offset = audioIntensity;
    const movement = [
      (initialPosition[0] + initialPosition[0] * offset - position[0]) * snapBackValue + restlessValue,
      (initialPosition[1] + initialPosition[1] * offset - position[1]) * snapBackValue + restlessValue,
      (initialPosition[2] + initialPosition[2] * offset - position[2]) * snapBackValue + restlessValue
    ];

    switch (animationStateRef.current) {
      case ANIMATION_STATE.OUT:
        particle.position = [
          position[0] + movement[0] * 0.2,
          position[1] + movement[1] * 0.2,
          position[2] + movement[2] * 0.2,
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
    }
  }

  function handleAnimationState(): void {
    const allOutOfFrame = particlesRef.current.every(particle => {
      return new THREE.Vector3(...particle.position).length() >= THRESHOLD_DISTANCE_OUT;
    });

    const allInFrame = particlesRef.current.every(particle => {
      return new THREE.Vector3(...particle.position).length() <= THRESHOLD_DISTANCE_IN;
    });

    if (animationStateRef.current === ANIMATION_STATE.OUT && allOutOfFrame) {
      animationStateRef.current = ANIMATION_STATE.IN;
    } else if (animationStateRef.current === ANIMATION_STATE.IN && allInFrame) {
      animationStateRef.current = ANIMATION_STATE.IDLE;
      if (setIsTransitioningOut) {
        setIsTransitioningOut(false);
      }
    }
  }

  return particlesRef.current || particles;
};

export default useAnimatedParticles;
