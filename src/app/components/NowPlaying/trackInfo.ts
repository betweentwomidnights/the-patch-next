import { TrackInfo } from '../../types/track';

const trackInfo: Record<string, TrackInfo> = {
  'CCFiles/the_clusterfuck.mp3': {
    displayName: "captains chair s2",
    description: "all the episodes of captains chair season 2 combined into one continuous piece of music. watch all the tracks get made on youtube:",
    youtubePlaylist: "https://youtube.com/playlist?list=PLTgvaF3a9YMhy7q0oTf8av27CIyxCqeWi&si=IHEFQuIJqsmiutBy",
    spotifyLink: "https://open.spotify.com/album/0F8XLjGGxo4ORIg12Rm6OQ?si=cfyp7SIVRvuyBhISqqXxSA"
  },
  'CC_1_Files/captains_chair_10_ableton12.mp3': {
    displayName: "captains chair ep.10",
    description: "from episode 10 of the captains chair. made using gary when he was just a python script.",
    youtubeLink: "https://youtu.be/hKG3sEROqrk?si=ypfyHWRqwpy48EKO",
    colabLink: "https://colab.research.google.com/drive/10CMvuI6DV_VPS0uktbrOB8jBQ7IhgDgL"
  },
  'PoloFiles/ip_1.mp3': {
    displayName: "infinite polo",
    description: "this is a 2 hour remix of a remix of polo g's '21'. the remix is by https://www.youtube.com/@zeuzmakesmusic",
    githubLink: "https://github.com/betweentwomidnights/infinitepolo",
    youtubeLink: "https://youtu.be/nQCibZE14Bo?si=7AW7ef3o4MXFWSoR",
    additionalInfo: "you're listening to a python script that can run forever called infinitepolo:"
  },
  'CC_1_Files/captains_chair_12_ableton12.mp3': {
    displayName: "captains chair s1 ep. 12",
    description: "from episode 12 of the captains chair, season 1. made while gary was still just a python script. warning...these early videos are rly dumb",
    youtubeLink: "https://youtu.be/wCh-ug1475Q?si=lFZAUwJqoJ63RO-E",
    spotifyLink: "https://open.spotify.com/album/7hJAkNUupaTOOtefSBqtKT?si=H4m_7hjoTYqIoCj8IAjJdg"
  },
  'CC_1_Files/captains_chair_15_ableton12_final.mp3': {
    displayName: "captains chair s1 ep. 15",
    description: "from captains chair, season one, ep. 12. made while gary was still just a python script. warning...these early videos are rly dumb",
    youtubeLink: "https://youtu.be/3YzlC1kafW8?si=N-P9QG2F8ZAOsR_y",
    spotifyLink: "https://open.spotify.com/album/7hJAkNUupaTOOtefSBqtKT?si=H4m_7hjoTYqIoCj8IAjJdg"
  },
  'CC_1_Files/captains_chair_16_ableton12.mp3': {
    displayName: "captains chair s1 ep. 16",
    description: "from episode 16 of the captains chair, season one...this is one of kev's favorites. gary went hard. watch it get made:",
    youtubeLink: "https://youtu.be/Pzk6JpzGNuU?si=XoHA0lSpL1igQgko",
    spotifyLink: "https://open.spotify.com/album/7hJAkNUupaTOOtefSBqtKT?si=H4m_7hjoTYqIoCj8IAjJdg"
  },
  'CC_1_Files/captains_chair_17_ableton12.mp3': {
    displayName: "captains chair s1 ep. 17",
    description: "from episode 17 of the captains chair, season one. gary was still a python script.",
    youtubeLink: "https://youtu.be/-Gzh7WtLp0I?si=sIbwe75tRLUhZBte",
    spotifyLink: "https://open.spotify.com/album/7hJAkNUupaTOOtefSBqtKT?si=H4m_7hjoTYqIoCj8IAjJdg"
  },
  'CC_1_Files/captainschair_1_16_ableton12.mp3': {
    displayName: "captains chair s1 ep. 16",
    description: "from episode 9 of the captains chair, season one. there's no video for this one i guess...not sure what happened there lol",
    spotifyLink: "https://open.spotify.com/album/7hJAkNUupaTOOtefSBqtKT?si=H4m_7hjoTYqIoCj8IAjJdg"
  },
  'ldt_files/adam_ldt.mp3': {
    displayName: "let's destroy that, ep. 6",
    description: "'let's destroy that' is a series of jams where kev takes a homie's input audio and runs away with it using gary4live. adam a.k.a. mr. armageddon sent a bass line. gary and kev destroyed the fk out of it.",
    youtubeLink: "https://youtube.com/shorts/6CKqcF-XjBQ?feature=share"
  },
  'ldt_files/dejavu_ldt.mp3': {
    displayName: "deja vu - let's destroy that ep. 4",
    description: "from episode 4 of 'let's destroy that', kyle gives us a riff from his timeless classic 'de ja vu'. kev and gary demolish it.",
    youtubeLink: "https://youtube.com/shorts/TdfeAd3ZIak?feature=share"
  },
  'ldt_files/blackbird.mp3': {
    displayName: "blackbird - let's destroy that ep. 1",
    description: "kyle, kev and gary take the riff from blackbird and destroy the sht out of it",
    youtubeLink: "https://youtube.com/shorts/UxhXfpdLwqk?feature=share"
  },
  'ldt_files/ldt_7.mp3': {
    displayName: "let's destroy that, ep. 7",
    description: "kyle gave us another one of his guitar riffs to destruct.",
    youtubeLink: "https://youtube.com/shorts/v5SLBZA94yY"
  },
  'ldt_files/ldt_9_dust.mp3': {
    displayName: "dust - let's destroy that, ep. 9",
    description: "this riff is from one of kyle's 'timeless classics' called dust. kev, gary, and terry (the new melodyflow model) demolish it.",
    youtubeLink: "https://youtube.com/shorts/9vxAqlFGW58?feature=share"
  },
  'ldt_files/ldt_8.mp3': {
    displayName: "let's destroy that, ep. 8",
    description: "another collab between kyle, kev and vanya's gary a.k.a 'lil percussion guy'.",
    youtubeLink: "https://youtube.com/shorts/9vxAqlFGW58?feature=share"
  }
} as const;

export default trackInfo;