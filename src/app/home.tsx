// src/app/home.tsx
'use client'; // This line marks this file as a Client Component

import React, { useState, useRef, useEffect, useTransition } from 'react';
import useImageAndTextureLoader from './hooks/useImageAndTextureLoader'; 
import ParticlesImage from './components/Particles';
import ChangeImageButton from './components/ChangeImageButton';



const imageUrls = [
  '/astrokitty.webp',
  '/geopat4.webp',
  '/geopat3.webp',
  '/geopat2.webp',
  '/kavinsky1.webp',
  '/kavisnky2.webp',
  '/kavisnky3.webp',
  '/kavisnky4.webp',
  '/kavisnky5.webp',
  '/mom1.webp',
  '/mom2.webp',
  '/mom3.webp',
  '/mom4.webp',
  '/mom5.webp',
  '/mom6.webp',
  '/skellington.webp',
  '/b2mcoverspotify.webp',
];

function getRandomImageUrl(currentImageUrl: string | null): string {
  let newImageUrl: string;
  do {
    const randomIndex = Math.floor(Math.random() * imageUrls.length);
    newImageUrl = imageUrls[randomIndex];
  } while (newImageUrl === currentImageUrl);

  return newImageUrl;
}

interface HomeProps {
    spectrumData: Uint8Array;
    isChangeImageClicked: boolean;
    setIsChangeImageClicked: React.Dispatch<React.SetStateAction<boolean>>;
  }
  
  const Home: React.FC<HomeProps> = ({ spectrumData, isChangeImageClicked, setIsChangeImageClicked }) => {

  const [imageUrl, setImageUrl] = useState<string>(getRandomImageUrl(null));
  const [image, texture, fallbackTexture, isLoadingImage] = useImageAndTextureLoader({ imagePath: imageUrl });

  const [isPending, startTransition] = useTransition();
  const [isTransitioningOut, setIsTransitioningOut] = useState<boolean>(false);

  const changeImage = () => {
    setIsTransitioningOut(true);
  
    setTimeout(() => {
      startTransition(() => {
        setImageUrl(prevImageUrl => getRandomImageUrl(prevImageUrl));
      });
    }, 100);
  };
  
  useEffect(() => {
    if (!isPending) {
      setIsTransitioningOut(false);
    }
  }, [isPending]);

  useEffect(() => {
    const intervalId = setInterval(changeImage, 60000); 
    return () => clearInterval(intervalId);
  }, []);


  
  

  return (
      <div className="Home">
        
      <ChangeImageButton 
  onChangeImage={() => {
    changeImage(); 
    setIsChangeImageClicked(true);
  }} 
/>
        <ParticlesImage 
          key={imageUrl} 
          canvasClassName="particles-image"
          texture={texture} 
          fallbackTexture={fallbackTexture} 
          spectrumData={spectrumData} 
          gridCount={50}
          isLoadingImage={isLoadingImage}
          isTransitioningOut={isTransitioningOut}
          setIsTransitioningOut={setIsTransitioningOut}
          isPending={isPending}
        />
      </div>
  );
}

export default Home;
