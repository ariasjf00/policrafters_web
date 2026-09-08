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

## HomePage (contrato nuevo para diseño actual)

Este contrato refleja el diseño real de la home y compatibiliza con [src/mocks/home.json](../src/mocks/home.json) y [src/pages/index.astro](../src/pages/index.astro).

Importante:
- `featured_projects`, `team_members`, `values_slides`, `catalogs` y `contact_links` son arrays dinámicos con múltiples registros.
- La API devuelve un solo idioma por respuesta: `locale` indica el idioma resuelto y el backend debe devolver inglés por defecto cuando `lang` no venga o no sea válido.
- `fields.copy` contiene strings ya localizados; el frontend no espera objetos bilingües dentro de la misma respuesta.
- Los arrays también vienen ya localizados, sin pares base + `_en`.

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
    "copy": {
      "hero_eyebrow": "string",
      "hero_heading": "string",
      "hero_cta": "string",
      "projects_eyebrow": "string",
      "projects_heading": "string",
      "projects_cta": "string",
      "projects_prev_aria": "string",
      "projects_next_aria": "string",
      "projects_carousel_aria": "string",
      "projects_dot_aria": "string",
      "about_eyebrow": "string",
      "about_heading": "string",
      "about_body_1": "string",
      "about_body_2": "string",
      "about_brands_label": "string",
      "about_cta": "string",
      "team_eyebrow": "string",
      "team_heading": "string",
      "values_eyebrow": "string",
      "values_heading": "string",
      "values_prev_aria": "string",
      "values_next_aria": "string",
      "values_carousel_aria": "string",
      "values_dot_aria": "string",
      "catalogs_eyebrow": "string",
      "catalogs_heading": "string",
      "catalogs_prev_aria": "string",
      "catalogs_next_aria": "string",
      "catalogs_dot_aria": "string",
      "contact_heading": "string",
      "contact_cta": "string"
    },

    "hero_video_horizontal": "string | null",
    "hero_video_vertical": "string | null",
    "hero_image_horizontal": {
      "url": "string",
      "alt": "string"
    },
    "hero_image_vertical": {
      "url": "string",
      "alt": "string"
    },
    "site_logo": {
      "url": "string",
      "alt": "string"
    },

    "featured_projects": [
      {
        "title": "string",
        "slug": "string",
        "thumbnail": {
          "url": "string",
          "alt": "string"
        },
        "description": "string"
      }
    ],

    "team_members": [
      {
        "name": "string",
        "role": "string",
        "photo": {
          "url": "string",
          "alt": "string"
        },
        "bio": "string"
      }
    ],

    "values_slides": [
      {
        "title": "string",
        "image": {
          "url": "string",
          "alt": "string"
        },
        "description": "string"
      }
    ],

    "catalogs": [
      {
        "title": "string",
        "image": {
          "url": "string",
          "alt": "string"
        },
        "file_url": "string | null"
      }
    ],

    "contact_links": [
      {
        "title": "string",
        "description": "string",
        "url": "string"
      }
    ]
  }
}
```

### Reglas de implementación

- `featured_projects` es un array dinámico. Puede tener 1, 5, 12 o N registros; el frontend itera sobre el array sin asumir un número fijo.
- `team_members` es otro array dinámico. Cada elemento sigue el mismo esquema y puede tener varios miembros.
- `copy` debe ser un objeto con strings ya resueltos para el idioma solicitado. No se espera `copy.hero_heading` como objeto bilingüe.
- El backend debe resolver el idioma antes de serializar la respuesta; el frontend no hace merge de `es` y `en`.
- Cuando el frontend recibe una respuesta, debe poder renderizar `featured_projects` y `team_members` sin cambios en la estructura, solo con nuevos datos.

### Ejemplo realista

```json
{
  "type": "home_cms.HomePage",
  "title": "Policrafters",
  "locale": "es",
  "meta": {
    "seo_title": "Policrafters | Diseño y mobiliario",
    "search_description": "Mobiliario y diseño de interiores premium."
  },
  "fields": {
    "copy": {
      "hero_eyebrow": "DONDE LA INNOVACIÓN SE ENCUENTRA CON EL DISEÑO",
      "hero_heading": "Tu Socio Experto en Interiores y Arquitectura"
    },
    "featured_projects": [
      {
        "title": "Easy Slide",
        "slug": "easy-slide",
        "thumbnail": { "url": "/images/projects/Easy_Slide.png", "alt": "Easy Slide" },
        "description": "Sistema de puertas corredizas de bajo perfil."
      },
      {
        "title": "Pergola Thermal",
        "slug": "pergola-thermal",
        "thumbnail": { "url": "/images/projects/Pergola_Thermal.png", "alt": "Pergola Thermal" },
        "description": "Estructura térmica resistente pensada para exteriores."
      }
    ],
    "team_members": [
      {
        "name": "María López",
        "role": "Diseñadora de interiores",
        "photo": { "url": "/images/team/maria.jpg", "alt": "María López" },
        "bio": "Especialista en espacios residenciales y comerciales."
      }
    ]
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
