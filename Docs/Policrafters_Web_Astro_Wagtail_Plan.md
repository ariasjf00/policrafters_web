# Policrafters Web — Astro + Wagtail (headless)
### Documentación de arquitectura y plan de implementación

**Fecha:** julio 2026
**Contexto:** Policrafters ya tiene un CRM en producción (Django monolito + PostgreSQL + Docker Compose + Traefik) en `policrafters.ancous.tech`, alojado en un VPS KVM de Hostinger. Este documento define la arquitectura y el plan para el nuevo sitio web público en `policrafters.com`, separado del CRM.

---

## 1. Decisión de arquitectura

**No se fusiona el sitio web con el CRM.** Se construyen como dos proyectos independientes (repos, despliegues y bases de datos separadas), compartiendo únicamente infraestructura de bajo nivel (mismo VPS, mismo Traefik, mismo servidor PostgreSQL con bases de datos distintas, mismo Redis con namespaces distintos).

### Razones para mantenerlos separados
- **Ciclos de vida distintos**: el sitio lo edita el cliente casi a diario (contenido, fotos, colecciones); el CRM lo edita el desarrollador. Compartir codebase arriesga el sistema de cotizaciones con cada cambio de contenido.
- **Superficie de ataque distinta**: el sitio es público con formularios abiertos; el CRM guarda datos de cotizaciones y clientes. No deben compartir proceso ni base de datos.
- **Modelos de datos incompatibles**: Wagtail trabaja con árboles de páginas, StreamFields y renditions de imágenes — un dominio de datos totalmente distinto al de `Lead`/`Opportunity`/`Quote` del CRM.
- **Escalado y dominios independientes**: `policrafters.com` (público, SEO crítico, picos de tráfico por campañas) vs `policrafters.ancous.tech` (interno, uso predecible).

### Stack elegido
| Capa | Tecnología |
|---|---|
| Frontend | Astro (SSG — sitio estático) |
| Animaciones | GSAP + CSS + Astro View Transitions |
| CMS | Wagtail sobre Django (headless, API v2) |
| Base de datos | PostgreSQL (nueva DB `policrafters_cms` en el mismo servidor Postgres del CRM) |
| Cache | Redis existente del CRM, namespace/DB distinto |
| Imágenes/media | Cloudflare R2 (S3-compatible) vía `django-storages` |
| Hosting | Mismo VPS KVM de Hostinger, mismo Traefik |
| CI/CD | GitHub Actions (build) + rsync/SSH (deploy) |

### Por qué Astro estático (SSG) y no SSR
Un KVM compartido con el CRM no debe cargar con un proceso Node corriendo 24/7 ni con builds pesados en cada request. Se eligió:
- **Astro en modo `static`**, con rebuild automático disparado por un webhook de Wagtail al publicar contenido.
- El build se ejecuta en **GitHub Actions** (cómputo gratuito de CI), no en el VPS.
- Solo se despliega al VPS el resultado (`dist/`) vía rsync/SSH — el VPS termina sirviendo archivos estáticos puros detrás de Traefik.
- Los formularios dinámicos (captura de leads, descarga de PDFs con gate de datos) se implementan como *islands* de Astro (`client:load`) que llaman directamente al backend (CRM) vía `fetch`, no como rutas SSR.

### Puente entre el sitio y el CRM
Cada formulario de contacto o descarga de PDF/imagen en el sitio dispara una llamada a un endpoint interno del CRM (`POST /api/leads/from-web/`), creando automáticamente una `Opportunity` en la etapa `prospect` con `source=website`, reutilizando el pipeline de CRM ya construido.

---

## 2. Diagrama — arquitectura general

```mermaid
flowchart TB
    T[Traefik<br/>Reverse proxy + dominios]
    T --> CRM
    T --> CMS

    subgraph CRM["CRM Policrafters — policrafters.ancous.tech"]
        CRMWEB[Django CRM<br/>Leads, cotizador, PDF]
        CRMDB[(PostgreSQL · crm_db)]
    end

    subgraph CMS["Sitio web headless — policrafters.com"]
        ASTRO[Astro estático<br/>servido por Traefik]
        WAGTAIL[Django + Wagtail<br/>API headless en cms.policrafters.com]
        CMSDB[(PostgreSQL · policrafters_cms)]
    end

    ASTRO -- "build time: fetch contenido" --> WAGTAIL
    WAGTAIL --- CMSDB
    ASTRO -- "leads / descargas (API)" --> CRMWEB
```

