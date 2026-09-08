# Homepage CMS Contract — Changes for the Backend (Aug 30)

**Endpoints:** `PUBLIC_API_URL` → `/api/home/` · `PUBLIC_COLLECTIONS_API_URL` → `/api/collections/`
**Page types:** `home_cms.HomePage` · `collections.CollectionIndexPage`
**Reference shapes:** `src/mocks/home.json` and `src/mocks/collections-page.json` (kept in sync with what the frontend actually reads — fastest way to confirm a field name)

Follow-on to `CMS_Potential_Changes_8_29.md`. Four new sections were added to the homepage, two were deleted, the site's default language flipped to English, and the Collections page became bilingual.

**This document reverses two instructions from Aug 29.** Fields that doc told you to leave alone are now dead. See §2.

---

## If you only do three things

1. Add the **four new repeatable fields** in §1 — `team_members`, `values_slides`, `catalogs`, `contact_links`. `catalogs` is the one that needs real work: it wants a **document/PDF chooser** per entry.
2. Stop supplying `testimonials[]`, `cta_heading`, `cta_button_text`, `cta_button_url`. Those sections were deleted (§2). Aug 29 said to keep them; that's no longer true.
3. Read §7. **Returning `site_logo` right now actively breaks other CMS fields** — it throws in the browser and silently kills every field update after it. Until that's patched, leaving the logo field empty is safer than filling it in.

---

## 1. New fields on `HomePage` (additive)

Four repeatable blocks, in the order they appear on the page (all sit between About Us and the footer). Every text field ships **both languages** — see §3 for the naming rule.

### `team_members[]` — "The People Behind the Craft"

| Key | Type | Notes |
|---|---|---|
| `name` | string | Rendered as-is, uppercase via CSS. Not translated. |
| `role` / `role_en` | string | Job title |
| `photo` | `{ url, alt }` | Portrait, cropped to 4:5 |
| `bio` / `bio_en` | string | Two or three sentences |

**Designed for exactly 4.** Lays out 4 across, 2 across under 900px, 1 under 560px. Other counts render but leave gaps.

### `values_slides[]` — "The Principles Behind Everything We Create"

| Key | Type | Notes |
|---|---|---|
| `title` / `title_en` | string | Large overlay heading, e.g. Quality / Durability |
| `image` | `{ url, alt }` | **Full-bleed, edge to edge.** 16:7 on desktop, 4:3 on mobile |
| `description` / `description_en` | string | Short paragraph under the title |

Autoplaying slider, 4s per slide, loops. One dot per slide, so any count works.

**These images are the largest on the site** — full viewport width. Please upload high-resolution source and let Wagtail's renditions handle sizing. Text is overlaid bottom-right over a dark gradient, so images with a busy or light bottom-right corner will read poorly.

### `catalogs[]` — "Explore Our Collections and Solutions"

| Key | Type | Notes |
|---|---|---|
| `title` / `title_en` | string | Caption under the cover, e.g. "Catalog 1" |
| `image` | `{ url, alt }` | Cover thumbnail, cropped to 3:4 portrait |
| `file_url` | string | **The downloadable PDF. Currently `"#"` everywhere.** |

Paged slider: 4 covers at a time, arrows advance a full page of 4. Dots = one per page, so **counts that are a multiple of 4 look best**. Currently 16 placeholder entries.

**This is the main piece of new work.** `file_url` should come from a Wagtail document (PDF) chooser, not a free-text URL. The whole card — cover, title, and download icon — is one link pointing at it. Until real PDFs exist, every entry points at `#` and clicking does nothing.

### `contact_links[]` — "Would you like to get direct contact with Policrafters?"

| Key | Type | Notes |
|---|---|---|
| `title` / `title_en` | string | Column heading, underlined |
| `description` / `description_en` | string | Two lines of supporting copy |
| `url` | string | Destination for the "Learn more" button |

**Designed for exactly 4** (4 across, 2 under 900px, 1 under 560px). Current entries are Interior Design Service, Falper Contract, Retailers, Contact Us — all pointing at `#`.

The "Learn more" button label is **not** in this data; it's hardcoded in the frontend in both languages.

---

## 2. Fields no longer read at all — reverses Aug 29

