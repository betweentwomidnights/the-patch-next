import React, { useState, useEffect } from 'react';
import Joyride, { STATUS, Step, CallBackProps } from 'react-joyride';

interface IntroProps {
  run: boolean;
  steps: Step[];
  setRun: React.Dispatch<React.SetStateAction<boolean>>;
  isPlayPauseClicked: boolean;
  isChangeImageClicked: boolean;
  isSwitchStreamClicked: boolean;
}

function Intro({ steps, run, setRun, isPlayPauseClicked, isChangeImageClicked, isSwitchStreamClicked }: IntroProps) {
    const [index, setIndex] = useState(0); 
  
    useEffect(() => {
      setRun(true);
    }, [setRun]);
  
    useEffect(() => {
      if (index === 0 && isPlayPauseClicked) {
        setIndex(prevIndex => prevIndex + 1);
      }
      if (index === 1 && isChangeImageClicked) {
        setIndex(prevIndex => prevIndex + 1);
      }
      if (index === 2 && isSwitchStreamClicked) {
        setIndex(prevIndex => prevIndex + 1);
      }
    }, [index, isPlayPauseClicked, isChangeImageClicked, isSwitchStreamClicked]);
  
    const callback = (data: CallBackProps) => {
      const { status } = data;
    
      if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
        setRun(false);
      }
    }
  
    return (
      <Joyride 
        callback={callback} 
        steps={steps} 
        run={run}
        stepIndex={index}
        continuous={false}
        showSkipButton={false}
        showProgress={false}
        hideBackButton={true}
        spotlightClicks={false}
        hideCloseButton={true}
        styles={{
    options: {
      primaryColor: '#ffffff', // This changes the color of the beacon and the border of the tooltip
      spotlightShadow: '0 0 0px rgba(255, 255, 255, 0.5)', // This changes the spotlight shadow color
      zIndex: 9999,
    },
    tooltip: {
      backgroundColor: 'black', // Set the background color of the tooltip
      borderRadius: '10px', // Round the edges of the tooltip
      color: 'white', // Set the text color in the tooltip
      textAlign: 'center', // Center align the text in the tooltip
    },
    tooltipContainer: {
      textAlign: 'center', // Center align the text in the tooltip container
    },
    buttonClose: {
      display: 'none', // Hide the close button in the tooltip
    },
    buttonBack: {
      display: 'none', // Hide the back button in the tooltip
    },
    buttonNext: {
      backgroundColor: 'white', // Set the background color of the next button
      color: 'black', // Set the text color of the next button
    },
    buttonSkip: {
      color: 'white', // Set the color of the skip button text
    },
       }}
      />
    );
      }
  
  export default Intro;