**Notas:**
- `policrafters_cms` es una base de datos nueva en el **mismo servidor** PostgreSQL del CRM (no un contenedor nuevo), para ahorrar recursos del VPS.
- Redis se reutiliza del CRM con un número de DB distinto (ej. `db=2`) para cache de la API de Wagtail.
- `cms.policrafters.com` es un subdominio interno solo para la API/admin de Wagtail — no lo usa el público.

---

## 3. Diagrama — flujo de publicación (rebuild on publish)

```mermaid
flowchart TD
    A[Editor publica en Wagtail] --> B[Django dispara webhook<br/>signal page_published]
    B --> C[GitHub Actions<br/>build de Astro con datos de la API]
    C --> D[Deploy por SSH/rsync<br/>sube dist/ al VPS]
    D --> E[Traefik sirve el sitio estático]
```

Cada vez que se publica contenido en Wagtail, GitHub Actions reconstruye el sitio con datos frescos y lo sube por rsync — el VPS nunca ejecuta `npm run build`.

---

## 4. Plan de implementación por fases

### Fase 0 — Cuentas y recursos externos (1 día)
1. **Cloudflare R2**: crear bucket `policrafters-media`, generar API token (Access Key/Secret) con permisos solo sobre ese bucket.
2. **Cloudflare DNS**: agregar/confirmar `policrafters.com` en Cloudflare, modo proxy (nube naranja) activado.
3. **Certificados**: activar SSL **Full (strict)** en Cloudflare y generar un **Origin CA Certificate** para instalar en Traefik para este dominio. El dominio del CRM (`ancous.tech`) no se toca.
4. **GitHub**: bajo la cuenta `ariasjf00`, crear dos repos:
   - `policrafters-cms` (Django + Wagtail headless)
   - `policrafters-web` (Astro)

### Fase 1 — Repos y llaves de despliegue (medio día)

```bash
# En el VPS, una llave por repo (mismo patrón que el CRM)
ssh-keygen -t ed25519 -f ~/.ssh/policrafters_cms_deploy -C "cms-deploy"
ssh-keygen -t ed25519 -f ~/.ssh/policrafters_web_deploy -C "web-deploy"
```

Agregar cada `.pub` como **Deploy Key** (solo lectura) en su respectivo repo de GitHub.

`~/.ssh/config` en el VPS:
```
Host github-cms
  HostName github.com
  User git
  IdentityFile ~/.ssh/policrafters_cms_deploy

Host github-web
  HostName github.com
  User git
  IdentityFile ~/.ssh/policrafters_web_deploy
```

Llave para que **GitHub Actions** despliegue al VPS (con capacidad de escritura en el VPS, no en GitHub):

```bash
ssh-keygen -t ed25519 -f ~/.ssh/gh_actions_deploy -C "gh-actions-deploy"
cat ~/.ssh/gh_actions_deploy.pub >> ~/.ssh/authorized_keys
```

Guardar la llave privada como secret en `policrafters-web` → `Settings > Secrets and variables > Actions`:
- `VPS_SSH_KEY`
- `VPS_HOST`
- `VPS_USER`

### Fase 2 — Scaffolding de Wagtail (headless CMS) (3-4 días)

```bash
mkdir -p /var/www/policrafters-cms && cd /var/www/policrafters-cms
python3 -m venv venv && source venv/bin/activate
pip install wagtail django-storages[s3] boto3 django-cors-headers python-decouple
wagtail start policrafters_cms .
python manage.py startapp home_cms
python manage.py startapp collections
python manage.py startapp brands
```

`settings/base.py` (mismo patrón split base/dev/production del CRM):

