'use client';

import React, { useState } from 'react';

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WaitlistModal: React.FC<WaitlistModalProps> = ({ isOpen, onClose }) => {
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, firstName }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage('thanks homie. expect an email shortly with the deets.');
        setEmail('');
        setFirstName('');
      } else {
        setStatus('error');
        setMessage(data.message || 'Something went wrong');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Failed to join waitlist');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 p-6 rounded-lg max-w-md w-full relative border border-gray-700">
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          ×
        </button>

        {status === 'success' ? (
          <div className="text-center">
            <p className="text-green-400 mb-4">{message}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white text-black rounded hover:bg-gray-200"
            >
              ok
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-xl mb-4 text-center text-white">
              sign up to be one of the first ppl to use gary4beatbox android. we testing right now.
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="first name"
                  className="w-full px-4 py-2 rounded bg-gray-800 border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-white"
                  disabled={status === 'loading'}
                />
              </div>
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email"
                  className="w-full px-4 py-2 rounded bg-gray-800 border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-white"
                  disabled={status === 'loading'}
                />
              </div>
              <button
                type="submit"
                disabled={status === 'loading'}
                className={`w-full px-4 py-2 rounded ${
                  status === 'loading'
                    ? 'bg-gray-600'
                    : 'bg-white text-black hover:bg-gray-200'
                }`}
              >
                {status === 'loading' ? 'joining...' : 'join waitlist'}
              </button>
              {message && status === 'error' && (
                <p className="text-red-400 text-sm text-center">{message}</p>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default WaitlistModal;