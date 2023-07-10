// src/app/R3F/page.tsx
'use client'; // This line marks this file as a Client Component

import React, { useState, useRef, useEffect, useTransition } from 'react';
import useImageAndTextureLoader from './hooks/useImageAndTextureLoader'; 
import ParticlesImage from './components/Particles';
import ChangeImageButton from './components/ChangeImageButton';



const imageUrls = [
  '/b2mcoverspotify.png', 
  '/skellington.png', 
  '/escalator.png', 
  '/escalator2.png', 
  '/mom3.png', 
  '/mom4.png', 
  '/geopat1.jpg', 
  '/geopat2.jpg', 
  '/geopat3.jpg', 
  '/geopat4.jpg', 
  '/watch1.jpg',
  '/watch2.jpg',
  '/mom20.jpg',
  '/mom21.jpg',
  '/mom22.jpg',
  '/mom23.jpg',
  '/mom24.jpg',
  '/mom25.jpg',
  '/mom26.jpg',
  '/mom27.jpg',
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
    }, 500);
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
          gridCount={40}
          isLoadingImage={isLoadingImage}
          isTransitioningOut={isTransitioningOut}
          setIsTransitioningOut={setIsTransitioningOut}
          isPending={isPending}
        />
      </div>
  );
}

export default Home;