Two homepage sections were deleted outright. Aug 29 §4 listed `testimonials[]` and `cta_button_url` under "please leave these alone" — **that no longer applies.**

| Field | Why it's gone |
|---|---|
| `testimonials[]` | The testimonials block was removed from the homepage. |
| `cta_heading` | The dark "Ready for your next project?" band at the bottom was removed. |
| `cta_button_text` | Same section. |
| `cta_button_url` | Same section. |

Safe to delete from the page model, or leave them — nothing reads them either way. The Contact Us route still exists and is reachable from the nav and from `contact_links[]`.

---

## 3. The bilingual convention — now baked into the data shape

Aug 29 §5 raised this as an open question (Option A: translations move into Wagtail / Option B: frontend owns copy). Today's work settled it **for structured content only**, and it's worth understanding exactly where the line falls:

- **Repeatable content fields** (`team_members`, `values_slides`, `catalogs`, `contact_links`, and everything on the Collections page) now carry **both languages in the data**.
- **Section chrome** — eyebrows, headings, button labels, nav items — is still hardcoded in the frontend in both languages. See §8.

**The naming rule for anything new:** the base key holds **Spanish**, and a `_en` suffix holds **English**.

```json
{ "title": "Calidad", "title_en": "Quality" }
```

Fields with no linguistic content — `url`, `file_url`, `slug`, image `url` — take no suffix. Image `alt` is currently single-language (Spanish); worth revisiting.

**The wart, stated plainly:** the site's default display language is now English (§4), but the base key still holds Spanish. So the default language lives in the *suffixed* key. This is a direct consequence of the mock having been Spanish-first from the start, and it's the sort of thing that quietly causes mistakes later. If you're standing up real translation infrastructure, **`wagtail-localize` is the better destination** than growing more `_en` fields — this convention is a pragmatic stopgap, not an endorsement.

---

## 4. Default language is now English

Previously Spanish. What changed:

- `locale` in both mocks is now `"en"`, and **`locale` still does the same job** — it decides the default when the visitor has no saved preference and no `?lang=` in the URL. Setting it back to `"es"` on a page flips that page's default.
- The `?lang=` URL convention changed: **English is no longer written into the URL.** `/` is English; `/?lang=es` is Spanish. A stale `?lang=en` gets stripped. Nav links and the language switcher all emit this form.
- The language switcher, the nav labels, and the `sitelangchange` broadcast now live in one place (a new `Header.astro` component) rather than being duplicated across pages.

**Known gap:** `meta.seo_title` and `meta.search_description` on the homepage are still Spanish-only, so the browser tab title and meta description stay Spanish regardless of language. The Collections page now has `search_description_en`; the homepage has no equivalent yet. If you want a bilingual `<title>`, the homepage meta needs `_en` variants added.

---

## 5. Collections page — now bilingual

`/api/collections/` → `collections.CollectionIndexPage`. Previously the English version of this page was hardcoded in the frontend's JavaScript; it's now data-driven, so **these fields are newly required** for English to work.

**Page-level:**

| Key | Notes |
|---|---|
| `hero_title` / `hero_title_en` | Was `"Collections"` in both. Spanish now reads "Colecciones". |
| `hero_subtitle` / `hero_subtitle_en` | `hero_subtitle_en` is new — English had no subtitle before |
| `intro_text` / `intro_text_en` | The Rimadesio paragraph |
| `prev_aria` / `prev_aria_en` | Carousel accessibility labels |
| `next_aria` / `next_aria_en` | " |
| `carousel_aria` / `carousel_aria_en` | " |
| `meta.search_description_en` | New |

**Per `collection_items[]`:** `type` / `type_en`, `description` / `description_en`, `cta_text` / `cta_text_en`, plus unchanged `image { url, alt }` and `cta_url`.

Note the Spanish page heading changed from "Collections" to **"Colecciones"** — the old mock rendered an English heading on the Spanish page, which looked like a bug.

---

## 6. Fields still in use — please leave these alone

- **`title`**, **`locale`** — see §4.
- **`meta.seo_title`**, **`meta.search_description`** — still drive page title and meta description (Spanish-only; see §4).
- **`featured_projects[]`** — unchanged shape: `title`, `slug`, `thumbnail { url, alt }`, `description`.
- **`hero_video_horizontal`** / **`hero_video_vertical`** / **`hero_image_horizontal`** / **`hero_image_vertical`** — unchanged from Aug 29.
- **`site_logo`** — still read server-side, **but see §7 before returning it.**

