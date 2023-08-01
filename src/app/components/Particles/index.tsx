import { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, extend, useThree, Vector3 } from '@react-three/fiber';
import { Raycaster } from 'three';
import * as THREE from 'three';
import useShaderMaterial from '../../hooks/useShaderMaterial';
import useParticleGrid from '../../hooks/useParticleGrid';
import useAnimatedParticles from '../../hooks/useAnimatedParticles';

// Add Raycaster to the three-fiber hook library
extend({ Raycaster });



const vertexShader = `
uniform vec2 uvOffset;
uniform vec2 uvScale;
uniform vec3 mousePosition; // add mousePosition uniform
varying vec2 vUv;

void main() {
  vUv = uv * uvScale + uvOffset;

  // calculate the displacement based on the distance to mouse position
  float distanceToMouse = distance(position, mousePosition);
  float displacement = sin(distanceToMouse * 10.0) * 0.1; // adjust the multiplier for different displacement intensity

  // add the displacement to the position
  vec3 displacedPosition = position + normalize(position - mousePosition) * displacement * 1.0; // Increase the displacement by multiplying it by a larger number

  gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
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
  const meshRefs = useRef<THREE.Mesh[]>([]);
  const [hoveredMesh, setHoveredMesh] = useState<THREE.Mesh | null>(null);
  const { raycaster, mouse, camera } = useThree();
  
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
      if (shaderMaterial && shaderMaterial.uniforms.map.value !== texture) {
        shaderMaterial.uniforms.map.value = texture;
      }
    }, [texture, shaderMaterial]);
  
    useFrame(() => {
      if (groupRef.current && spectrumData && shaderMaterial?.uniforms?.map?.value) {
        // Calculate the average intensity
        const averageIntensity = spectrumData.reduce((sum, intensity) => sum + intensity, 0) / spectrumData.length;
        const scaledIntensity = averageIntensity / 255;
    
        groupRef.current.scale.set(1 + scaledIntensity, 1 + scaledIntensity, 1 + scaledIntensity);
        
        // Raycast checking
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(meshRefs.current);
        if (intersects.length > 0) {
          setHoveredMesh(intersects[0].object as THREE.Mesh);
        } else {
          setHoveredMesh(null);
        }
      } 
    });

    useEffect(() => {
      if (hoveredMesh) {
        const rotationSpeed = 0.05; // Adjust this value to control the speed of rotation
        const mousePosition = new THREE.Vector3(mouse.x, mouse.y, 0);
        const meshPosition = new THREE.Vector3().setFromMatrixPosition(hoveredMesh.matrixWorld);
        const distanceToMouse = meshPosition.distanceTo(mousePosition);
        //const rotationAmount = rotationSpeed / distanceToMouse; // Objects closer to the mouse will rotate faster
    
        // Apply rotation
        //hoveredMesh.rotation.y += rotationAmount;
        camera.position.x += (mouse.x - camera.position.x) * 0.05;
        camera.position.y += (-mouse.y - camera.position.y) * 0.05;
        camera.lookAt(new THREE.Vector3(0, 0, 0));
        // Apply additional rotation here
        camera.rotation.z += Math.PI / 2;
      }
    }, [hoveredMesh, mouse, camera]);


  
    return (
      <group ref={groupRef} position={[0, 0, 0]}>
        {animatedParticles.map((particle, idx) => {
          const uvOffset = [idx % gridCount / gridCount, 1 - (Math.floor(idx / gridCount) + 1) / gridCount];
          const uvScale = [1 / gridCount, 1 / gridCount];
          return (
            <mesh key={idx} position={particle.position as [number, number, number]} ref={(ref) => ref && (meshRefs.current[idx] = ref)}>
              <planeGeometry attach="geometry" args={[1 / (gridCount - 1), 1 / (gridCount - 1)]} />
              <shaderMaterial
                attach="material"
                uniforms={{ ...shaderMaterial.uniforms, uvOffset: { value: new THREE.Vector2(...uvOffset) }, uvScale: { value: new THREE.Vector2(...uvScale) } }}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                transparent={true}
                blending={THREE.NormalBlending}
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
        rotation: [0, 0, Math.PI / 2],
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