```python
INSTALLED_APPS += [
    "wagtail.api.v2",
    "corsheaders",
    "storages",
]
MIDDLEWARE.insert(0, "corsheaders.middleware.CorsMiddleware")
CORS_ALLOWED_ORIGINS = [
    "https://policrafters.com",
    "http://localhost:4321",  # dev server de Astro
]

# Idiomas
WAGTAIL_I18N_ENABLED = True
WAGTAIL_CONTENT_LANGUAGES = [("en", "English"), ("es", "Español")]

# Storage en R2 (compatible S3)
DEFAULT_FILE_STORAGE = "storages.backends.s3boto3.S3Boto3Storage"
AWS_ACCESS_KEY_ID = config("R2_ACCESS_KEY")
AWS_SECRET_ACCESS_KEY = config("R2_SECRET_KEY")
AWS_STORAGE_BUCKET_NAME = "policrafters-media"
AWS_S3_ENDPOINT_URL = config("R2_ENDPOINT_URL")
AWS_S3_CUSTOM_DOMAIN = config("R2_PUBLIC_DOMAIN")
AWS_DEFAULT_ACL = None
```

`urls.py`:

```python
from wagtail.api.v2.views import PagesAPIViewSet
from wagtail.api.v2.router import WagtailAPIRouter

api_router = WagtailAPIRouter("wagtailapi")
api_router.register_endpoint("pages", PagesAPIViewSet)
urlpatterns += [path("api/v2/", api_router.urls)]
```

**Modelos de página:** `HomePage`, `CollectionIndexPage`, `ModelPage` (StreamField con specs técnicas, galería de imágenes, PDF descargable), `RenovationPage`, `ServicePage`, `BrandPage` — cada uno con campos SEO nativos de Wagtail (`seo_title`, `search_description`).

**Webhook de publicación** (dispara el build de Astro):

```python
# collections/signals.py
from wagtail.signals import page_published
import requests
from decouple import config

def trigger_rebuild(sender, instance, **kwargs):
    requests.post(
        "https://api.github.com/repos/ariasjf00/policrafters-web/dispatches",
        headers={"Authorization": f"token {config('GH_DISPATCH_TOKEN')}"},
        json={"event_type": "content-published"},
    )

page_published.connect(trigger_rebuild)
```

### Fase 3 — Scaffolding de Astro (2-3 días)

```bash
npm create astro@latest policrafters-web -- --template minimal --typescript strict
cd policrafters-web
npx astro add tailwind
npm install gsap
```

`astro.config.mjs`:

```js
export default defineConfig({
  output: 'static',
  site: 'https://policrafters.com',
  integrations: [tailwind()],
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es'],
  },
});
```

Cliente de datos hacia Wagtail en build time:

```ts
// src/lib/wagtail.ts
const API_BASE = import.meta.env.WAGTAIL_API_URL; // https://cms.policrafters.com/api/v2

export async function getModels(locale: string) {
  const res = await fetch(`${API_BASE}/pages/?type=collections.ModelPage&locale=${locale}&fields=*`);
  return res.json();
}
```

Cada página tipo Collection/ModelPage usa `getStaticPaths()` para generar rutas en build time. El submenú, migas de pan y transiciones (referencia: falper.it / Boffi) se implementan con GSAP + Astro View Transitions (nativo desde Astro 3+).

Formularios de descarga/leads como *island* (`client:load`) que hace `fetch` directo al endpoint de leads del **CRM**, no de Wagtail.

### Fase 4 — Contenerización en el VPS (2 días)

Solo se agrega un contenedor real nuevo: el backend de Wagtail. Astro no corre como servicio — su `dist/` se sirve como archivos estáticos.

`/var/www/policrafters-cms/docker-compose.yml`:

```yaml
services:
  cms-web:
    build: .
    environment:
      - DJANGO_SETTINGS_MODULE=policrafters_cms.settings.production
    env_file: .env.production
    networks:
      - traefik-public
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.cms.rule=Host(`cms.policrafters.com`)"
      - "traefik.http.routers.cms.tls.certresolver=cloudflare"
      - "traefik.http.services.cms.loadbalancer.server.port=8000"

networks:
  traefik-public:
    external: true
```

`cms.policrafters.com` queda como subdominio solo API/admin, protegido idealmente con IP allowlist o Basic Auth adicional en Traefik para `/admin/`.

Para servir los estáticos de Astro: contenedor nginx ligero o el propio Traefik con file provider sirviendo `/var/www/policrafters-web/dist` directo — sin proceso Node en producción.