**Still partially working:** `hero_heading` is rendered from the CMS on the server, then overwritten in the browser by the frontend's hardcoded copy. Unchanged from Aug 29 §5 — and now slightly worse, because English is the default and English copy has never come from the CMS.

### One correction to Aug 29

That doc said the projects slider "shows two cards at a time." It was *specified* as two but a CSS bug rendered roughly four. That's fixed — it genuinely shows **2 at a time** now, with dots numbering one fewer than the project count (5 projects → 4 dots). **Four or five projects minimum** still holds.

---

## 7. Returning `site_logo` currently breaks other CMS fields

Worth knowing before you wire up the logo, because the failure looks like something else entirely.

The client-side refresh function calls `normalizeAssetUrl()` when a logo comes back from the API — but that helper only exists server-side. The call throws `ReferenceError` in the browser and **aborts the rest of the refresh function**. Everything after that point is skipped, including the language pass at the end.

**Net effect:** supply `site_logo` (or `logo`, or `header_logo`) and the logo won't update *and* the runtime updates that would otherwise work stop happening. Leave it empty and everything else behaves.

This is a known frontend bug, deliberately left unfixed for now — flagged here so it isn't mistaken for a backend problem. The server-side render reads `site_logo` correctly, so the logo does work on first paint; it just can't be swapped at runtime.

**Also still true from Aug 29:** that same refresh function looks for `hero_video_url` and `hero_image_fallback` — the *old* field names — and targets `#hero-media` / `#hero-image`, elements that no longer exist in the markup (confirmed: zero occurrences). Those calls are inert.

---

## 8. Content not connected to the CMS at all

Hardcoded in the frontend in both languages, never requested from the API. Flagging so nobody builds page-model fields expecting them to be picked up.

Carried over from Aug 29, still true:

- Hero eyebrow and hero button label
- Projects section eyebrow, heading, and "See all projects" button
- The entire About Us block, including the two brand links
- The entire footer — every label, phone, email, address, and social link
- All English copy for section chrome

New today:

- **Nav menu labels** (Collections / Renovations / Services / Brands / Contact Us) — now defined **once** in `Header.astro` instead of being duplicated in four places. If nav should ever become editor-managed, that's the single place to wire it.
- Section eyebrows and headings for **Team**, **Values**, **Catalogs**, and the "Would you like to get direct contact" heading
- The **"Learn more"** button label shared by all four `contact_links` columns

### Links still pointing nowhere

All `href="#"`:

- Projects "See all projects", About Us "Know more"
- **All 16 catalog download links** (`file_url`) — §1
- **All 4 `contact_links` "Learn more" buttons** (`url`) — §1
- All nine footer nav links, both footer service sub-lists, all five social icons

---

## 9. Assets living in the frontend repo

Committed files, not CMS uploads. Carried over from Aug 29, plus today's additions.

- `/videos/horizontal_video_placeholder.mp4`, `/videos/vertical_video_placeholder.mp4`
- `/images/pages/horizontal_video_static_image.png`, `/images/pages/vertical_video_static_image.png`
- `/images/pages/about_us.png`
- `/logo_black.png` (header), `/logo_grey.png` (footer)
- `/images/projects/` — project thumbnails

New today, **all placeholders awaiting real assets:**

- `/images/pages/office_portrait_1–4.png` — team portraits
- `/images/pages/values_1–4.webp` — the four full-bleed values images
- `/images/pages/1_pergola.png` … `16_pergola.png` — the 16 catalog covers. **These are currently the same pergola photograph in different color treatments**, standing in for 16 distinct covers.

---

## 10. How asset URLs are resolved

Unchanged from Aug 29 §8, and still worth re-reading if paths come back looking wrong.

Short version: with `PUBLIC_USE_API=true`, relative Wagtail paths get the API origin prefixed automatically; absolute `http(s)` URLs pass through untouched, so **returning fully-qualified URLs is always safe**. The origin is only prefixed onto values that genuinely came from the API — local fallback files are used as-is. Please don't collapse that branch; it was a real bug once.
