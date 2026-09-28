# Pixel Perfect

Implement exactly the screenshot and nothing else

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e48ff9f1-981b-4f5b-a899-fca24feeff7e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Audio-based word timing

LyricFlow gets the lyric text from Lovable AI, then sends the saved audio and that transcript to ElevenLabs Forced Alignment to locate each word in the recording. Add `ELEVENLABS_API_KEY` as a server-side secret in Lovable Cloud (or your local server environment) to enable word-by-word highlighting. Keep it server-side; do not use a `VITE_` prefix.

The alignment request sends the uploaded audio and lyrics to ElevenLabs and uses the account associated with that key; usage follows that account's pricing. Without the key, the player stays in line-level timing and offers an alignment button for existing songs. Word timing is shown only when the aligner returns timings that match the transcript.
