import React, { useState, useEffect, FormEvent } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: string;
  setModel: (model: string) => void;
  promptLength: string;
  setPromptLength: (length: string) => void;
  duration: string;
  setDuration: (duration: string) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  model,
  setModel,
  promptLength,
  setPromptLength,
  duration,
  setDuration,
}) => {
  const [isDurationValid, setIsDurationValid] = useState(true);

  const processDuration = (input: string): string => {
    const singleNumber = parseInt(input, 10);
    if (!isNaN(singleNumber)) {
      let start = singleNumber;
      let end = singleNumber + 1;

      start = Math.max(1, start);

      if (end > 30) {
        end = 30;
        start = Math.max(1, end - 1);
      }

      return `${start}-${end}`;
    }
    return input;
  };

  const validateAndFormatDuration = (duration: string): string | null => {
    const processedDuration = processDuration(duration);
    const regex = /^(\d+)-(\d+)$/;
    const match = processedDuration.match(regex);
    if (match) {
      const start = parseInt(match[1], 10);
      const end = parseInt(match[2], 10);
      return start < end && end <= 30 ? processedDuration : null;
    }
    return null;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const validDuration = validateAndFormatDuration(duration);
    if (validDuration) {
      setIsDurationValid(true);
      setDuration(validDuration);
      localStorage.setItem('model', model);
      localStorage.setItem('promptLength', promptLength);
      localStorage.setItem('duration', validDuration);
      onClose();
    } else {
      setIsDurationValid(false);
    }
  };

  useEffect(() => {
    const savedModel = localStorage.getItem('model');
    const savedPromptLength = localStorage.getItem('promptLength');
    const savedDuration = localStorage.getItem('duration');
    if (savedModel) setModel(savedModel);
    if (savedPromptLength) setPromptLength(savedPromptLength);
    if (savedDuration) setDuration(savedDuration);
  }, [setModel, setPromptLength, setDuration]);

  const modelMapping = [
    { value: 'facebook/musicgen-small', label: 'facebook/musicgen-small' },
    //{ value: 'facebook/musicgen-melody', label: 'facebook/musicgen-melody' },
    //{ value: 'facebook/musicgen-medium', label: 'facebook/musicgen-medium' },
    //{ value: 'facebook/musicgen-large', label: 'facebook/musicgen-large' },
    { value: 'thepatch/vanya_ai_dnb_0.1', label: 'vanya_aidnb_0.1' },
    //{ value: 'thepatch/hoenn_lofi', label: 'hoenn_lofi' },
    //{ value: 'thepatch/budots_remix', label: 'budots_remix' },
    //{ value: 'thepatch/PhonkV2', label: 'PhonkV2' },
    //{ value: 'thepatch/bleeps-medium', label: 'bleeps-medium' },
  ];

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setModel(e.target.value);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div style={modalOverlayStyles}>
      <div style={modalStyles}>
        <h2>Select the model, prompt length, and duration</h2>
        <form onSubmit={handleSubmit}>
          <div style={formControlStyles}>
            <label>Model</label>
            <select value={model} onChange={handleModelChange} style={inputStyles}>
              {modelMapping.map((option, index) => (
                <option key={index} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div style={formControlStyles}>
            <label>Prompt Length (seconds)</label>
            <input
              type="number"
              value={promptLength}
              onChange={(e) => setPromptLength(e.target.value)}
              style={inputStyles}
            />
          </div>

          <div style={formControlStyles}>
            <label>Duration Range (seconds)</label>
            <input
              type="text"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              style={inputStyles}
            />
            {!isDurationValid && (
              <span style={errorStyles}>
                Use a valid duration range like 16-18 or a single number under 30 sec.
              </span>
            )}
          </div>

          <button type="submit" style={buttonStyles}>
            Save Settings
          </button>
          <button type="button" onClick={onClose} style={buttonStyles}>
            Close
          </button>
        </form>
      </div>
    </div>
  );
};

const modalOverlayStyles: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  justifyContent: 'flex-start', // Align to top-left
  alignItems: 'flex-start', // Align to top-left
  zIndex: 1000,
};

const modalStyles: React.CSSProperties = {
  backgroundColor: '#000', // Black background
  color: '#fff', // White text
  padding: '20px',
  borderRadius: '8px',
  maxWidth: '500px',
  width: '100%',
  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
  marginTop: '20px', // Add some margin from top
  marginLeft: '20px', // Add some margin from left
};

const formControlStyles: React.CSSProperties = {
  marginBottom: '10px',
};

const inputStyles: React.CSSProperties = {
  width: '100%',
  padding: '8px',
  borderRadius: '4px',
  border: '1px solid #ccc',
  fontSize: '16px',
  backgroundColor: '#000', // Black background
  color: '#fff', // White text
};

const errorStyles: React.CSSProperties = {
  color: 'red',
  fontSize: '14px',
  marginTop: '5px',
};

const buttonStyles: React.CSSProperties = {
  padding: '10px 20px',
  margin: '5px',
  backgroundColor: '#000',
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
  borderRadius: '4px',
};

export default SettingsModal;
