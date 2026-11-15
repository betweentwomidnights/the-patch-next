// The software catalog. Desktop downloads come from GitHub releases
// (see ./github.ts); mobile apps link to their stores. Desktop prices live
// in Stripe, found by `stripeLookupKey`.

export interface ReleaseChannel {
  /** Heading shown above this channel's downloads, e.g. "windows". */
  label: string;
  /** GitHub repo under betweentwomidnights. */
  repo: string;
  /** Only releases whose tag matches are considered. */
  tag: RegExp;
  /** Allow prereleases (e.g. the ROCm builds). Stable channels leave this off. */
  prerelease?: boolean;
  note?: string;
}

export interface AssetRule {
  match: RegExp;
  label: string;
  hint?: string;
}

export interface Product {
  slug: string;
  name: string;
  tagline: string;
  /** Paragraphs for the product page. */
  about: string[];
  media?: { video?: string; poster?: string; image?: string; alt: string; square?: boolean };
  /** Store-managed apps can provide their version and store destinations. */
  version?: string;
  stores?: { label: string; href: string }[];
  channels: ReleaseChannel[];
  /** Ordered: the first rule an asset matches gives its label and its position. */
  assets: AssetRule[];
  /** Stripe Price lookup key for pay-what-you-want. Free products omit it. */
  stripeLookupKey?: string;
  warning?: string;
  related?: { slug: string; why: string }[];
  experimental?: boolean;
}

const GITHUB = 'https://github.com/betweentwomidnights';
export const repoUrl = (repo: string) => `${GITHUB}/${repo}`;

/** Asset files that are never offered as downloads. */
export const HIDDEN_ASSET = /\.sig$|^SHA256SUMS/i;

const gpuHint = {
  cuda: 'nvidia only',
  vulkan: 'any gpu (nvidia, amd, intel)',
  metal: 'apple silicon',
};

