// Playlist definition
export interface Track {
  id: number;
  title: string;
  artist: string;
  duration: string;
  albumColor: string;
  albumImage: string; // path to image in /public
  src: string | null;
  startAt?: number; // start playback at this second
}

export const playlist: Track[] = [
  {
    id: 1,
    title: "Foto Kita Blur",
    artist: "Sal Priadi",
    duration: "3:42",
    albumColor: "from-violet-500 to-purple-700",
    albumImage: "/images.jpg",
    src: '/sound/Foto kita blur - Sal Priadi.mp3',
    startAt: 24,
  }
];