#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import re
import unicodedata
from datetime import datetime
from html import escape
from pathlib import Path

import bleach
import mistune
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
PUBLICACIONES_JS = ROOT / "assets/js/publicaciones.js"
INDEX_HTML = ROOT / "index.html"
ARTICLES_DIR = ROOT / "articulos"
RESULT_FILE = ROOT / "publication-result.json"

ALLOWED_CATEGORIES = [
    "Derecho Administrativo","Derecho Civil y Comercial","Derecho Constitucional",
    "Derecho de Familia y Sucesorio","Derecho de los Recursos Naturales, Aguas; y Protección del Medio Ambiente",
    "Derecho del Consumidor y Defensa de la Competencia","Derecho del Trabajo y la Seguridad Social",
    "Derecho Informático","Derecho Internacional","Derecho Penal","Derecho Político","Derecho Procesal",
    "Derecho Registral y Notarial","Derechos Humanos","Derechos Reales","Enseñanza del Derecho",
    "Filosofía del Derecho","Mediación","Miscelánea","Pluralismo Jurídico y Gobernanza",
    "Sociología del Derecho","Tecnologías aplicadas al Derecho"
]


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text.lower()).strip("-")
    return text[:120] or "articulo"


def norm(text: str) -> str:
    text = unicodedata.normalize("NFKD", str(text)).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^a-zA-Z0-9\s]", " ", text.lower())
    return re.sub(r"\s+", " ", text).strip()


def parse_issue_form(body: str) -> dict[str, str]:
    # GitHub Issue Forms serializa cada campo como "### Etiqueta" + contenido.
    matches = list(re.finditer(r"(?m)^###\s+(.+?)\s*$", body or ""))
    fields: dict[str, str] = {}
    for i, m in enumerate(matches):
        key = m.group(1).strip()
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(body)
        value = body[start:end].strip()
        if value in {"_No response_", "No response"}:
            value = ""
        fields[key] = value
    return fields


def get(fields: dict[str, str], label: str) -> str:
    return fields.get(label, "").strip()


def parse_categories(raw: str) -> list[str]:
    candidates = []
    for line in raw.splitlines():
        line = re.sub(r"^[-*]\s*", "", line).strip()
        candidates.extend([p.strip() for p in line.split(",") if p.strip()])
    out = []
    for c in candidates:
        if c in ALLOWED_CATEGORIES and c not in out:
            out.append(c)
    return out


def md_to_html(text: str) -> str:
    renderer = mistune.HTMLRenderer(escape=False)
    md = mistune.create_markdown(renderer=renderer, plugins=["table", "strikethrough"])
    raw = md(text or "")
    tags = [
        "p","br","strong","em","u","s","a","ul","ol","li","blockquote","h2","h3","h4",
        "img","figure","figcaption","table","thead","tbody","tr","th","td","hr","code","pre"
    ]
    attrs = {
        "a": ["href","title","target","rel"],
        "img": ["src","alt","title","loading"],
        "h2": ["id"], "h3": ["id"], "h4": ["id"],
        "th": ["colspan","rowspan"], "td": ["colspan","rowspan"]
    }
    clean = bleach.clean(raw, tags=tags, attributes=attrs, protocols=["http","https","mailto"], strip=True)
    soup = BeautifulSoup(clean, "html.parser")
    for img in soup.find_all("img"):
        img["loading"] = "lazy"
        if img.parent.name != "figure":
            wrapper = soup.new_tag("figure")
            wrapper["class"] = "article-figure"
            img.wrap(wrapper)
    for a in soup.find_all("a"):
        href = a.get("href", "")
        if href.startswith("http"):
            a["target"] = "_blank"
            a["rel"] = "noopener"
    return str(soup)


