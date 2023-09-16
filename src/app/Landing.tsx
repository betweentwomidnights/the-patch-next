// Landing.tsx

import React from 'react';

interface LandingProps {
  onDashboardClick: () => void;
}

const Landing: React.FC<LandingProps> = ({ onDashboardClick }) => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-black text-white">
      <h1 className="text-4xl mb-4">The infinite collab. you down?</h1>
      <p className="mb-8 text-center max-w-lg">
   it&apos;s like a radio station. or a procedurally generated concept album. it&apos;s a place where artists come together with robots and make cool shit. If you&apos;re down, hit us up. maybe you make beats and wanna collab with gary. perhaps you got perlin noise and custom shaders for r3f scenes that go on forever. maybe you got jokes. submit below and hear back in a week. we&apos;ll get ya patched in.
</p>


      <button 
        className="mb-8 bg-transparent border-2 border-white text-white py-2 px-6 rounded-full hover:bg-white hover:text-black transition-all duration-300 transform hover:scale-105"
        onClick={() => window.open('https://www.youtube.com/channel/UCmDU9oCSFwbNokxM1Wi_FWA?sub_confirmation=1', '_blank')}
      >
        subscribe to youtube
      </button>

      <div className="flex space-x-4">
        <button 
          className="bg-transparent border-2 border-white text-white py-2 px-6 rounded-full hover:bg-white hover:text-black transition-all duration-300 transform hover:scale-105"
          onClick={onDashboardClick}
        >
          enter
        </button>
        <button 
          className="bg-transparent border-2 border-white text-white py-2 px-6 rounded-full hover:bg-white hover:text-black transition-all duration-300 transform hover:scale-105"
          onClick={() => window.open('https://noteforms.com/forms/show-or-send-us-a-lil-somethin-f7gf0x', '_blank')}
        >
          submit
        </button>
      </div>
    </div>
  );
}

export default Landing;
