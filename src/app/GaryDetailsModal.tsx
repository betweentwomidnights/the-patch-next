'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Info, X } from 'lucide-react';
import { Button } from './components/ui/button';
import { cn } from './lib/utils';

interface GaryDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGaryPageClick: () => void;
}

const gumroadUrl = 'https://thepatch.gumroad.com/l/gary4juce';

const modelLinks = [
  {
    key: 'musicgen',
    name: 'gary',
    source: 'musicgen',
    href: 'https://github.com/facebookresearch/audiocraft',
    copy: 'continues your audio in unexpected directions',
  },
  {
    key: 'saos',
    name: 'jerry',
    source: 'stable audio open small',
    href: 'https://huggingface.co/stabilityai/stable-audio-open-small',
    copy: 'BPM-aware loops in under a second',
  },
  {
    key: 'stable-audio-3',
    name: 'stable-audio-3',
    source: 'stable audio 3',
    href: 'https://github.com/stability-ai/stable-audio-3',
    copy: 'higher fidelity text-guided generation and remixing',
  },
  {
    key: 'foundation-1',
    name: 'rc-jerry',
    source: 'foundation-1',
    href: 'https://huggingface.co/RoyalCities/Foundation-1',
    copy: 'structured synth, bass, and keys loops',
  },
  {
    key: 'ace-step',
    name: 'carey',
    source: 'ace-step 1.5',
    href: 'https://github.com/ace-step/Ace-step-1.5',
    copy: 'vocals, stems, continuation, and remix',
  },
  {
    key: 'melodyflow',
    name: 'terry',
    source: 'melodyflow',
    href: 'https://huggingface.co/spaces/facebook/Melodyflow',
    copy: 'transforms anything with style presets or a prompt',
  },
  {
    key: 'magenta-rt',
    name: 'darius',
    source: 'magenta-realtime',
    href: 'https://github.com/magenta/magenta-realtime',
    copy: '48kHz stereo continuations with style steering',
  },
];

const demos = [
  {
    title: 'foundation, musicgen, ace-step',
    subtitle: 'structured loop into continuation and remix territory',
    src: '/gary4juce_demos/gary4juce_demo_1.mp4',
    poster: '/gary4juce_demos/gary4juce_demo_1_poster.jpg',
    modelKeys: ['foundation-1', 'musicgen', 'ace-step'],
  },
  {
    title: 'foundation, stable audio, ace-step',
    subtitle: 'jerry-family loop generation feeding carey',
    src: '/gary4juce_demos/gary4juce_demo_2.mp4',
    poster: '/gary4juce_demos/gary4juce_demo_2_poster.jpg',
    modelKeys: ['foundation-1', 'saos', 'ace-step'],
  },
  {
    title: 'human input, ace-step, turbo',
    subtitle: 'multiple carey passes from the same human seed',
    src: '/gary4juce_demos/gary4juce_demo_3.mp4',
    poster: '/gary4juce_demos/gary4juce_demo_3_poster.jpg',
    modelKeys: ['ace-step'],
  },
  {
    title: 'human input, melodyflow, ace-step',
    subtitle: 'terry transformation into carey remix',
    src: '/gary4juce_demos/gary4juce_demo_4.mp4',
    poster: '/gary4juce_demos/gary4juce_demo_4_poster.jpg',
    modelKeys: ['melodyflow', 'ace-step'],
  },
  {
    title: 'human input, musicgen, ace-step',
    subtitle: 'gary continuation into carey finishing pass',
    src: '/gary4juce_demos/gary4juce_demo_5.mp4',
    poster: '/gary4juce_demos/gary4juce_demo_5_poster.jpg',
    modelKeys: ['musicgen', 'ace-step'],
  },
];

