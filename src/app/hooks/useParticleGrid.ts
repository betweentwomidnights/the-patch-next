import { useMemo } from 'react';

interface Particle {
  position: number[];
  initialPosition: number[];
  uv: number[];
}

interface UseParticleGridProps {
  gridCount: number;
}

const useParticleGrid = ({ gridCount }: UseParticleGridProps): Particle[] => {
  return useMemo(() => {
    const particles: Particle[] = [];
    for (let i = 0; i < gridCount; i++) {
      for (let j = 0; j < gridCount; j++) {
        const x = (i / (gridCount - 1)) - 0.5;
        const y = (j / (gridCount - 1)) - 0.5;
        const u = i / (gridCount - 1);
        const v = j / (gridCount - 1);
        const position = [x, y, 0];
        particles.push({ position, initialPosition: [...position], uv: [u, v] });
      }
    }
    return particles;
  }, [gridCount]);
}

export default useParticleGrid;
