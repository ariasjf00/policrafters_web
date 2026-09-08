# Manual de inicialización del VPS

## Despliegue de frontend Astro estático con Docker, Traefik y SSL

Este manual documenta la publicación del frontend Astro del proyecto `policrafters_web` en el subdominio `astro.novatierra.cloud`, utilizando:

- VPS KVM 2 con Ubuntu 24.04.
- Node.js 22 y npm.
- Rama Git `home_test`.
- Astro generado como sitio estático.
- Datos mock mientras Wagtail/CMS continúa en desarrollo.
- Docker.
- Traefik como proxy inverso.
- SSL automático mediante el resolver `mytlschallenge`.
- Red Docker externa `traefik_proxy`.

> En este despliegue Astro se publica únicamente como contenido estático. Wagtail todavía no participa en la ejecución de la página.

---

## 1. Conectarse al VPS

Acceder mediante Web Terminal de Hostinger o por SSH:

```bash
ssh root@IP_DEL_VPS
```

Sustituir `IP_DEL_VPS` por la dirección IP real del servidor.

---

## 2. Ir al directorio de aplicaciones

```bash
cd /var/www
```

Si el directorio no existe:

```bash
mkdir -p /var/www
cd /var/www
```

---

## 3. Clonar el repositorio en la rama correcta

Para descargar directamente la rama `home_test`:

```bash
git clone --branch home_test --single-branch URL_DEL_REPOSITORIO policrafters_web
```

Entrar al proyecto:

```bash
cd /var/www/policrafters_web
```

Si el repositorio ya había sido clonado y se encontraba en `main`, cambiar a la rama correcta:

```bash
git fetch origin
git switch --track -c home_test origin/home_test
```

Si la rama local ya existe:

```bash
git switch home_test
git pull origin home_test
```

Verificar la rama activa:

```bash
git branch --show-current
git log -1 --oneline
```

El resultado de `git branch --show-current` debe ser:

```text
home_test
```

---

## 4. Instalar Node.js 22 y npm

Comprobar si ya están instalados:

```bash
node -v
npm -v
```

Si no existen, instalar Node.js 22 junto con npm:

```bash
apt update
apt install -y ca-certificates curl
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
```

Verificar la instalación:

```bash
node -v
npm -v
```

La versión de Node debe ser `v22.x`.

> No instalar solamente el paquete `npm` de Ubuntu si se necesita Node.js 22, porque podría producir una combinación de versiones diferente a la requerida por el proyecto.

---

## 5. Configurar el modo mock de Astro

Mientras Wagtail continúa en desarrollo, Astro debe ejecutarse sin consultar el CMS.

Crear o revisar el archivo `.env.production` dentro del proyecto:

```bash
cd /var/www/policrafters_web
nano .env.production
```

Contenido:

```env
PUBLIC_USE_API=false
# PUBLIC_API_URL=http://localhost:8000/api/home/
# PUBLIC_COLLECTIONS_API_URL=http://localhost:8000/api/collections/
```

Con `PUBLIC_USE_API=false`, la aplicación utiliza los mocks configurados en el frontend y no depende de los servicios de Wagtail.

No colocar contraseñas, tokens ni secretos en variables que comiencen con `PUBLIC_`, porque pueden quedar expuestas al navegador.

---

## 6. Instalar dependencias del proyecto

Si el repositorio contiene `package-lock.json`, utilizar:

```bash
npm ci
```

Si no existe `package-lock.json`, utilizar:

```bash
npm install
```

---

## 7. Generar el sitio estático

Ejecutar:

```bash
npm run build
```

Astro debe crear la carpeta `dist`:

```bash
ls -la dist
```

La carpeta `dist` contiene los archivos que se publicarán mediante el contenedor web.

Para una prueba temporal local se puede utilizar:

```bash
npm run preview -- --host 0.0.0.0
```

`npm run preview` es únicamente para comprobar el resultado. No se utiliza como servicio de producción en este despliegue.

---

## 8. Crear el registro DNS A

Para asociar el proyecto con `astro.novatierra.cloud`, crear en la zona DNS de `novatierra.cloud`:

```text
Tipo: A
Nombre: astro
Valor: IP_DEL_VPS
TTL: automático
```

El registro puede apuntar a la misma IP que otros subdominios del VPS. Cada subdominio tendrá su propia regla en Traefik.

Comprobar la resolución DNS:

```bash
getent hosts astro.novatierra.cloud
```

Debe devolver la IP del VPS.

> Si existe un registro `AAAA` para `astro.novatierra.cloud`, debe apuntar a la IPv6 correcta del VPS o eliminarse si no se utiliza. Una IPv6 incorrecta puede provocar que algunos visitantes no lleguen al servidor correcto.

---

## 9. Crear el Dockerfile

Desde el directorio del proyecto:

```bash
cd /var/www/policrafters_web
nano Dockerfile
```

Contenido:

```dockerfile
FROM nginx:alpine

COPY dist/ /usr/share/nginx/html/

EXPOSE 80
```

