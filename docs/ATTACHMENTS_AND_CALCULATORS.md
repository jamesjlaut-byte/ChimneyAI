# v31 — attachments and field calculator

## Homeowner attachments
Homeowners can attach:
- inspection report PDFs
- images
- text/markdown/CSV documents

PDF text is extracted locally in the browser before the chat request. ChimneyAI is explicitly told that extraction may omit diagrams, images, signatures, tables or layout.

Homeowner analysis remains explanatory. An uploaded report or photo cannot become an AI safety clearance.

## Pro attachments
The same attachment engine is available to ChimneyAI Pro, but the Pro prompt requires visible observations, missing facts, field verification and source control.

## Pro opening/flue calculator
v31 includes an arithmetic area-ratio tool supporting:
- rectangular fireplace opening
- rectangular flue
- round flue

The tool calculates areas and the opening-to-flue area ratio. It intentionally does not decide whether the system is compliant/acceptable from that ratio alone.
