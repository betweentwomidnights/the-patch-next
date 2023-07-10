// useImageAndTextureLoader.ts
import { useState, useEffect } from 'react';
import { useLoader } from '@react-three/fiber';
import { Texture, TextureLoader } from 'three';

interface useImageAndTextureLoaderProps {
  imagePath: string;
}

const useImageAndTextureLoader = ({
  imagePath
}: useImageAndTextureLoaderProps): [HTMLImageElement | null, Texture, Texture, boolean] => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState<boolean>(true);
  const texture = useLoader(TextureLoader, imagePath);
  const fallbackTexture = useLoader(TextureLoader, '/fallback.png');

  useEffect(() => {
    const img = new Image();
    img.src = imagePath;

    img.onload = () => {
      setImage(img);
      setIsLoadingImage(false);
    };

    img.onerror = (event, message, error) => {
        console.log('Error loading image:', message);
        setError(new Error(message));
      };
  }, [imagePath]);

  useEffect(() => {
    if (texture) {
      console.log('Texture loaded:', texture);
    }
  }, [texture]);

  if (error) {
    console.log('Error:', error);
    return [null, fallbackTexture, fallbackTexture, false];
  }

  return [image, texture, fallbackTexture, isLoadingImage];
};

export default useImageAndTextureLoader;
