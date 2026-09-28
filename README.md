# LyricFlow

LyricFlow turns uploaded songs into synchronized lyric experiences. It transcribes tracks, creates phonetic romanizations, detects beats, and plays lyrics alongside the audio. The library, player, and lyric editor are built with React, TanStack Start, and Supabase.

## Development

You need Node.js and npm.

```sh
npm install
npm run dev
```

The app stores uploaded tracks and lyrics in Supabase. Configure the Supabase environment used by the server before uploading songs.

## Audio-based word timing

LyricFlow transcribes a song, then can send the saved audio and transcript to ElevenLabs Forced Alignment to locate each word in the recording. Add `ELEVENLABS_API_KEY` as a server-side secret in Lovable Cloud (or your local server environment) to enable word-by-word highlighting. Keep it server-side; do not use a `VITE_` prefix.

The alignment request sends the uploaded audio and lyrics to ElevenLabs and uses the account associated with that key; usage follows that account's pricing. Without the key, the player stays in line-level timing and offers an alignment button for existing songs. Word timing is shown only when the aligner returns timings that match the transcript.
