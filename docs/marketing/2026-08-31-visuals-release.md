# Vibeify 0.15.6: better pictures, private magazine

Public-action status: **prepared for the 0.15.6 release**. Publish only after the tag, downloadable assets and live local installation have been independently verified.

## Main announcement

Vibeify now has a separate open-source picture desk.

**DSH Visuals** searches Wikimedia Commons and Openverse without an account, and can add Pexels and Pixabay when you place your own keys safely in DSH Settings. It looks for the named person, place, object, work or event in a Vibe article, keeps the creator, licence and original source attached, and remembers recent images to reduce repetition.

The privacy line is simple: picture services receive the short public-facing title of an explicit magazine page—not the prompt, article body, attachment, Chat history, preferences, keys or current private images. If no suitable photograph exists, Vibeify keeps its unique editorial cover instead of borrowing unrelated stock.

Vibeify 0.15.6 and DSH Visuals 0.1.0 are free, open-source plugins for DeepSeek Harness. Finish active work before updating.

Release: https://github.com/N9-Developer-Empowerment/DSH-Vibeify/releases/tag/v0.15.6

See Vibeify: https://dsh-vibeify.ezzye.chatgpt.site/

Watch the real workflow: https://youtu.be/jda4uplWsiI

## Short social version

Vibeify has a new open-source picture desk 📷

DSH Visuals can find relevant, credited images through Wikimedia Commons, Openverse, Pexels and Pixabay—without sending your article, prompt or Chat history to an image service. If nothing suitable exists, Vibe keeps its unique editorial cover.

Free for DeepSeek Harness: https://github.com/N9-Developer-Empowerment/DSH-Vibeify/releases/tag/v0.15.6

## DSH plugin-builder update

DSH Vibeify 0.15.6 adds a separately installable `dsh-visuals` capability. The loopback RPC accepts a bounded public title, orientation, result limit and recent-image exclusions. Provider adapters preserve original source and licence data; keyed credentials are resolved per request through DSH's credential provider and never cross the RPC boundary. Vibeify detects the capability at runtime and fails back to its deterministic local cover when absent.

I would value feedback on the plugin boundary, provider allow-lists and provenance contract:

https://github.com/N9-Developer-Empowerment/DSH-Vibeify/releases/tag/v0.15.6

## YouTube community update

Vibeify's latest update is about something deceptively important: the picture should actually belong to the story.

The new DSH Visuals plugin searches reusable and stock-photo catalogues, keeps the creator and licence visible, avoids sending private article copy to search providers, and falls back honestly when no exact photograph exists.

Vibeify 0.15.6 is free and open source. The original walkthrough still shows the complete Vibe → Chat → Update → private preview → optional public link journey:

https://youtu.be/jda4uplWsiI

Download and release notes:

https://github.com/N9-Developer-Empowerment/DSH-Vibeify/releases/tag/v0.15.6