def toc_from_html(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    links = []
    used = set()
    for heading in soup.find_all(["h2", "h3"]):
        text = heading.get_text(" ", strip=True)
        hid = heading.get("id") or slugify(text)
        base = hid
        n = 2
        while hid in used:
            hid = f"{base}-{n}"; n += 1
        used.add(hid)
        heading["id"] = hid
        links.append((hid, text))
    return str(soup), links


def load_publications() -> list[dict]:
    text = PUBLICACIONES_JS.read_text(encoding="utf-8")
    m = re.search(r"window\.BITACORA_PUBLICACIONES\s*=\s*(\[.*\])\s*;?\s*$", text, re.S)
    if not m:
        raise RuntimeError("No se pudo leer assets/js/publicaciones.js")
    return json.loads(m.group(1))


def save_publications(items: list[dict]) -> None:
    PUBLICACIONES_JS.write_text(
        "window.BITACORA_PUBLICACIONES = " + json.dumps(items, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8"
    )


def update_inline_index(items: list[dict]) -> None:
    html = INDEX_HTML.read_text(encoding="utf-8")
    compact = []
    for p in items:
        compact.append({
            "id": p.get("id"), "title": p.get("title"), "authors": p.get("authors", []),
            "areas": p.get("areas", []), "slug": p.get("slug"), "localUrl": p.get("localUrl"),
            "year": str(p.get("year", "")), "date": p.get("date", ""), "excerpt": p.get("excerpt", ""),
            "key": norm(" ".join([
                p.get("title", ""), " ".join(p.get("authors", [])), " ".join(p.get("areas", [])),
                str(p.get("year", "")), p.get("excerpt", ""), p.get("searchText", ""),
                " ".join(p.get("keywords", [])) if isinstance(p.get("keywords"), list) else str(p.get("keywords", ""))
            ]))
        })
    js = "const BITACORA_DATA=" + json.dumps(compact, ensure_ascii=False, separators=(",", ":")) + ";"
    html, count = re.subn(r"const BITACORA_DATA=\[.*?\];\s*const BITACORA_CATEGORIES=", js + "\nconst BITACORA_CATEGORIES=", html, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError("No se pudo actualizar BITACORA_DATA en index.html")

    # Orden real por fecha cuando existe; mantiene compatibilidad con artículos históricos que sólo tienen año.
    html = re.sub(
        r"const sortNewest=\(a,b\)=>[^;]+;",
        "const sortNewest=(a,b)=>{const da=a.date||`${a.year||'0000'}-01-01`,db=b.date||`${b.year||'0000'}-01-01`;return db.localeCompare(da)||Number(b.id||0)-Number(a.id||0)||a.title.localeCompare(b.title,'es');};",
        html,
        count=1
    )

    # Hace que los años se generen automáticamente a partir de los datos, para no tocar HTML en futuras cargas.
    if 'id="yearOptions"' not in html:
        html = re.sub(r'<div class="year-options">.*?</div></fieldset>', '<div class="year-options" id="yearOptions"></div></fieldset>', html, count=1, flags=re.S)
    marker = "const selectedYears=()=>$$('#yearFilters input[type=checkbox]:checked').map(i=>i.value);"
    if marker in html and "function renderYearOptions()" not in html:
        dynamic = """function renderYearOptions(){const wrap=$('#yearOptions');if(!wrap)return;const years=[...new Set(data.map(p=>String(p.year||'')).filter(Boolean))].sort((a,b)=>Number(b)-Number(a));wrap.innerHTML=years.map(y=>`<label class=\"year-option\"><input name=\"year\" type=\"checkbox\" value=\"${esc(y)}\"/><span>${esc(y)}</span></label>`).join('');}\n  """ + marker
        html = html.replace(marker, dynamic)
        html = html.replace("renderCategories(); renderCatalog(); runSearch();", "renderYearOptions(); renderCategories(); renderCatalog(); runSearch();")

    INDEX_HTML.write_text(html, encoding="utf-8")


def contact_html(authors: list[dict]) -> str:
    parts = []
    for a in authors:
        links = []
        if a.get("email"):
            links.append(f'<a href="mailto:{escape(a["email"], quote=True)}">{escape(a["email"])}</a>')
        if a.get("linkedin"):
            links.append(
                f'<a aria-label="LinkedIn de {escape(a["name"], quote=True)}" class="linkedin-link" '
                f'href="{escape(a["linkedin"], quote=True)}" rel="noopener" target="_blank">'
                f'<img alt="LinkedIn" src="../assets/img/linkedin.png"/></a>'
            )
        if links:
            parts.append(f'<span class="contact-item"><strong>{escape(a["name"])}</strong>{"".join(links)}</span>')
    if not parts:
        return ""
    return '<div class="article-contact-hero"><span class="contact-label">Contacto</span><div class="contact-list">' + "".join(parts) + "</div></div>"


def author_profile_html(authors: list[dict]) -> str:
    bios = []
    for a in authors:
        bio = a.get("bio", "").strip()
        if bio:
            bios.append(f'<p><strong>{escape(a["name"])}</strong>. {escape(bio)}</p>')
    if not bios:
        return ""
    return '<aside class="author-profile"><p class="micro-label dark">Sobre la autoría</p>' + "".join(bios) + "</aside>"


def render_article(*, title: str, year: str, areas: list[str], authors: list[dict], summary: str,
                   body_html: str, toc: list[tuple[str,str]], references_html: str, description: str) -> str:
    chips = "".join(
        f'<a class="article-chip" href="../index.html?categoria={escape(a, quote=True)}#categorias">{escape(a)}</a>'
        for a in areas
    )
    byline = " · ".join(escape(a["name"]) for a in authors)
    toc_html = ""
    if toc:
        toc_links = "".join(f'<a href="#{escape(hid, quote=True)}">{escape(text)}</a>' for hid, text in toc)
        toc_html = f'<details class="article-toc"><summary>En este artículo</summary><nav>{toc_links}</nav></details>'
    summary_html = f'<h2 id="resumen">Resumen</h2><p>{escape(summary)}</p>'
    ref_block = ""
    if references_html.strip():
        ref_block = '<h2 id="bibliografia">Bibliografía</h2>' + references_html
    profile = author_profile_html(authors)
    contact = contact_html(authors)
    return f'''<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
<meta name="theme-color" content="#192135"/>
<meta name="description" content="{escape(description[:300], quote=True)}"/>
<title>{escape(title)} · Bitácora Legal en Acción</title>
<link href="../assets/img/logo-bitacora.png" rel="icon"/>
<link href="../assets/css/styles.css" rel="stylesheet"/>
</head>
<body class="article-page">
<a class="skip-link" href="#articulo">Saltar al contenido</a>
<div aria-hidden="true" class="top-rule"></div>
<header class="site-header article-site-header"><div class="container header-inner">
<a aria-label="Bitácora Legal en Acción, inicio" class="compact-brand" href="../index.html"><span aria-hidden="true" class="brand-dot"></span><span>Bitácora <em>Legal en Acción</em></span></a>
<nav aria-label="Navegación principal" class="desktop-nav"><a href="../index.html#publicaciones">Publicaciones</a><a href="../index.html#categorias">Categorías</a><a href="../index.html#publicar">Cómo publicar</a><a href="../index.html#sobre">Sobre el proyecto</a></nav>
<a class="article-back-mobile" href="../index.html#catalogo">← Catálogo</a>
</div></header>
<main class="article-main" id="articulo">
<header class="article-hero"><div class="article-shell">
<a class="back-link" href="../index.html#catalogo">← Volver al catálogo</a>
<div class="article-chips">{chips}</div>
<h1>{escape(title)}</h1>
<div class="article-byline"><strong>{byline}</strong><span>{escape(year)}</span></div>{contact}
</div></header>
<div class="article-shell article-layout"><div class="article-reading">
{toc_html}
{profile}
<article class="article-content">{summary_html}{body_html}{ref_block}</article>
<div class="article-end"><span></span><p>Fin del artículo</p><a href="../index.html#catalogo">Explorar más publicaciones →</a></div>
</div></div>
</main>
<footer class="site-footer article-footer"><div class="container footer-top">
<div class="footer-brand"><strong>Bitácora Legal en Acción</strong><p>Divulgación jurídica, teoría y práctica.</p><a href="mailto:bitacoralegalenaccion@gmail.com">bitacoralegalenaccion@gmail.com</a></div>
<div class="footer-links"><a href="../index.html#publicaciones">Publicaciones</a><a href="../index.html#categorias">Categorías</a><a href="../index.html#publicar">Cómo publicar</a><a href="../index.html#sobre">Sobre el proyecto</a></div>
<a aria-label="Facultad de Derecho de la Universidad Nacional de Cuyo" class="derecho-logo-link" href="https://derecho.uncuyo.edu.ar/" rel="noopener" target="_blank"><img alt="UNCUYO — Facultad de Derecho" src="../assets/img/logo-derecho.png"/></a>
</div><div class="container footer-bottom"><span>Facultad de Derecho · Universidad Nacional de Cuyo</span><a href="#articulo">Volver arriba ↑</a></div></footer>
</body></html>'''


def main() -> None:
    event_path = os.environ.get("BITACORA_EVENT_PATH") or os.environ.get("GITHUB_EVENT_PATH")
    if not event_path:
        raise RuntimeError("Falta GITHUB_EVENT_PATH")
    event = json.loads(Path(event_path).read_text(encoding="utf-8"))
    issue = event["issue"]
    fields = parse_issue_form(issue.get("body", ""))

    title = get(fields, "Título del artículo")
    kind = get(fields, "Tipo de contribución")
    date = get(fields, "Fecha de publicación")
    raw_categories = get(fields, "Categoría o categorías")
    summary = get(fields, "Resumen")
    keywords_raw = get(fields, "Palabras clave")
    body_md = get(fields, "Texto completo del artículo")
    references = get(fields, "Referencias / Bibliografía")

    if not all([title, date, raw_categories, summary, body_md]):
        missing = [k for k,v in [("Título",title),("Fecha",date),("Categorías",raw_categories),("Resumen",summary),("Texto",body_md)] if not v]
        raise RuntimeError("Faltan campos requeridos: " + ", ".join(missing))
    try:
        parsed_date = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise RuntimeError("La fecha debe tener formato AAAA-MM-DD")
    year = str(parsed_date.year)
    areas = parse_categories(raw_categories)
    if not areas:
        raise RuntimeError("No se pudo reconocer ninguna categoría válida")

    authors = []
    for n in (1,2,3):
        name = get(fields, f"Autor/a {n} — Nombre completo")
        if not name:
            continue
        authors.append({
            "name": name,
            "email": get(fields, f"Autor/a {n} — Correo electrónico"),
            "linkedin": get(fields, f"Autor/a {n} — LinkedIn"),
            "bio": get(fields, f"Autor/a {n} — Breve CV")
        })
    if not authors:
        raise RuntimeError("Debe existir al menos una autoría")

    body_html = md_to_html(body_md)
    body_html, toc = toc_from_html(body_html)
    refs_html = "".join(f"<p>{escape(line.strip())}</p>" for line in references.splitlines() if line.strip())

    items = load_publications()
    slug = slugify(title)
    existing_slugs = {p.get("slug") for p in items}
    base_slug = slug
    i = 2
    while slug in existing_slugs:
        slug = f"{base_slug}-{i}"; i += 1

    local_url = f"articulos/{slug}.html"
    article_path = ROOT / local_url
    article_path.parent.mkdir(parents=True, exist_ok=True)
    article_html = render_article(
        title=title, year=year, areas=areas, authors=authors, summary=summary,
        body_html=body_html, toc=toc, references_html=refs_html, description=summary
    )
    article_path.write_text(article_html, encoding="utf-8")

    plain_body = BeautifulSoup(body_html, "html.parser").get_text(" ", strip=True)
    excerpt = summary.strip()
    if len(excerpt) > 360:
        excerpt = excerpt[:357].rstrip() + "…"
    keywords = [k.strip() for k in keywords_raw.split(",") if k.strip()]
    next_id = max([int(p.get("id",0)) for p in items] or [0]) + 1
    publication = {
        "id": next_id,
        "title": title,
        "authors": [a["name"] for a in authors],
        "areas": areas,
        "slug": slug,
        "localUrl": local_url,
        "year": year,
        "date": date,
        "type": kind,
        "keywords": keywords,
        "excerpt": excerpt,
        "searchText": " ".join([title, " ".join(a["name"] for a in authors), " ".join(areas), year, summary, " ".join(keywords), plain_body, references])
    }
    items.append(publication)
    save_publications(items)
    update_inline_index(items)
    RESULT_FILE.write_text(json.dumps({"localUrl": local_url, "title": title}, ensure_ascii=False), encoding="utf-8")
    print(f"Publicado: {title} -> {local_url}")


if __name__ == "__main__":
    main()
