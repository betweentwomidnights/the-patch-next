// The models inside gary4juce, in the order the plugin's README lists them.
// Names are the plugin's nicknames; `source` is the open source project behind
// each one. Keep this in step with the gary4juce README.

export interface Model {
  name: string;
  source: string;
  href: string;
  does: string;
}

export const models: Model[] = [
  {
    name: 'yuey',
    source: 'YuE2',
    href: 'https://github.com/multimodal-art-projection/YuE',
    does: 'songs with or without lyrics in your tempo and key, and a score you can drag in as MIDI',
  },
  {
    name: 'sa3',
    source: 'stable-audio-3',
    href: 'https://github.com/stability-ai/stable-audio-3',
    does: 'text-to-audio, loops, transforms, continuations, LoRA blending',
  },
  {
    name: 'gary',
    source: 'musicgen',
    href: 'https://github.com/facebookresearch/audiocraft',
    does: 'the anti-looper. extends your audio in creative directions',
  },
  {
    name: 'jerry',
    source: 'stable-audio-open-small',
    href: 'https://huggingface.co/stabilityai/stable-audio-open-small',
    does: 'BPM-aware 12-second loops in under a second',
  },
  {
    name: 'rc-jerry',
    source: 'foundation-1',
    href: 'https://huggingface.co/RoyalCities/Foundation-1',
    does: 'BPM and key-aware 4/8-bar synth, bass and keys loops',
  },
  {
    name: 'carey',
    source: 'ACE-Step',
    href: 'https://github.com/ace-step/ACE-Step-1.5',
    does: 'stems, continuation, and remix/cover with lyrics',
  },
  {
    name: 'terry',
    source: 'melodyflow',
    href: 'https://huggingface.co/spaces/facebook/melodyflow',
    does: 'audio transformation. turn your guitar into an orchestra',
  },
  {
    name: 'darius',
    source: 'magenta-realtime',
    href: 'https://github.com/magenta/magenta-realtime',
    does: '48 kHz continuations with style control',
  },
];

/** Not a model you prompt, but it ships in the plugin. */
export const stemSeparator: Model = {
  name: 'stem separator',
  source: 'stems.cpp',
  href: 'https://github.com/betweentwomidnights/stems.cpp',
  does: 'splits gary’s output or your recording buffer into stems on your own machine',
};
