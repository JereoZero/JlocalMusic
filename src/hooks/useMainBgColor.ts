import { usePlayerStore } from '../stores/playerStore'
import { useSongCover } from './useSongCover'
import { useAlbumColor } from './useAlbumColor'

export function useMainBgColor(): string {
  const currentSong = usePlayerStore((state) => state.currentSong)
  const { cover } = useSongCover(currentSong?.path)
  const albumColors = useAlbumColor(cover, currentSong?.path)
  
  return albumColors.main || '#121212'
}
