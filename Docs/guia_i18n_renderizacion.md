# Guía de i18n y renderización (caso colecciones)

Este documento resume el cambio efectivo que resolvió el problema de traducciones EN/ES en la página de colecciones y define el patrón a replicar en nuevas páginas.

## 1. Cambio clave: evitar CORS en fetch del cliente

Problema previo:
- El navegador intentaba pedir datos directo a localhost:8000.
- Eso fallaba por CORS desde localhost:4321.

Solución aplicada:
- En desarrollo, el cliente consume un endpoint relativo proxificado por Astro.
- En producción, sigue usando la URL real del backend.

Implementación aplicada:
- En [src/pages/colecciones.astro](src/pages/colecciones.astro):
  - Se define apiUrl para servidor.
  - Se define clientApiUrl con ruta relativa en DEV.
- En [astro.config.mjs](astro.config.mjs):
  - Se configura el proxy /wagtail-api hacia localhost:8000.

Patrón:
- clientApiUrl = DEV ? /wagtail-api/... : apiUrl
- El script del cliente siempre hace fetch a clientApiUrl.

## 2. Cambio clave: rehidratación localizada por idioma

Problema previo:
- El HTML inicial podía quedar en español.
- Al cambiar a inglés, si no se reaplicaba contenido localizado, el usuario seguía viendo ES.

Solución aplicada:
- Al iniciar en cliente, se detecta idioma activo por query param lang o fallback.
- Se hace fetch con locale del idioma activo.
- Se valida la locale devuelta por API antes de aplicar al DOM.
- Se actualiza el contenido visible con la respuesta localizada.

Implementación aplicada:
- En [src/pages/colecciones.astro](src/pages/colecciones.astro):
  - fetchCollectionsPayload(lang)
  - applyApiPayload(payload, lang)

Notas:
- Se prueban variantes de locale (ejemplo: en, en-us, en-gb) para tolerancia de backend.
- Se evita aplicar una respuesta que venga en locale distinto al solicitado.

## 3. Cambio clave: eliminar traducción mock hardcodeada

Problema previo:
- Si fallaba API, aparecía un inglés simulado desde texto local.
- Eso enmascaraba errores reales de integración.

Solución aplicada:
- Se eliminó el fallback de traducción inventada en cliente.
- El contenido traducido debe venir del backend o mantener contenido actual sin falsos positivos.

Implementación aplicada:
- En [src/pages/colecciones.astro](src/pages/colecciones.astro):
  - Se retiró bloque de traducción hardcodeada para EN.

## 4. Ajuste importante: actualizar también hero de layout

Problema observado:
- Cards e intro podían pasar a EN, pero el hero superior quedaba en ES.

Solución aplicada:
- Se agregaron nodos identificables en el layout.
- Se actualizan esos nodos desde el flujo de aplicación de payload.

Implementación aplicada:
- En [src/layouts/PageLayout.astro](src/layouts/PageLayout.astro):
  - IDs para título y subtítulo de hero.
- En [src/pages/colecciones.astro](src/pages/colecciones.astro):
  - applyApiPayload actualiza hero + contenido de sección.

## 5. Checklist para nuevas páginas

1. Definir apiUrl (servidor) y clientApiUrl (cliente con proxy en DEV).
2. En SSR inicial, respetar lang en la consulta al backend.
3. En cliente, detectar idioma activo y hacer refetch localizado.
4. Validar payload.locale antes de renderizar.
5. Aplicar contenido traducido a todos los nodos visibles (incluyendo hero/layout).
6. Evitar traducciones hardcodeadas como fallback de idioma.
7. Mantener configuración de entorno en [.env.local](.env.local):
   - PUBLIC_USE_API=true
   - PUBLIC_API_URL=http://localhost:8000/api/home/
   - PUBLIC_COLLECTIONS_API_URL=http://localhost:8000/api/collections/

## 6. Resultado esperado del patrón

- Cambio de idioma consistente entre SSR y cliente.
- Sin bloqueos por CORS en desarrollo.
- Sin estados mixtos (hero en ES, cards en EN).
- Sin falsos positivos por traducción mock local.
