# Website Workflow Orchestration

Game Shop treats website work as a first-class production workflow rather than a generic collection of UI tools.

## MCP tools

- `gameshop_route_website_workflow` — classify and route website creation, upgrade, repair, audit and release work.
- `gameshop_website_workflow_matrix` — expose supported website types, default needs, routing boundaries and release policy.

Both tools are read-only. Routing never grants GitHub writes, external execution, paid generation or production deployment permission.

## Website types

- `landing` — focused launch/campaign page. Prefer static/client-side delivery unless the brief truly requires persistent backend behavior.
- `marketing` — broader conversion/brand site with media, forms and analytics.
- `artist` — music/creative site emphasizing media, motion, discoverability and conversion without automatically adding app infrastructure.
- `portfolio` — showcase site emphasizing media, responsive presentation and lightweight interaction.
- `content` — editorial/catalog/content-heavy site where a durable content model may justify CMS/data work.
- `ecommerce` — commerce flow with backend/data/auth/payment requirements and server/provider-authoritative payment state.
- `web-app` — application/SaaS surface with persistent data/auth/backend/observability requirements.
- `experiential` — immersive 3D/shader-heavy web experience with explicit performance and fallback gates.

`auto` infers a type from declared needs. Commerce wins first, then experiential 3D/shaders, then web-app backend/auth/data, then content/CMS, then media-heavy artist, otherwise landing.

## Key routing principles

1. **Use the smallest stack that satisfies the task.** A landing page should not gain a database or auth system simply because Supabase exists.
2. **Existing sites are repaired before rewritten.** Inspect current source, dependencies, routes and deployment behavior first.
3. **3D is opt-in.** Three.js/Spline/shader infrastructure belongs only in sites with a specific experiential requirement.
4. **Commerce is opt-in.** Stripe/payment dependencies appear only when the product actually sells or bills for something.
5. **Motion follows layout.** GSAP/Motion/Anime/Rive are routed after stable structure and remain subject to responsiveness, reduced-motion and performance budgets.
6. **Backend is requirement-driven.** Static/client-side sites stay static where possible. Backend/data/auth are introduced only for real product needs.
7. **Preview before production.** Release work requires hosted preview evidence before production promotion.
8. **Browser evidence is independent.** Playwright/browser QA verifies user-visible behavior rather than accepting implementation claims at face value.

## Underlying specialist routing

The website controller delegates capability selection to the existing multidomain router. Depending on the task this can choose among:

- React Bits, shadcn, KokonutUI and other verified UI registries
- CSS, Anime.js, Motion, GSAP, Lenis and Rive for interaction/motion
- Three.js, Spline, ShaderGradient and WebGPU for experiential work
- Supabase for database/auth/storage/backend when justified
- Stripe for checkout/commerce
- Cloudinary for managed media delivery
- Playwright, Browserbase, Chrome DevTools MCP and Impeccable for QA, diagnostics and visual quality
- Vercel for preview/deployment/observability
- GitHub as canonical source control and release evidence

The routing result records selected engines and alternatives, but does not itself invoke them.

## Typical flows

### Existing artist-site repair

Game Shop → GitHub inspection → existing frontend stack → targeted UI/performance fix → deterministic browser QA → controlled branch evidence → optional preview → release decision.

No 3D, Stripe, database or framework migration should appear unless the repair actually requires it.

### Ecommerce build

Game Shop → GitHub → design/UI → backend/data/auth → media → Stripe checkout → analytics/observability → browser QA → preview → release gate.

Payment state remains authoritative on the provider/server side; mock frontend state is not authorization.

### Experiential campaign site

Game Shop → design/UI → motion → Three.js/Spline/shader lane → media → performance diagnostics → browser QA/fallback validation → preview → release gate.

Essential content/navigation must remain usable when advanced graphics are reduced or unavailable.

## Safety and release boundaries

- Project writes remain inside registered project roots on controlled branches.
- Routing never authorizes external calls or spend.
- Billable media generation remains behind existing Game Shop spend controls.
- Performance claims require comparable before/after evidence.
- Production deployment requires a separate explicit release decision.
