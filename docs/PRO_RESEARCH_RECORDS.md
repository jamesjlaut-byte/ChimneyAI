# ChimneyAI v35 — Technical research records

v35 turns saved Pro cases into persistent research records rather than simple manufacturer/model bookmarks.

## Saved conversation history
When a Pro case is saved, the current ChimneyAI conversation text is saved with it. Reloading the case restores the research context and chat history.

## Manual identity hash
v35 generates a SHA-256 fingerprint from the recorded manual metadata:
- manufacturer
- model
- manual title
- document/part number
- revision
- effective date
- official URL
- relevant pages

Important: this is a hash of metadata, not the actual PDF bytes. It is intended to make changes to the recorded source identity visible. A future version should hash the downloaded/uploaded manual file itself.

## Export
A saved Pro case can be exported as Markdown containing:
- appliance identity
- technical question
- source status
- manual verification record
- manual identity hash
- case notes
- saved conversation
- research-only disclaimer

This creates a portable research record that can later be attached to a FlueFire inspection or converted into report-support documentation.

## Still needed
- authenticated cloud cases
- actual source-file/PDF byte hashing
- attachment persistence
- automatic manufacturer manual retrieval
- source revision comparison
- direct FlueFire handoff
