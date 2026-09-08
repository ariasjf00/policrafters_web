# Kickoff Policrafters — Preguntas para el cliente

**Para:** Fernando Arias
**De:** David Panesso
**Reunión:** dueño de Policrafters + diseñador web
**Objetivo de esta revisión:** acordar cuáles de estas preguntas se hacen en vivo (15 min) y cuáles se resuelven por correo.

**Instrucciones:** marca `[x]` en "Preguntar en vivo" las que consideres críticas. Anota tus comentarios al final de cada bloque.

---

## Contexto que conviene tener presente

La propuesta comercial y los mockups describen dos sitios distintos:

- **La propuesta cotiza:** Home, About Us, Services, Portfolio, Before & After, Gallery, Testimonials, Blog, Contact, FAQ.
- **Los mockups muestran:** Collections, Renovations, Services, Brands, Contact Us, Catálogos, Locations, Projects.
- **Ninguno de los dos incluye lo del otro.**

Además, el documento de textos pide que Collections funcione como `falper.it` (submenú filtrable, ficha por modelo, descarga con captura de datos, breadcrumbs estilo Boffi). Con Astro + Wagtail es construible, pero necesitamos definir el modelo de datos y varias semanas de calendario. Por eso la pregunta 1 abre la lista.

*Nota: el área de Partners (Login) queda fuera de este alcance — Me imagion que viene a ser el CRM? se construye en otro proyecto?*

---

## Bloque A — Alcance y requerimientos de negocio

### 1. Sitemap definitivo
¿Cuál es la lista de páginas aprobada y final? La propuesta y los mockups no coinciden.

- [ ] Preguntar en vivo
- Respuesta:

### 2. Alcance real de Collections
¿Catálogo navegable tipo Falper (submenú filtrable, ficha por modelo, breadcrumbs) o galería visual? Define el modelo de contenido en Wagtail y el cronograma.

- [ ] Preguntar en vivo
- Respuesta:

### 3. Volumen del catálogo
¿Cuántas colecciones y modelos al lanzamiento, y cuántos en 12 meses? Define filtros, paginación y esfuerzo de carga inicial.

- [ ] Preguntar en vivo
- Respuesta:

### 4. Campos por modelo
¿Qué lleva cada producto? (nombre, descripción, acabados, medidas, variantes, ficha técnica, PDF, galería). Sin esto no se puede modelar el CMS.

- [ ] Preguntar en vivo
- Respuesta:

### 5. Descarga de catálogos con captura de datos
¿Se mantiene? ¿Qué campos se piden, se verifica el email, y a dónde llegan esos leads?

- [ ] Preguntar en vivo
- Respuesta:

### 6. Secciones de la propuesta que no están en los mockups
Before & After, Testimonials, FAQ y Blog: ¿siguen en alcance y hay contenido real para ellos?

- [ ] Preguntar en vivo
- Respuesta:

### 7. Formularios e integraciones
¿Qué formularios existen y a dónde llega cada envío? ¿Se conservan el agendamiento de citas y el newsletter del sitio actual?

- [ ] Preguntar en vivo
- Respuesta:

### 8. Marcas
¿Lista definitiva y destino de cada logo (sitio externo o sección interna)? El documento dice cuatro marcas, el mockup muestra tres, el texto de About Us menciona dos.

- [ ] Preguntar en vivo
- Respuesta:

### 9. Ubicaciones
"Our Locations" muestra cuatro sedes con la misma dirección: ¿son reales? Afecta plantilla de ubicaciones y SEO local.

- [ ] Preguntar en vivo
- Respuesta:

**Comentarios del bloque A:**

---

## Bloque B — Contenido

### 10. Responsable y fechas del copy final
¿Quién redacta, en qué idioma se escribe primero, quién aprueba y con qué fecha comprometida por sección? Es el bloqueante real de las 8–10 semanas.

- [ ] Preguntar en vivo
- Respuesta:

