# Sistema editorial de carga — Bitácora Legal en Acción

El sitio continúa alojado en GitHub Pages. El sistema de carga usa **GitHub Issue Forms + GitHub Actions** y no requiere servidor, base de datos ni contraseñas incrustadas en el sitio.

## Primera configuración (una sola vez)

1. Subir a la raíz del repositorio todos los archivos y carpetas de este paquete, incluida la carpeta oculta `.github`.
2. En GitHub, ir a **Settings → Actions → General → Workflow permissions** y seleccionar **Read and write permissions**. Guardar.
3. Ir a **Issues → Labels → New label** y crear una etiqueta llamada exactamente `publicar`.
4. Confirmar que las personas que aprobarán artículos tengan permiso **Write** o superior en el repositorio.
5. Abrir el panel editorial: `https://siedfduncuyo-star.github.io/bitacoralegalenaccion/admin/`.

## Flujo de trabajo

1. El editor abre **Cargar nuevo artículo**.
2. Completa el formulario y lo envía.
3. El artículo queda como Issue pendiente, sin publicarse.
4. Una persona autorizada revisa la carga.
5. Al agregar la etiqueta `publicar`, se ejecuta `.github/workflows/publicar-articulo.yml`.
6. El script `scripts/publicar_articulo.py`:
   - crea `articulos/<slug>.html` con la estética actual;
   - incorpora autorías, correo y LinkedIn;
   - genera el índice “En este artículo” desde los subtítulos;
   - agrega el artículo a `assets/js/publicaciones.js`;
   - actualiza la base de búsqueda embebida en `index.html`;
   - incorpora automáticamente nuevos años al filtro;
   - usa la fecha completa para ordenar “Últimas publicaciones”.
7. El workflow hace commit y push automáticamente.
8. GitHub Pages actualiza el sitio.

## Imágenes

En el campo **Texto completo del artículo**, las imágenes se pueden pegar o arrastrar. GitHub genera una URL y la inserta en Markdown. Esa URL queda incorporada en la página publicada.

## Seguridad

- No hay tokens de GitHub dentro de la web pública.
- Una carga no se publica sólo por enviar el formulario.
- La publicación sólo se ejecuta cuando una persona con permiso de escritura aplica la etiqueta `publicar`.

## Observación

El sistema está preparado para **altas** de nuevos artículos. La edición y baja desde el panel pueden agregarse en una segunda etapa.
