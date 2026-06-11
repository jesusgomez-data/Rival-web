# -*- coding: utf-8 -*-
"""
Genera la Guia Oficial de Uso de RIVAL FIT para Centros Deportivos (PDF).
Identidad de marca: fondo negro, acento rojo (#EF4444).
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer,
    Table, TableStyle, NextPageTemplate, PageBreak, ListFlowable, ListItem,
    Image,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.lib.utils import ImageReader
from PIL import Image as PILImage, ImageDraw
import os

SHOTS = os.path.join(os.path.dirname(__file__), "_shots")
ASSETS = os.path.dirname(__file__)
LOGO = os.path.join(ASSETS, "_logo_R.png")  # logo oficial (R) renderizado de logo.svg

def _round_and_frame(src, radius_frac=0.05, border=4, border_color=(42, 42, 42, 255), pad=0):
    """Redondea esquinas y anade un borde fino. Devuelve ruta del PNG enmarcado."""
    im = PILImage.open(src).convert("RGBA")
    w, h = im.size
    r = int(min(w, h) * radius_frac)
    # mascara redondeada
    mask = PILImage.new("L", (w, h), 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle([0, 0, w - 1, h - 1], radius=r, fill=255)
    im.putalpha(mask)
    # lienzo con borde
    cw, ch = w + border * 2, h + border * 2
    canvas_img = PILImage.new("RGBA", (cw, ch), (0, 0, 0, 0))
    bd = ImageDraw.Draw(canvas_img)
    bd.rounded_rectangle([0, 0, cw - 1, ch - 1], radius=r + border, fill=border_color)
    canvas_img.paste(im, (border, border), im)
    out = src.replace(".png", "_framed.png")
    canvas_img.save(out)
    return out

def screenshot(name, max_w_mm=None, max_h_mm=None, frame=True):
    """Devuelve un flowable Image de una captura, escalado y enmarcado."""
    path = os.path.join(SHOTS, name + ".png")
    if not os.path.exists(path):
        return None
    use = _round_and_frame(path) if frame else path
    iw, ih = PILImage.open(use).size
    ratio = ih / iw
    if max_w_mm and not max_h_mm:
        w = max_w_mm * mm
        h = w * ratio
    elif max_h_mm and not max_w_mm:
        h = max_h_mm * mm
        w = h / ratio
    else:
        w = (max_w_mm or 80) * mm
        h = w * ratio
        if max_h_mm and h > max_h_mm * mm:
            h = max_h_mm * mm
            w = h / ratio
    img = Image(use, width=w, height=h)
    img.hAlign = "CENTER"
    return img

# ----- Marca -----------------------------------------------------------------
RED = colors.HexColor("#EF4444")
RED_DARK = colors.HexColor("#B91C1C")
BLACK = colors.HexColor("#000000")
NEAR_BLACK = colors.HexColor("#0a0a0a")
GRAY = colors.HexColor("#9ca3af")
LIGHT = colors.HexColor("#e5e7eb")
WHITE = colors.HexColor("#ffffff")
CARD = colors.HexColor("#151515")

OUT = os.path.join(os.path.dirname(__file__), "..", "GUIA_RIVAL_FIT_CENTROS.pdf")
OUT = os.path.abspath(OUT)

PAGE_W, PAGE_H = A4

# ----- Estilos ---------------------------------------------------------------
styles = getSampleStyleSheet()

def S(name, **kw):
    return ParagraphStyle(name, **kw)

h_title = S("h_title", fontName="Helvetica-Bold", fontSize=34, leading=38,
            textColor=WHITE, spaceAfter=6)
h_sub = S("h_sub", fontName="Helvetica", fontSize=13, leading=18, textColor=GRAY)
h1 = S("h1", fontName="Helvetica-Bold", fontSize=20, leading=24, textColor=WHITE,
       spaceBefore=10, spaceAfter=8)
h2 = S("h2", fontName="Helvetica-Bold", fontSize=14, leading=18, textColor=RED,
       spaceBefore=12, spaceAfter=4)
body = S("body", fontName="Helvetica", fontSize=10.5, leading=16, textColor=LIGHT,
         alignment=TA_JUSTIFY, spaceAfter=6)
body_w = S("body_w", fontName="Helvetica", fontSize=10.5, leading=16, textColor=WHITE)
bullet = S("bullet", fontName="Helvetica", fontSize=10.5, leading=15, textColor=LIGHT)
small = S("small", fontName="Helvetica", fontSize=8.5, leading=12, textColor=GRAY)
kpi_num = S("kpi_num", fontName="Helvetica-Bold", fontSize=22, leading=24,
            textColor=RED, alignment=TA_CENTER)
kpi_lbl = S("kpi_lbl", fontName="Helvetica", fontSize=8, leading=11,
            textColor=GRAY, alignment=TA_CENTER)
cover_kicker = S("cover_kicker", fontName="Helvetica-Bold", fontSize=11, leading=14,
                 textColor=RED, alignment=TA_CENTER, spaceAfter=10)
toc_item = S("toc_item", fontName="Helvetica", fontSize=11, leading=20, textColor=LIGHT)
white_center = S("wc", fontName="Helvetica-Bold", fontSize=12, textColor=WHITE,
                 alignment=TA_CENTER)

# ----- Fondos de pagina ------------------------------------------------------
def draw_bg(canvas, doc, cover=False):
    canvas.saveState()
    canvas.setFillColor(BLACK)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    # franja roja superior
    canvas.setFillColor(RED)
    canvas.rect(0, PAGE_H - 6, PAGE_W, 6, fill=1, stroke=0)
    if not cover:
        # logo oficial (R) en la cabecera, arriba a la izquierda
        try:
            lh = 9 * mm
            lw = lh * (1217 / 1414.0)
            canvas.drawImage(LOGO, 20 * mm, PAGE_H - 16 * mm, width=lw, height=lh,
                             mask="auto", preserveAspectRatio=True)
        except Exception:
            pass
        canvas.setFillColor(GRAY)
        canvas.setFont("Helvetica", 7.5)
        canvas.drawRightString(PAGE_W - 20 * mm, PAGE_H - 12 * mm, "GUIA OFICIAL PARA CENTROS")
        # pie
        canvas.setFillColor(NEAR_BLACK)
        canvas.rect(0, 0, PAGE_W, 22 * mm, fill=1, stroke=0)
        canvas.setStrokeColor(RED)
        canvas.setLineWidth(0.6)
        canvas.line(20 * mm, 22 * mm, PAGE_W - 20 * mm, 22 * mm)
        canvas.setFillColor(GRAY)
        canvas.setFont("Helvetica", 7.5)
        canvas.drawString(20 * mm, 12 * mm, "RIVAL FIT  ·  Guia Oficial para Centros Deportivos")
        canvas.drawRightString(PAGE_W - 20 * mm, 12 * mm, "rivalfit.app")
        canvas.setFillColor(RED)
        canvas.setFont("Helvetica-Bold", 8)
        canvas.drawCentredString(PAGE_W / 2, 12 * mm, "Pag. %d" % doc.page)
    canvas.restoreState()

def cover_bg(canvas, doc):
    draw_bg(canvas, doc, cover=True)
    canvas.saveState()
    # glow rojo radial simulado con rectangulos semitransparentes
    canvas.setFillColor(RED_DARK)
    canvas.setFillAlpha(0.10)
    canvas.rect(0, PAGE_H * 0.45, PAGE_W, PAGE_H * 0.35, fill=1, stroke=0)
    canvas.setFillAlpha(1)
    # logo oficial (R) sobre el titulo, en el espacio superior
    try:
        lh = 34 * mm
        lw = lh * (1217 / 1414.0)
        canvas.drawImage(LOGO, (PAGE_W - lw) / 2, PAGE_H * 0.74, width=lw, height=lh,
                         mask="auto", preserveAspectRatio=True)
    except Exception:
        pass
    canvas.restoreState()

def content_bg(canvas, doc):
    draw_bg(canvas, doc, cover=False)

# ----- Documento -------------------------------------------------------------
doc = BaseDocTemplate(
    OUT, pagesize=A4,
    leftMargin=20 * mm, rightMargin=20 * mm,
    topMargin=22 * mm, bottomMargin=28 * mm,
    title="Guia Oficial RIVAL FIT para Centros Deportivos",
    author="RIVAL FIT",
)
frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="main")
cover_frame = Frame(doc.leftMargin, 30 * mm, doc.width, PAGE_H - 60 * mm, id="cover")
doc.addPageTemplates([
    PageTemplate(id="Cover", frames=[cover_frame], onPage=cover_bg),
    PageTemplate(id="Content", frames=[frame], onPage=content_bg),
])

story = []

# ---- Helpers ----
def caption(text):
    return Paragraph("&#9656; " + text,
                     S("cap", fontName="Helvetica-Oblique", fontSize=8, leading=11,
                       textColor=RED, alignment=TA_CENTER, spaceBefore=4, spaceAfter=2))

def shot_block(name, caption_text, max_w_mm=None, max_h_mm=None):
    """Captura + pie de foto, agrupados (no se separan entre paginas)."""
    from reportlab.platypus import KeepTogether
    img = screenshot(name, max_w_mm=max_w_mm, max_h_mm=max_h_mm)
    if img is None:
        return Spacer(1, 1)
    return KeepTogether([Spacer(1, 6), img, caption(caption_text), Spacer(1, 8)])

def kpi_row(items):
    cells = []
    for num, lbl in items:
        inner = Table([[Paragraph(num, kpi_num)], [Paragraph(lbl, kpi_lbl)]],
                      colWidths=[(doc.width / len(items)) - 6])
        inner.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), CARD),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#2a2a2a")),
            ("TOPPADDING", (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ]))
        cells.append(inner)
    t = Table([cells], colWidths=[doc.width / len(items)] * len(items))
    t.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (-1, -1), 3),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    return t

def bullets(items):
    return ListFlowable(
        [ListItem(Paragraph(t, bullet), value="•", leftIndent=12) for t in items],
        bulletType="bullet", bulletColor=RED, bulletFontSize=10, leftIndent=6,
    )

def callout(text, title="CLAVE"):
    inner = Table([[Paragraph("<b><font color='#EF4444'>%s</font></b>  %s" % (title, text),
                              S("co", fontName="Helvetica", fontSize=9.5, leading=14,
                                textColor=LIGHT))]],
                  colWidths=[doc.width])
    inner.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#1a0f0f")),
        ("LINEBEFORE", (0, 0), (0, -1), 3, RED),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ]))
    return inner

def section_card(rows):
    """rows: list of (titulo, descripcion)"""
    data = []
    for title, desc in rows:
        data.append([Paragraph("<b>%s</b>" % title, body_w),
                     Paragraph(desc, S("cd", fontName="Helvetica", fontSize=9.5,
                                       leading=13, textColor=GRAY))])
    t = Table(data, colWidths=[doc.width * 0.30, doc.width * 0.70])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), CARD),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [CARD, NEAR_BLACK]),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#2a2a2a")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#222")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ]))
    return t

# =================== PORTADA ===================
story.append(Spacer(1, 52 * mm))
story.append(Paragraph("GUIA OFICIAL · 2026", cover_kicker))
story.append(Paragraph("RIVAL FIT", S("cover_title", fontName="Helvetica-Bold",
             fontSize=46, leading=48, textColor=WHITE, alignment=TA_CENTER)))
story.append(Spacer(1, 4))
story.append(Paragraph("para Centros Deportivos", S("cover_st", fontName="Helvetica",
             fontSize=18, leading=22, textColor=RED, alignment=TA_CENTER)))
story.append(Spacer(1, 70 * mm))
story.append(Paragraph(
    "El ecosistema todo-en-uno para gimnasios, boxes de CrossFit, HYROX, "
    "calistenia y entrenamiento funcional. Gestiona tu centro, fideliza a tus "
    "miembros y convierte tu comunidad en tu mejor herramienta de marketing.",
    S("cover_desc", fontName="Helvetica", fontSize=11, leading=17, textColor=GRAY,
      alignment=TA_CENTER)))
story.append(NextPageTemplate("Content"))
story.append(PageBreak())

# =================== INDICE ===================
story.append(Paragraph("Indice", h1))
story.append(Paragraph("<font color='#EF4444'>━━━━━</font>", body))
toc = [
    "1.  Que es RIVAL FIT y por que es diferente",
    "2.  Primeros pasos: crea tu centro en 4 minutos",
    "3.  El Dashboard de tu centro",
    "4.  Gestion de miembros y membresias",
    "5.  Clases, horarios y reservas",
    "6.  Programacion y WODs (CrossFit / HYROX / Funcional)",
    "7.  Check-in y control de asistencia",
    "8.  Tienda y monetizacion",
    "9.  Comunicaciones y comunidad",
    "10. Captacion de leads y clases de prueba",
    "11. Analitica e inteligencia de negocio",
    "12. Instalar RIVAL como app (sin App Store)",
    "13. Planes, precios y soporte",
    "14. Checklist de lanzamiento",
]
for t in toc:
    story.append(Paragraph(t, toc_item))
story.append(shot_block("ecosystem",
    "RIVAL une la red social de tus atletas con la gestion de tu centro", max_w_mm=155))
story.append(PageBreak())

# =================== 1. QUE ES ===================
story.append(Paragraph("1 · Que es RIVAL FIT y por que es diferente", h1))
story.append(Paragraph(
    "RIVAL FIT es la primera plataforma que une en un solo lugar la <b>red social "
    "deportiva</b> (donde tus atletas compiten, comparten y se motivan) con el "
    "<b>software de gestion</b> de tu centro. No es solo un software de administracion: "
    "es un motor de comunidad que mantiene a tus miembros enganchados cada dia.", body))
story.append(shot_block("for-centers",
    "Tu portal para centros en rivalfit.app/for-centers: gestion + leads + comunidad",
    max_w_mm=140))
story.append(Paragraph("La diferencia frente a la competencia", h2))
story.append(section_card([
    ("Wodify / SugarWOD", "Excelentes registrando WODs, pero cerrados: tus miembros no construyen comunidad publica ni atraen nuevos clientes por ti."),
    ("PushPress / Mindbody", "Potentes en gestion y cobros, pero la experiencia del atleta es plana. No hay feed social, historias ni competicion global."),
    ("Strava", "Gran comunidad, pero cero herramientas para que el DUENO gestione clases, cobros, miembros o leads."),
    ("RIVAL FIT", "Une las dos mitades: gestion profesional + red social viral. Cada entrenamiento que publica un miembro es marketing organico para tu centro."),
]))
story.append(Spacer(1, 8))
story.append(callout(
    "Cada miembro que registra su PR, sube una historia o completa el WOD del dia "
    "esta exponiendo tu marca a su red. Tu comunidad se convierte en tu equipo de marketing.",
    title="POR QUE IMPORTA"))
story.append(PageBreak())

# =================== 2. PRIMEROS PASOS ===================
story.append(Paragraph("2 · Primeros pasos: crea tu centro en 4 minutos", h1))
story.append(Paragraph(
    "Todo ocurre desde la web, sin instalar nada. Entra en "
    "<b><font color='#EF4444'>rivalfit.app/for-centers</font></b> y pulsa "
    "<i>Empezar Gratis</i>.", body))
story.append(Paragraph("El asistente de 4 pasos", h2))
story.append(section_card([
    ("Paso 1 — Cuenta", "Introduce tu email y crea una contrasena. Este sera el acceso de administrador (Head Coach) del centro."),
    ("Paso 2 — Tipo", "Elige el tipo de centro: Gimnasio, Box de CrossFit, HYROX, Calistenia o Funcional. Esto adapta las plantillas y la programacion."),
    ("Paso 3 — Ubicacion", "Nombre del centro, pais y ciudad. Puedes capturar la ubicacion GPS para aparecer en el mapa de centros."),
    ("Paso 4 — Plan", "Elige Free para empezar o un plan superior. Puedes cambiarlo cuando quieras desde Ajustes."),
]))
story.append(shot_block("center-signup",
    "Paso 1 del alta de centro: el asistente guiado de 4 pasos", max_h_mm=115))
story.append(Spacer(1, 8))
story.append(callout(
    "Al terminar, te llevamos directo al Dashboard de tu centro, ya operativo. "
    "No necesitas tarjeta para el plan Free.", title="LISTO"))
story.append(PageBreak())

# =================== 3. DASHBOARD ===================
story.append(Paragraph("3 · El Dashboard de tu centro", h1))
story.append(Paragraph(
    "El Dashboard es tu centro de mando. Desde una sola pantalla ves el pulso de tu "
    "negocio y accedes a todos los modulos.", body))
story.append(Paragraph("Que encontraras", h2))
story.append(bullets([
    "<b>Barra de estadisticas</b>: miembros activos, clases de hoy, ingresos del mes y nuevos leads.",
    "<b>Accesos rapidos</b>: Clases, Miembros, Tienda, Programacion, Comunicaciones y Perfil publico.",
    "<b>Feed del centro</b>: publica anuncios, fotos y resultados que veran todos tus miembros.",
    "<b>Multi-sede</b>: si tienes varias localizaciones, gestionalas de forma centralizada.",
]))
story.append(Spacer(1, 6))
story.append(callout(
    "Navega a Dashboard → Mis Centros → [tu centro]. Cada modulo se abre en su propia "
    "seccion y los cambios se guardan al instante en la nube.", title="COMO LLEGAR"))
story.append(shot_block("center-dashboard",
    "Panel de gestion real del centro: todos los modulos a un clic", max_w_mm=158))
story.append(PageBreak())

# =================== 4. MIEMBROS ===================
story.append(Paragraph("4 · Gestion de miembros y membresias", h1))
story.append(Paragraph(
    "El corazon de tu centro. Da de alta atletas, asignales un plan y controla el estado "
    "de cada membresia.", body))
story.append(shot_block("center-members",
    "Gestion de atletas: tarifa, facturacion y estado de cada miembro de un vistazo",
    max_w_mm=158))
story.append(Paragraph("Lo que puedes hacer", h2))
story.append(bullets([
    "Alta de miembros con nombre, email, telefono, plan y fecha de inicio.",
    "Estados automaticos: activo, en pausa, vencido — para que sepas a quien reactivar.",
    "Vincula a cada miembro con su perfil social RIVAL para ver su progreso real.",
    "Roles del equipo: Head Coach, Coach, Miembro y Lead, cada uno con sus permisos.",
]))
story.append(Spacer(1, 6))
story.append(callout(
    "Solo los roles Owner y Admin pueden crear o editar miembros. La seguridad por "
    "roles esta aplicada a nivel de base de datos, no solo en la pantalla.",
    title="SEGURIDAD"))
story.append(Spacer(1, 8))
story.append(Paragraph("Membresias y planes", h2))
story.append(Paragraph(
    "Define los planes de tu centro (mensual, bono de clases, drop-in...) y asignalos a "
    "cada miembro. El sistema lleva el control de vigencia y te avisa de los vencimientos "
    "para que no pierdas ingresos por bajas silenciosas.", body))
story.append(shot_block("center-memberships",
    "Membresias y tarifas del centro: DROP-IN, CrossFit, HYROX, Full Training...",
    max_w_mm=158))
story.append(PageBreak())

# =================== 5. CLASES ===================
story.append(Paragraph("5 · Clases, horarios y reservas", h1))
story.append(Paragraph(
    "Crea tu cuadrante de clases y deja que los miembros reserven su plaza desde su movil.", body))
story.append(section_card([
    ("Crear clase", "Nombre, descripcion, coach, dia, hora, duracion y capacidad maxima."),
    ("Horario semanal", "Vista de calendario con todas las clases. Edita o duplica en segundos."),
    ("Reservas", "Los miembros reservan plaza; tu ves el aforo en tiempo real y evitas overbooking."),
    ("Sincronizacion", "Conecta con Google Calendar para que coaches y miembros tengan sus clases en su agenda."),
]))
story.append(Spacer(1, 8))
story.append(callout(
    "La capacidad por clase evita aglomeraciones y te da datos de demanda: que franjas "
    "se llenan y cuales conviene reprogramar.", title="OPTIMIZA AFORO"))
story.append(shot_block("center-schedule",
    "Horario semanal: CrossFit, HYROX, Mobility y mas, con coach y aforo por clase",
    max_w_mm=158))
story.append(PageBreak())

# =================== 6. WODS ===================
story.append(Paragraph("6 · Programacion y WODs", h1))
story.append(Paragraph(
    "Disena la programacion diaria de tu box y publicala para todos tus atletas. Ideal "
    "para CrossFit, HYROX y entrenamiento funcional.", body))
story.append(Paragraph("Funciones de programacion", h2))
story.append(bullets([
    "<b>Editor de WODs</b>: crea entrenamientos con bloques, movimientos, cargas y tiempos.",
    "<b>WOD Generator con IA</b> (plan Pro): genera entrenamientos profesionales segun tipo, duracion y nivel.",
    "<b>Publicacion</b>: el WOD del dia aparece en el feed de tus miembros automaticamente.",
    "<b>Leaderboard</b>: tus atletas registran su resultado y compiten en la tabla del centro.",
    "<b>Deteccion de PR</b>: el sistema detecta records personales y los celebra — pura motivacion.",
]))
story.append(Spacer(1, 6))
story.append(callout(
    "El leaderboard por WOD genera competicion sana y asistencia recurrente: nadie quiere "
    "quedarse fuera de la tabla de la semana.", title="RETENCION"))
story.append(shot_block("center-wods",
    "Publicador de WODs: titulo, calentamiento, bloques, score y programacion", max_w_mm=158))
story.append(PageBreak())

# =================== 7. CHECK-IN ===================
story.append(Paragraph("7 · Check-in y control de asistencia", h1))
story.append(Paragraph(
    "Registra quien entra a cada clase y construye el historial de asistencia que necesitas "
    "para entender la salud de tu negocio.", body))
story.append(bullets([
    "Check-in rapido desde el panel del centro o desde el movil del miembro.",
    "Historial por miembro: detecta a tiempo a quien ha dejado de venir.",
    "Datos de asistencia que alimentan la prediccion de bajas (churn).",
]))
story.append(Spacer(1, 6))
story.append(callout(
    "Un miembro que falta 2 semanas seguidas es un miembro en riesgo. RIVAL te lo senala "
    "para que actues antes de perderlo.", title="ANTICIPATE A LA BAJA"))
story.append(shot_block("center-checkin",
    "Check-in por clase: asistencia del dia, clases programadas y aforo en tiempo real",
    max_w_mm=158))
story.append(PageBreak())

# =================== 8. TIENDA ===================
story.append(Paragraph("8 · Tienda y monetizacion", h1))
story.append(Paragraph(
    "Vende mas alla de las cuotas: merchandising, suplementos, bonos y servicios, todo "
    "integrado y cobrado online con Stripe.", body))
story.append(section_card([
    ("Productos", "Crea articulos con foto, precio y stock: camisetas, material, suplementos, bonos."),
    ("Pagos seguros", "Cobros procesados por Stripe. Tu dinero, directo a tu cuenta conectada."),
    ("Tienda en el perfil", "Tus miembros compran desde el perfil de tu centro, sin salir de la app."),
    ("Ingresos extra", "Diversifica tus ingresos y reduce tu dependencia exclusiva de las cuotas."),
]))
story.append(Spacer(1, 8))
story.append(callout(
    "La pasarela usa Stripe, lider mundial en pagos. Las claves secretas viven solo en el "
    "servidor: ni tus datos ni los de tus clientes se exponen en el navegador.",
    title="PAGOS SEGUROS"))
story.append(shot_block("center-store",
    "Store Manager: productos con foto, precio y stock, cobrados online con Stripe",
    max_w_mm=158))
story.append(PageBreak())

# =================== 9. COMUNICACIONES ===================
story.append(Paragraph("9 · Comunicaciones y comunidad", h1))
story.append(Paragraph(
    "Manten a tu comunidad informada y activa con herramientas de comunicacion directa.", body))
story.append(bullets([
    "<b>Feed del centro</b>: anuncios, eventos, fotos y resultados visibles para todos los miembros.",
    "<b>Notificaciones push</b>: avisa de cambios de horario, eventos o promociones al instante.",
    "<b>Mensajeria</b>: chat entre coaches y miembros para dudas y seguimiento.",
    "<b>Historias y publicaciones</b>: tus atletas comparten su dia a dia con video e imagen.",
]))
story.append(Spacer(1, 6))
story.append(callout(
    "Las notificaciones push funcionan aunque la app este cerrada, como una app nativa. "
    "Tasa de apertura muy superior al email.", title="LLEGADA DIRECTA"))
story.append(shot_block("center-communications",
    "Comunicaciones: redacta un anuncio y segmenta la audiencia (todos, activos, en prueba)",
    max_w_mm=158))
story.append(PageBreak())

# =================== 10. LEADS ===================
story.append(Paragraph("10 · Captacion de leads y clases de prueba", h1))
story.append(Paragraph(
    "Convierte visitantes en miembros. RIVAL te ayuda a capturar interesados y guiarlos "
    "hasta su primera clase.", body))
story.append(section_card([
    ("Perfil publico", "Tu centro tiene una pagina publica donde cualquiera puede descubrirte y contactar."),
    ("Clases de prueba", "Ofrece sesiones de prueba para que los leads vivan tu box antes de pagar."),
    ("Gestion de leads", "Registra interesados como rol Lead y haz seguimiento hasta convertirlos en miembros."),
    ("Mapa de centros", "Aparece en el descubrimiento por ubicacion para atletas que buscan donde entrenar."),
]))
story.append(Spacer(1, 8))
story.append(callout(
    "Una clase de prueba bien gestionada es tu mejor comercial. RIVAL te da el embudo "
    "completo: descubrir → probar → convertir.", title="EMBUDO DE VENTA"))
story.append(shot_block("public-center",
    "Perfil publico de tu centro: portada, CTA 'Prueba Gratis' y pestañas de instalaciones, WODs y tienda",
    max_h_mm=112))
story.append(PageBreak())

# =================== 11. ANALITICA ===================
story.append(Paragraph("11 · Analitica e inteligencia de negocio", h1))
story.append(Paragraph(
    "Decide con datos, no con intuiciones. RIVAL convierte la actividad de tu centro en "
    "metricas accionables.", body))
story.append(bullets([
    "<b>Panel de analitica</b>: miembros, asistencia, ingresos y crecimiento en graficos claros.",
    "<b>Prediccion de churn</b> (Pro): identifica que miembros estan en riesgo de baja.",
    "<b>Benchmarking</b> (Pro): compara el rendimiento de tu centro con referencias del sector.",
    "<b>Reportes automaticos</b> (Pro): recibe informes periodicos sin levantar un dedo.",
]))
story.append(Spacer(1, 6))
story.append(callout(
    "Saber a quien retener y que franjas potenciar es la diferencia entre crecer o "
    "estancarse. La analitica de RIVAL te da ese mapa.", title="DECIDE MEJOR"))
story.append(shot_block("center-analytics",
    "Analitica real: miembros activos, retencion, ingresos y evolucion a 12 meses",
    max_w_mm=158))
story.append(PageBreak())

# =================== 12. PWA ===================
story.append(Paragraph("12 · Instalar RIVAL como app (sin App Store)", h1))
story.append(Paragraph(
    "RIVAL FIT es una <b>Progressive Web App</b>: se instala en el movil como una app "
    "nativa, pero sin pasar por Apple Store ni Google Play. Sin descargas pesadas, sin "
    "esperas de revision, siempre actualizada.", body))
story.append(shot_block("landing",
    "La app se abre a pantalla completa en el movil, como una app nativa", max_h_mm=112))
story.append(Paragraph("Como instalarla", h2))
story.append(section_card([
    ("En iPhone (Safari)", "Abre rivalfit.app, pulsa Compartir y luego 'Anadir a pantalla de inicio'."),
    ("En Android (Chrome)", "Abre rivalfit.app, pulsa el menu (tres puntos) y 'Instalar aplicacion'."),
    ("Resultado", "Aparece el icono de RIVAL en tu pantalla. Se abre a pantalla completa, con notificaciones push y modo sin conexion."),
]))
story.append(Spacer(1, 8))
story.append(callout(
    "Recomienda a tus miembros instalar la app: los usuarios que la instalan abren la "
    "plataforma mucho mas y se mantienen mas tiempo en tu centro.", title="CONSEJO"))
story.append(PageBreak())

# =================== 13. PLANES ===================
story.append(Paragraph("13 · Planes, precios y soporte", h1))
story.append(shot_block("graphic-plans",
    "Cuatro planes que escalan con tu centro — empieza gratis", max_w_mm=160))
plan_data = [
    ["PLAN", "PRECIO", "PARA QUIEN", "DESTACADO"],
    ["Free", "0 €/mes", "Centros que empiezan", "Hasta 50 miembros, 10 clases/sem, check-in"],
    ["Starter", "49,99 €/mes", "Centros en crecimiento", "Clases ilimitadas, tienda, push, pruebas"],
    ["Pro", "99,99 €/mes", "Centros que escalan", "WOD Generator IA, churn, benchmarking, reportes"],
    ["Enterprise", "A medida", "Cadenas y redes", "Marca blanca, API, soporte 24/7, multi-centro"],
]
pt = Table(plan_data, colWidths=[doc.width*0.16, doc.width*0.17, doc.width*0.25, doc.width*0.42])
pt.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), RED),
    ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, 0), 9),
    ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
    ("FONTSIZE", (0, 1), (-1, -1), 8.5),
    ("TEXTCOLOR", (0, 1), (0, -1), RED),
    ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
    ("TEXTCOLOR", (1, 1), (-1, -1), LIGHT),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [CARD, NEAR_BLACK]),
    ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#2a2a2a")),
    ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#222")),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("TOPPADDING", (0, 0), (-1, -1), 9),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
    ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
]))
story.append(pt)
story.append(Spacer(1, 6))
story.append(Paragraph("Precios de lanzamiento para los primeros 50 centros. Puedes cambiar de "
                       "plan en cualquier momento desde Ajustes → Facturacion.", small))
story.append(Spacer(1, 12))
story.append(Paragraph("Soporte", h2))
story.append(bullets([
    "Email de ventas y soporte: sales@rivalfit.app",
    "Centro de ayuda y legal disponibles en rivalfit.app/legal/support",
    "Plan Enterprise: soporte prioritario 24/7 y formacion presencial para tu staff.",
]))
story.append(PageBreak())

# =================== 14. CHECKLIST ===================
story.append(Paragraph("14 · Checklist de lanzamiento", h1))
story.append(Paragraph(
    "Sigue estos pasos en orden para tener tu centro operativo y atrayendo miembros "
    "esta misma semana.", body))
story.append(shot_block("graphic-checklist",
    "10 pasos para lanzar tu centro en RIVAL esta misma semana", max_w_mm=160))
story.append(Spacer(1, 12))
final = Table([[Paragraph("Tu centro. Tu comunidad. Tu terreno.<br/><br/>"
                          "<font size=9 color='#9ca3af'>Empieza gratis hoy en "
                          "<font color='#EF4444'>rivalfit.app</font></font>",
                          S("final", fontName="Helvetica-Bold", fontSize=16, leading=22,
                            textColor=WHITE, alignment=TA_CENTER))]],
              colWidths=[doc.width])
final.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#1a0f0f")),
    ("BOX", (0, 0), (-1, -1), 1, RED),
    ("TOPPADDING", (0, 0), (-1, -1), 22),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 22),
]))
story.append(final)

doc.build(story)
print("PDF generado:", OUT)
print("Paginas y tamano OK")
