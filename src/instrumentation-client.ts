import posthog from 'posthog-js'

// Next.js runs this once on the client before hydration.
// The `defaults` preset gives us history_change pageviews (so App Router
// navigations are captured without a manual pageview component) and flags
// localhost as internal, keeping dev traffic out of the reports.
const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN

if (posthogKey) {
  posthog.init(posthogKey, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    defaults: '2026-01-30',
  })
}
