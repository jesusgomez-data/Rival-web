# RIVAL - Plan de Expansión B2B
## Centros Deportivos & Empresas de Fitness

**Versión:** 1.0 | **Fecha:** Enero 2026 | **Clasificación:** Estrategia de Producto

---

## TABLA DE CONTENIDOS
1. [Introducción & Visión](#introducción--visión)
2. [Oportunidad de Mercado](#oportunidad-de-mercado)
3. [Arquitectura de Integración B2B](#arquitectura-de-integración-b2b)
4. [Flujos de Usuario Detallados](#flujos-de-usuario-detallados)
5. [Features por Rol & Permisos](#features-por-rol--permisos)
6. [Herramientas Core para Centros](#herramientas-core-para-centros)
7. [Sistema de Clases de Prueba (Lead Management)](#sistema-de-clases-de-prueba-lead-management)
8. [Tienda Integrada & Pagos](#tienda-integrada--pagos)
9. [Analytics Avanzados](#analytics-avanzados)
10. [Monetización B2B](#monetización-b2b)
11. [Tech Stack Recomendado](#tech-stack-recomendado)
12. [Roadmap de Implementación](#roadmap-de-implementación)
13. [KPIs & Métricas Clave](#kpis--métricas-clave)
14. [Ideas Innovadoras](#ideas-innovadoras)
15. [Diferenciadores Competitivos](#diferenciadores-competitivos)

---

## INTRODUCCIÓN & VISIÓN

### El Problema
Plataformas B2B fitness actuales (AimHarder, SugarWOD, Wodify, Mindbody) se enfocan en **gestión operativa interna** (clases, asistencia, pagos) pero carecen de:
- **Red social integrada** para atracción de leads orgánicos
- **Experiencia unificada** entre centros y usuarios individuales
- **Herramientas de descubrimiento** (ubicación, tipo de deporte, comunidad)
- **Análisis predictivo** con IA para retención

ClassPass resolvió descubrimiento + membresía, pero **no es B2B2C** (el centro no controla su narrativa).

### La Solución: RIVAL B2B
Convertir Rival en **la primera red social fitness con CRM integrado** donde:

1. **Centros deportivos** gestionan su operación (clases, membresías, pagos) Y construyen su marca en una red social
2. **Usuarios individuales** descubren centros, asisten clases de prueba, se convierten en miembros
3. **Sinergia natural**: El feed social del usuario muestra actividad de centros que sigue → mayor engagement

**Diferenciador vs. competencia:**
- ✅ Centros tienen visibilidad social orgánica (vs. solo CRM)
- ✅ Leads vienen pre-calificados (seguidores interesados)
- ✅ Retención mejorada (comunidad integrada)
- ✅ Revenue compartida (app toma comisión pero ambos crecen)

---

## OPORTUNIDAD DE MERCADO

### Tamaño de Mercado
- **EU Fitness Market**: €30B anuales (2024)
- **Centros deportivos en EU**: ~150,000 (boxes CrossFit, gyms, estudios yoga, clubes running)
- **TAM B2B (solo EU)**: 150K centros × €100-200 ARPU = €15-30B
- **Nicho inicial (Centros fitness tech-ready)**: ~30K centros en EU = €3-6B

### Competencia Existente
| Competidor | Fortaleza | Debilidad |
|---|---|---|
| **AimHarder** | Simpleza, pricing bajo (€29-99/mes) | Sin red social, leads limitados, UX básica |
| **SugarWOD** | Comunidad WOD fuerte, integración Wodify | Solo para CrossFit, caro (€99-299/mes) |
| **Mindbody** | Ecosistema completo, marketplace | Caro (€199-400/mes), complejo, heredado |
| **ClassPass** | Descubrimiento, UX moderna | B2C, centros pierden control, comisión 30% |
| **Wodify** | Especializado CrossFit, datos | Caro, interfaz antigua |

**RIVAL B2B Advantage**: Social + CRM + Leads a fracción del precio

---

## ARQUITECTURA DE INTEGRACIÓN B2B

### Estructura de Cuentas

```
┌─────────────────────────────────────────────────────────────────┐
│                    RIVAL DATABASE UNIFIED                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐│
│  │  Users Table    │  │  Gym/Center      │  │  Memberships     ││
│  │                 │  │  Organization    │  │  Table           ││
│  │ - uid (PK)      │  │  Table           │  │                  ││
│  │ - email         │  │                  │  │ - membership_id  ││
│  │ - profile_type  │  │ - gym_id (PK)    │  │ - user_id (FK)   ││
│  │   (individual/  │  │ - name           │  │ - gym_id (FK)    ││
│  │    organization)│  │ - organization_  │  │ - type           ││
│  │ - created_at    │  │   id (FK)        │  │ - status         ││
│  │                 │  │ - location       │  │ - start_date     ││
│  │                 │  │ - description    │  │ - renewal_date   ││
│  │                 │  │ - social_profile │  │ - price_paid     ││
│  │                 │  │ - verified       │  │                  ││
│  └─────────────────┘  └──────────────────┘  └──────────────────┘
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐│
│  │  Roles & Perms   │  │  Classes/Events  │  │  Trial Classes   ││
│  │  (RLS policies)  │  │  Table           │  │  Table           ││
│  │                  │  │                  │  │                  ││
│  │ - user_id        │  │ - class_id       │  │ - trial_id       ││
│  │ - gym_id         │  │ - gym_id (FK)    │  │ - gym_id (FK)    ││
│  │ - role           │  │ - coach_id (FK)  │  │ - user_id (FK)   ││
│  │   (head_coach/   │  │ - type           │  │ - status         ││
│  │    coach/member) │  │ - schedule       │  │ - scheduled_date ││
│  │ - permissions    │  │ - max_capacity   │  │ - feedback       ││
│  │ - created_at     │  │ - enrolled       │  │ - converted      ││
│  └──────────────────┘  └──────────────────┘  └──────────────────┘
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              EXTERNAL INTEGRATIONS                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ Google Maps  │  │ Google Cal/  │  │ Stripe / Apple Pay /   │ │
│  │ (Discovery)  │  │ iCal Sync    │  │ Google Pay (Pagos)     │ │
│  └──────────────┘  └──────────────┘  └────────────────────────┘ │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ Firebase     │  │ Gemini IA    │  │ Twilio SMS / FCM Push  │ │
│  │ (Chat/Auth)  │  │ (Analytics & │  │ (Notificaciones)       │ │
│  │              │  │  Programación)                            │ │
│  └──────────────┘  └──────────────┘  └────────────────────────┘ │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Tipos de Usuarios en B2B
```
User Type         Role               Access Level    Use Case
────────────────────────────────────────────────────────────────
Organization     Owner/Admin        Full            Registra el centro
Admin            Head Coach          90%            Gestiona operaciones
Coach            Instructor          50%            Imparte clases
Member           Athlete            30%            Entrena
Lead             Trial User         10%            Prueba la clase
```

---

## FLUJOS DE USUARIO DETALLADOS

### 1. ONBOARDING DE CENTRO (Primeros 15 minutos)

```
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: Discovery & Sign Up (2 min)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Usuario visita rival.com → "Para centros"                     │
│  ↓                                                               │
│  Landing B2B: Features, precios, casos de uso                  │
│  ↓                                                               │
│  Click "Prueba Gratis" → Sign Up Form:                         │
│  - Email corporativo (dominios verificables: gmail ❌)         │
│  - Nombre del centro                                            │
│  - País / Ciudad                                                │
│                                                                   │
│  [ALTERNATIVA: SSO con Google Workspace]                       │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: Selección de Tipo de Centro (1 min)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Opciones (radio buttons):                                      │
│  ○ CrossFit Box                                                 │
│  ○ Gym Convencional (musculación/cardio)                        │
│  ○ Club de Running                                              │
│  ○ Estudio Yoga/Pilates                                         │
│  ○ Pista Pádel/Tenis                                            │
│  ○ Estudio de Danza                                             │
│  ○ Otro                                                          │
│                                                                   │
│  → Personaliza features (ej: CrossFit muestra "WODs",         │
│     Yoga muestra "Clases por nivel")                           │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: Verificación (3-5 min)                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Email verification → Link en email                             │
│  ↓                                                               │
│  [OPCIONAL] Verificación de documentos:                        │
│  - Foto RUT/ID del propietario                                 │
│  - Foto frontal del centro (validar dirección)                 │
│  - Certificación de actividad (registro mercantil)             │
│                                                                   │
│  ⏱️ Tiempo: Automático (5 seg) o manual si se selecciona       │
│     verificación (24-48h respuesta de equipo Rival)            │
│                                                                   │
│  ✅ Centro verificado → Badge en perfil                        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  STEP 4: Creación de Perfil Social (4-5 min)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Dashboard → "Completar Perfil"                                 │
│  ↓                                                               │
│  Campos a rellenar:                                             │
│  ┌──────────────────────────────────────────────┐              │
│  │ Logo (PNG/JPG, 512x512px)                    │              │
│  │ Foto de portada (1200x400px)                 │              │
│  │ Bio/Descripción (500 caracteres)             │              │
│  │ Dirección (autocompletado Google Maps)       │              │
│  │ Teléfono                                      │              │
│  │ Sitio web                                     │              │
│  │ Instagram/Facebook (links sociales)          │              │
│  │ Horarios de operación (by/day)               │              │
│  │ Deportes/Especialidades (checkboxes)         │              │
│  │ Cantidad de miembros (estimation)            │              │
│  │ Privacidad (Público / Solo miembros)         │              │
│  └──────────────────────────────────────────────┘              │
│  ↓                                                               │
│  [PREVIEW] Ver cómo se vé el perfil en la app                 │
│  ↓                                                               │
│  ✅ Crear perfil                                               │
│                                                                   │
│  → Perfil visible en búsquedas/mapas 30 seg después           │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  STEP 5: Setup Inicial (5 min - Async)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ✓ Plan seleccionado (Free, Starter, Pro, Enterprise)         │
│  ✓ Tarjeta de crédito (para pase de prueba o upgrade)        │
│  ✓ Invitar Head Coach (email invitación + link onboarding)   │
│  ✓ Crear primera clase                                         │
│  ✓ Conectar Google Calendar (opcional)                         │
│  ✓ Ver primer dashboard                                        │
│                                                                   │
│  🎉 Center ready to operate                                     │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 2. FLUJO: Usuario Individual Descubre Centro → Prueba → Conversión

```
┌─────────────────────────────────────────────────────────────────┐
│  USUARIO INDIVIDUAL (Logged In o Guest)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Browse Feed → Ve publicación de un centro                     │
│  "💪 New WOD: 3x5 Deadlifts - Burpees - Box Jumps"            │
│  Fotos del center, 2.4K likes                                   │
│                                                                   │
│  OR                                                              │
│                                                                   │
│  Navega a "Descubre" → Busca "Boxes CrossFit en Madrid"        │
│  → Mapa interactivo con pins de centros                         │
│  → Click en pin → Abre perfil del centro                        │
│                                                                   │
│  ┌────────────────────────────────────┐                        │
│  │ Box Madrid Elite                   │                        │
│  │ ⭐ 4.8 (234 reviews)              │                        │
│  │ 📍 Calle Gran Vía 5, Madrid       │                        │
│  │ 🕐 06:00 - 22:00 (Lunes-Sábado)   │                        │
│  │                                     │                        │
│  │ CrossFit Boxes:                    │                        │
│  │ - 20 Athletes                       │                        │
│  │ - 15 Coaches                        │                        │
│  │ - Founded 2018                      │                        │
│  │                                     │                        │
│  │ "Formamos campeones desde 2018..." │                        │
│  │                                     │                        │
│  │ [Seguir]  [Reseña]  [Enviar DM]   │                        │
│  │ [+ Solicitar Clase Prueba]         │ ← KEY ACTION          │
│  │                                     │                        │
│  │ 📸 Fotos (carousel)                │                        │
│  │ 🎥 Videos (últimos WODs)           │                        │
│  │ 📰 Feed del centro (10 posts)      │                        │
│  │ ⭐ Reseñas (con avatares users)    │                        │
│  └────────────────────────────────────┘                        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  STEP: SOLICITAR CLASE PRUEBA                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Click [+ Solicitar Clase Prueba]                              │
│  ↓                                                               │
│  Modal abre:                                                    │
│  ┌────────────────────────────────────┐                        │
│  │ ¿Cuándo quieres venir?             │                        │
│  │                                     │                        │
│  │ [Calendar selector]                │                        │
│  │ Próximas fechas:                   │                        │
│  │ ☐ Lunes 27 - 18:00 (Clase básica) │                        │
│  │ ☐ Miércoles 29 - 19:00 (General)  │                        │
│  │ ☐ Viernes 31 - 17:00 (Avanzado)   │                        │
│  │                                     │                        │
│  │ 📝 Nivel fitness: [Dropdown]       │                        │
│  │ 🏥 Lesiones: [Text]                │                        │
│  │ 📞 Teléfono: [+34...]             │                        │
│  │                                     │                        │
│  │ [Cancelar]  [Solicitar]            │                        │
│  └────────────────────────────────────┘                        │
│                                                                   │
│  → Notificación push al Head Coach: "Nueva solicitud de prueba" │
│  → Email al usuario: "Solicitud recibida"                       │
│                                                                   │
│  ✓ Status: "Pendiente aprobación" (visible en su perfil)       │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  CENTER SIDE: HEAD COACH APRUEBA/RECHAZA                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Dashboard → "Trial Requests" o Notificación Push              │
│  ↓                                                               │
│  Lista de solicitantes:                                         │
│  ┌────────────────────────────────────────────┐               │
│  │ 🔔 Luis García - Solicita prueba          │               │
│  │    Viernes 31, 17:00 (Avanzado)           │               │
│  │    Nivel: Intermediario                    │               │
│  │    Lesiones: Rodilla derecha              │               │
│  │                                             │               │
│  │    [Ver perfil]  [Rechazar]  [Aprobar]   │               │
│  └────────────────────────────────────────────┘               │
│                                                                   │
│  Si [Aprobar]:                                                  │
│  → Usuario recibe: "¡Aprobado! Llegá 10 min antes"            │
│  → Check-in QR generado (para día de la clase)                │
│  → Recordatorio automático 24h antes                            │
│  → Recordatorio 1h antes con ubicación/mapa                    │
│                                                                   │
│  Si [Rechazar]:                                                 │
│  → Email automático: "Gracias pero no disponible. Reintenta..." │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  LEAD ATTENDS CLASS (Día del evento)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  📍 Lead entra al centro                                        │
│                                                                   │
│  Opción 1: Check-in QR                                          │
│  - Coach escanea QR del lead con tablet/app                    │
│  - Sistema registra asistencia automáticamente                 │
│  - Status: "Asistió"                                            │
│                                                                   │
│  Opción 2: Manual                                               │
│  - Coach marcá asistencia en app                               │
│                                                                   │
│  Opción 3: Geolocalización (future)                            │
│  - Lead abre app → automáticamente detecta que está en centro  │
│  - Asistencia se registra                                       │
│                                                                   │
│  Lead participa en clase normal                                │
│                                                                   │
│  Al final:                                                      │
│  - Coach puede escribir nota ("Buen potencial - recomendar") │
│  - Lead recibe feedback en app                                │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  POST-CLASS: CONVERSIÓN O FOLLOW-UP                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  24h después:                                                   │
│  Lead recibe encuesta: "¿Cómo fue tu experiencia?"            │
│  - Rating ⭐⭐⭐⭐⭐                                           │
│  - ¿Volverías? Sí / No / Tal vez                              │
│  - Comentarios                                                  │
│                                                                   │
│  Simultáneamente:                                              │
│  Head Coach ve analytics:                                      │
│  "Luis García → Asistió → Rating 5/5 → LISTO PARA CONVERSIÓN" │
│                                                                   │
│  Lead recibe:                                                   │
│  ┌────────────────────────────────────┐                        │
│  │ 🎉 ¡Te gustó Box Madrid Elite!     │                        │
│  │                                     │                        │
│  │ Unirse por €49.99/mes              │                        │
│  │ (Primer mes €20 descuento)         │                        │
│  │                                     │                        │
│  │ Membresía incluye:                 │                        │
│  │ ✓ Clases ilimitadas                │                        │
│  │ ✓ Acceso a programas IA            │                        │
│  │ ✓ Badges & Rankings                │                        │
│  │ ✓ Comunidad                        │                        │
│  │                                     │                        │
│  │ [Ver más planes]  [Unirse ahora]   │                        │
│  └────────────────────────────────────┘                        │
│                                                                   │
│  Lead puede:                                                    │
│  a) Convertirse a miembro pagado                               │
│  b) Solicitar otra clase prueba                                │
│  c) Ignorar y seguir como seguidor                             │
│                                                                   │
│  ┌─ SI CONVERSIÓN ─────────────────────────────────────────┐  │
│  │                                                            │  │
│  │ 💳 Pago: Stripe (CC, Apple/Google Pay)                   │  │
│  │ ✅ Membresía activada inmediatamente                     │  │
│  │ 👤 Perfil actualizado: "Entreno en Box Madrid Elite"    │  │
│  │ 📊 Center analytics: Conversion tracked                  │  │
│  │ 🔔 Head Coach notification: "New member!"               │  │
│  │ 📧 Email: Bienvenida + horarios próximas clases        │  │
│  │ 💬 Chat abierto con coach asignado                      │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 3. FLUJO: Gestión Diaria de Centro

```
┌─────────────────────────────────────────────────────────────────┐
│  HEAD COACH MORNING ROUTINE (5 min)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. Abre app → Dashboard Home                                   │
│     - 3 nuevas solicitudes de clase prueba                     │
│     - 47 miembros hoy (capacidad 60)                           │
│     - 12 nuevos followers ayer                                  │
│     - 1 comentario negativo en review → responde               │
│                                                                   │
│  2. Check "Clases hoy"                                          │
│     - 06:00 clase básica (23/30 confirmados)                   │
│     - 17:00 clase avanzada (28/30 confirmados)                 │
│     - 19:00 yin yoga (18/25 confirmados)                       │
│                                                                   │
│  3. Envía recordatorios automáticos a todos los inscritos      │
│     (notificación push + email para inactivos)                 │
│                                                                   │
│  4. Publica WOD del día:                                        │
│     ┌─────────────────────────────────────┐                    │
│     │ 📰 Crear Publicación                 │                    │
│     │                                      │                    │
│     │ Tipo: WOD / Anuncio / Video / Foto │                    │
│     │                                      │                    │
│     │ **WOD - Viernes 24 Ene**            │                    │
│     │                                      │                    │
│     │ Warm up:                            │                    │
│     │ 3x5 Hang Squat Clean                │                    │
│     │ ...                                  │                    │
│     │                                      │                    │
│     │ [Agregar imagen] [Agregar video]   │                    │
│     │                                      │                    │
│     │ [Publicar]                           │                    │
│     └─────────────────────────────────────┘                    │
│                                                                   │
│     → Visible para todos los followers                          │
│     → Miembros reciben notificación                             │
│     → Leads ven en feed (descubrimiento)                        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  DURING CLASS (Coach Mode)                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Coach: Abre app → "Clase actual: 06:00 Básico"               │
│                                                                   │
│  Pantalla muestra:                                              │
│  ┌─────────────────────────────────────┐                       │
│  │ ✓ Juan Pérez                        │ Asistencia marca ✓   │
│  │ ✓ María López                       │                      │
│  │ ✓ Pedro García                      │                      │
│  │ ⏳ Luis Martínez (llega siempre 5 min)                     │
│  │ ❌ Ana Rodríguez (no llegó)         │                      │
│  │ 👶 Carlos (NUEVO - Clase prueba)    │                      │
│  │                                      │                      │
│  │ [Marcar todos presentes]             │                      │
│  │ [Añadir notas de clase]              │                      │
│  │ [Cargar vídeo/fotos]                 │                      │
│  └─────────────────────────────────────┘                       │
│                                                                   │
│  Notas por miembro (click en nombre):                          │
│  - Progreso hoy vs. semana pasada                              │
│  - Lesiones alertadas                                           │
│  - Logros/PRs (si los hubiera)                                 │
│  - Puntuación WOD vs. benchmarks                               │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  POST-CLASS (Analytics)                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Sistema automáticamente:                                       │
│  ✓ Marca asistencia confirmada                                 │
│  ✓ Calcula tasas de ocupación (23/30 = 76%)                   │
│  ✓ Identifica no-shows (Ana R. penalizada -1 punto)           │
│  ✓ Registra nuevo lead (Carlos - primer intento)              │
│  ✓ Sugiere mensajes personalizados:                           │
│    - A Ana: "Te extrañamos hoy. ¿Estás bien?"                 │
│    - A Carlos: "¡Bien hecho! ¿Qué te pareció?"               │
│                                                                   │
│  Head Coach opcionalmente:                                     │
│  - Envía mensajes personalizados a miembros                   │
│  - Marks PRs (Ana levantó nuevo PR en deadlift)              │
│  - Asigna "challenges" para próximos días                     │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## FEATURES POR ROL & PERMISOS

### Matriz de Control de Acceso (RBAC)

| Feature | Head Coach | Coach | Member | Lead | Guest |
|---------|:----------:|:-----:|:------:|:----:|:-----:|
| **PERFIL DEL CENTRO** | | | | | |
| Ver perfil público | ✅ | ✅ | ✅ | ✅ | ✅ |
| Editar descripción/bio | ✅ | ❌ | ❌ | ❌ | ❌ |
| Subir fotos/videos | ✅ | ✅ | ❌ | ❌ | ❌ |
| Gestionar reseñas | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver analytics del perfil | ✅ | ❌ | ❌ | ❌ | ❌ |
| **GESTIÓN DE CLASES** | | | | | |
| Crear clase | ✅ | ✅ | ❌ | ❌ | ❌ |
| Editar clase | ✅ | ✅* | ❌ | ❌ | ❌ |
| Eliminar clase | ✅ | ❌ | ❌ | ❌ | ❌ |
| Publicar WOD/Programación | ✅ | ✅ | ❌ | ❌ | ❌ |
| Ver calendario de clases | ✅ | ✅ | ✅ | ❌ | ✅ |
| Inscribirse a clase | ✅ | ✅ | ✅ | ❌ | ❌ |
| Ver roster de asistentes | ✅ | ✅ | ❌ | ❌ | ❌ |
| **ASISTENCIA** | | | | | |
| Marcar asistencia | ✅ | ✅ | ❌ | ❌ | ❌ |
| Check-in QR | ✅ | ✅ | ✅ | ✅ | ❌ |
| Ver histórico asistencia personal | ✅ | ✅ | ✅ | ❌ | ❌ |
| Ver reportes asistencia | ✅ | ❌ | ❌ | ❌ | ❌ |
| **CLASES PRUEBA** | | | | | |
| Solicitar clase prueba | ❌ | ❌ | ❌ | ✅ | ✅ |
| Aprobar solicitudes | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver lista de leads | ✅ | ❌ | ❌ | ❌ | ❌ |
| Seguimiento conversión | ✅ | ❌ | ❌ | ❌ | ❌ |
| **MIEMBROS** | | | | | |
| Agregar miembro manual | ✅ | ❌ | ❌ | ❌ | ❌ |
| Editar info del miembro | ✅ | ✅* | ❌ | ❌ | ❌ |
| Suspender/expulsar | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver lista de miembros | ✅ | ✅ | ❌ | ❌ | ❌ |
| Exportar lista de miembros | ✅ | ❌ | ❌ | ❌ | ❌ |
| **COACHING** | | | | | |
| Asignar coach a miembro | ✅ | ❌ | ❌ | ❌ | ❌ |
| Registrar progreso | ✅ | ✅ | ✅* | ❌ | ❌ |
| Ver progreso de protegidos | ✅ | ✅ | ❌ | ❌ | ❌ |
| Enviar plan de entrenamiento | ✅ | ✅ | ❌ | ❌ | ❌ |
| **CHAT / MENSAJERÍA** | | | | | |
| Chat 1:1 con coach | ✅ | ✅ | ✅ | ✅* | ❌ |
| Chat grupal (por clase) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Enviar anuncios broadcast | ✅ | ✅ | ❌ | ❌ | ❌ |
| Ver histórico mensajes | ✅ | ✅ | ✅ | ✅* | ❌ |
| **TIENDA** | | | | | |
| Crear producto | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver catálogo tienda | ✅ | ✅ | ✅ | ✅ | ✅ |
| Comprar producto | ✅ | ✅ | ✅ | ❌ | ❌ |
| Ver órdenes de cliente | ✅ | ❌ | ✅ | ❌ | ❌ |
| Ver todas las órdenes | ✅ | ❌ | ❌ | ❌ | ❌ |
| **MEMBRESÍA** | | | | | |
| Crear plan de membresía | ✅ | ❌ | ❌ | ❌ | ❌ |
| Editar precios | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver membresías activas | ✅ | ❌ | ❌ | ❌ | ❌ |
| Cambiar plan personal | ✅ | ✅* | ✅ | ❌ | ❌ |
| Cancelar membresía | ✅ | ❌ | ✅ | ❌ | ❌ |
| **ANALYTICS** | | | | | |
| Ver dashboard principal | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver ingresos/facturación | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver retención/churn | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver ocupación de clases | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver leads funnel | ✅ | ❌ | ❌ | ❌ | ❌ |
| Exportar reportes | ✅ | ❌ | ❌ | ❌ | ❌ |
| **INTEGRACIÓN SOCIAL** | | | | | |
| Ver followers | ✅ | ❌ | ✅ | ❌ | ❌ |
| Publicar en feed | ✅ | ✅ | ❌ | ❌ | ❌ |
| Responder comentarios | ✅ | ✅ | ✅ | ❌ | ❌ |
| Ver engagement stats | ✅ | ❌ | ❌ | ❌ | ❌ |
| Compartir clase en redes | ❌ | ❌ | ✅ | ❌ | ❌ |

**Leyenda**: ✅ = Acceso completo | ✅* = Acceso limitado (solo datos propios o protegidos) | ❌ = Sin acceso

---

## HERRAMIENTAS CORE PARA CENTROS

### 1. CALENDARIO DE CLASES & RESERVAS

#### Frontend (App)
```
┌─────────────────────────────────────────────────────┐
│ Centro: CALENDAR VIEW                               │
├─────────────────────────────────────────────────────┤
│                                                      │
│  [< Semana Anterior]  [WEEK VIEW]  [Semana Sig. >] │
│                                                      │
│  Lunes 27      Martes 28    Miércoles 29  ...      │
│  ────────      ────────     ─────────────           │
│                                                      │
│  06:00 ┌─────────────────┐                          │
│        │ Básico          │ 23/30 ✓                  │
│        │ Coach: Juan     │ [Editar]                 │
│        │ Warm: 10 min    │                          │
│        └─────────────────┘                          │
│                                                      │
│  17:00 ┌─────────────────┐                          │
│        │ Avanzado        │ 28/30 ✓                  │
│        │ Coach: María    │ [Editar]                 │
│        │ Dificultad: ⭐⭐⭐⭐⭐                      │
│        └─────────────────┘                          │
│                                                      │
│  19:00 ┌─────────────────┐                          │
│        │ Yin Yoga        │ 15/25 ✓                  │
│        │ Coach: Sofía    │ [Editar]                 │
│        │ Props: Mats     │                          │
│        └─────────────────┘                          │
│                                                      │
│  [+ CREAR NUEVA CLASE]                              │
│                                                      │
└─────────────────────────────────────────────────────┘
```

#### Crear/Editar Clase
```
┌──────────────────────────────────────────┐
│ Nueva Clase                              │
├──────────────────────────────────────────┤
│                                           │
│ Nombre: [_____________] (ej: "Básico")  │
│ Coach: [Dropdown] María López            │
│ Fecha: [Date Picker] 27 de enero        │
│ Hora inicio: [18:00]                    │
│ Duración: [60] minutos                  │
│ Capacidad máxima: [30] personas         │
│ Dificultad: ○ Básico ● Intermedio ○ Avanzado │
│ Descripción: [Text area]                │
│ Notas privadas (para coaches): [Text]   │
│                                           │
│ Sincronizar con:                        │
│ ☑ Google Calendar                       │
│ ☐ iCal                                   │
│ ☐ Zoom (Virtual class link)             │
│                                           │
│ Notificaciones automáticas:             │
│ ☑ 24 horas antes                        │
│ ☑ 1 hora antes                          │
│ ☑ A miembros no confirmados             │
│                                           │
│ [Cancelar]  [Guardar]  [Publicar]       │
│                                           │
└──────────────────────────────────────────┘
```

#### Sincronización Google Calendar
```
Head Coach setup:
1. Click "Conectar Google Calendar"
2. OAuth flow → Autorizar Rival a acceder calendario
3. Automáticamente:
   - Nueva clase en Rival → Se agrega a Google Cal
   - Cambio de hora/cancelación en Rival → Sincroniza
   - Los miembros ven clase en sus calendarios (si lo habilitan)

Miembros:
1. Ver clase en app
2. Click "Agregar a mi calendario"
3. Se sincroniza con Google Cal / Apple Cal / Outlook
```

#### Reservas
```
Usuario Individual (Member o Lead):
[Ver calendario del centro]
   ↓
[Click en clase]
   ↓
┌──────────────────────────┐
│ WOD - Viernes 31 - 17:00 │
│ Coach: Juan              │
│ Capacidad: 28/30 spots   │
│                           │
│ ☐ Aceptar términos      │
│ (Llegá 10 min antes)     │
│                           │
│ [Cancelar reserva] [Confirmar] │
└──────────────────────────┘
   ↓
✅ Reserva confirmada
Recordatorio: 24h antes
Recordatorio: 1h antes (push + ubicación)

No-show policy:
- 2 no-shows en 30 días → Aviso
- 3 no-shows → Suspensión temporal (debe contactar coach)
```

---

### 2. PROGRAMACIÓN SEMANAL CON IA

#### Flujo Head Coach
```
┌─────────────────────────────────────────────────────┐
│ Dashboard → "WOD Builder" (IA Asistida)            │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Semana: 27 Ene - 2 Feb                              │
│                                                      │
│ [Generar con IA] [Editar Manual] [Usar Plantilla] │
│                                                      │
│ Si click "Generar con IA":                         │
│ ┌──────────────────────────────────────┐           │
│ │ IA WOD Generator                     │           │
│ │                                       │           │
│ │ Tema: [Strength / Metabolic / Skills] │           │
│ │ Duración: [60 min]                    │           │
│ │ Equipamiento disponible: [Checkboxes] │           │
│ │ - Barbells ☑                          │           │
│ │ - Dumbbells ☑                         │           │
│ │ - Rigs ☑                              │           │
│ │ - Kettlebells ☑                       │           │
│ │ Público objetivo: [Básico/Int/Avanzado] │         │
│ │ Objetivo semanal: [Text] ej: "Mejorar │           │
│ │                    front squat"       │           │
│ │                                       │           │
│ │ [Generar]                             │           │
│ └──────────────────────────────────────┘           │
│                                                      │
│ IA genera 3 opciones:                              │
│                                                      │
│ Opción 1: (Strength Focus)                         │
│ Warm: 3x5 Front Squat @75%                         │
│ EMOM 20:                                            │
│ Min 1-3: 5 Thrusters + 7 Box Jumps                 │
│ Min 4-6: ...                                        │
│ [Usar esta] [Editar] [Ver más opciones]            │
│                                                      │
│ Opción 2: (Metabolic)                              │
│ ...                                                 │
│                                                      │
│ Opción 3: (Skills)                                 │
│ ...                                                 │
│                                                      │
└─────────────────────────────────────────────────────┘
```

#### Características IA
```
Gemini IA integration:

1. WOD GENERATION
   Input: Equipment, duration, difficulty, goal
   Output: Complete WOD with warmup + metcon + cooldown
   
2. PROGRESSION TRACKING
   Input: Athlete performance data (previous WODs)
   Output: Suggested progression (increase reps/weight)
   
3. INJURY PREVENTION
   Input: Common injuries, athlete history
   Output: Modified movements for safer execution
   
4. BENCHMARKING
   Input: WOD completion times/scores across athletes
   Output: "Athlete X improved 15% vs last month"
   
5. TEAM PERFORMANCE
   Input: Class attendance + WOD scores
   Output: Suggests class structure changes for better engagement
   
Example prompt template:
"Generate a 60-minute CrossFit WOD for 15 intermediate athletes
using barbells, dumbbells, and rings. Focus on lower body
strength. Athlete average PR front squat is 100kg. Include
modifications for seniors and pre-natal athletes."
```

---

### 3. CONTROL DE ASISTENCIA AVANZADO

#### Check-in Methods

**Opción 1: QR Code (Recomendado)**
```
Head Coach pre-clase:
1. Dashboard → Clase actual
2. Click "Mostrar QR"
3. Se muestra código QR en tablet/TV

Miembros al llegar:
1. Abren app → "Check-in"
2. Escanean QR con cámara del teléfono
3. ✅ "Check-in completado"
4. Sistema automáticamente:
   - Marca asistencia
   - Registra hora de llegada
   - Sincroniza con perfil del miembro
   - Notifica al coach

Ventajas:
- No requiere conexión de internet (QR es local)
- Rápido (2 segundos por persona)
- Imposible fraude (no sin estar en centro)
```

**Opción 2: Manual (Respaldo)**
```
Coach en app durante clase:
┌──────────────────────────────┐
│ Clase: Básico - 06:00        │
│                               │
│ ✓ Juan Pérez                 │
│ ✓ María López                │
│ ⏳ Pedro García (arriving)   │
│ ❌ Ana Martínez              │
│ 👶 Luis (LEAD - Prueba)      │
│                               │
│ Cuando llega Pedro:           │
│ Click en "⏳" → "✓"          │
│                               │
└──────────────────────────────┘
```

**Opción 3: Geolocalización (Futuro)**
```
Requisitos:
- Miembro habilita location sharing (opt-in)
- Centro tiene geofence definido

Al entrar al geofence:
- App detecta presencia
- Notifica al miembro: "¿Check-in en Box Madrid Elite?"
- Miembro confirma (1 tap)
- Asistencia registrada

Privacidad:
- Geofence activable/desactivable por centro
- Miembros pueden opt-out
- Datos de ubicación no almacenados (solo evento)
```

#### Reportes de Asistencia

```
Head Coach Dashboard:

┌──────────────────────────────────────────┐
│ ASISTENCIA - ÚLTIMA SEMANA                │
├──────────────────────────────────────────┤
│                                           │
│ Clase Básico (Lun-Mié-Vie):              │
│ Promedio ocupación: 76% (23/30)          │
│ Tasa de retención: 94% (vs hace 4 sem)  │
│ No-shows: 1 (Ana Martínez)               │
│ Nuevos asistentes: 3                     │
│                                           │
│ Clase Avanzado (Mar-Jue-Sab):            │
│ Promedio ocupación: 93% (28/30)          │
│ Tasa de retención: 100%                  │
│ No-shows: 0                              │
│ Nuevos: 0 (full)                         │
│                                           │
│ TOP PERFORMERS (mayor asistencia):       │
│ 1. Juan Pérez - 10/10 (100%)            │
│ 2. María López - 9/10 (90%)             │
│ 3. Pedro García - 8/10 (80%)            │
│                                           │
│ AT RISK (bajo asistencia):               │
│ ⚠️ Luis Martínez - 2/10 (20%) - En caída│
│ ⚠️ Sofía García - 4/10 (40%) - Tendencia baja │
│                                           │
│ [Descargar reporte Excel]                │
│ [Enviar notificaciones a at-risk]        │
│                                           │
└──────────────────────────────────────────┘
```

---

## SISTEMA DE CLASES DE PRUEBA (LEAD MANAGEMENT)

### Lead Funnel Completo

```
ETAPA 1: DISCOVERY
┌─────────────────────────────────────────┐
│ Usuario individual (free o premium)     │
│ Ve publicación del centro en feed       │
│ O descubre en mapa                      │
│ O busca por deporte/ubicación           │
│                                          │
│ CTR promedio: 15-20%                    │
│ (click en perfil del centro)            │
└─────────────────────────────────────────┘
                ↓
ETAPA 2: INTEREST
┌─────────────────────────────────────────┐
│ Visita perfil del centro                │
│ - Lee descripción                       │
│ - Ve fotos/videos                       │
│ - Lee reseñas (4.8⭐, 234 reviews)     │
│ - Ve horarios/ubicación                 │
│                                          │
│ Conversion: 30-40%                      │
│ (Click en "Solicitar clase prueba")    │
└─────────────────────────────────────────┘
                ↓
ETAPA 3: SOLICITUD
┌─────────────────────────────────────────┐
│ Lead relleña formulario:                │
│ - Fecha preferida                       │
│ - Nivel fitness                         │
│ - Lesiones/restricciones                │
│ - Teléfono                              │
│                                          │
│ Status: "Pending approval" (visible)    │
│ Email confirmación al lead              │
│ Notificación push al Head Coach         │
│                                          │
│ Conversion: 70% aprobación              │
└─────────────────────────────────────────┘
                ↓
ETAPA 4: APROBACIÓN & SCHEDULING
┌─────────────────────────────────────────┐
│ Head Coach:                             │
│ - Revisa solicitud                      │
│ - Click "Aprobar"                       │
│ - Sistema asigna clase automática       │
│   (próxima clase con capacidad)         │
│   O Head Coach elige manualmente        │
│                                          │
│ Lead recibe:                            │
│ - Push notification: "¡Aprobado!"      │
│ - Email con detalles (hora, ubicación) │
│ - Check-in QR                           │
│ - Recordatorios automáticos             │
│                                          │
│ Conversion: 80% asistencia              │
└─────────────────────────────────────────┘
                ↓
ETAPA 5: ASISTENCIA
┌─────────────────────────────────────────┐
│ Lead llega al centro                    │
│ - Check-in con QR                       │
│ - Participa en clase normal             │
│ - Coach nota comportamiento             │
│                                          │
│ Conversion: 65% (si buena experiencia) │
└─────────────────────────────────────────┘
                ↓
ETAPA 6: ENCUESTA & FEEDBACK
┌─────────────────────────────────────────┐
│ 24h después:                            │
│ Lead recibe survey:                     │
│ - ¿Cómo fue tu experiencia? (1-5⭐)    │
│ - ¿Volverías? (Sí/No/Talvez)           │
│ - Comentarios libres                    │
│                                          │
│ Simultáneamente:                        │
│ Head Coach ve feedback + puede          │
│ enviar mensaje personalizado            │
│                                          │
│ Conversion: 50-60% conversión (si 4⭐+)│
└─────────────────────────────────────────┘
                ↓
ETAPA 7: CONVERSIÓN O NURTURE
┌─────────────────────────────────────────┐
│ CAMINO A: Conversión                    │
│ Lead compra membresía → Miembro pagado │
│ Comisión app: 5-10%                    │
│                                          │
│ CAMINO B: Nurture                       │
│ Lead no convierte → Recibe:             │
│ - 2-3 recordatorios (email)             │
│ - Ofertas especiales ("50€ primer mes") │
│ - Invitación a probar otra clase       │
│ - Después de 30 días → Abandonado      │
│                                          │
│ Conversion: 20-30% eventual             │
│ (en próximas 3 meses)                   │
└─────────────────────────────────────────┘

FUNNELSUMMARY:
Discovery (100%) → Interest (35%) → Request (10%) 
→ Approval (7%) → Attendance (5.6%) → Conversion (3-4%)

Con 1000 visitors mensuales → 30-40 conversiones
A €49.99/mes → €1,500-2,000 revenue del funnel
```

### Lead Management Dashboard

```
Head Coach view:
┌──────────────────────────────────────────────┐
│ LEADS & TRIAL CLASSES                        │
├──────────────────────────────────────────────┤
│                                               │
│ 📊 FUNNEL SUMMARY (This month)               │
│ Total Solicitudes: 47                        │
│ Aprobadas: 40 (85%)                          │
│ Asistieron: 32 (80% de aprobadas)            │
│ Conversiones: 8 (25% de asistentes)          │
│                                               │
│ 📋 PENDING REQUESTS (3)                      │
│ ┌────────────────────────────────────────┐  │
│ │ Luis García                             │  │
│ │ Solicita: Viernes 31, 17:00 (Avanzado) │  │
│ │ Nivel: Intermediario                   │  │
│ │ [Ver más]  [Aprobar]  [Rechazar]      │  │
│ └────────────────────────────────────────┘  │
│                                               │
│ ┌────────────────────────────────────────┐  │
│ │ Carmen López                            │  │
│ │ Solicita: Sábado 1, 10:00 (Básico)     │  │
│ │ Nivel: Principiante                    │  │
│ │ [Ver más]  [Aprobar]  [Rechazar]      │  │
│ └────────────────────────────────────────┘  │
│                                               │
│ 👥 LEADS (Past 7 days)                       │
│ Convertidos: ✅                              │
│ - Juan Martínez (27 Ene) → Miembro 49.99€  │
│ - Sofia Ruiz (28 Ene) → Miembro 79.99€     │
│                                               │
│ En seguimiento: ⏳                            │
│ - Pedro García (22 Ene) → Email reminder   │
│ - Ana Fernández (25 Ene) → Pendiente feed │
│                                               │
│ Abandonados: ❌                              │
│ - Carlos López (15 Ene) → Sin respuesta    │
│ - Rosa Martín (20 Ene) → Negó conversión  │
│                                               │
│ 🎯 PREDICTED CONVERSIONS (Next 7 days)      │
│ IA predice 3 leads con 70%+ probabilidad   │
│ de convertirse en próxima semana            │
│                                               │
│ [Send bulk email offers] [Analizar datos] │
│                                               │
└──────────────────────────────────────────────┘
```

### Plantillas de Mensaje Automático

```
SYSTEM: Mensaje automático después de clase

Default template (editable por Head Coach):
"Hi [LEAD_NAME], Thanks for joining us on [CLASS_DATE]! 
How was your experience? We'd love to have you join our community. 
First month only €[DISCOUNT_PRICE] (regular €[PRICE]). 
[LINK to convert]"

Personalización basada en feedback:
Si lead rated 5⭐ y dijo "Sí volería":
"Hi [NAME], We loved having you! You were great today.
Ready to join permanently? Start your free 7-day trial → [LINK]"

Si lead rated 3⭐ o dijo "Talvez":
"Hi [NAME], Thanks for trying us! Maybe you'd prefer 
different class time? We have options:
- Clase básica a las 18:00 (menos intensa)
- Private coaching session (personalizado)
Let's find what works for you → [LINK to schedule]"

Si lead rated 1-2⭐:
"Hi [NAME], Sorry you didn't love it! We'd like to improve.
Would you be open to a chat with our head coach?
We offer personalized onboarding for free.
[LINK to calendar]"
```

---

## TIENDA INTEGRADA & PAGOS

### Tienda del Centro

```
User View (Member/Lead/Public):
┌──────────────────────────────────────────────┐
│ BOX MADRID ELITE - STORE                     │
├──────────────────────────────────────────────┤
│                                               │
│ 🛍️ CATEGORIES                                │
│ [Memberships] [Merch] [Supplements] [Extra]  │
│                                               │
│ MEMBERSHIPS:
│ ┌─────────────────────────────────┐          │
│ │ Monthly Unlimited              │          │
│ │ €49.99 / month                 │          │
│ │ ✓ Unlimited classes            │          │
│ │ ✓ Programación IA              │          │
│ │ ✓ Social badges                │          │
│ │ ✓ Progress tracking            │          │
│ │                                 │          │
│ │ [Subscribe]  [Learn more]      │          │
│ └─────────────────────────────────┘          │
│                                               │
│ ┌─────────────────────────────────┐          │
│ │ 10 Class Pack                  │          │
│ │ €129.99 (€12.99 per class)    │          │
│ │ ✓ 10 visits                    │          │
│ │ ✓ Valid 3 months               │          │
│ │ ✓ Transferable to friend       │          │
│ │                                 │          │
│ │ [Buy]                          │          │
│ └─────────────────────────────────┘          │
│                                               │
│ MERCH & PRODUCTS:
│ ┌─────────────────────────────────┐          │
│ │ BME Logo T-Shirt              │          │
│ │ €19.99                         │          │
│ │ Colores: Blanco, Negro        │          │
│ │ ⭐⭐⭐⭐⭐ (48 reviews)         │          │
│ │ Stock: 32 available            │          │
│ │                                 │          │
│ │ [Add to cart]                  │          │
│ └─────────────────────────────────┘          │
│                                               │
│ ┌─────────────────────────────────┐          │
│ │ Whey Protein (MyProtein)       │          │
│ │ €22.99                         │          │
│ │ Centro partner: MyProtein      │          │
│ │ [Partner badge] 5% commission  │          │
│ │ (comisión al centro)           │          │
│ │                                 │          │
│ │ [Add to cart]                  │          │
│ └─────────────────────────────────┘          │
│                                               │
│ [🛒 Cart (3)]  [Checkout]                    │
│                                               │
└──────────────────────────────────────────────┘
```

### Head Coach - Gestión de Tienda

```
┌──────────────────────────────────────────────────┐
│ STORE MANAGEMENT                                 │
├──────────────────────────────────────────────────┤
│                                                   │
│ [Memberships] [Products] [Orders] [Settings]    │
│                                                   │
│ ADD NEW PRODUCT:
│ ┌──────────────────────────────────────────┐   │
│ │ Name: [BME Hoodie]                       │   │
│ │ Category: [Merchandise] ▼                │   │
│ │ Price: [€39.99]                          │   │
│ │ Cost: [€15] (para calcular profit)      │   │
│ │ Stock: [50]                              │   │
│ │ Description: [Rich hoodie with logo]    │   │
│ │ Images: [Upload] [Camera] [Gallery]     │   │
│ │ Track inventory: ☑ Auto-decrement       │   │
│ │ Linked to supplier: None / [Add]        │   │
│ │                                           │   │
│ │ Type: Físico / Digital / Class Pass     │   │
│ │                                           │   │
│ │ [Cancel]  [Save]  [Publish]             │   │
│ └──────────────────────────────────────────┘   │
│                                                   │
│ PRODUCTS LISTING:
│ │ Product      │ Price  │ Stock  │ Sales │ % │
│ ├──────────────┼────────┼────────┼───────┼───┤
│ │ T-Shirt      │ €19.99 │ 12/50  │ 38    │ 76%│
│ │ Hoodie       │ €39.99 │ 25/50  │ 25    │ 50%│
│ │ Water Bottle │ €12.99 │ 3/30   │ 27    │ 90%│
│ │ Whey Protein │ €22.99 │ 100+   │ 122   │ -- │
│ │ [Edit] [Delete] [Stats]                    │
│                                                   │
│ ORDERS (Last 30 days):
│ │ #003421  | Juan Pérez    | €39.99 | Shipped │
│ │ #003420  | María López   | €52.97 | Pending │
│ │ #003419  | Pedro García  | €19.99 | Delivered │
│ │ [View details] [Mark as sent] [Contact]    │
│                                                   │
│ PARTNER PRODUCTS (Dropship):
│ ☑ MyProtein - Auto-sync inventory from API    │
│ ☑ Rogue Fitness - Custom commission (10%)    │
│ ❌ Lululemon - Pending verification           │
│                                                   │
└──────────────────────────────────────────────────┘
```

### Flujo de Pago

```
COMPRADOR (Member) → Carrito:

1. Producto seleccionado: T-Shirt Negra + Proteína
   Subtotal: €42.98

2. Opciones de pago:
   ○ Credit/Debit Card (Visa, MC, Amex)
   ○ Apple Pay
   ○ Google Pay
   ○ PayPal (future)
   ○ SEPA Transfer (B2B, future)

3. Click "Pagar €42.98"
   ↓
   Stripe Secure Payment Gateway
   ↓
   Ingresa CC info (PCI compliant)
   ↓
   ✅ Transacción aprobada

4. FACTURACIÓN AUTOMÁTICA:
   - Factura generada (PDF)
   - Descargable desde app
   - Email a member + head coach
   - Datos de envío capturados
   - Código de seguimiento generado

5. DESGLOSE DE COMISIONES:
   Precio final: €42.98
   
   Rival app: 10% = €4.30 ✓
   Centro: 90% = €38.68
   
   Nota: Si es producto partner (ej MyProtein):
   Rival: 5% (comisión stripe + servidor)
   Centro: 5% (affiliate del partner)
   MyProtein: 90%

6. SETTLEMENT (Pagos al Centro):
   - Semanal por transferencia bancaria
   - Resumen de transacciones
   - Deducción de chargebacks/refunds
   - Reporte fiscable (para IVA)
```

---

## ANALYTICS AVANZADOS

### Dashboard Principal (Head Coach)

```
┌─────────────────────────────────────────────────────────────┐
│ ANALYTICS DASHBOARD - BOX MADRID ELITE                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Period: [Last 30 Days] ▼  [Export PDF]  [Share]            │
│                                                              │
│ ┌──────────────┬──────────────┬──────────────┐             │
│ │ Members      │ New This Mo.  │ Churn Rate   │             │
│ │ 147          │ +12 (↑ 8.8%)  │ -3 (2.0%)    │             │
│ └──────────────┴──────────────┴──────────────┘             │
│                                                              │
│ ┌──────────────┬──────────────┬──────────────┐             │
│ │ Total Revenue│ Avg per Memb. │ Growth MoM  │             │
│ │ €7,352.50    │ €49.99        │ +12% ↑      │             │
│ └──────────────┴──────────────┴──────────────┘             │
│                                                              │
│ 📊 REVENUE BREAKDOWN:
│ Memberships (Recurring):  €6,200 (84%)
│ Tienda (Merch/Suplementos): €984 (13%)
│ One-time Clases: €168 (2%)
│ [Detalle mensual] [Proyección próximo trimestre]          │
│                                                              │
│ 📈 MEMBER GROWTH TREND (Last 6 months):
│ [Gráfico de línea]
│ Enero: 124 → Feb: 135 → Mar: 143 → Abr: 147              │
│ Tasa de crecimiento: +2.1% promedio mensual               │
│                                                              │
│ ⚠️ AT-RISK MEMBERS (Churn predicción, Next 30d):          │
│ - Luis Martínez (asistencia -40% vs mes anterior)         │
│ - Sofía García (pagó pero no vino en 2 semanas)          │
│ - Pedro López (mensaje negativo hace 5 días)             │
│ [Enviar re-engagement campaign]                           │
│                                                              │
│ 🎯 CLASS OCCUPANCY (Last week):
│ Clase Básica:      76% promedio (23/30 capacity)         │
│ Clase Avanzado:    93% promedio (28/30 capacity)         │
│ Yin Yoga:          60% promedio (15/25 capacity)         │
│ → Sugerencia IA: Agregar clase Básico sábado mañana     │
│                                                              │
│ 👥 ATTENDANCE PATTERNS:
│ Promedio por clase:    24 miembros                        │
│ No-show rate:          3.2%                               │
│ Most popular time:     17:00 (93% ocupación)             │
│ Least popular:         06:00 (65% ocupación)             │
│                                                              │
│ 💰 TIENDA PERFORMANCE:
│ Total órdenes: 14 (¡+25% vs mes anterior!)               │
│ Producto TOP: T-Shirt (38 ventas)                        │
│ Avg order value: €30.54                                   │
│ Repeat customers: 71% (10/14 compraron antes)            │
│                                                              │
│ 🏆 BENCHMARKS vs Similar Centers (EU):
│ Churn rate: 2.0% (your) vs 4.2% (avg) ✅ -52% mejor!   │
│ Revenue/member: €49.99 vs €48 (avg) ✅ +4% arriba       │
│ Class occupancy: 76% vs 68% (avg) ✅ +12% arriba        │
│ [Ver más benchmarks]                                      │
│                                                              │
│ 📱 LEADS FUNNEL (This month):
│ Solicitudes: 47                                            │
│ Aprobadas: 40 (85%)                                        │
│ Asistieron: 32 (80%)                                       │
│ Conversiones: 8 (25%)                                      │
│ Revenue from trials: €399.92 (5.4% del total)            │
│ [Detalle funnel] [Exportar leads]                        │
│                                                              │
│ 🤖 IA INSIGHTS:
│ "Your churn dropped 50% after adding Yin Yoga classes.   │
│  Recommend adding 1 more Yin class/week to retain        │
│  female members (70% female, avg age 32)."               │
│                                                              │
│ "Your best converter class is Avanzado on Thursday 17:00.
│  94% of converts attended this slot. 
│  Consider hosting trial class discovery sessions here."  │
│                                                              │
│ [Generate IA Report] [Ask IA a question]                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Reportes Automáticos (Email)

```
WEEKLY REPORT (Every Monday 8am):

Subject: 📊 Box Madrid Elite - Weekly Summary

Hi Juan,

Here's your performance summary for Week 27-31 Ene:

HIGHLIGHTS:
✅ +3 new members this week (147 total)
✅ +15% engagement in social feed (234 posts, 1.2K likes)
✅ €1,847 revenue (+8% vs last week)

CLASSES:
- Total classes: 15
- Avg occupancy: 78% (↑ from 74% last week)
- Top class: Avanzado Thursday 17:00 (30/30)
- At-risk: Yin Yoga Mon 18:00 (45% occupancy)

LEADS:
- New trial requests: 8
- Conversions: 2 (25% conversion rate)
- Predicted converters (next 7 days): 3

AT-RISK MEMBERS:
⚠️ Luis Martínez: No visit in 14 days
⚠️ Sofía García: -60% attendance vs 2 weeks ago

SUGGESTIONS:
💡 Add 1 Yin Yoga class Saturday morning to increase engagement
💡 Feature Avanzado Thursday on social feed (highest demand)
💡 Send personalized offer to 3 predicted converters (50% discount)

[View full dashboard] [Export PDF]

---

MONTHLY REPORT (1st of each month):
[Email with comprehensive analytics]
```

---

## MONETIZACIÓN B2B

### Modelos de Precios

#### Plan 1: FREEMIUM (Para Onboarding)

```
RIVAL FREE FOR CENTERS
├─ Capacidad: Hasta 100 miembros
├─ Clases: Hasta 10 por semana
├─ Funcionalidades:
│  ✓ Perfil público en app
│  ✓ Calendario de clases básico
│  ✓ Check-in manual
│  ✓ Asistencia basic reporting
│  ✓ Chat 1:1 con miembros
│  ├─ Sin análisis avanzado
│  ├─ Sin tienda integrada
│  ├─ Sin trial class management
│  └─ Sin integración calendarios
│
├─ Conversión estrategia:
│  - Centro ve valor pero choca con limitaciones
│  - Ideal para onboarding (0-30 días gratis)
│  - Luego requiere upgrade para crecer
│
└─ Precio: €0/mes
   (Rival monetiza vía comisiones tienda: 10%)
```

#### Plan 2: STARTER (Pequeños Centros)

```
RIVAL STARTER
├─ Capacidad: Hasta 500 miembros
├─ Clases: Ilimitadas
├─ Funcionalidades:
│  ✓ Todo de FREE, más:
│  ✓ Análisis de asistencia (gráficos)
│  ✓ Sistema de clases prueba
│  ✓ Tienda integrada (productos básicos)
│  ✓ Google Calendar sync
│  ✓ Notificaciones push automáticas
│  ✓ Chat grupal (por clase)
│  ✓ Email templates personalizables
│  ├─ Sin WOD IA generator
│  ├─ Sin benchmarks
│  └─ Sin analytics avanzados
│
├─ Casos de uso:
│  - Yoga studios (20-50 miembros)
│  - Personal training studios
│  - Pequeños boxes CrossFit
│
└─ Precio: €49.99/mes
   Comisiones adicionales:
   - Tienda: 8% (vs 10% en Free)
   - Pago plan: Stripe toma 2.9% + €0.30
```

#### Plan 3: PRO (Centros Medianos)

```
RIVAL PRO
├─ Capacidad: Hasta 2,000 miembros
├─ Clases: Ilimitadas + Subgrupos (coaches)
├─ Funcionalidades:
│  ✓ Todo de STARTER, más:
│  ✓ WOD IA Generator (Gemini)
│  ✓ Análisis predictivo de churn
│  ✓ Benchmarks contra centros similares
│  ✓ Tienda avanzada (dropshipping partners)
│  ✓ Reportes automáticos (email)
│  ✓ Custom domains (ej: store.boxmadrid.club)
│  ✓ Roles & Permisos granulares
│  ✓ Video uploads para clases
│  ✓ SMS reminders (20 gratis/mes, +€0.10 c/u)
│  ✓ Advanced chat (encuestas, polls)
│  ├─ Sin white label
│  └─ Sin API access
│
├─ Casos de uso:
│  - Cadenas pequeñas (3-5 centros)
│  - Boxes CrossFit de 200+ miembros
│  - Grandes studios (yoga, pilates)
│
└─ Precio: €149.99/mes
   Comisiones:
   - Tienda: 6%
   - SMS: €0.10 por mensaje enviado
```

#### Plan 4: ENTERPRISE (Grandes Redes)

```
RIVAL ENTERPRISE
├─ Capacidad: Ilimitada (10,000+ miembros)
├─ Clases: Ilimitadas + Franchises/Ubicaciones
├─ Funcionalidades:
│  ✓ Todo de PRO, más:
│  ✓ Múltiples locales en un dashboard
│  ✓ API access (integraciones custom)
│  ✓ White label (branding custom)
│  ✓ Soporte prioritario (teléfono + Slack)
│  ✓ Consultoría de estrategia (1h/mes)
│  ✓ Integraciones: Zapier, Make.com
│  ✓ Custom reports builder
│  ✓ Advanced member segmentation
│  ✓ Programación automática IA (custom)
│
├─ Casos de uso:
│  - Franquicias nacionales (10-50 centros)
│  - Grupos corporativos de fitness
│  - Cadenas multinacionales
│
└─ Precio: Customizado (Starting €499.99/mes)
   Comisiones:
   - Tienda: 4%
   - Negociable según volumen
   
   Contrato: Anual con descuento 20% (€4,799.88)
```

### Resumen de Precios

| Feature | Free | Starter | Pro | Enterprise |
|---------|------|---------|-----|------------|
| **Monthly Price** | €0 | €49.99 | €149.99 | €499.99+ |
| **Capacity** | 100 | 500 | 2,000 | Unlimited |
| **Locations** | 1 | 1 | 1-3 | Unlimited |
| Clases Ilimitadas | ❌ (10/sem) | ✅ | ✅ | ✅ |
| Sistema pruebas | ❌ | ✅ | ✅ | ✅ |
| WOD IA | ❌ | ❌ | ✅ | ✅ |
| Benchmarks | ❌ | ❌ | ✅ | ✅ |
| Tienda | ❌ | ✅ (básico) | ✅ (avanzado) | ✅ (premium) |
| API Access | ❌ | ❌ | ❌ | ✅ |
| White Label | ❌ | ❌ | ❌ | ✅ |
| Soporte | Email | Email | Email+Chat | Teléfono+Slack |
| **Comisión Tienda** | 10% | 8% | 6% | 4% |

### Proyecciones de Ingresos (Año 1)

```
Asunciones:
- 5,000 centros registrados en EU por fin de año
- Mix: 70% Starter, 25% Pro, 5% Enterprise
- Churn: 5% mensual (perdemos ~4 Starter por mes)
- Upsell: 10% de Starter → Pro anualmente

Mes 1 (Enero):
- 50 centros registrados
  30 Free, 15 Starter, 5 Pro
- Revenue: (15 × €49.99) + (5 × €149.99) = €1,499.70
- Comisión tienda (avg €50/centro): (15 × €50 × 8%) + (5 × €50 × 6%) = €75
- Total: €1,574.70

Mes 6 (Junio):
- 1,200 centros totales
  300 Free, 840 Starter, 50 Pro, 10 Enterprise
- Revenue:
  Starter: 840 × €49.99 = €41,993
  Pro: 50 × €149.99 = €7,500
  Enterprise: 10 × €500 = €5,000
  Total suscripciones: €54,493
  
- Comisión tienda (avg €1,500/mes por centro):
  Free: 300 × €1,500 × 10% = €45,000
  Starter: 840 × €1,500 × 8% = €100,800
  Pro: 50 × €1,500 × 6% = €4,500
  Enterprise: 10 × €1,500 × 4% = €600
  Total comisiones: €150,900
  
- Total: €205,393 / mes

Año 1 Final (Diciembre):
- 5,000 centros totales
  500 Free, 3,500 Starter, 800 Pro, 200 Enterprise
  
- Revenue suscripciones:
  Starter: 3,500 × €49.99 = €174,965
  Pro: 800 × €149.99 = €119,992
  Enterprise: 200 × €600 = €120,000 (promedio)
  Total: €414,957 / mes
  
- Comisión tienda (avg €5,000/mes por centro):
  Free: 500 × €5,000 × 10% = €250,000
  Starter: 3,500 × €5,000 × 8% = €1,400,000
  Pro: 800 × €5,000 × 6% = €240,000
  Enterprise: 200 × €5,000 × 4% = €40,000
  Total: €1,930,000 / mes
  
- Total: €2,344,957 / mes (Dec)
- **AÑO 1 REVENUE B2B: ~€8.5M** (proyectado)

Desglose:
- Suscripciones: ~€2.8M (33%)
- Comisiones tienda: ~€5.7M (67%)

NOTA: Estos números asumen:
✅ Estrategia de marketing fuerte (paid ads, partnerships)
✅ Viralidad (5-10% MoM growth en centros)
✅ Tienda promedio €5k/mes es realista (mix de membresías recurrentes)
✅ Churn manejable (5% = bueno para SaaS fitness)
```

---

## TECH STACK RECOMENDADO

### Backend (Expansión)

| Layer | Tecnología | Alternativa | Propósito |
|-------|-----------|------------|----------|
| **Auth** | Supabase Auth | Firebase Auth | SSO empresarial, verificación email/dominio |
| **Database** | Supabase (PostgreSQL) | Firebase Firestore | Datos de centros, miembros, clases, órdenes |
| **File Storage** | Supabase Storage | AWS S3 | Fotos/videos de centros, clases, reseñas |
| **Chat/Real-time** | Firebase Realtime DB | Supabase Realtime | Mensajes 1:1 y grupales |
| **Payments** | Stripe Connect | Adyen, PayPal Commerce | Pagos membresías, tienda, payouts a centros |
| **IA / Generación** | Google Gemini API | OpenAI GPT-4 | WOD generation, analytics insights, churn prediction |
| **Notificaciones** | Firebase Cloud Messaging (FCM) | OneSignal | Push notifications a miembros |
| **SMS** | Twilio | Vonage | Recordatorios SMS (reminders de clase) |
| **Maps API** | Google Maps Embed | Mapbox | Ubicación centros, descubrimiento geográfico |
| **Calendar Sync** | Google Calendar API | iCal/CalDAV | Sincronización calendario usuario |
| **Jobscheduler** | Cloud Tasks (GCP) | Redis Bull (self-hosted) | Reportes automáticos, recordatorios |

### Frontend (Expansión)

```
EXISTING:
- Next.js 16 (app router)
- React 19.2.3
- TypeScript
- Tailwind CSS 4
- Framer Motion 12

NEW MODULES FOR B2B:
├─ Center Dashboard
│  ├ /app/center/[centerId]/dashboard
│  ├ /app/center/[centerId]/classes
│  ├ /app/center/[centerId]/store
│  ├ /app/center/[centerId]/analytics
│  ├ /app/center/[centerId]/leads
│  └─ /app/center/[centerId]/members
│
├─ Mobile (React Native / Expo)
│  ├ For coaches (check-in, attendance)
│  ├ For members (booking, chat)
│  └─ For centers (notifications, quick stats)
│
└─ Admin Panel (React + TypeScript)
   ├ Fraud detection
   ├ Center moderation
   ├ Dispute resolution
   └─ Global analytics

LIBRARIES TO ADD:
- react-hook-form (forms en dashboard)
- zod (validación)
- recharts (gráficos analytics)
- zustand (state management simple)
- react-query (server state)
- react-hot-toast (notifications)
- clsx (condicional classes)
```

### Infraestructura

```
HOSTING:
├─ Frontend: Vercel (existing Next.js)
├─ Backend APIs: Supabase (hosted PostgreSQL + functions)
├─ CDN: Vercel Edge Network
└─ Backups: Automated (Supabase managed)

MONITORING & OBSERVABILITY:
├─ Errors: Sentry
├─ Analytics: Posthog (eventos)
├─ Logs: Supabase + Google Cloud Logging
├─ Performance: Web Vitals (Vercel Analytics)
└─ Database: Supabase CLI + pg_stat_statements

CI/CD:
├─ GitHub Actions
├─ Tests: Vitest (unit) + Playwright (E2E)
├─ Staging: Preview deployments en Vercel
└─ Production: Auto-deploy on main branch

SECURITY:
├─ SSL/TLS: Automatic (Vercel)
├─ RLS (Row-Level Security): Supabase policies
├─ API Rate limiting: Supabase realtime rules
├─ PCI Compliance: Stripe handles CC processing
├─ GDPR Compliance: Data export/deletion endpoints
└─ 2FA: Supabase built-in
```

---

## ROADMAP DE IMPLEMENTACIÓN

### Fase 1: MVP B2B (3 meses)

**Objetivo:** Convertir cualquier centro pequeño en operador básico en la app

| Sprint | Week | Feature | MVP Scope | Effort |
|--------|------|---------|-----------|--------|
| 1 | 1-2 | Center Registration | Email + tipo de centro + plan selection | M |
| 1 | 2-3 | Center Profile Social | Logo, bio, foto portada, horarios | M |
| 2 | 4-5 | Roles & Permissions | Head Coach, Coach, Member roles | M |
| 2 | 5-6 | Classes Management | Create, edit, calendar view | L |
| 3 | 7-8 | Check-in System | Manual + QR básico | M |
| 3 | 8-9 | Memberships | Setup 2-3 planes, Stripe integration | L |
| 4 | 10-11 | Basic Analytics | Occupancy, attendance trends, revenue | L |
| 4 | 11-12 | Basic Store | Tienda simple (5-10 productos, Stripe) | M |

**Deliverables:**
- ✅ Centro puede crear cuenta → Setup perfil → Gestionar clases → Cobrar membresías
- ✅ Miembros pueden ver perfil centro → Inscribirse clases → Pagar
- ✅ App genera 20-30% más engagement (centros publican en feed)

**Metricas Éxito:**
- 500+ centros registrados (primeros 90 días)
- 10K+ miembros pagando a través de centros
- €50K+ MRR (suscripciones + comisiones)

---

### Fase 2: Leads & Advanced Features (3 meses)

**Objetivo:** Convertir centros en growth engines a través de trial classes

| Sprint | Week | Feature | Scope | Effort |
|--------|------|---------|-------|--------|
| 5 | 13-14 | Trial Class System | Request → Approval → Attendance flow | L |
| 5 | 14-15 | Lead Management | Dashboard, funnel analytics, nurture | L |
| 6 | 16-17 | WOD IA Generator | Gemini integration para programación | L |
| 6 | 17-18 | Advanced Analytics | Churn prediction, benchmarks, IA insights | L |
| 7 | 19-20 | SMS Reminders | Twilio integration, scheduled messages | M |
| 7 | 20-21 | Chat Sistema | 1:1 + grupal (Firebase Realtime) | L |
| 8 | 22-23 | Advanced Store | Partner products (MyProtein, Rogue) | M |
| 8 | 23-24 | Reportes Automáticos | Semanales/mensuales por email | M |

**Deliverables:**
- ✅ Centro genera leads orgánicos → Aprueban pruebas → Conversión automatizada
- ✅ Coaching mejorado (chat, programación IA, seguimiento)
- ✅ Análisis predictivos (sabe quién va a churn antes de que pase)

**Metricas Éxito:**
- 2,000+ centros (200% growth)
- 30-40% trial → member conversion rate
- €300K+ MRR
- 1-2% churn rate (vs industry avg 5%)

---

### Fase 3: Scale & Enterprise (3+ meses)

**Objetivo:** Soportar grandes redes y integración total con app individual

| Sprint | Week | Feature | Scope | Effort |
|--------|------|---------|-------|--------|
| 9 | 25-26 | Multi-location Management | Franquicias en un dashboard | L |
| 9 | 26-27 | Global Pass (ClassPass competitor) | Membresía app para acceder 100+ centros | XL |
| 10 | 28-29 | API Access | REST API para integraciones custom | L |
| 10 | 29-30 | White Label | Custom domains, branding | M |
| 11 | 31-32 | Mobile App for Centers | Coach + Head Coach app native | L |
| 11 | 32-33 | Virtual Events | Classes en vivo (Zoom/Twitch integration) | L |
| 12 | 34-35 | Marketplace | Centros descubren partners (entrenadores, nutris) | M |
| 12 | 35-36 | Payment Reconciliation | Reporting/compliance avanzado | M |

**Deliverables:**
- ✅ Redes de 10-50 centros operan como un ecosystem
- ✅ Global Pass: usuarios pueden visitar 200+ centros europeos
- ✅ Centros monetizan coaching, eventos, partnerships

**Metricas Éxito:**
- 5,000+ centros (150% growth)
- 500K+ miembros totales
- €2M+ MRR
- 30+ centros en "Enterprise" tier
- 50+ partner brands en marketplace

---

## KPIs & MÉTRICAS CLAVE

### Para Rival (Nivel Empresa)

```
ACQUISITION & ACTIVATION:

1. Centers Registered
   ├─ Objetivo Año 1: 5,000
   ├─ Target MoM growth: 15%
   ├─ Tracking: Dashboard global
   └─ Success: >500 por mes (Jun+)

2. Centers Activated (First Class Created)
   ├─ Objetivo: 80% del registro
   ├─ Typical: 72h post signup
   └─ Problem indicator: <60%

3. Time-to-Value (TTM)
   ├─ Objetivo: <15 minutos (desde signup a crear clase)
   ├─ Current: ~20 min
   └─ Optimization: Remove friction en onboarding

ENGAGEMENT:

4. Monthly Active Centers (MAC)
   ├─ Objetivo: 90% del total registrado
   ├─ Típico para SaaS: 60-70%
   └─ Action: <80% = revisar UX/value prop

5. Classes Published per Center/Week
   ├─ Baseline: 5 clases por semana (avg)
   ├─ Objetivo: 7 (indica engagement)
   └─ Tracking: Automático (database)

6. Feed Engagement (Social)
   ├─ Posts published/month: 50,000+ (all centers)
   ├─ Engagement rate: 5%+ (likes/comments/shares)
   ├─ Viral coeff: 0.2 (each post brings 0.2 new leads)
   └─ Success: Feed visible in home feed = discovery

RETENTION:

7. Monthly Churn Rate (Centers)
   ├─ Objetivo: <5% (bueno para SaaS)
   ├─ Typical gyms: 10-15%
   ├─ Action if >5%: Outbound calls, feature gaps
   └─ Reason tracking: API abandonment, cheaper competitor, bankruptcy

8. Net Revenue Retention (NRR)
   ├─ Fórmula: (Revenue_end - Churned + Upsell + Net) / Revenue_start
   ├─ Target: >110% (significa growth from upsells)
   ├─ Current projection: 108% (bueno!)
   └─ Tracked: Por tier (Starter → Pro upsell)

9. Center Health Score
   ├─ Inputs:
   │  ├─ Classes created (40% weight)
   │  ├─ Members active (30%)
   │  ├─ Tienda revenue (20%)
   │  └─ Engagement (10%)
   ├─ Score: 0-100 (Green: >70, Yellow: 40-70, Red: <40)
   ├─ Usage: Proactive support para Yellow/Red
   └─ Típico: 75 (healthy)

REVENUE:

10. MRR (Monthly Recurring Revenue)
    ├─ Target Año 1 End: €2M+
    ├─ Breakdown:
    │  ├─ Suscripciones: 30%
    │  └─ Comisiones: 70%
    └─ Tracking: Stripe + manual reconciliation

11. ARPU (Average Revenue Per Unit/Center)
    ├─ Fórmula: Total MRR / Active Centers
    ├─ Target: €120 (suscripción €90 + comisiones €30)
    ├─ Baseline: €65 (Starter tier only)
    └─ Growth via: Upsells to Pro (€240 ARPU)

12. LTV:CAC Ratio
    ├─ LTV = ARPU × (1/churn) × contribution margin
    ├─ Target: >3:1 (healthy)
    ├─ Calculation:
    │  ├─ Avg center lifespan: 24 months
    │  ├─ LTV: €120 × 24 × 0.7 = €2,016
    │  ├─ CAC: €600 (paid ads + support)
    │  └─ Ratio: 3.4:1 ✅
    └─ Optimization: Reduce CAC, improve LTV

13. Tienda Commission Revenue
    ├─ Target MoM: 60-65% of total MRR
    ├─ Average per center: €3,000-5,000/month
    ├─ Commission: 6-10% = €180-500 per center
    └─ Growth lever: Partner integrations (dropship)

LEAD QUALITY (Trials System):

14. Trial Request Approval Rate
    ├─ Target: 85%+
    ├─ Current: 80%
    ├─ Indicates: Supply (class availability)
    └─ Problem: <70% = add more trial slots

15. Trial Attendance Rate
    ├─ Target: 75%+
    ├─ Typical: 60-70%
    ├─ Trackable: Via check-in QR
    └─ Action if <60%: Reminders (email+SMS) are working?

16. Trial-to-Member Conversion Rate
    ├─ Target: 30%+
    ├─ Baseline: 20% (industry avg)
    ├─ Success KPI: Show in case studies
    └─ Optimization: Follow-up emails, pricing offers

17. Lifetime Value of Trial Converts
    ├─ Converts stay: 3x longer vs organic signups
    ├─ LTV: €1,500+ (vs €400 organic)
    ├─ CAC: €50 (mostly app infrastructure)
    └─ Ratio: 30:1 (exceptionally good)

18. Cost per Acquired Member (CPAM)
    ├─ Channel 1 (Trial class): €15-25
    ├─ Channel 2 (Social feed): €5-10
    ├─ Channel 3 (Paid ads): €30-50
    └─ Blended: ~€20

SOCIAL METRICS:

19. Followers per Center
    ├─ Baseline: 20-50 (first month)
    ├─ Growth: 10-15% monthly
    ├─ Mature center: 500-2,000
    ├─ Predictive: Centers >500 followers = high-retention
    └─ Action: Feature centers with high engagement

20. Feed Engagement Rate
    ├─ = (likes + comments + shares) / impressions
    ├─ Target: 5-10%
    ├─ Typical social: 1-3%
    ├─ High engagement = more visibility (algo boost)
    └─ Metric for success: Viral coefficient >0.15

OPERATIONAL HEALTH:

21. Support Ticket Resolution Time
    ├─ Target: <24h (avg)
    ├─ High priority: <4h
    ├─ Tools: Intercom + ticket tracking
    └─ Quality: NPS >50 from centers

22. Platform Uptime
    ├─ Target: 99.9%
    ├─ SLA guaranteed: 99.5%
    ├─ Monitoring: Sentry + PagerDuty
    └─ Impact: $100 credit per 1h downtime

23. Data Quality Score
    ├─ = (complete profiles + accurate attendance) / total
    ├─ Target: >95%
    ├─ Issues: Duplicate members, wrong times
    └─ Action: Validation rules + admin tools
```

### Para Centros (In-App Dashboards)

```
CADA CENTRO VE:

1. Revenue Metrics:
   - Monthly recurring (membresías)
   - One-time sales (tienda)
   - Proyección próximo mes
   - Payouts a su cuenta (semanales)

2. Member Metrics:
   - Total members
   - New this month
   - Churn rate
   - Average lifetime value
   - At-risk members (churn prediction)

3. Operational:
   - Classes published (on schedule)
   - Attendance rate (por clase + average)
   - No-shows (y tendencia)
   - Ocupación promedio

4. Leads:
   - Trial requests (pending/approved/attended)
   - Conversion funnel (solicitud → asistencia → pago)
   - Cost per acquired member
   - Projected revenue from trials

5. Social:
   - Followers
   - Posts published
   - Engagement rate
   - Top performing posts
   - Reach/impressions

6. Health Score:
   - Green = all metrics healthy
   - Yellow = one or more metrics below target
   - Red = intervention needed
```

---

## IDEAS INNOVADORAS

### 1. EVENTOS VIRTUALES INTER-CENTROS

```
Competencias de centros en la app:

"BOX CHALLENGE GLOBAL"
Evento semanal:
- Cada viernes 19:00 CET
- Participating centers: 500+ en EU
- Same WOD para todos
- Centers compiten por:
  ✓ Fastest athlete
  ✓ Most participants
  ✓ Best engagement on leaderboard

Implementation:
- App genera WOD programado
- Centros lo publican
- Athletes ven leaderboard global
- Winning centers reciben:
  - Badge "Champion This Week"
  - Featured on app home
  - Social proof (grows followers)

Business Impact:
- Drives 30-40% spike in engagement on Fridays
- Increases member retention (gamification)
- Centros ven viral moment → attract new leads
- Potential sponsors (Rogue, MyProtein)

Monetization:
- Premium badge for centers (€99/evento)
- Sponsor branding in leaderboard
- Exclusive merchandise (race kit sponsorship)

Launch: Fase 3 (Post-MVP)
```

### 2. PARTNERSHIPS CON MARCAS DE SUPLEMENTOS

```
Marketplace B2B2C:

Marcas (MyProtein, Optimum Nutrition, Rogue) se integran:

1. Center Perspective:
   └─ Tienda automáticamente stocked con productos
   └─ 0 inventory risk (dropship)
   └─ Rival procesa, marca envía directo a member
   └─ Centro recibe 5-10% comisión

2. Member Perspective:
   └─ En tienda del centro, ve productos partner
   └─ Trust = es recomendación del center
   └─ Entrega rápida (2-3 días)
   └─ Devoluciones fáciles

3. Rival Perspective:
   └─ Cobro 15% a marca (vs center 5%)
   └─ Member data = valuable (demographics, purchase intent)
   └─ Recurring revenue (each sale)

Example Deal Structure:
MyProtein + Rival:
- Brand paga Rival €5,000/mes
- Rival features MyProtein en 100 centros
- Centers earn 5% per sale through app
- Member sees: "Recommended by [Box Name]"

Expected Revenue (100 centros × 500 members each):
- 50K members have access
- 5% purchase rate = 2,500 orders/month
- Avg order: €35
- Total: €87,500
- Rival cut (15%): €13,125/month
- Scale to 10 brands: €130K+/month recurring

Launch: Fase 2-3 (Once store is stable)
```

### 3. GLOBAL PASS (MULTICENTRO MEMBRESÍA)

```
Rival's answer to ClassPass:

RIVAL GLOBAL PASS
Una suscripción para acceder clases en 200+ centros

Estructura:
├─ €79.99/mes = 8 clases en centros partner
├─ €149.99/mes = 16 clases
├─ Válida en 200+ centros en EU
├─ Flexible: cambiar centros cada clase

Example user journey:
- Lunes: Cross-fit en Madrid
- Miércoles: Yoga en Barcelona (2h drive, pero reserva online)
- Viernes: Running club en Valencia
- Domingo: Gym en Bilbao

Implementation:
1. API para centros (permitir Global Pass members)
2. Centro ve en roster: "Member name | GLOBAL PASS"
3. Rival saca comisión: €15-20 per class
4. Centro recibe: €5-10 per class

Center Incentive:
- Llena clases (más cupos usados)
- Descubre nuevos members
- Potencial upgrades a membresía local
- Ranking en app ("Popular on Global Pass")

Business Case:
- 50K Global Pass subscribers × €100 avg ARPU = €5M
- 8 clases × 50K = 400K classes/month
- Comisión: €10 × 400K = €4M para Rival
- Remaining: Para centros y payment processing

Launch: Fase 3 (Once 2,000+ centers active)
Requires: Standardization (class booking, cancellation, ratings)
```

### 4. COACH MARKETPLACE

```
Professional Coaches como producto:

Rival coach directory:
- Coaches ofrecen servicios (programación, asesoría)
- Centros los contratan o recomiendan a members
- Members pagan directamente

Use Cases:
1. Programming (creación de planes personalizados)
   - Coach hace assessment → genera 4-week program
   - Member sigue en app + chat con coach
   - Price: €49.99/program

2. Nutrition Coaching
   - RD/Nutricionista da plans
   - Integración con app (log meals)
   - Price: €99.99/month

3. Mobility/Prehab
   - PT specialista prescribe exercises
   - Members see in app + perform + coach gives feedback
   - Price: €79.99/month

Revenue Model:
- Rival takes 20% cut from coach
- Coach keeps 80%
- Member benefits: Quality assurance (Rival vets coaches)

Viral Loop:
- Good coaches build reputation
- Featured in app home
- Members refer coaches to friends
- Centers hire coaches they discover

Launch: Fase 3
```

### 5. GAMIFICACIÓN PARA CENTROS

```
Centers earn badges/reputation:

Center Badges:
├─ 🥇 "Retention Champion" (churn <2% for 3 months)
├─ 🚀 "Growth Leader" (+50% members in quarter)
├─ 📱 "Social Engager" (engagement rate >8%)
├─ 💪 "High Performance" (members PR tracking high)
├─ 🎯 "Lead Conversion King" (trial→member >40%)
├─ 📊 "Data Savvy" (uses analytics 10+ times/week)
├─ 🤝 "Community Builder" (followers >1,000)
└─ 🏆 "EU Champion" (top 1% of benchmarks)

Benefits of Badges:
- Visible on center profile
- Featured on app (home carousel)
- Attract talent (coaches see top centers)
- Social proof for leads ("Join award-winning center")
- Psychological: Gamify retention

Tiers:
- Silver: 3+ badges
- Gold: 6+ badges
- Platinum: All 8 badges (super rare)

Launch: Fase 2 (easy to implement, high morale boost)
```

### 6. RIVAL CORPORATE WELLNESS

```
Empresas usan Rival para employee wellness:

Corporate Account:
- Empresa paga Rival €X/month
- Empleados acceden clase en centros partner
- Benefit: "Unlimited gym access en tu ciudad"

Implementation:
- Company signs B2B agreement
- Creates employee cohort in app
- Assigns budget (€50/employee/month)
- Employees redeem in partner centers

Revenue:
- 1,000 employees × €50 = €50K/month
- Rival saca 20% = €10K/month per corporate account
- Target: 50 corporate accounts = €500K/month recurring

Benefits:
- Centers fill off-peak hours (corporate employees = predictable)
- Companies reduce insurance costs (fit employees)
- Rival = B2B2C holy grail (3 parties benefit)

Launch: Fase 3 (requires scale of centers first)
```

---

## DIFERENCIADORES COMPETITIVOS

### Tabla Comparativa vs. Competencia

| Feature | Rival B2B | AimHarder | SugarWOD | Mindbody | ClassPass |
|---------|-----------|-----------|----------|----------|-----------|
| **Registration** | Sencillo (5 min) | Sencillo | Complejo | Muy Complejo | N/A |
| **Social Network** | ✅ Integrado | ❌ | ❌ | ❌ (básico) | ❌ |
| **Lead Management** | ✅ Avanzado | ❌ Muy básico | ❌ | ✅ Básico | ✅ Integrado |
| **Trial Class System** | ✅ Automated | ❌ Manual | ❌ | ❌ | ✅ Built-in |
| **WOD IA Generation** | ✅ Gemini | ❌ | ❌ | ❌ | ❌ |
| **Churn Prediction** | ✅ ML-based | ❌ | ❌ | ❌ | ❌ |
| **Benchmarking** | ✅ vs Similar | ❌ | ✅ Básico | ❌ | ❌ |
| **Integrated Store** | ✅ Dropship | ❌ | ❌ | ✅ Basic | ❌ |
| **Chat System** | ✅ 1:1+Grupal | ❌ | ✅ Básico | ❌ | ❌ |
| **Mobile Coach App** | ✅ Planned | ✅ | ✅ | ✅ | ❌ |
| **Pricing** | €49-500/mo | €29-99 | €99-299 | €199-400 | N/A (B2C) |
| **Ease of Setup** | 🟢 Very Easy | 🟢 Easy | 🟡 Moderate | 🔴 Hard | N/A |
| **Supports B2C Lead Gen** | 🟢 Yes | ❌ No | ❌ No | 🟡 Limited | ✅ Yes |
| **International** | 🟢 EU/EU+Latam | 🟡 EU | 🟡 EU | ✅ Global | ✅ Global |

**RIVAL's Unique Selling Points:**

1. **Única con Red Social Integrada**
   - Centros no aislados
   - Organic lead generation
   - Viral discovery

2. **Lead Management + Conversion Automation**
   - Trials → members (not ClassPass-style passes)
   - Centro mantiene control + relación
   - Higher lifetime value

3. **Predictive Analytics (IA)**
   - Sabe quién va a churn antes que pase
   - Sugerencias automáticas de mejora
   - Data-driven decisions

4. **Mejor UX + Onboarding**
   - 5 min setup vs 2-3h competencia
   - Pre-built templates (WODs, planes)
   - Mobile-first design

5. **Precio Agresivo**
   - €49.99 Starter vs €99+ (SugarWOD)
   - Low barrier to entry
   - Comisiones más altas = mejor margen

6. **Freemium Model**
   - Gratis para pequeños (atraer volumen)
   - Upsell cuando crece
   - Network effect

---

## CONCLUSIÓN & NEXT STEPS

### Resumen Ejecutivo

RIVAL B2B convierte **la app freemium de social fitness** en una **plataforma de CRM + Community + Commerce** para centros deportivos europeos.

**Ventaja Core:** Sinergia natural entre:
- Usuarios individuales que descubren centros
- Centros que atraen leads calificados
- Rival que monetiza ambos lados

**Proyección Año 1:**
- 5,000 centros registrados
- €8.5M+ revenue (suscripciones + comisiones)
- 500K miembros pagando a través de centros
- 1-2% churn (industry-leading)

**Diferenciador Clave:**
- Única plataforma con social + CRM integrado
- Leads precalificados (followers → trials → conversión 30%+)
- IA para programación y predicción
- Precio accesible (€49.99 vs €200+ competencia)

### Timeline

**Mes 1-3 (Fase 1):** MVP Launch
- Centro puede: Registrarse → Crear perfil → Gestionar clases → Cobrar
- Go-to-market: 100 early adopter centers (partner boxes)
- Success metric: €100K MRR

**Mes 4-6 (Fase 2):** Leads & IA
- Trial class system working
- WOD generator live
- 500+ centros activos
- Success metric: €500K MRR

**Mes 7-12 (Fase 3):** Scale & Enterprise
- 2,000+ centros
- Global Pass launched
- Multi-location support
- Success metric: €2M+ MRR

### Recomendaciones Inmediatas

1. **Hire** Product Manager B2B (senior, fitness-tech background)
2. **Partner** con 10-20 centros para early testing (paid pilot)
3. **Allocate** 3 engineers (backend + frontend + devops)
4. **Design** onboarding flow UX/UI (critical for adoption)
5. **Build** Stripe integration (payments) immediately
6. **Setup** analytics pipeline (Posthog for event tracking)

### Success Metrics (Trimestral)

| Trimestre | Centros | MRR | Churn | CAC |
|-----------|---------|-----|-------|-----|
| Q1 (MVP) | 100 | €50K | 8% | €600 |
| Q2 (Leads) | 500 | €300K | 6% | €500 |
| Q3 (Scale) | 1,500 | €900K | 4% | €400 |
| Q4 (Enterprise) | 3,000 | €1.8M | 3% | €350 |

---

**Document Prepared By:** Product & Growth Team  
**Last Updated:** January 2026  
**Version:** 1.0 (MVP Planning)

---
