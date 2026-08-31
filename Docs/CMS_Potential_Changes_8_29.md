# Homepage CMS Contract — Changes for the Backend

**Endpoint:** `PUBLIC_API_URL` → `/api/home/`
**Page type:** `home_cms.HomePage`
**Reference shape:** `src/mocks/home.json` (kept in sync with what the frontend actually reads — fastest way to confirm a field name)

The homepage was rebuilt section by section. Several fields the Wagtail page model supplies were renamed, reshaped, or dropped. This document lists everything that moved, plus one architectural problem worth discussing before more fields get wired up.

---

## If you only do three things

1. Split the hero video and hero fallback image into **horizontal and vertical pairs**. The old single-field names return nothing now.
2. Swap `location` for `description` on each featured project.
3. Read *"The CMS is being overwritten"* below. Several fields you supply are currently discarded in the browser. It's a frontend bug, but the fix depends on a decision about where translations should live.

---

## 1. Fields that were renamed or split (breaking)

The old names are no longer read anywhere. Anything still returning them is being silently ignored.

### `hero_video_url` → `hero_video_horizontal` + `hero_video_vertical`

Both are plain URL strings. The hero plays the landscape video on desktop and the vertical one on phones, chosen in the browser by screen width.

### `hero_image_fallback` → `hero_image_horizontal` + `hero_image_vertical`

Each is an object with `url` and `alt` — same shape as before, just two of them now.

These are the still images shown while the video loads, and shown permanently if the browser blocks autoplay or the visitor has reduced-motion enabled. **They are not decorative.** For a meaningful share of visitors this is the only hero they ever see, so both need real alt text.

---

## 2. Field whose shape changed

### `featured_projects[]`

- **Remove:** `location`
- **Add:** `description` — a sentence or two of prose, shown under each project image in the slider
- **Unchanged:** `title`, `slug`, `thumbnail { url, alt }`

Also worth knowing: the projects slider shows two cards at a time and has a dot indicator underneath. It needs **at least four or five projects** to look right. With two entries it looks broken.

---

## 3. Fields no longer read at all

The sections that displayed these were removed from the homepage. Safe to delete from the page model, or leave them — nothing on the frontend will look at them either way.

| Field | Why it's gone |
|---|---|
| `hero_subheading` | The hero is now eyebrow + headline + button. No subheading paragraph. |
| `intro_text` | The paragraph between the hero and the projects slider was removed. |
| `featured_brands` | The logo-row Brands section was removed from the homepage. |

**Note on `featured_brands`:** the `/marcas` page and its navigation link still exist and were not touched. This only removed the logo strip from the homepage. Brands are now mentioned inside the new About Us block as two text links, which are hardcoded in the frontend.

---

## 4. Fields still in use — please leave these alone

- **`title`** and **`locale`** — `locale` still decides the default language when the visitor has no saved preference and no `?lang=` in the URL.
- **`meta.seo_title`** and **`meta.search_description`** — still drive the page title and meta description.
- **`testimonials[]`** — unchanged: `author`, `quote`, `project_ref`.
- **`site_logo`** — header logo. The frontend accepts `site_logo`, `logo`, or `header_logo`, whichever arrives first. Can be a plain URL string or an object with `url` and `alt`.
- **`cta_button_url`** — still drives the bottom CTA button's destination.

**Partially working:** `hero_heading`, `cta_heading`, `cta_button_text` are still requested and still rendered on the server, but get overwritten in the browser a moment later. See the next section.

---

## 5. The CMS is being overwritten in the browser — needs a decision

The site is bilingual, and right now every English and Spanish string lives in a hardcoded object inside the homepage's JavaScript. That script runs on every page load and replaces the text of a fixed list of elements, including some the CMS just filled in.

**The practical effect:** if an editor sets `hero_heading`, `cta_heading`, or `cta_button_text` in Wagtail, the server renders their value, then the script immediately swaps it back to the hardcoded string. The editor sees no change on the live page.

**Separately:** the client-side refresh function still tries to update the hero video and hero image using the *old* field names, targeting HTML elements that no longer exist. Those calls do nothing. The server-side render does read the new fields correctly, so the hero works — it just can't be updated at runtime.

**Two ways out, worth choosing deliberately:**

- **Option A:** Translations move into Wagtail (wagtail-localize, or per-language fields), and the frontend stops holding copy.
- **Option B:** The frontend keeps owning the copy, and we stop exposing those fields as editable in the CMS.

The current halfway state is the worst of both — the fields look editable but aren't.

---

## 6. Content not connected to the CMS at all

All of this is currently hardcoded in the frontend, in both languages, and is never requested from the API. Flagging it so nobody builds page-model fields expecting them to be picked up automatically.

- Hero eyebrow text and hero button label
- Projects section eyebrow, heading, and the "See all projects" button
- The entire About Us block — eyebrow, heading, both paragraphs, the "Our Brands" label, the two brand links, and the "Know more" button
- The entire footer — every link label, phone number, email address, physical address, and all social media links
- All English copy sitewide. Spanish is partly CMS-backed; English never is.

### Links currently pointing nowhere

These all use `href="#"` and need real destinations eventually:

- Projects "See all projects" button
- About Us "Know more" button
- All nine footer navigation links
- Both footer service sub-lists (residential and commercial)
- All five social media icons

---

## 7. Assets living in the frontend repo

These are committed files, not CMS uploads. If any should become editor-managed, they need page-model fields. The hero ones especially are placeholders awaiting real footage.

- `/videos/horizontal_video_placeholder.mp4` and `/videos/vertical_video_placeholder.mp4`
- `/images/pages/horizontal_video_static_image.png` and `/images/pages/vertical_video_static_image.png`
- `/images/pages/about_us.png` — the team photo
- `/logo_black.png` (header) and `/logo_grey.png` (footer)
- `/images/projects/` — the five project thumbnails currently referenced

---

## 8. How asset URLs are resolved

Useful if paths ever come back looking wrong.

When `PUBLIC_USE_API=true`, a relative path from Wagtail such as `/media/images/x.jpg` gets the API origin prefixed automatically, derived from `PUBLIC_API_URL`. Absolute `http(s)` URLs pass through untouched — so returning fully-qualified URLs is always safe.

One nuance specific to the hero fields: the origin is only prefixed onto values that genuinely came from the API. When the API is off, or a field is missing, the frontend falls back to its own local files and uses those paths as-is. This was a real bug earlier — local images were being prefixed with `http://localhost:8000` and breaking — so please don't collapse that branch if you touch it.