export const products: Product[] = [
  {
    slug: 'gary4juce',
    name: 'gary4juce',
    tagline: 'a bunch of open source ai music models in the daw',
    about: [
      'a VST3/AU plugin for musicians who want ai to meet them where they actually live. put it on your master, press play, record some audio, and start iterating.',
      'transform, extend, accompany, or make entirely new samples that fit the track you are already working on. use the remote backend, or run the models on your own machine with gary4local.',
      'gary4juce is open source and the releases are public on github. paying what you want here is how this keeps going.',
    ],
    media: {
      video: '/gary4juce_v4_landing.mp4',
      poster: '/gary4juce_v4_landing_poster.jpg',
      alt: 'gary4juce running inside a DAW',
    },
    channels: [
      { label: 'windows', repo: 'gary4juce', tag: /^v\d+\.\d+\.\d+$/ },
      { label: 'macOS', repo: 'gary4juce', tag: /^v\d+\.\d+\.\d+-mac$/ },
    ],
    assets: [
      { match: /win-vst3/i, label: 'VST3' },
      { match: /win-standalone/i, label: 'standalone' },
      { match: /mac-VST3/i, label: 'VST3' },
      { match: /mac-AU/i, label: 'AU' },
      { match: /mac-STANDALONE/i, label: 'standalone' },
    ],
    stripeLookupKey: 'gary4juce_pwyw',
    related: [{ slug: 'gary4local', why: 'run the models locally instead of on the remote backend' }],
  },
  {
    slug: 'gary4local',
    name: 'gary4local',
    tagline: 'run models and train your own LoRAs locally',
    about: [
      'a control center for running the gary4juce models locally: it installs the runtimes, downloads the models, and keeps the services running while you work.',
      'pair it with gary4juce in your DAW, or use the models from the standalone app.',
      'train your own LoRAs with gary4local, then use them with the matching models in our software.',
    ],
    media: { image: '/gary4local-install-startup.gif', alt: 'gary4local install and startup' },
    channels: [
      { label: 'windows', repo: 'gary-localhost-installer', tag: /^v\d+\.\d+\.\d+$/ },
      {
        label: 'windows · amd radeon (rocm preview)',
        repo: 'gary-localhost-installer',
        tag: /-rocm\.\d+$/,
        prerelease: true,
      },
      {
        label: 'macOS (apple silicon)',
        repo: 'gary-localhost-installer-mac',
        tag: /^v\d+\.\d+\.\d+$/,
        note: 'signed and notarized',
      },
    ],
    assets: [
      { match: /-rocm.*setup\.exe$/i, label: 'installer (rocm)' },
      { match: /setup\.exe$/i, label: 'installer' },
      { match: /mac-arm64\.dmg$/i, label: 'disk image' },
    ],
    warning:
      'the windows installer isn’t code-signed yet, so windows smartscreen will warn you. click “more info”, then “run anyway”. the source is on github if you’d rather build it yourself.',
    related: [{ slug: 'gary4juce', why: 'the plugin it serves' }],
  },
  {
    slug: 'foundation-keys',
    name: 'foundation keys',
    tagline: 'text to playable synth. runs on sa3.cpp.',
    about: [
      'describe a sound (or roll the dice), preview six notes, then build a 48–60 key keyboard you can play. it runs RoyalCities’ Foundation-1.2 keybeds model locally through sa3.cpp.',
      'save kits as FLAC or WAV plus an sfz, or drag single notes straight into your DAW. VST3, CLAP, and standalone.',
    ],
    media: {
      video: '/foundation-keys/foundation-keys-build.mp4',
      poster: '/foundation-keys/foundation-keys-build-poster.jpg',
      alt: 'foundation keys building a playable keyboard from a text prompt',
    },
    channels: [{ label: 'downloads', repo: 'foundation-1.2-iplug2', tag: /^v\d+\.\d+\.\d+$/ }],
    assets: [
      { match: /macos-metal/i, label: 'macOS · metal', hint: gpuHint.metal },
      { match: /win-vulkan-vst3/i, label: 'windows · vulkan · VST3', hint: gpuHint.vulkan },
      { match: /win-vulkan-clap/i, label: 'windows · vulkan · CLAP', hint: gpuHint.vulkan },
      { match: /win-vulkan-standalone/i, label: 'windows · vulkan · standalone', hint: gpuHint.vulkan },
      { match: /win-cuda-vst3/i, label: 'windows · cuda · VST3', hint: gpuHint.cuda },
      { match: /win-cuda-clap/i, label: 'windows · cuda · CLAP', hint: gpuHint.cuda },
      { match: /win-cuda-standalone/i, label: 'windows · cuda · standalone', hint: gpuHint.cuda },
    ],
    experimental: true,
  },
  {
    slug: 'gary4beatbox',
    name: 'gary4beatbox',
    tagline: 'sa3, musicgen, and melodyflow on your phone.',
    about: [
      'make music on your phone with sa3, musicgen, and melodyflow.',
      'v4 is live on android and ios. we’re still iterating.',
    ],
    version: 'v4',
    media: {
      video: '/gary4beatbox/app-preview.mp4',
      poster: '/gary4beatbox/app-preview-poster.jpg',
      alt: 'gary4beatbox v4 on a phone',
      square: true,
    },
    stores: [
      { label: 'download for ios', href: 'https://apps.apple.com/us/app/gary4beatbox/id6736522400' },
      { label: 'get it on google play', href: 'https://play.google.com/store/apps/details?id=com.gary4beatbox' },
    ],
    channels: [],
    assets: [],
  },
  {
    slug: 'sa3-ableton-extension',
    name: 'the sa3 ableton extension',
    tagline: 'stable audio 3 fully embedded inside ableton’s context menu. no external apps. all c++. runs on sa3.cpp.',
    about: [
      'generate, transform, and continue audio directly from an arrangement selection in ableton live.',
      'install the .ablx in the ableton live beta with developer mode off. only one build can be installed at a time.',
    ],
    media: {
      video: '/sa3/ableton-extension.mp4',
      poster: '/sa3/ableton-extension-poster.jpg',
      alt: 'the sa3 ableton extension generating audio from ableton’s context menu',
    },
    channels: [{ label: 'windows', repo: 'sa3-ableton-extension', tag: /^v\d+\.\d+\.\d+$/ }],
    assets: [
      { match: /vulkan\.ablx$/i, label: 'vulkan', hint: gpuHint.vulkan },
      { match: /cuda\.ablx$/i, label: 'cuda', hint: gpuHint.cuda },
    ],
    experimental: true,
  },
  {
    slug: 'sa3-plugin-demo',
    name: 'sa3 iplug2',
    tagline: 'stable audio 3 in VST3, AU, REAPER extension + standalone. no companion app. all c++. runs on sa3.cpp. bring your own LoRAs.',
    about: [
      'stable audio 3 fully embedded in a VST3, AU, REAPER extension, and standalone plugin.',
      'generate, transform, and continue audio in your DAW. import and blend your own LoRAs directly in the plugin.',
    ],
    media: {
      video: '/sa3/reaper-extension.mp4',
      poster: '/sa3/reaper-extension-poster.jpg',
      alt: 'the sa3 REAPER extension generating audio with LoRA blending and automation',
    },
    channels: [{ label: 'downloads', repo: 'sa3.cpp-iplug2-demo', tag: /^v\d+\.\d+\.\d+$/ }],
    assets: [
      { match: /^SA3IPlug2Demo.*macos-metal/i, label: 'plugin · macOS · metal', hint: gpuHint.metal },
      { match: /^SA3IPlug2Demo.*win-vulkan-vst3/i, label: 'plugin · windows · vulkan · VST3', hint: gpuHint.vulkan },
      { match: /^SA3IPlug2Demo.*win-vulkan-standalone/i, label: 'plugin · windows · vulkan · standalone', hint: gpuHint.vulkan },
      { match: /^SA3IPlug2Demo.*win-cuda-vst3/i, label: 'plugin · windows · cuda · VST3', hint: gpuHint.cuda },
      { match: /^SA3IPlug2Demo.*win-cuda-standalone/i, label: 'plugin · windows · cuda · standalone', hint: gpuHint.cuda },
      { match: /^SA3ReaperExtension.*macos-metal/i, label: 'reaper extension · macOS · metal', hint: gpuHint.metal },
      { match: /^SA3ReaperExtension.*win-vulkan/i, label: 'reaper extension · windows · vulkan', hint: gpuHint.vulkan },
      { match: /^SA3ReaperExtension.*win-cuda/i, label: 'reaper extension · windows · cuda', hint: gpuHint.cuda },
    ],
    experimental: true,
  },
];

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}
