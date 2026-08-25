# Ride My Line privacy specification

Last updated: August 25, 2026

Ride My Line works without an account. It does not use advertising trackers, cookies, a session identifier, or a persistent player identifier.

## Browser storage

The game stores only campaign state and preferences in the player’s browser: storage schema version, unlocked-yard count, last yard, medal totals, last animation variants, master mute, music, effects, and rider-reaction settings. Reset Progress erases campaign progression and medals without changing audio preferences. Browser controls can erase everything.

## First-party game events

The game may send these fixed event names to its same-origin `/api/events` endpoint: `game_loaded`, `yard_loaded`, `run_started`, `run_finished`, `campaign_completed`, `progress_reset`, and `client_error`.

The accepted fields are event name, yard, outcome, fixed failure reason, build version, broad input method, attempt number, duration, ink percentage, star count, and checkpoint count. The endpoint rejects arbitrary fields and never writes names, email addresses, IP addresses, precise location, referrers, browsing history, free-form text, user-agent strings, URLs, session IDs, or device IDs to the product dataset.

Telemetry is disabled when the browser reports Global Privacy Control or Do Not Track. Cloudflare hosts the same-origin endpoint. Its Analytics Engine retains product events for three months. Normal infrastructure request processing and short-lived operational logs are governed by Cloudflare’s service controls.

The deployed, player-facing version is `privacy.html`.
