# ChimneyAI v32 — Pro Source Desk

The Pro interface now has a structured Source Desk so technical answers can identify what is actually controlling the question.

## Source states
- uploaded — source material was supplied in this chat
- verified_external — reserved for a future app-side verification/retrieval system
- reference_only — source identity may be known, but its controlling text is not present
- not_available — required controlling source is unavailable

The model is explicitly prohibited from upgrading a source to verified_external by itself.

## Manufacturer / UL label workflow
A technician can upload one or more label photos and use "Treat photo as label scan."

ChimneyAI Pro is instructed to extract only legible:
- manufacturer
- model
- serial
- listing / standard markings
- fuel or appliance type
- other visible installation data

Uncertain characters must remain uncertain. A label scan identifies the product/source needed next; it is not proof that the installed system conforms to its listing.

## Manual-page discipline
PDF extraction already marks text `[Page N]`. v32 tells Pro to cite only supplied page markers. If the requirement is not found in supplied text, Pro must say it was not located rather than inventing a page number.

## New field geometry tools
- segmental arch radius / arc geometry
- hearth side-extension measurement helper
- existing opening/flue area-ratio calculator

The hearth helper intentionally calculates measured geometry only; it does not contain a universal minimum requirement.
