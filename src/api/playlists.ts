import { getDeviceId } from "@/api/songs";
import {
  createPlaylistFn,
  deletePlaylistFn,
  getPlaylistFn,
  listPlaylistsFn,
  playlistsForSongFn,
  renamePlaylistFn,
  setPlaylistSongFn,
} from "@/lib/playlists.functions";

export type { PlaylistDetail, PlaylistSummary } from "@/lib/playlists.functions";

export const listPlaylists = () => listPlaylistsFn({ data: { deviceId: getDeviceId() } });
export const playlistsForSong = (songId: string) =>
  playlistsForSongFn({ data: { deviceId: getDeviceId(), songId } });
export const createPlaylist = (name: string) => createPlaylistFn({ data: { deviceId: getDeviceId(), name } });
export const renamePlaylist = (playlistId: string, name: string) =>
  renamePlaylistFn({ data: { deviceId: getDeviceId(), playlistId, name } });
export const deletePlaylist = (playlistId: string) =>
  deletePlaylistFn({ data: { deviceId: getDeviceId(), playlistId } });
export const setPlaylistSong = (playlistId: string, songId: string, included: boolean) =>
  setPlaylistSongFn({ data: { deviceId: getDeviceId(), playlistId, songId, included } });
export const getPlaylist = (playlistId: string) =>
  getPlaylistFn({ data: { deviceId: getDeviceId(), playlistId } });
