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
- `featured_projects`, `team_members` y `values_slides` son arrays dinámicos con múltiples registros.
- Los catálogos **ya no viven en este payload**: se movieron a su propio endpoint (ver [CatalogIndex](#catalogindex--catálogos)) porque la home y la página de contacto renderizan el mismo carrusel. `fields.catalogs` y las claves `copy.catalogs_*` quedan obsoletas aquí; el backend puede dejar de serializarlas.
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
  }
}
```

### Reglas de implementación

- `featured_projects` es un array dinámico. Puede tener 1, 5, 12 o N registros; el frontend itera sobre el array sin asumir un número fijo.
- `team_members` es otro array dinámico. Cada elemento sigue el mismo esquema y puede tener varios miembros.
- `copy` debe ser un objeto con strings ya resueltos para el idioma solicitado. No se espera `copy.hero_heading` como objeto bilingüe.
- `contact_links` ya no forma parte de HomePage; vive en el bloque compartido de DirectContact.
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

## CatalogIndex — Catálogos

Fuente única de la lista de catálogos descargables. La renderizan tanto [index.astro](../src/pages/index.astro) como [contact-us.astro](../src/pages/contact-us.astro) a través del componente compartido [CatalogsCarousel.astro](../src/components/CatalogsCarousel.astro), por eso vive en su propio endpoint en lugar de repetirse dentro de cada página.

Mocks: [src/mocks/catalogs.en.json](../src/mocks/catalogs.en.json) y [src/mocks/catalogs.es.json](../src/mocks/catalogs.es.json).

Nota para el backend: el frontend pide **los dos idiomas** en build time (`?lang=en` y `?lang=es`) y deja ambos en el markup, porque el selector de idioma cambia el contenido sin recargar. Cada respuesta sigue siendo de un solo idioma, como el resto del contrato.

```json
{
  "type": "catalogs_cms.CatalogIndexPage",
  "title": "string",
  "locale": "en | es",
  "meta": {
    "seo_title": "string",
    "search_description": "string"
  },
  "fields": {
    "copy": {
      "catalogs_eyebrow": "string",
      "catalogs_heading": "string",
      "catalogs_prev_aria": "string",
      "catalogs_next_aria": "string",
      "catalogs_dot_aria": "string"
    },

    "catalogs": [
      {
        "title": "string",
        "image": {
          "url": "string",
          "alt": "string"
        },
        "file_url": "string | null"
      }
    ]
  }
}
```

### Reglas de implementación

- `catalogs` es un array dinámico; el carrusel pagina según el ancho de pantalla y no asume un número fijo de registros.
- `catalogs_dot_aria` es un prefijo: el frontend le agrega el número de página (`"Go to page" → "Go to page 3"`).
- `file_url` es el PDF descargable. Si viene `null` o vacío, la tarjeta se renderiza igual pero sin destino útil.
- El orden del array es el orden de presentación; el frontend no reordena.

## DirectContactBlock — Contacto directo compartido

Fuente única del bloque de contacto reutilizable que se renderiza al final de varias páginas. El frontend pide este bloque como contenido global independiente, no lo deriva de `home` ni de `collections`, para que Home, Collections y futuras páginas compartan la misma estructura y el mismo fallback.

Mocks: [src/mocks/direct-contact.en.json](../src/mocks/direct-contact.en.json) y [src/mocks/direct-contact.es.json](../src/mocks/direct-contact.es.json).

Nota para el backend: la respuesta debe venir ya localizada por idioma. Si el frontend pide inglés y español por separado, ambas respuestas deben mantener la misma forma para que el componente pueda cambiar de idioma sin recargar.

```json
{
  "type": "shared_cms.DirectContactBlock",
  "title": "string",
  "locale": "en | es",
  "fields": {
    "copy": {
      "contact_heading": "string",
      "contact_cta": "string"
    },
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

- Este bloque no vive dentro del payload de una página concreta; se trata como contenido global reutilizable.
- El frontend lo renderiza con ambas lenguas ya resueltas para permitir el cambio de idioma sin recargar.
- Si el endpoint dedicado no responde, el frontend cae a los mocks locales del bloque.

## CollectionIndexPage

Página de índice de colecciones referenciada por [collections.astro](../src/pages/collections.astro). Esta página no deriva su contenido de HomePage; usa su propio contrato y, aparte de eso, renderiza el bloque compartido de [DirectContactBlock](#directcontactblock--contacto-directo-compartido).

Mocks de referencia: [src/mocks/collections-page.en.json](../src/mocks/collections-page.en.json) y [src/mocks/collections-page.es.json](../src/mocks/collections-page.es.json).

Nota importante: igual que HomePage y ContactPage, la API devuelve un solo idioma por request. El frontend pide `?lang=en` y `?lang=es` por separado para poder renderizar ambos idiomas en el markup sin mezclar campos bilingües en una sola respuesta.

```json
{
  "type": "collections.CollectionIndexPage",
  "title": "string",
  "locale": "en | es",
  "meta": {
    "seo_title": "string",
    "search_description": "string"
  },
  "fields": {
    "hero_title": "string",
    "intro_text": "string",
    "empty_state_text": "string",
    "categories": [
      {
        "key": "string",
        "label": "string",
        "has_products": true,
        "types": [
          {
            "key": "string",
            "label": "string",
            "products": [
              {
                "title": "string",
                "slug": "string",
                "image": {
                  "url": "string",
                  "alt": "string"
                }
              }
            ]
          }
        ]
      },
      {
        "key": "string",
        "label": "string",
        "has_products": false,
        "types": [
          {
            "key": "string",
            "label": "string",
            "products": []
          }
        ]
      }
    ]
  }
}
```

### Reglas de implementación

- `categories` es dinámico y el frontend respeta el orden recibido.
- El backend o mock devuelve `hero_title`, `intro_text`, `empty_state_text` y `categories` ya localizados para un solo idioma por respuesta.
- Los productos de la categoría `shower-doors` se agrupan en la galería; las demás categorías pueden actuar como secciones informativas sin productos.
- Esta página no incluye `contact_links`; el bloque de contacto directo vive en el contrato separado de DirectContact.
- El frontend solicita `?lang=en` y `?lang=es` por separado para renderizar ambos idiomas con el mismo patrón que HomePage y ContactPage.

## RenovationIndexPage

Página de índice de renovaciones referenciada por [renovations.astro](../src/pages/renovations.astro). Sigue el mismo patrón que [CollectionIndexPage](#collectionindexpage): contrato propio, sin depender de HomePage, y renderiza el bloque compartido de [DirectContactBlock](#directcontactblock--contacto-directo-compartido) al final.

Mocks de referencia: [src/mocks/renovations-page.en.json](../src/mocks/renovations-page.en.json) y [src/mocks/renovations-page.es.json](../src/mocks/renovations-page.es.json).

Nota importante: igual que CollectionIndexPage, la API devuelve un solo idioma por request. El frontend pide `?lang=en` y `?lang=es` por separado para poder renderizar ambos idiomas en el markup sin mezclar campos bilingües en una sola respuesta.

```json
{
  "type": "renovations.RenovationIndexPage",
  "title": "string",
  "locale": "en | es",
  "meta": {
    "seo_title": "string",
    "search_description": "string"
  },
  "fields": {
    "hero_title": "string",
    "intro_text": "string",
    "empty_state_text": "string",
    "categories": [
      {
        "key": "string",
        "label": "string",
        "has_products": true,
        "types": [
          {
            "key": "string",
            "label": "string",
            "products": [
              {
                "title": "string",
                "slug": "string",
                "image": {
                  "url": "string",
                  "alt": "string"
                }
              }
            ]
          }
        ]
      },
      {
        "key": "string",
        "label": "string",
        "has_products": true,
        "show_type_filters": false,
        "types": [
          {
            "key": "string",
            "label": "string",
            "products": [
              {
                "title": "string",
                "slug": "string",
                "image": {
                  "url": "string",
                  "alt": "string"
                }
              }
            ]
          }
        ]
      },
      {
        "key": "string",
        "label": "string",
        "has_products": false,
        "types": [
          {
            "key": "string",
            "label": "string",
            "products": []
          }
        ]
      }
    ]
  }
}
```

### Reglas de implementación

- `categories` es dinámico y el frontend respeta el orden recibido.
- El backend o mock devuelve `hero_title`, `intro_text`, `empty_state_text` y `categories` ya localizados para un solo idioma por respuesta.
- Los productos de la categoría `commercial` se agrupan en la galería (2 columnas, imágenes en formato horizontal); `residential` es una sección informativa sin productos (`has_products: false`), igual que `storage-systems`/`complements` en CollectionIndexPage.
- `show_type_filters` es un campo opcional por categoría, propio de este contrato (no existe en CollectionIndexPage). Con `has_products: true`, controla si la categoría renderiza checkboxes de tipo en el panel de filtros:
  - Ausente o `true` (default): se renderiza la lista de tipos como checkboxes filtrables (comportamiento igual a `commercial`).
  - `false`: la categoría no expone filtros por tipo — el panel se renderiza vacío — pero sus productos sí aparecen en la galería al expandirla. Así se modela `partners`, que tiene un solo grupo de productos sin sub-tipos.
- Esta página no incluye `contact_links`; el bloque de contacto directo vive en el contrato separado de DirectContact.
- El frontend solicita `?lang=en` y `?lang=es` por separado para renderizar ambos idiomas con el mismo patrón que HomePage, ContactPage y CollectionIndexPage.

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

### `/collections/product` — campos implementados

[src/pages/collections/product.astro](../src/pages/collections/product.astro) implementa la
página completa de un `ModelPage`: hero + dos imágenes de ancho completo intercaladas con
texto + un par de imágenes + bloque de título; una sección de información técnica (eyebrow +
encabezado — reutiliza `product_heading`, no un campo aparte — dos ilustraciones y una lista
de enlaces de descarga); y un bloque de productos relacionados (título de la colección + botón
de vuelta al menú + hasta 4 tarjetas), seguido del componente compartido `DirectContact` (ver
[DirectContact.astro](../src/components/DirectContact.astro) y
[direct-contact.ts](../src/lib/direct-contact.ts), que ya tienen su propio contrato vía el
payload de home).

A diferencia de `collections.astro`, este endpoint **sigue la regla general** del documento:
un solo idioma ya resuelto por respuesta, sin pares `_en`. El frontend pide `?lang=en` y
`?lang=es` por separado en build time y conserva ambos en el markup (el mismo patrón que
`ContactPage` y `CatalogIndex` — ver [product-content.ts](../src/lib/product-content.ts)),
en vez del convenio base-español + hermano `_en` que el bloque introductorio usó en un borrador
anterior de este documento. Mocks de referencia:
[src/mocks/product-page.en.json](../src/mocks/product-page.en.json) y
[src/mocks/product-page.es.json](../src/mocks/product-page.es.json).

#### Contrato de URL y búsqueda por producto real

La ruta real del detalle no es una sola página fija llamada `/collections/product` para todos
los productos. El frontend ahora soporta URLs dinámicas de la forma:

```text
/collections/<category>/<type>/<model>
```

Ejemplo:

```text
/collections/shower-doors/fixed/model-1
/collections/shower-doors/pivot/model-1
```

La API debe resolver el producto por el slug completo, no por una sola página genérica. Es decir,
el backend debe aceptar un filtro de `slug` y devolver solo el `ModelPage` correspondiente.

```http
GET /api/products?lang=en&slug=shower-doors/fixed/model-1
```

Respuesta esperada:

```json
{
  "type": "collections.ModelPage",
  "title": "Name of the Product",
  "slug": "shower-doors/fixed/model-1",
  "locale": "en",
  "meta": {
    "seo_title": "Product | Policrafters",
    "search_description": "Discover Policrafters' fixed shower door model"
  },
  "fields": {
    "collection": {
      "name": "Shower Doors",
      "slug": "shower-doors"
    },
    "product_heading": "NAME OF THE PRODUCT",
    "hero_image": { "url": "/media/...jpg", "alt": "Fixed tempered-glass shower door" },
    "intro_text_1": "...",
    "secondary_image": { "url": "/media/...jpg", "alt": "..." },
    "intro_text_2": "...",
    "gallery_pair": [
      { "url": "/media/...jpg", "alt": "..." },
      { "url": "/media/...jpg", "alt": "..." }
    ],
    "technical_eyebrow": "Technical Information",
    "technical_image_product": { "url": "/media/...svg", "alt": "..." },
    "technical_image_dimensions": { "url": "/media/...svg", "alt": "..." },
    "download_heading": "DOWNLOAD",
    "download_links": [
      { "label": "Technical Sheet PDF", "url": "/media/...pdf" }
    ],
    "related_models": [
      {
        "title": "Product 1",
        "slug": "shower-doors/fixed/model-1",
        "thumbnail": { "url": "/media/...jpg", "alt": "Fixed shower door" }
      }
    ],
    "back_to_menu_label": "Back to products menu"
  }
}
```

Esto es importante porque la colección lista productos con `slug` completo, y la página de detalle
**debe resolver exactamente ese producto**. No se puede devolver siempre el mismo payload de
`/collections/product` para cada imagen clickeada.

El resto del contrato de `ModelPage` (`specs`, `gallery`, `brand`, `breadcrumbs`) sigue
pendiente de construirse en el frontend y no cambia. Estos campos se suman a `fields` arriba:

```json
{
  "fields": {
    "hero_image": { "url": "string", "alt": "string" },
    "intro_text_1": "string",
    "secondary_image": { "url": "string", "alt": "string" },
    "intro_text_2": "string",
    "gallery_pair": [
      { "url": "string", "alt": "string" }
    ],
    "product_eyebrow": "string",
    "product_heading": "string",
    "product_body": "string",
    "technical_eyebrow": "string",
    "technical_image_product": { "url": "string", "alt": "string" },
    "technical_image_dimensions": { "url": "string", "alt": "string" },
    "download_heading": "string",
    "download_links": [
      { "label": "string", "url": "string" }
    ],
    "collection": { "name": "string", "slug": "string" },
    "related_models": [
      { "title": "string", "slug": "string", "thumbnail": { "url": "string", "alt": "string" } }
    ],
    "back_to_menu_label": "string"
  }
}
```

- `technical_image_product` y `technical_image_dimensions` son dos campos nombrados en
  vez de un array, porque cada ilustración tiene un rol, proporción y ancho de columna
  distintos en el layout — acceder por índice sería frágil.
- `download_links[].url` es `"#"` en el mock; se espera que el backend lo alimente con
  URLs reales de documentos de Wagtail (PDF, DWG, etc.). El array es dinámico y el
  frontend renderiza el orden tal como llega, sin reordenar.
- El frontend renderiza **como máximo 4** `related_models` (recorta el array si trae
  más) — el backend no necesita limitarlo.
- `back_to_menu_label` es el único campo sin equivalente previo en el contrato de
  `ModelPage`; el resto (`collection`, `related_models`) ya estaba definido ahí.
- `collection.slug` arma el enlace de vuelta como `/collections?category=<slug>`, por lo
  que debe coincidir con un `key` de categoría del mock
  [collections-page.json](../src/mocks/collections-page.json)
  (`fields.categories[].key`, p. ej. `shower-doors`). `CollectionIndexPage` en sí sigue
  pendiente de contrato formal — ver "Pendiente de definir" al final de este documento.

## ContactPage (contenido de página)

Contrato de contenido para [contact-us.astro](../src/pages/contact-us.astro),
exclusivo para textos y bloques visibles fuera del formulario. El formulario
mantiene sus labels/placeholders hardcodeados en frontend por ahora; este endpoint
no reemplaza el contrato de leads.

Endpoint sugerido para este payload: `PUBLIC_CONTACT_PAGE_API_URL`.

Mocks de referencia:
- [src/mocks/contact-page.en.json](../src/mocks/contact-page.en.json)
- [src/mocks/contact-page.es.json](../src/mocks/contact-page.es.json)

```json
{
  "type": "contact_cms.ContactPage",
  "title": "string",
  "locale": "en | es",
  "meta": {
    "seo_title": "string",
    "search_description": "string"
  },
  "fields": {
    "copy": {
      "heading": "string",
      "intro": "string",
      "phone_label": "string",
      "email_label": "string",
      "locations_heading": "string",
      "locations_aria": "string",
      "learn_more": "string"
    },
    "contact": {
      "phone_display": "string",
      "phone_href": "string | null",
      "email": "string"
    },
    "locations": [
      {
        "name": "string",
        "address_label": "string",
        "street": "string",
        "city": "string",
        "url": "string",
        "image": {
          "url": "string",
          "alt": "string"
        }
      }
    ]
  }
}
```

### Reglas de implementación

- La API devuelve un solo idioma por request (`?lang=en` o `?lang=es`) y el
  frontend solicita ambos en build time para permitir cambio de idioma sin recarga.
- `locations` es dinámico y ordenado: el frontend respeta el orden recibido y no
  asume cantidad fija de tarjetas.
- `contact.phone_href` puede venir nulo o vacío; en ese caso el frontend calcula
  `tel:` desde `phone_display` como fallback.
- `meta.seo_title` y `meta.search_description` alimentan el `title` y `description`
  de la página de contacto.

---

## Formulario de contacto (leads)

A diferencia del resto de este documento, este contrato es de **escritura**: el sitio
envía datos al backend, no los recibe. Lo consume [src/pages/contact-us.astro](../src/pages/contact-us.astro),
que hace `POST` a la URL definida en `PUBLIC_CONTACT_API_URL`. Si esa variable está
vacía, el formulario valida pero no envía y le pide al visitante que escriba a
`info@policrafters.com`.

**Estado: borrador propuesto por el frontend.** Debe acordarse con el backend antes de
desplegarse; la ruta final (`POST /api/leads/from-web/`) sigue pendiente.

### Request

`POST` con `Content-Type: application/json`:

```json
{
  "name": "string",
  "email": "string",
  "company": "string",
  "message": "string",
  "phone": "string",
  "phone_country": "US | CA | MX | CO | ES",
  "locale": "en | es"
}
```

- `company` y `phone` son opcionales y llegan como `""` cuando el visitante no los completa.
- `phone` llega normalizado a dígitos con prefijo internacional (`+18138120650`) o `""`.
  `phone_country` es el ISO elegido en el selector de país.
- `locale` es el idioma activo en el sitio al momento del envío — sirve para responderle
  al lead en su idioma.
- Todos los strings llegan con espacios recortados (`trim`).

### Response

- `2xx` — el frontend limpia el formulario y muestra el mensaje de éxito. El cuerpo no se lee.
- Cualquier otro código o fallo de red — el frontend conserva lo escrito y muestra un
  error con el correo de contacto como alternativa.

### Validación y seguridad (responsabilidad del backend)

El frontend valida y normaliza **solo para la experiencia de usuario**. Cualquiera puede
saltarse la página y hacer `POST` directo al endpoint, así que el backend debe asumir que
no existe validación previa:

- [ ] **Revalidar todo**: tipos, obligatoriedad (`name`, `email`, `message`) y formato de correo.
- [ ] **Límites de longitud** propios. El formulario aplica `maxlength` de 100 (name),
      254 (email), 120 (company), 25 (phone) y 2000 (message); el backend debe imponer
      los mismos por su cuenta, más un tope de tamaño del cuerpo.
- [ ] **Inyección de cabeceras de correo**: si algún campo termina en `From`, `Reply-To` o
      `Subject`, eliminar CR/LF. Usar `EmailMessage` de Django (lanza `BadHeaderError`) en
      lugar de concatenar cabeceras a mano.
- [ ] **Rate limiting por IP** — es la defensa real contra spam.
- [ ] **CORS**: permitir solo el origen del sitio. Al ser un frontend estático y separado,
      el flujo de CSRF por cookie de Django no aplica; la lista de orígenes más el rate
      limiting ocupan su lugar.
- [ ] **No sanitizar en escritura.** Guardar el texto tal cual y escapar en el punto de
      uso (las plantillas de Django y el admin de Wagtail ya lo hacen). Escapar antes de
      guardar corrompe nombres legítimos como `O'Brien` o `Muñoz`.

El formulario ya incluye un honeypot (campo `website`, oculto fuera de pantalla) y un
descarte por envío en menos de 2 segundos. Ambos se resuelven en el cliente y **no** viajan
en el payload, así que no reemplazan al rate limiting del servidor.

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

- [ ] `RenovationPage`
- [ ] `ServicePage`
- [ ] `BrandPage`
- [x] `ContactPage` (contenido visual de `/contact-us`, excluye formulario)
- [x] Endpoint de leads (`POST /api/leads/from-web/` en el CRM) — ver [Formulario de contacto (leads)](#formulario-de-contacto-leads). Borrador del frontend, pendiente de acordar la ruta final con el backend.
