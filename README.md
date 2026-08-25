# Bitácora Legal en Acción — sitio estático

Versión migrada desde Google Sites y preparada para GitHub Pages.

## Contenido
- Portada con buscador y filtros.
- 67 publicaciones con página HTML propia en `articulos/`.
- Buscador por título, autor/a, categoría, año y contenido textual.
- Imágenes de artículos copiadas localmente cuando estaban incluidas en la exportación.
- Resolución de aprobación disponible localmente en `assets/docs/`.
- No se requiere Google Sites para abrir las publicaciones.

## Publicar en GitHub Pages
1. Crear un repositorio en GitHub.
2. Subir **todo el contenido de esta carpeta** a la raíz del repositorio.
3. Ir a `Settings` → `Pages`.
4. En `Build and deployment`, seleccionar `Deploy from a branch`.
5. Elegir la rama `main` y la carpeta `/ (root)`.
6. Guardar.

La portada es `index.html`.

## Dominio institucional
Una vez validado el sitio, el dominio `bitacoralegal.derecho.uncu.edu.ar` puede configurarse como dominio personalizado de GitHub Pages con los registros DNS correspondientes. Conviene hacerlo sólo después de probar todos los enlaces.

## Fuente de la migración
Exportación Google Takeout recibida el 20/08/2026.


## Búsqueda
La portada utiliza una única caja de búsqueda. Las tarjetas de categorías funcionan como accesos directos: al seleccionarlas, cargan el nombre del área en la búsqueda y muestran el catálogo correspondiente.


## Ajustes de navegación (agosto 2026)
- Buscador autocontenido en `index.html` por título, autoría, categoría, año y contenido.
- Filtro por año mediante casillas múltiples.
- Categorías desplegables en la misma grilla.
- Catálogo inicial de 5 publicaciones y carga progresiva de 10.
- Contacto y LinkedIn en el encabezado de cada artículo.


## Ajustes de esta versión
- Resultados de búsqueda inmediatamente debajo del buscador.
- Filtro por año asociado a Buscar por categorías.
- Cómo publicar antes de Sobre el proyecto.
- Equipo editorial como última sección de contenido.
- Bloque de identidad con logo, separador y frase institucional en azul.
