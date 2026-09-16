# ChimneyAI usage analytics

Vercel Web Analytics records visits to `/`, `/homeowner`, `/pro`, and `/legal` in Vercel production deployments only. Query strings and fragments are removed from pageview and custom-event URLs. Local development and preview deployments do not initialize tracking.

Optional custom events carry only `mode` (`homeowner` or `pro`). They are disabled by default because the current Hobby plan does not support custom events. On an eligible plan, explicitly set `NEXT_PUBLIC_ENABLE_AI_ANALYTICS=true` and redeploy:

- `ai_submitted`: a prepared request is being submitted.
- `ai_response_received`: the current request returned a successful application response.
- `ai_request_failed`: the current request failed or timed out. Deliberate navigation cancellation is excluded.

These are browser events, not billing totals, verified human counts, or a durable audit trail. Browser blockers, navigation, and network loss can omit events. Owner/test visits in production count too. No event properties contain questions, model responses, customer details, uploaded files, filenames, source hashes, case IDs, or email addresses.

## Activation

Web Analytics was enabled on the included Hobby tier on September 15, 2026 (50,000 events/month, capped ingestion, 30 days viewable history). No upgrade was purchased. For another project, open Analytics → Enable, then deploy. Custom events require an eligible Vercel plan; pageview analytics works independently. Confirm `NEXT_PUBLIC_VERCEL_ENV` is exposed as `production` through Vercel's automatic system environment variables. No analytics API key is needed.

After deployment, confirm the analytics script loads and a pageview appears in the dashboard. Submit a non-sensitive test question and confirm the submitted/response events if the plan supports them. Counts begin when tracking is enabled; historical visits cannot be reconstructed.

References: https://vercel.com/docs/analytics/quickstart and https://vercel.com/docs/analytics/custom-events
