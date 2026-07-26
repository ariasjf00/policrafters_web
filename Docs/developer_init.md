# Onboarding Frontend — policrafters-web (Windows + VS Code)

Guía paso a paso para que el desarrollador de frontend configure su entorno local en Windows y empiece a trabajar en el proyecto Astro.

---

## 0. Requisitos previos

- Windows 10/11
- [Visual Studio Code](https://code.visualstudio.com/) instalado
- Cuenta propia de GitHub (si no tiene una, crearla en [github.com](https://github.com))
- Acceso al repo `ariasjf00/policrafters_web` (privado) — **debe ser agregado como colaborador** por el administrador del repo (José) antes de poder clonarlo. Avisar el usuario de GitHub para que lo agreguen en `Settings > Collaborators`.

---

## 1. Instalar Git para Windows

Descargar e instalar desde [git-scm.com/download/win](https://git-scm.com/download/win). Durante la instalación, dejar las opciones por defecto (incluye Git Bash, que se recomienda usar para los comandos de esta guía en vez de PowerShell/CMD, por consistencia con el resto del equipo que trabaja en Mac/Linux).

Verificar instalación abriendo **Git Bash**:

```bash
git --version
```

---

## 2. Configurar Git (si es la primera vez en esta máquina)

```bash
git config --global user.name "Nombre Apellido"
git config --global user.email "correo@ejemplo.com"
```

---

## 3. Generar una llave SSH y conectarla a GitHub

```bash
ssh-keygen -t ed25519 -C "correo@ejemplo.com"
```

Presionar Enter para aceptar la ubicación por defecto y (opcional) definir una passphrase.

Copiar la llave pública:

```bash
cat ~/.ssh/id_ed25519.pub
```

En GitHub: **Settings (de su cuenta personal) → SSH and GPG keys → New SSH key**, pegar el contenido copiado.

Verificar que la conexión funciona:

```bash
ssh -T git@github.com
```

Debe responder algo como `Hi <usuario>! You've successfully authenticated...`.

---

## 4. Clonar el repositorio

```bash
cd /c/Users/<su_usuario>/Desktop
git clone git@github.com:ariasjf00/policrafters_web.git
cd policrafters_web
```

---

## 5. Instalar la versión correcta de Node.js

El proyecto requiere **Node 22 LTS** (Astro 7.x exige `>=22.12.0`). El repo incluye un archivo `.nvmrc` que fija esta versión — no usar la versión de Node que ya esté instalada en el sistema sin verificar primero.

### Instalar nvm para Windows

El `nvm` de Mac/Linux **no funciona en Windows** — se usa un proyecto distinto, [`nvm-windows`](https://github.com/coreybutler/nvm-windows/releases). Descargar el instalador `nvm-setup.exe` de la última release y ejecutarlo (instalación estándar, siguiente-siguiente-finalizar).

Cerrar y volver a abrir Git Bash o la terminal, luego verificar:

```bash
nvm version
```

### Instalar y usar Node 22

```bash
nvm install 22
nvm use 22
node --version   # debe confirmar v22.x.x
```

> A diferencia de nvm en Mac, `nvm-windows` no lee automáticamente el archivo `.nvmrc` — cada vez que se abra una terminal nueva para trabajar en este proyecto, correr `nvm use 22` manualmente.

---

## 6. Instalar dependencias del proyecto

Desde la carpeta `policrafters_web`, con Node 22 activo:

```bash
npm install
```

Esto va a instalar Astro, Tailwind CSS, GSAP y el resto de dependencias ya definidas en `package.json`/`package-lock.json` — no es necesario instalar nada de esto manualmente.

---

## 7. Variables de entorno locales

Crear un archivo `.env.local` en la raíz del proyecto (este archivo ya está en `.gitignore`, nunca se sube a git):

```bash
cat > .env.local << 'EOF'
WAGTAIL_API_URL=http://localhost:8000/api/v2
EOF
```

> **Nota:** por ahora el backend (Wagtail) corre solo en la máquina de José, no es accesible desde la red todavía. Para empezar a trabajar sin depender de que el backend esté corriendo o accesible, ver la sección 10 (**trabajar con mocks**) — es el flujo esperado durante esta primera etapa.

---

## 8. Extensiones recomendadas en VS Code

Instalar desde el panel de Extensiones (`Ctrl+Shift+X`):

- **Astro** (`astro-build.astro-vscode`) — sintaxis, autocompletado e IntelliSense para archivos `.astro`
- **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`) — autocompletado de clases de Tailwind
- **ESLint** (si el proyecto lo incorpora más adelante)
- **Prettier - Code formatter** (opcional, para formateo consistente)

---

## 9. Levantar el servidor de desarrollo

```bash
npm run dev
```

Abrir `http://localhost:4321` en el navegador. Debe verse la página de inicio con fondo oscuro y texto blanco centrado — esto confirma que Astro y Tailwind están funcionando correctamente.

Detener el servidor con `Ctrl+C` en la terminal.

---

## 10. Trabajar con mocks (mientras el backend no esté disponible en red)

El contrato de datos entre frontend y backend está documentado en **`Docs/API_CONTRACT.md`** dentro de este mismo repo — leerlo antes de empezar a maquetar cualquier página que consuma contenido dinámico (Home, páginas de modelo/producto, etc.).

Flujo recomendado:

1. Crear una carpeta `src/mocks/` (si no existe).
2. Por cada tipo de página, crear un archivo JSON con datos de prueba que respeten **exactamente** la forma definida en `API_CONTRACT.md` (ej. `src/mocks/home.json`, `src/mocks/model-page.json`).
3. Construir los componentes de Astro (`getStaticPaths`, layout, GSAP, Tailwind) consumiendo esos mocks en vez de un `fetch` real.
4. Cuando el backend esté accesible (local en red o desplegado), solo se cambia la fuente de datos del mock a la URL real definida en `WAGTAIL_API_URL` — sin retrabajo, siempre que el mock haya respetado el contrato.

---

## 11. Flujo de ramas de git

```
main        → siempre desplegable, protegida (requiere Pull Request)
develop     → integración de trabajo en curso
feature/*   → una rama por tarea, ej. feature/home-page, feature/model-detail
```

Antes de empezar cualquier tarea nueva:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/nombre-de-la-tarea
```

Al terminar, subir la rama y abrir un Pull Request hacia `develop` en GitHub (no hacer push directo a `main`).

---

## 12. Checklist final antes de empezar a codear

- [ ] Acceso confirmado como colaborador del repo `policrafters_web`
- [ ] Llave SSH generada y agregada a GitHub personal
- [ ] Repo clonado en local
- [ ] `nvm-windows` instalado, Node 22 activo (`node --version` → v22.x.x)
- [ ] `npm install` corrido sin errores
- [ ] `.env.local` creado
- [ ] `npm run dev` levanta correctamente en `http://localhost:4321`, con estilos de Tailwind aplicando
- [ ] Extensiones de VS Code instaladas (Astro, Tailwind CSS IntelliSense)
- [ ] `Docs/API_CONTRACT.md` leído
- [ ] Rama `feature/*` propia creada desde `develop` para la primera tarea

---

## Notas / errores conocidos (ver también `Docs/` para la bitácora completa del setup en Mac)

- Si `npm install` o `npm run dev` fallan con un warning `EBADENGINE` mencionando `required: { node: '>=22.12.0' }`, significa que Node 22 no está activo en esa terminal — correr `nvm use 22` de nuevo.
- Si un archivo `.astro` da error `Could not import ... Failed to load module SSR`, revisar dos cosas: (1) que el frontmatter tenga `---` tanto de apertura como de cierre, y (2) que el nombre de la carpeta/archivo coincida exactamente (mayúsculas incluidas) con la ruta del `import`.