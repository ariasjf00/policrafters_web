# API Contract — Policrafters Web

Contrato de datos entre el backend (`policrafters-cms`, Wagtail) y el frontend (`policrafters-web`, Astro).

**Propósito:** permitir que backend y frontend se desarrollen en paralelo. El frontend construye componentes contra mocks locales que respetan exactamente esta forma; el backend configura los `api_fields` de Wagtail para que la respuesta real coincida campo por campo. Cuando ambos lados están listos, el frontend solo cambia la URL del `fetch` (de un mock local a la API real) — sin retrabajo, siempre que el contrato se haya respetado de los dos lados.

Este documento vive en `Docs/API_CONTRACT.md` en ambos repos (mismo archivo, referencia compartida). Cualquier cambio a la forma de estos JSON debe actualizarse aquí primero y comunicarse entre ambos desarrolladores antes de implementarse.

---

## Convenciones generales

- `locale`: `"en"` o `"es"`, según el idioma de la página consultada.
- Todo campo de imagen sigue la forma `{ "url": "string", "alt": "string" }`.
- Campos opcionales/nulos se marcan explícitamente como `"string | null"`.
- `meta.seo_title` y `meta.search_description` vienen de los campos SEO nativos de Wagtail — siempre presentes, pueden estar vacíos.
- Las migas de pan (`breadcrumbs`) se exponen ya armadas desde la API — no se recalculan en el frontend, porque en Wagtail salen naturalmente del árbol de páginas.

---

## HomePage

```json
{
  "type": "home_cms.HomePage",
  "title": "string",
  "locale": "en | es",
  "meta": {
    "seo_title": "string",
    "search_description": "string"
  },
  "fields": {
    "hero_video_url": "string | null",
    "hero_image_fallback": { "url": "string", "alt": "string" },
    "hero_heading": "string",
    "hero_subheading": "string",
    "intro_text": "string",
    "featured_projects": [
      {
        "title": "string",
        "slug": "string",
        "thumbnail": { "url": "string", "alt": "string" },
        "location": "string"
      }
    ],
    "featured_brands": [
      {
        "name": "string",
        "slug": "string",
        "logo": { "url": "string", "alt": "string" }
      }
    ],
    "testimonials": [
      {
        "author": "string",
        "quote": "string",
        "project_ref": "string | null"
      }
    ],
    "cta_heading": "string",
    "cta_button_text": "string",
    "cta_button_url": "string"
  }
}
```

## ModelPage

Página de un modelo/producto individual dentro de una colección (referencia: falper.it).

```json
{
  "type": "collections.ModelPage",
  "title": "string",
  "slug": "string",
  "locale": "en | es",
  "meta": {
    "seo_title": "string",
    "search_description": "string"
  },
  "fields": {
    "hero_image": { "url": "string", "alt": "string" },
    "short_description": "string",
    "specs": [
      { "label": "string", "value": "string" }
    ],
    "gallery": [
      { "url": "string", "alt": "string" }
    ],
    "pdf_datasheet": "string | null",
    "brand": {
      "name": "string",
      "slug": "string",
      "logo": { "url": "string", "alt": "string" }
    },
    "collection": {
      "name": "string",
      "slug": "string"
    },
    "related_models": [
      {
        "title": "string",
        "slug": "string",
        "thumbnail": { "url": "string", "alt": "string" }
      }
    ]
  },
  "breadcrumbs": [
    { "title": "string", "url": "string" }
  ]
}
```

---

## Cómo lo usa cada lado

**Frontend (Astro):**
- Crear `src/mocks/home.json` y `src/mocks/model-page.json` con datos falsos que respeten esta forma exacta.
- Construir los componentes (layout, GSAP, Tailwind) consumiendo esos mocks.
- Cuando el endpoint real exista, cambiar el `fetch` de la ruta del mock a `WAGTAIL_API_URL` (ver `.env.local`).

**Backend (Wagtail):**
- Al definir `HomePage` y `ModelPage`, configurar `api_fields` para que `wagtail.api.v2` devuelva exactamente esta estructura.
- Cualquier cambio de nombre o tipo de campo debe reflejarse primero aquí y avisarse al frontend antes de desplegarse.

---

## Pendiente de definir (próximos contratos)

- [ ] `CollectionIndexPage`
- [ ] `RenovationPage`
- [ ] `ServicePage`
- [ ] `BrandPage`
- [ ] Endpoint de leads (`POST /api/leads/from-web/` en el CRM) — payload de envío desde los formularios del sitio
