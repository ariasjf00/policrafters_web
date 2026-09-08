## Especificacion del frontend

Tipo de letra: Helvélica Neue
Idiomas: Español, Ingles

Home Page 
Cabcera comn el logo del policrafters com esta en Doccs/logo_black.png
diseñoi como esta en la imagen iDoc/image.png
## Vidos carga en CMS 
Cómo usarlo ahora:

Sube el video a un storage público (S3, Cloudflare R2, Bunny, Vimeo, etc.).
Copia la URL final del archivo o stream.
Pégala en hero_video_horizontal y hero_video_vertical en el admin.
Guarda y publica la página.
Qué tipo de URL conviene:

Mejor: URL directa a archivo reproducible, por ejemplo .mp4.
También puede ser URL de reproductor externo (YouTube/Vimeo), pero ahí normalmente hay que usar embed en frontend, no solo enlace.
Recomendación práctica:

Horizontal: video desktop 16:9.
Vertical: video mobile 9:16.
Usa compresión web (H.264, tamaño razonable) para que no haga lenta la home.