const GaryDetailsModal: React.FC<GaryDetailsModalProps> = ({
  isOpen,
  onClose,
  onGaryPageClick,
}) => {
  const [currentDemoIndex, setCurrentDemoIndex] = useState(0);
  const [showMobileModels, setShowMobileModels] = useState(false);
  const modelsSectionRef = useRef<HTMLDivElement>(null);
  const currentDemo = demos[currentDemoIndex];

  const activeModels = useMemo(
    () => modelLinks.filter((model) => currentDemo.modelKeys.includes(model.key)),
    [currentDemo]
  );

  useEffect(() => {
    if (isOpen) {
      setCurrentDemoIndex(Math.floor(Math.random() * demos.length));
      setShowMobileModels(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrevious = () => {
    setCurrentDemoIndex((index) => (index - 1 + demos.length) % demos.length);
  };

  const handleNext = () => {
    setCurrentDemoIndex((index) => (index + 1) % demos.length);
  };

  const handleModelsClick = () => {
    const shouldOpen = !showMobileModels;

    setShowMobileModels(shouldOpen);

    if (shouldOpen) {
      window.setTimeout(() => {
        modelsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 0);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-stretch justify-center bg-black/80 p-0 backdrop-blur-md sm:items-center sm:p-5"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="gary details and demos"
        className="relative flex h-[100dvh] max-h-[100dvh] min-h-0 w-full max-w-5xl flex-col overflow-hidden rounded-none border-0 bg-black/95 shadow-[0_0_32px_rgba(255,255,255,0.14)] sm:h-auto sm:max-h-[96vh] sm:rounded-lg sm:border sm:border-white/20"
        onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-black/90 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur-md sm:px-5 sm:py-3">
            <div>
              <p className="text-sm font-medium text-gray-300">gary4juce v4</p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={gumroadUrl}
              target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-all duration-200 hover:scale-105 hover:shadow-[0_0_15px_rgba(255,255,255,0.35)]"
              >
                download
              </a>
            <button
              type="button"
              aria-label="close gary details"
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/50 bg-white/10 text-white shadow-[0_0_14px_rgba(255,255,255,0.18)] transition-colors hover:bg-white hover:text-black sm:h-9 sm:w-9 sm:border-white/25 sm:bg-transparent sm:shadow-none"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:p-5 sm:pb-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="min-w-0">
            <div className="overflow-hidden rounded-lg border border-white/15 bg-black">
              <video
                key={currentDemo.src}
                className="aspect-square w-full bg-black object-cover"
                controls
                playsInline
                preload="metadata"
                poster={currentDemo.poster}
              >
                <source src={currentDemo.src} type="video/mp4" />
              </video>
            </div>

            <div className="mt-3 flex justify-center sm:justify-end">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full border border-white/20 bg-white/5 hover:bg-white hover:text-black"
                  onClick={handlePrevious}
                  aria-label="previous demo"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="flex min-w-20 items-center justify-center text-xs text-gray-300 sm:hidden">
                  <span>
                    demo {currentDemoIndex + 1} / {demos.length}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full border border-white/20 bg-white/5 hover:bg-white hover:text-black"
                  onClick={handleNext}
                  aria-label="next demo"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="mt-4 hidden gap-2 sm:grid sm:grid-cols-5">
              {demos.map((demo, index) => (
                <button
                  key={demo.src}
                  type="button"
                  onClick={() => setCurrentDemoIndex(index)}
                  className={cn(
                    'min-w-[72px] rounded-lg border px-2.5 py-2 text-center text-xs transition-colors sm:min-w-0',
                    index === currentDemoIndex
                      ? 'border-white bg-white text-black'
                      : 'border-white/15 bg-white/5 text-gray-300 hover:border-white/50'
                  )}
                >
                  <span className="block font-medium">demo {index + 1}</span>
                </button>
              ))}
            </div>
          </section>

          <aside className="min-w-0 space-y-5">
            <div ref={modelsSectionRef} className="scroll-mt-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-white">models in this demo</h3>
                <button
                  type="button"
                  aria-label="toggle models in this demo"
                  aria-expanded={showMobileModels}
                  onClick={handleModelsClick}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white sm:hidden"
                >
                  <Info className="h-4 w-4" />
                </button>
              </div>
              <div className={cn('mt-3 space-y-2', showMobileModels ? 'block' : 'hidden sm:block')}>
                {activeModels.map((model) => (
                  <a
                    key={model.key}
                    href={model.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg border border-white/15 bg-white/5 p-3 text-sm text-gray-300 transition-colors hover:border-white/45 hover:text-white"
                  >
                    <span className="block font-medium text-white">{model.name}</span>
                    <span className="block text-xs text-blue-300 underline underline-offset-2">{model.source}</span>
                    <span className="mt-1 block text-xs text-gray-400">{model.copy}</span>
                  </a>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onGaryPageClick();
                }}
                className="text-sm text-blue-300 underline underline-offset-2 hover:text-blue-200"
              >
                more about gary
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default GaryDetailsModal;
