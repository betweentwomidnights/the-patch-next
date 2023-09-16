import { ShaderMaterial, Texture, Vector2 } from 'three';
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
  fragmentShader,
}: UseShaderMaterialProps) => {
  const textureRef = useRef(texture);

  const material = new ShaderMaterial({
    uniforms: {
      map: { value: fallbackTexture },
      uvOffset: { value: new Vector2(0, 0) },  // Default values; can be modified as needed
      uvScale: { value: new Vector2(1, 1) },  // Default values; can be modified as needed
    },
    vertexShader,
    fragmentShader,
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
      uvOffset: { value: new Vector2(0, 0) }, // Ensure we return uvOffset
      uvScale: { value: new Vector2(1, 1) },  // Ensure we return uvScale
    },
    vertexShader,
    fragmentShader,
  };
};

export default useShaderMaterial;