### 11. Traducción al español
¿La entregan ustedes o la producimos nosotros? ¿Incluye fichas técnicas y PDFs? El CMS gestiona los idiomas, pero no genera el texto.

- [ ] Preguntar en vivo
- Respuesta:

### 12. Datos de contacto canónicos
Hoy conviven dos teléfonos —(813) 812-0650 y (917) 767-5030— y dos correos, info@ e interiors@. ¿Cuáles son los buenos?

- [ ] Preguntar en vivo
- Respuesta:

### 13. Textos legales
Terms & Conditions, Warranty, Privacy Policy y aviso de cookies: ¿quién los redacta y entrega?

- [ ] Preguntar en vivo
- Respuesta:

### 14. Equipo
Para "The people behind the craft": ¿nombres, cargos y fotos reales, con autorización de uso de imagen?

- [ ] Preguntar en vivo
- Respuesta:

### 15. Proyectos
¿Cada uno viene con nombre, ubicación, año y descripción reales? Los mockups usan "Project Name" y lorem ipsum.

- [ ] Preguntar en vivo
- Respuesta:

**Comentarios del bloque B:**

---

## Bloque C — Assets

### 16. Canal y formato de entrega
Pedimos originales sin comprimir (imágenes ≥2500px, logo en SVG o AI, PDFs finales) en una carpeta compartida con nomenclatura por sección. ¿Por dónde se entregan?

- [ ] Preguntar en vivo
- Respuesta:

### 17. Video del hero
¿Existe? Duración, resolución, versión vertical para móvil, con o sin audio, imagen de respaldo.

- [ ] Preguntar en vivo
- Respuesta:

### 18. Derechos de imagen
Las fotos de proyectos: ¿reales o renders? ¿Tenemos derechos de uso y autorización de los clientes finales?

- [ ] Preguntar en vivo
- Respuesta:

### 19. Marca y tipografía
¿Hay manual del logo nuevo (versiones, colores exactos, favicon, imagen para redes)? ¿Compran licencia web de Helvetica Neue o usamos una alternativa métricamente compatible?

- [ ] Preguntar en vivo
- Respuesta:

### 20. Figma y diseño móvil
¿Acceso al Figma con medidas y estados? ¿Diseño móvil de páginas internas (ficha de producto, listado de proyectos, blog, 404, estados de formulario)? Hoy solo tenemos JPEG de escritorio.

- [ ] Preguntar en vivo
- Respuesta:

**Comentarios del bloque C:**

---

## Bloque D — Accesos y migración

### 21. Control de accesos
¿Quién controla dominio, DNS, hosting actual en Duda, Google Analytics, Search Console y redes? Lo necesitamos temprano para preparar los redirects 301 de las URLs `/portfolio/*` ya indexadas.

- [ ] Preguntar en vivo
- Respuesta:

**Comentarios del bloque D:**

---

## Selección propuesta para los 15 minutos

Las que cuestan caro si se responden tarde:

| # | Pregunta | ¿De acuerdo? |
|---|----------|--------------|
| 1 | Sitemap definitivo | [ ] Sí  [ ] No |
| 2 | Alcance real de Collections | [ ] Sí  [ ] No |
| 10 | Quién entrega el contenido y cuándo | [ ] Sí  [ ] No |
| 16 | Canal y formato de assets | [ ] Sí  [ ] No |
| 20 | Figma y diseño móvil | [ ] Sí  [ ] No |
| 21 | Accesos y dominio | [ ] Sí  [ ] No |

**Sustituciones sugeridas por el revisor:**

**A resolver por correo (no ocupan reunión):** 12, 13, 14, 15 y las demás no marcadas.

---

## Acuerdos de la reunión

| Tema | Acuerdo | Responsable | Fecha |
|------|---------|-------------|-------|
|      |         |             |       |
|      |         |             |       |
|      |         |             |       |
|      |         |             |       |
