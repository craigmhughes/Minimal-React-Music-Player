# Minimal-React-Music-Player

Simple Mp3 player that I wrote using Electron + React. Mainly to test out bringing a design to life.

Current Issues:
  - Song skip latency: caused by reading each track as the app skips, this causes the app to be very slow as it reads the         track's info, such as; Album art, Track name/artist, etc. (If I were to revisit this, I would store all info in               placeholder files and read those).
