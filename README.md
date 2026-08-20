# Bitácora Legal en Acción — sitio estático

Este paquete está listo para publicarse en GitHub Pages.

## Estructura

- `index.html`: portada completa.
- `assets/css/styles.css`: diseño responsive/mobile-first.
- `assets/js/publicaciones.js`: catálogo real de publicaciones relevado del sitio actual.
- `assets/js/app.js`: buscador, filtros, categorías y menú móvil.
- `assets/img/logo-bitacora.png`: identidad de Bitácora.
- `assets/img/logo-derecho.png`: logo institucional enlazado a la Facultad de Derecho.
- `.nojekyll`: evita procesamiento innecesario de Jekyll.

## Publicar en GitHub Pages

1. Crear un repositorio nuevo en GitHub.
2. Subir **el contenido de esta carpeta** a la raíz del repositorio.
3. Ir a `Settings → Pages`.
4. En `Build and deployment`, elegir `Deploy from a branch`.
5. Seleccionar `main` y `/ (root)`.
6. Guardar. GitHub mostrará la URL pública del sitio.

## Dominio institucional

Para usar `bitacoralegal.derecho.uncu.edu.ar`, primero probá el sitio en la URL de GitHub Pages. Cuando esté aprobado, configurá el dominio en `Settings → Pages → Custom domain` y coordiná el cambio DNS con quien administre el dominio de la Facultad.

## Catálogo

El catálogo contiene 67 publicaciones únicas y 18 categorías con contenido. Se corrigieron para esta versión:

- `Derecho Rea les` → `Derechos Reales`.
- La publicación de Paulo César Álzate Gómez quedó como **una sola publicación con dos categorías**: Derechos Humanos y Pluralismo Jurídico y Gobernanza.
- Se normalizó el título completo de la publicación de Sofía Isabel Alvarado Carmen y Alejandro Amet Reyna Ballón según la página de destino: `Responsabilidad medioambiental en materia de Empresas y Derechos Humanos. ¿Existe una efectiva aplicación de los estándares internacionales en la región latinoamericana?`.

Por ahora, las fichas del catálogo abren las publicaciones originales del sitio actual. Esto permite publicar el nuevo buscador sin perder acceso a ningún texto. Para una migración completa de los cuerpos de los artículos, conviene trabajar desde una exportación propia de Google Sites/Google Takeout o desde los documentos fuente, y luego reemplazar las URLs por páginas locales.

## Actualizar una publicación

Editar `assets/js/publicaciones.js`. Cada registro tiene:

```js
{
  id: 1,
  title: "Título",
  authors: ["Nombre Apellido"],
  areas: ["Derecho Civil y Comercial"],
  url: "https://..."
}
```

No requiere base de datos ni servidor.