Este contenedor no ejecuta Astro con Node. Utiliza Nginx únicamente dentro del contenedor para servir los archivos estáticos de `dist`.

El VPS no utiliza Nginx como proxy principal: el tráfico público y el SSL los gestiona Traefik.

---

## 10. Crear `docker-compose.yml`

En el mismo directorio:

```bash
nano docker-compose.yml
```

Contenido:

```yaml
services:
  astro:
    build: .
    container_name: policrafters_astro
    restart: unless-stopped
    networks:
      - traefik_proxy
    labels:
      - traefik.enable=true
      - traefik.docker.network=traefik_proxy
      - traefik.http.routers.policrafters.rule=Host(`astro.novatierra.cloud`)
      - traefik.http.routers.policrafters.entrypoints=websecure
      - traefik.http.routers.policrafters.tls=true
      - traefik.http.routers.policrafters.tls.certresolver=mytlschallenge
      - traefik.http.services.policrafters.loadbalancer.server.port=80

networks:
  traefik_proxy:
    external: true
```

### Elementos importantes

- `traefik_proxy` es la red Docker externa compartida con Traefik.
- `websecure` indica que la entrada utiliza HTTPS.
- `mytlschallenge` es el resolver de certificados ya utilizado en el VPS.
- El puerto interno del contenedor es `80`.
- No se añade ninguna sección `ports:` porque Traefik ya administra los puertos públicos 80 y 443.
- La regla `Host(...)` asocia exclusivamente el contenedor con `astro.novatierra.cloud`.

---

## 11. Construir y levantar el contenedor

Desde `/var/www/policrafters_web`:

```bash
docker compose up -d --build
```

Comprobar que el contenedor está activo:

```bash
docker ps
```

El contenedor esperado es:

```text
policrafters_astro
```

Ver sus registros:

```bash
docker logs policrafters_astro
```

---

## 12. Verificar el sitio y SSL

Abrir en el navegador:

```text
https://astro.novatierra.cloud
```

Traefik solicitará y administrará automáticamente el certificado SSL usando `mytlschallenge`, siempre que:

- El registro DNS apunte al VPS.
- Los puertos 80 y 443 sean accesibles desde Internet.
- El subdominio no apunte a otra dirección IPv4 o IPv6.
- El contenedor esté conectado a `traefik_proxy`.
- Las etiquetas de Traefik estén correctamente escritas.

---

## 13. Actualizar el frontend desde GitHub

Cuando existan nuevos cambios en la rama `home_test`:

```bash
cd /var/www/policrafters_web
git pull origin home_test
npm ci
npm run build
docker compose up -d --build
```

La reconstrucción es necesaria porque el contenido de `dist` se copia dentro de la imagen Docker durante `docker build`.

---

## 14. Comandos de diagnóstico

### Ver contenedores activos

```bash
docker ps
```

### Ver registros del frontend

```bash
docker logs policrafters_astro
```

### Verificar la configuración de los servicios Docker

```bash
docker compose config
```

### Verificar que la red existe

```bash
docker network ls
```

Debe aparecer:

```text
traefik_proxy
```

### Verificar los puertos públicos

```bash
ss -ltnp
```

Traefik debe ser el servicio que atiende los puertos 80 y 443.

### Comprobar el estado HTTP/HTTPS

```bash
curl -I http://astro.novatierra.cloud
curl -I https://astro.novatierra.cloud
```

---

## 15. Integración futura con Wagtail

Cuando el CMS esté listo, cambiar las variables de entorno de Astro:

```env
PUBLIC_USE_API=true
PUBLIC_API_URL=http://wagtail:8000/api/home/
PUBLIC_COLLECTIONS_API_URL=http://wagtail:8000/api/collections/
```

La dirección `http://wagtail:8000/...` solo será válida si Astro y Wagtail se ejecutan en contenedores conectados a la misma red Docker y el servicio de Wagtail se llama `wagtail`.

Después de cambiar las variables:

```bash
npm run build
docker compose up -d --build
```

No se debe conectar Astro directamente a PostgreSQL. El frontend debe consumir la API de Wagtail y la base de datos debe permanecer accesible únicamente para Wagtail.

---

## Resumen de la arquitectura final

```text
Visitante
    |
    | https://astro.novatierra.cloud
    v
Traefik Docker
    |  SSL automático
    |  regla Host(astro.novatierra.cloud)
    v
Contenedor policrafters_astro
    |  Nginx interno
    v
Archivos estáticos de /usr/share/nginx/html
    |
    | proceden de /var/www/policrafters_web/dist
    v
Frontend Astro con mocks
```

Durante la primera etapa, Wagtail no es necesario para que la home funcione. Cuando el CMS esté terminado, se puede activar `PUBLIC_USE_API=true`, reconstruir la imagen y desplegar nuevamente el contenedor.

## Actualziacion de cambios
cd /var/www/policrafters_web
git pull origin home_test
npm ci
npm run build
docker compose up -d --build

## Usar la lllave existente del SSH 
git remote set-url origin git@github.com:ariasjf00/policrafters_web.git
git remote -v
git pull origin home_test