### Fase 5 — CI/CD: build en GitHub Actions, deploy al VPS (1-2 días)

`.github/workflows/deploy.yml` en `policrafters-web`:

```yaml
name: Build & Deploy
on:
  repository_dispatch:
    types: [content-published]
  push:
    branches: [main]

jobs:
  build-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run build
        env:
          WAGTAIL_API_URL: https://cms.policrafters.com/api/v2
      - name: Deploy to VPS
        uses: burnett01/rsync-deployments@6.0.0
        with:
          switches: -avzr --delete
          path: dist/
          remote_path: /var/www/policrafters-web/dist/
          remote_host: ${{ secrets.VPS_HOST }}
          remote_user: ${{ secrets.VPS_USER }}
          remote_key: ${{ secrets.VPS_SSH_KEY }}
```

### Fase 6 — Migración a R2 y pruebas de imágenes (1 día)
Subir imágenes de prueba desde el admin de Wagtail y confirmar que las renditions se generan y quedan en R2, no en disco local del VPS.

### Fase 7 — Contenido, colecciones tipo Falper, integración de leads (2-3 semanas)
- Modelos de página `ModelPage` con specs, galería, PDFs.
- Submenú lateral + migas de pan (referencia Boffi) para navegación entre modelos.
- Gate de datos (nombre/email/teléfono) antes de descargar PDFs/imágenes.
- Endpoint `/api/leads/from-web/` en el CRM que recibe cada envío y crea una `Opportunity` en etapa `prospect`, `source=website`.
- Secciones Renovations, Services, Brands según referencias (dellanno.com, linvisibile.com, Boffi).

### Fase 8 — QA, SEO, performance, go-live (1 semana)
- Lighthouse/PageSpeed (debería ser excelente por ser 100% estático).
- Verificación bilingüe completa (en/es).
- Sitemap XML, robots.txt, hreflang, Open Graph, Schema.org.
- Pruebas móviles.
- DNS final de `policrafters.com` apuntando al VPS vía Cloudflare.

**Tiempo total estimado: 6-7 semanas.** El frontend (Astro) y el backend (Wagtail) pueden desarrollarse en paralelo por ser una arquitectura headless, una vez definido el contrato de la API.

---

## 5. Arranque en desarrollo local (antes de tocar el VPS)

Repos ya creados en GitHub (`ariasjf00/policrafters-cms`, `ariasjf00/policrafters-web`). Equipo: backend/CMS a cargo del desarrollador principal, frontend (Astro) a cargo de un segundo desarrollador, trabajando en paralelo desde VS Code. Las fases de VPS/Traefik/Cloudflare (secciones 4 y 6-8 de este documento) se retoman cuando haya páginas navegables end-to-end en local.

### 5.1 Estrategia de ramas

```
main        → siempre desplegable, protegida (requiere PR)
develop     → integración de trabajo en curso
feature/*   → una rama por tarea (feature/home-page, feature/model-detail, etc.)
```

Activar "Require pull request before merging" en `main` en ambos repos.

### 5.2 Setup local del backend (Wagtail)

Requisitos: Python 3.11+, Docker solo para Postgres local (no para el proyecto Django).

```bash
git clone git@github.com:ariasjf00/policrafters-cms.git
cd policrafters-cms
python3 -m venv venv && source venv/bin/activate
pip install wagtail django-storages[s3] boto3 django-cors-headers python-decouple psycopg2-binary
wagtail start policrafters_cms .
```

Postgres local en un solo contenedor (sin Traefik, sin producción):

```yaml
# docker-compose.local.yml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: policrafters_cms
      POSTGRES_USER: policrafters
      POSTGRES_PASSWORD: localdev
    ports:
      - "5433:5432"   # 5433 para no chocar con el Postgres del CRM si corre localmente
    volumes:
      - cms_pg_data:/var/lib/postgresql/data
volumes:
  cms_pg_data:
```

```bash
docker compose -f docker-compose.local.yml up -d
```

`.env.local` (agregar a `.gitignore`, nunca se commitea):

```
DEBUG=True
DATABASE_URL=postgres://policrafters:localdev@localhost:5433/policrafters_cms
SECRET_KEY=dev-only-key
CORS_ALLOWED_ORIGINS=http://localhost:4321
```

