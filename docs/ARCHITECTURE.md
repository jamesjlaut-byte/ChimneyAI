# ChimneyAI v30 architecture split

ChimneyAI is now a separate product from FlueFire.

## ChimneyAI Homeowner
Public-facing educational AI for homeowners.
Primary use:
- explain inspection terminology
- explain repair recommendations
- explain common chimney/fireplace concepts
- help homeowners understand credentials
- help homeowners prepare questions for a contractor
- eventually review uploaded reports/photos for explanation

It does not issue safety clearances or replace an onsite inspection.

## ChimneyAI Pro
Technical assistant for chimney professionals.
Primary use:
- technical research
- field calculations
- manufacturer/manual workflow
- standards/source hierarchy
- objective report wording
- inspection documentation support
- photo second-look
- appliance identification
- missing-information prompts

It does not independently declare compliance/safety and does not fabricate citations.

## FlueFire
FlueFire is the separate professional business application. v29 remains the foundation for:
CRM, scheduling, inspections, reports, proposals, repairs, invoicing/POS, customer portal, website/booking, AI phone assistant and operations.

Future integration:
FlueFire can invoke ChimneyAI Pro with job/inspection context, but ChimneyAI remains independently usable.
