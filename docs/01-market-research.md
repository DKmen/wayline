# 01 · Market Research (as of July 2026)

Sources: vendor pricing pages, G2 review aggregations, PLG teardowns, and competitor-published pricing analyses (cross-checked against official pages; single-sourced complaint claims are directional). Full citations inline.

## 1. Player profiles

### Scribe — scribe.com

- **Positioning 2026**: moved upmarket — "capture how work gets done; give your teams and AI agents context." ~6M users, "94% of Fortune 500" claim.
- **Features**: auto-capture clicks → screenshot step guides with auto text; Chrome/Edge extension + desktop app (Pro); Smart Blur redaction (Pro+, users report misses); SOC 2/HIPAA/GDPR messaging. **Weak on video.**
- **Pricing**: Free (watermark, web-only); Pro Personal $25/user/mo; Pro Team $13/seat/mo with **5-seat minimum ($65/mo entry)**; Enterprise quotes reported at **$18k+/yr**.
- **Extension auth**: web signup (email/Google) → extension rides the web session. SSO Enterprise-only.
- **Complaints**: price climbs fast, watermark on free, "expensive for internal-only use," AI text needs cleanup, weak video.
- [pricing](https://scribe.com/pricing) · [G2](https://www.g2.com/products/scribe/reviews) · [sharing model](https://support.scribehow.com/hc/en-us/articles/7005471657373-Sharing-your-Scribe)

### Tango — tango.ai

- **Positioning**: documentation + **in-app "Guide Me" live guidance** + guide→automation. Enterprise logos.
- **Features**: extension auto-captures screenshots + descriptions; **live in-app walkthroughs and auto PII blur are Enterprise-gated**; screenshots only — no video.
- **Pricing**: Free (10 users, 5 workflows); Pro $15/user/mo, 3-user minimum; Enterprise custom.
- **Onboarding**: best-in-class PLG — install free extension (no credit card) → pin → click button → do task → guide auto-generates. **Aha (finished guide) before any invite ask.**
- **Complaints (G2)**: weak editing (blur/annotations/reordering), no undo, no video, in-app guidance behind opaque Enterprise pricing.
- [pricing](https://www.tango.ai/pricing) · [G2 cons](https://www.g2.com/products/tango-tango/reviews?qs=pros-and-cons) · [PLG teardown](https://www.toption.org/product-led-growth-examples/tango)

### Supademo — supademo.com

- Interactive demo platform; extension + desktop capture; HTML interactive replay (Growth tier); AI voice.
- **Pricing**: Free (5 demos); Scale $38/creator/mo annual; Growth $450/mo (5 creators); Enterprise 10-creator min.
- **Analytics = cohort ceiling**: viewer counts, completion, session duration, per-step drop-off, internal-vs-external filters, CRM sync.
- [pricing](https://supademo.com/pricing) · [analytics docs](https://docs.supademo.com/analytics-and-data/general-analytics)

### Guidde — guidde.com

- Closest to "capture → polished video": AI voiceover (200+ voices), auto captions, **auto zoom/pan/highlight**; Brand Kit.
- **Pricing**: Free; Pro $18/user/mo; Business $39/user/mo (voiceover, analytics, brand kit); Enterprise custom.
- **Onboarding**: install extension → **passwordless magic link or Google** → single red "Capture" button.
- **Complaints**: robotic voiceovers, narration sync issues, limited fine editing, folder/permissions weak, save conflicts.
- [pricing](https://www.guidde.com/pricing) · [G2](https://www.g2.com/products/guidde/reviews) · [sign-in doc](https://help.guidde.com/en/articles/6360998-signing-in-to-guidde)

### iorad — iorad.com

- Capture → interactive tutorials with view / try / do modes; LMS integrations.
- **Pricing hostile to small teams**: Free = **all tutorials public**; Individual $200/mo; Team $500/mo base. Unlimited free _viewers_ on paid plans (worth copying).
- [pricing](https://www.iorad.com/pricing) · [free = public policy](https://www.iorad.com/pricing/feature/free-public-tutorials)

### Floik — floik.com

- **One recording → three outputs** (interactive demo + step guide + explainer video) — the multi-format pattern Wayline shares. Pro $39/mo annual. Complaints: rough post-capture editing, **basic analytics**.
- [G2](https://www.g2.com/products/floik/reviews)

### Trainn — trainn.co

- Customer-education platform (video editor, academy, SCORM, learner analytics). ~$2,400/yr entry (third-party listing). Aimed at customer training, not internal SOPs.

### UserGuiding — userguiding.com

- DAP-lite for **your own product** via JS snippet (tours, checklists, hotspots). MAU-priced: $174–349/mo. Relevance: shows live-guidance pricing when sold standalone — and that nobody sells live guidance _over third-party apps via extension_ at self-serve prices.

### WalkMe (SAP) / Whatfix — enterprise DAPs

- WalkMe: acquired by SAP ($1.5B, closed Sept 2024); median ACV ~$43k/yr; consultants required.
- Whatfix: ~$24k/yr floor, median ~$32k; 1–3 month implementations; leads Spring 2026 G2 DAP grid.
- These are the only products doing live guidance over arbitrary apps — at 100–1000× Wayline's target price.

### Arcade — arcade.software

- Interactive demos for marketing. Free (3 demos); Pro $32/user/mo; Growth $297.50/mo flat. Complaints: HTML capture top-tier-gated, analytics "views but no drop-off," Pro→Growth pricing cliff.

### Newcomers (2025–26)

- **Clueso** (~$6.5M ARR est.): recording → studio-grade video + docs; Starter $120/mo — expensive.
- **Trupeer**: undercuts Clueso — Hobby $19/mo, Pro $49/mo.
- **Glitter AI**: narrate-while-you-click → guide; free desktop capture; 99 languages.
- Long tail: Guidejar, Folge (one-time purchase), Knowlify, MagicHow, Trails.

## 2. Feature comparison matrix

| Product        | Screenshot guide | Polished video             | Interactive demo | Live guidance (3rd-party apps) | Auto redaction                   | Viewer analytics                 | Free tier           | Paid entry          | SSO                 |
| -------------- | ---------------- | -------------------------- | ---------------- | ------------------------------ | -------------------------------- | -------------------------------- | ------------------- | ------------------- | ------------------- |
| Scribe         | ✅ core          | ⚠️ weak                    | ❌               | ❌                             | ✅ Pro+, imperfect               | ⚠️ basic                         | ✅ watermark        | $65/mo (5-seat min) | Ent                 |
| Tango          | ✅ core          | ❌                         | ❌               | ✅ **Ent only**                | ⚠️ Ent only                      | ⚠️ basic                         | ✅                  | $45/mo (3-seat min) | Ent                 |
| Supademo       | ✅               | ✅                         | ✅               | ❌                             | ⚠️ manual                        | ✅ **best**                      | ✅ 5 demos          | $38/creator         | Ent                 |
| Guidde         | ✅               | ✅ **core**                | ⚠️               | ❌ (Broadcast Ent)             | ⚠️                               | ✅ Business+                     | ✅                  | $18/user            | Ent                 |
| iorad          | ✅ try/do        | ⚠️                         | ✅               | ⚠️ "do mode"                   | ⚠️                               | ⚠️                               | ⚠️ **public-only**  | $200/mo             | Ent                 |
| Floik          | ✅               | ✅                         | ✅               | ❌                             | ⚠️                               | ⚠️ basic                         | ✅                  | $39/mo              | Ent                 |
| WalkMe/Whatfix | ⚠️               | ❌                         | ✅ sims          | ✅                             | ✅                               | ✅ deep                          | ❌                  | $24–43k/yr          | ✅                  |
| Arcade         | ✅               | ✅                         | ✅               | ❌                             | ⚠️                               | ⚠️ shallow                       | ✅ 3 demos          | $32/user            | Ent                 |
| **Wayline v1** | ✅ (guide view)  | ✅ **silent, caption-led** | —                | ✅ **self-serve**              | ✅ **free tier, blocks publish** | ✅ per-step + compliance framing | ✅ 3 flows, private | ~$29/workspace      | Google on base tier |

## 3. Gaps → Wayline differentiation

1. **Video + live-guidance combo doesn't exist self-serve.** Guide/video tools have no live guidance; live guidance over arbitrary apps is Enterprise-gated (Tango) or $24k+/yr DAP. Extension-delivered follow-along at Pro-tier pricing = open territory.
2. **Private-by-default is a genuine wedge.** iorad free = forced public; Scribe privacy behind Pro; complaints cluster on "expensive for internal-only." Nobody markets "your SOPs never leave your workspace" as the default posture. Wayline's local-until-publish draft model is stronger still.
3. **Redaction is universally weak or gated.** Better blur is Tango users' top G2 ask. Publish-blocking redaction review on the free tier is a security-conscious-team differentiator.
4. **Silent video is an unserved aesthetic.** AI-voiceover cohort's #1 complaint is robotic audio. Captions + cursor motion + spotlight sidesteps it.
5. **Pricing resentments to exploit**: seat minimums, per-creator escalation, Free→Enterprise cliffs, quote-only pricing. Flat workspace price + unlimited viewers + transparent pricing page.
6. **Editing friction is the top functional complaint everywhere** (no undo, can't rearrange, cumbersome). A fast, forgiving editor (undo/redo, drag-reorder, merge) is table stakes done badly by incumbents — see [02-product-spec.md](./02-product-spec.md#editor).
7. **Analytics framing**: match Supademo's bar (per-step drop-off, completion), but frame for internal teams as **training compliance** ("who on the team completed this walkthrough") — nobody does this.

## 4. Onboarding patterns worth copying

1. **Extension-first CTA** (Tango): primary homepage button gets the extension, no credit card.
2. **Aha-before-invite** (Tango): first capture produces a finished artifact before any team-invite or upsell prompt; sharing is the viral loop.
3. **Passwordless magic link or Google** (Guidde): no password at signup; extension reuses the web session.
4. **One obvious record button** (Guidde red / Tango purple): single primary action in the popup.
5. **Guided first capture**: empty state teaches by doing ("go to any web app and click through your process").
6. **Use-case-segmented signup** (Scribe): deep links from hero chips (`?useCase=onboarding`).

## 5. Landing page conventions (and where Wayline deviates)

Category structure (Scribe, Tango, Guidde, Supademo):

1. Hero: outcome-verb headline + artifact sub-line + dual CTA (get extension / see demo)
2. Logo marquee
3. 3–6 step "how it works" strip
4. Feature pillars framed as outcomes (Capture / Customize / Share, + AI pillar in 2026)
5. Use-case spotlights with per-case CTAs
6. Testimonial wall + case studies
7. Security/compliance block (late on page)
8. **No pricing on homepage**; separate 3–4 tier page, quote-only Enterprise

**Wayline deviations** (deliberate):

- Move the **security/privacy block up** to position #3 — it's the wedge, not a footnote.
- **Transparent pricing** linked from the nav and shown on the pricing page with real numbers.
- Hero shows the _two outputs from one capture_ (video + live walkthrough) side by side — the combination is the differentiator, so demonstrate it immediately.

See [02-product-spec.md](./02-product-spec.md#landing-page) for the Wayline landing spec.