```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 0.0.0.0:8000
```

Django corre nativo en VS Code (no en Docker) para autoreload instantáneo. Admin en `http://localhost:8000/admin/`, API en `http://localhost:8000/api/v2/pages/` una vez registrado el `PagesAPIViewSet`.

### 5.3 Setup local del frontend (Astro)

```bash
git clone git@github.com:ariasjf00/policrafters-web.git
cd policrafters-web
npm create astro@latest . -- --template minimal --typescript strict
npx astro add tailwind
npm install gsap
```

`.env.local`:
```
WAGTAIL_API_URL=http://localhost:8000/api/v2
```

```bash
npm run dev
```

Astro en `http://localhost:4321`, consumiendo el backend en `localhost:8000`. No requiere Docker.

### 5.4 Contrato de la API — clave para trabajar en paralelo

Para que el frontend no dependa de que el backend termine todos los modelos de Wagtail, se define primero la "forma" de cada tipo de página en un `API_CONTRACT.md` compartido por ambos desarrolladores.

Ejemplo — contrato de `ModelPage`:

```json
{
  "type": "collections.ModelPage",
  "title": "string",
  "locale": "en | es",
  "fields": {
    "hero_image": { "url": "string", "alt": "string" },
    "specs": [{ "label": "string", "value": "string" }],
    "gallery": [{ "url": "string", "alt": "string" }],
    "pdf_datasheet": "string | null",
    "brand": { "name": "string", "slug": "string" }
  }
}
```

Con este contrato, el frontend construye componentes contra un JSON mock local (`src/mocks/model-page.json`) sin esperar al endpoint real. Cuando el backend publique el modelo real con esos mismos `api_fields`, solo cambia el `fetch` del mock a la URL real — sin retrabajo si el contrato se respetó. Empezar por el contrato de **Home** y **una sola `ModelPage`**, suficiente para desbloquear al frontend desde el día 2.

### 5.5 Orden cronológico sugerido — primeras 2 semanas

| Día | Backend / CMS | Frontend (Astro) |
|---|---|---|
| 1 | Setup Wagtail local + Postgres + admin funcionando | Setup Astro local + Tailwind + estructura de carpetas/layout base |
| 2 | Modelo `HomePage` + `ModelPage` mínimos, `api_fields` definidos, expone API | Con `API_CONTRACT.md`, arma mocks JSON y arranca layout de Home con datos falsos |
| 3-4 | Carga 2-3 páginas reales de prueba vía admin de Wagtail | Conecta `fetch` real a `localhost:8000`, valida que mock y respuesta real coincidan |
| 5 | Modelos de `CollectionIndexPage`, `RenovationPage`, `ServicePage`, `BrandPage` | Sigue maquetando Home/Collection con GSAP mientras el backend avanza |
| Semana 2 | Ajustes de API según necesidades del frontend (iteración conjunta) | Módulo Collection tipo Falper: submenú, breadcrumbs, detalle de modelo |

---

## 6. Bitácora de la puesta en marcha (lecciones reales)

Notas del arranque efectivo en local de ambos repos, para que sirvan de referencia rápida ante los mismos tropiezos.

### 6.1 `policrafters-cms` (Wagtail)

- **Repo creado en GitHub como `policrafters_cms`** (guión bajo), no `policrafters-cms` (guión) — GitHub normaliza el nombre. La carpeta local puede seguir llamándose con guión, solo el remote usa guión bajo. Siempre copiar el nombre exacto desde el botón "Code → SSH" en vez de escribirlo de memoria.
- **`zsh` interpreta los corchetes como glob**: `pip install django-storages[s3]` falla en zsh con `no matches found`. Solución: comillas → `pip install "django-storages[s3]"`.
- **`.gitignore` debe crearse ANTES del primer `git add .`**, nunca después. Si se hace `git add .` sin `.gitignore`, `venv/` completo queda trackeado (en este caso infló el primer push a 58 MB / ~21,600 objetos). Un `.gitignore` creado después no lo corrige retroactivamente — hay que borrar `.git` local y reiniciar el historial (`rm -rf .git && git init`) si el repo es nuevo y nadie más lo ha clonado, o `git rm -r --cached venv` si ya hay más historial que conservar.
- Verificación de rigor antes de cada primer commit: `git status | grep venv` (o `node_modules` en el otro repo) debe devolver vacío.

