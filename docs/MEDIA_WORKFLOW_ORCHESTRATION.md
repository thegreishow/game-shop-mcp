# Media Workflow Controller

Game Shop's Media Workflow Controller routes music, voice, video, visual, social, campaign and interactive-media work while preserving approved masters, source traceability and the existing paid-generation lock.

## MCP tools

- `gameshop_route_media_workflow`
- `gameshop_media_workflow_matrix`

Routing is read-only. It does not authorize billable generation, publishing or external execution.

## Media kinds

- music
- voice
- video
- visual
- social
- campaign
- interactive

## Core rules

- Inspect approved source media before regenerating or replacing it.
- Version masters and derivatives separately.
- Paid generation remains blocked unless independently authorized.
- An ambiguous provider submission failure is never automatically resubmitted to another billable provider.
- Captions/transcripts are explicit accessibility/text-track outputs.
- Social cutdowns are derivatives, never silent replacements of the master.
- 3D tooling is only introduced when the brief needs a spatial asset or scene.
- Interactive cinematic media can route to Yoroll with an explicit client/credit confirmation gate.
- Release requires QA tied to the exact media artifacts.

## Typical flow

`Game Shop → source/rights context → audio/video/image/motion specialists → captions/derivatives → versioned storage/delivery → media QA → release approval`
