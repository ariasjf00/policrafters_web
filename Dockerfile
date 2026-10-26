FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
# Redirect maps generated at build time from the CMS (see nginx.conf).
COPY nginx/ /etc/nginx/policrafters/
COPY dist/ /usr/share/nginx/html/

EXPOSE 80
