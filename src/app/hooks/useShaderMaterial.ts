import { ShaderMaterial, Texture, Vector2 } from 'three';
import { extend } from '@react-three/fiber';
import { useEffect, useRef } from 'react';

interface UseShaderMaterialProps {
  texture: Texture;
  fallbackTexture: Texture;
  vertexShader: string;
  fragmentShader: string;
}

const useShaderMaterial = ({ 
  texture, 
  fallbackTexture, 
  vertexShader, 
  fragmentShader 
}: UseShaderMaterialProps) => {
  const textureRef = useRef(texture);

  extend({
    ShaderMaterial: class extends ShaderMaterial {
      constructor() {
        super({
          uniforms: {
            map: { value: fallbackTexture },
            uvOffset: { value: new Vector2(0, 0) },
            uvScale: { value: new Vector2(1, 1) },
          },
          vertexShader,
          fragmentShader,
        });
      }
    },
  });

  useEffect(() => {
    textureRef.current = texture;

    return () => {
      if (textureRef.current) {
        textureRef.current.dispose();
      }
    };
  }, [texture]);

  return {
    uniforms: {
      map: { value: textureRef.current ? textureRef.current : fallbackTexture },
      uvOffset: { value: new Vector2(0, 0) },
      uvScale: { value: new Vector2(1, 1) },
    },
    vertexShader,
    fragmentShader,
  };
};

export default useShaderMaterial;