### 6.2 `policrafters-web` (Astro)

- **Node version**: la máquina tenía Node 25 (versión "current", no LTS). Se instaló `nvm` para poder fijar una LTS por proyecto sin desinstalar nada:
  ```bash
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  source ~/.zshrc
  ```
- Primer intento con `nvm install 20` **no fue suficiente** — Astro 7.x exige Node `>=22.12.0`. Node 20 quedó obsoleto para este proyecto específico. Se corrigió con:
  ```bash
  nvm install 22 && nvm use 22
  echo "22" > .nvmrc
  ```
  Cada terminal nueva requiere `nvm use 22` (o `nvm use` si hay `.nvmrc`) — no queda fijo globalmente solo por instalarlo una vez.
- **`npm create astro@latest .` se niega a correr si la carpeta no está vacía** (aunque solo tenga `.gitignore`, `.nvmrc`, etc.), y en la versión usada no ofrece opción de "continuar de todas formas". Workaround: generar el scaffold en una carpeta temporal vacía (`policrafters-web-temp`) y mover el contenido a la carpeta real después, fusionando a mano el `.gitignore` generado por Astro con el propio (sin duplicar reglas).
- Al mover archivos por Finder, revisar que no se arrastren `node_modules/`, `.DS_Store` ni `.vscode/` desde la carpeta temporal — no aportan nada y hay que reinstalar `node_modules` limpio de todas formas (`npm install`).
- El scaffold dejó `"name": "policrafters-web-temp"` heredado del nombre de la carpeta temporal en `package.json` **y** `package-lock.json` (dos posiciones en el lock) — hay que corregirlo a mano en ambos archivos antes del primer commit.
- **Astro genera `AGENTS.md` y un symlink `CLAUDE.md → AGENTS.md`** automáticamente — es una convención reciente del ecosistema para dar contexto a asistentes de IA (comandos preferidos, links de documentación), no algo que haya que crear ni revisar; se sube a git normalmente.
- **Un componente `.astro` necesita el frontmatter con `---` de apertura Y de cierre.** Un archivo que solo tiene el `---` de cierre (sin el de apertura en la primera línea) produce `Could not import ... Failed to load module SSR`, un error que suena a problema de ruta pero en realidad es de sintaxis.
- Si el mismo error de importación persiste con el archivo ya sintácticamente correcto, verificar que el **nombre de la carpeta en disco coincide exactamente** con el import (`../layouts/Layout.astro` vs. una carpeta creada con typo o mayúscula distinta) — en este caso el error real era un folder mal nombrado, no el contenido del archivo.
- `npx astro add tailwind` (Tailwind v4, vía plugin de Vite) no crea un layout compartido automáticamente — hay que crearlo a mano (`src/layouts/Layout.astro`) e importar `../styles/global.css` ahí para que los estilos apliquen.

---

## 7. Próximos pasos concretos
- [x] Crear repos `policrafters-cms` y `policrafters-web` en GitHub (`ariasjf00`)
- [ ] Setup local de Wagtail (backend) — Postgres en Docker, Django nativo en VS Code
- [ ] Setup local de Astro (frontend) — `npm run dev`
- [ ] Definir y documentar `API_CONTRACT.md` (Home + una ModelPage)
- [ ] Modelos mínimos de `HomePage` y `ModelPage` con `api_fields`
- [ ] Mocks JSON en Astro para desbloquear maquetado sin esperar backend
- [ ] Primeras páginas reales cargadas vía admin de Wagtail
- [ ] *(Cuando haya flujo navegable end-to-end en local)* Crear bucket R2 y token de acceso
- [ ] *(VPS)* Agregar `policrafters.com` a Cloudflare y generar Origin CA cert
- [ ] *(VPS)* Generar y registrar las 3 llaves SSH (cms deploy, web deploy, gh-actions deploy)
- [ ] *(VPS)* `Dockerfile` del contenedor de Wagtail
- [ ] *(VPS)* `.env.production` con variables de R2/CORS
