import { ShaderMaterial, Texture, Vector2, Vector3 } from 'three';
import { extend, useThree, useFrame } from '@react-three/fiber';
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
  const mouse = useThree((state) => state.mouse); // get mouse from three-fiber
  const materialRef = useRef<any>();

  extend({
    ShaderMaterial: class extends ShaderMaterial {
      constructor() {
        super({
          uniforms: {
            map: { value: fallbackTexture },
            uvOffset: { value: new Vector2(0, 0) },
            uvScale: { value: new Vector2(1, 1) },
            mousePosition: { value: new Vector3(mouse.x, mouse.y, 0) }, // new uniform for mouse position
          },
          vertexShader,
          fragmentShader,
        });
      }
    },
  });

  // Create an instance of ShaderMaterial and keep reference to it
  materialRef.current = new ShaderMaterial({
    uniforms: {
      map: { value: fallbackTexture },
      uvOffset: { value: new Vector2(0, 0) },
      uvScale: { value: new Vector2(1, 1) },
      mousePosition: { value: new Vector3(mouse.x, mouse.y, 0) },
    },
    vertexShader,
    fragmentShader,
  });

  useFrame(() => {
    // Update mousePosition uniform on each frame
    materialRef.current.uniforms.mousePosition.value.set(mouse.x, mouse.y, 0);
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
      mousePosition: { value: new Vector3(mouse.x, mouse.y, 0) }, // return mousePosition uniform
    },
    vertexShader,
    fragmentShader,
  };
};

export default useShaderMaterial;