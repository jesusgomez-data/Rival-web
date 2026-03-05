# 🏋️ WOD Generator - Guía Completa de Setup

**Fecha:** 2026-03-05
**Estado:** ✅ **INTEGRACIÓN COMPLETADA**

---

## 🎯 ¿QUÉ SE HA IMPLEMENTADO?

### **Sistema Completo de Generación de WODs con IA**

1. ✅ **Componente UI** ([WODGeneratorUI.tsx](components/WODGeneratorUI.tsx))
   - Modal interactivo con selección de parámetros
   - Integración con Gemini AI
   - Preview del WOD generado
   - Botón de publicación directa al feed

2. ✅ **API de Generación** ([/api/wod/generate](app/api/wod/generate/route.ts))
   - Endpoint para generar WODs con Gemini AI
   - Validación de parámetros
   - Rate limiting

3. ✅ **API de Publicación** ([/api/wod/publish](app/api/wod/publish/route.ts))
   - Endpoint para publicar WODs en el feed
   - Formato optimizado para visualización
   - Vinculación con usuario autenticado

4. ✅ **Integración en Dashboard** ([app/dashboard/page.tsx](app/dashboard/page.tsx))
   - Botón flotante en esquina inferior derecha
   - Flujo completo: generar → revisar → publicar

---

## 🚀 PASOS PARA ACTIVAR LA FEATURE

### **PASO 1: Ejecutar Migration SQL en Supabase**

1. Abre tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Ve a **SQL Editor** (en el menú lateral)
3. Copia y pega el siguiente SQL:

```sql
-- Migration: Add WOD Support to Posts Table

-- 1. Add post_type column
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS post_type TEXT DEFAULT 'standard'
  CHECK (post_type IN ('standard', 'wod', 'workout', 'achievement', 'progress'));

-- 2. Add wod_data column for JSON storage
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS wod_data JSONB;

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_post_type ON public.posts(post_type);
CREATE INDEX IF NOT EXISTS idx_posts_wod_data ON public.posts USING GIN (wod_data)
  WHERE post_type = 'wod';

-- 4. Add documentation
COMMENT ON COLUMN public.posts.post_type IS 'Type of post: standard, wod, workout, achievement, progress';
COMMENT ON COLUMN public.posts.wod_data IS 'Full WOD data in JSON format (only for post_type = wod)';
```

4. Haz clic en **Run** (esquina inferior derecha)
5. Verifica que aparezca el mensaje: **"Success. No rows returned"**

---

### **PASO 2: Configurar Gemini API Key**

Si aún no lo has hecho:

1. Obtén tu API key de [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Abre tu archivo `.env.local` en la raíz del proyecto
3. Agrega la siguiente línea:

```bash
GEMINI_API_KEY=tu_api_key_aqui
```

4. **Reinicia el servidor de desarrollo:**

```bash
npm run dev
```

---

### **PASO 3: Probar el WOD Generator**

1. Abre tu dashboard: `http://localhost:3000/dashboard`

2. Deberías ver un **botón flotante rojo** en la esquina inferior derecha con el ícono ✨ y texto "Generar WOD con IA"

3. **Haz clic en el botón** para abrir el modal

4. **Configura tu WOD:**
   - Selecciona tipo de workout (AMRAP, For Time, EMOM, etc.)
   - Ajusta la duración con el slider (10-60 minutos)
   - Elige tu nivel de fitness
   - Marca el equipamiento disponible

5. **Haz clic en "Generar WOD Ahora"**
   - Verás un loading mientras Gemini AI genera el WOD
   - Tardará 2-5 segundos

6. **Revisa el WOD generado:**
   - Título y subtítulo del WOD
   - Duración estimada y calorías
   - Bloques de ejercicios (warmup, metcon, cooldown)
   - Tips de entrenamiento

7. **Publicar el WOD:**
   - Haz clic en **"Publicar WOD"**
   - El WOD se publicará automáticamente en tu feed
   - La página se recargará y verás tu nuevo post

---

## 🎨 CARACTERÍSTICAS DEL WOD GENERATOR

### **Tipos de Workout Soportados:**
- ✅ **AMRAP** (As Many Rounds As Possible)
- ✅ **For Time** (Completar lo más rápido posible)
- ✅ **EMOM** (Every Minute On the Minute)
- ✅ **Tabata** (20s trabajo / 10s descanso)
- ✅ **Chipper** (Lista larga de ejercicios, 1 ronda)
- ✅ **Strength** (Enfoque en fuerza)

### **Niveles de Fitness:**
- 🌱 **Principiante**: WODs simples, bajo volumen
- ⚡ **Intermedio**: Intensidad moderada
- 🔥 **Avanzado**: High intensity, movimientos complejos
- 👑 **Elite**: Máxima dificultad

### **Equipamiento:**
- Sin equipo (bodyweight)
- Mancuernas
- Barra olímpica
- Kettlebell
- Barra de dominadas
- Remo
- Bicicleta
- Cuerda de saltar
- Cajón de saltos

---

## 📊 ESTRUCTURA DEL WOD GENERADO

El WOD generado incluye:

```json
{
  "title": "WARRIOR AMRAP",
  "subtitle": "Full body conditioning",
  "difficulty": "intermediate",
  "estimatedDuration": 30,
  "caloriesBurn": 350,
  "blocks": [
    {
      "type": "warmup",
      "title": "Calentamiento Dinámico",
      "duration": "8 min",
      "exercises": [...]
    },
    {
      "type": "metcon",
      "title": "AMRAP 15 min",
      "exercises": [
        { "name": "Burpees", "reps": 10 },
        { "name": "Air Squats", "reps": 20 }
      ]
    },
    {
      "type": "cooldown",
      "exercises": [...]
    }
  ],
  "tips": ["Mantén el core activado", "Respira profundo"],
  "scalingOptions": {
    "beginner": "Reduce reps 50%",
    "advanced": "Añade peso"
  }
}
```

---

## 🎯 CÓMO SE VE EN EL FEED

Cuando publicas un WOD, se crea un post con este formato:

```
💪 WARRIOR AMRAP
Full body conditioning

⏱️ 30 min | 🔥 350 kcal | 📊 INTERMEDIATE

🎯 AMRAP 15 MIN
• 10 Burpees
• 20 Air Squats
• 15 Push-ups

💡 TIP: Mantén el core activado durante todo el ejercicio

#WOD #Fitness #RivalFit #AIGenerated
```

---

## 🐛 TROUBLESHOOTING

### **1. No veo el botón flotante**

**Solución:**
- Verifica que estés en `/dashboard` (no en `/dashboard/videos` u otra sub-página)
- Abre la consola del navegador (F12) y busca errores
- Haz hard refresh: `Ctrl + Shift + R` (Windows) o `Cmd + Shift + R` (Mac)

---

### **2. Error: "Failed to generate WOD"**

**Posibles causas:**

a) **API Key no configurada:**
   - Verifica que `GEMINI_API_KEY` esté en `.env.local`
   - Reinicia el servidor después de agregar la key

b) **API Key inválida:**
   - Genera una nueva key en [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Verifica que hayas copiado la key completa

c) **Rate limit de Gemini:**
   - Plan gratuito: 60 requests/minuto
   - Espera 1 minuto y vuelve a intentar

---

### **3. Error al publicar: "Error publicando WOD"**

**Posibles causas:**

a) **No ejecutaste la migration SQL:**
   - Ejecuta el SQL del PASO 1 en Supabase Dashboard
   - Verifica que las columnas `post_type` y `wod_data` existan en la tabla `posts`

b) **No estás autenticado:**
   - Cierra sesión y vuelve a iniciar sesión
   - Verifica en Supabase → Authentication que tu usuario existe

c) **RLS Policy bloqueando:**
   - Ve a Supabase → Table Editor → posts
   - Verifica que la policy "Users manage own posts" esté activa

---

### **4. El WOD no aparece en el feed después de publicar**

**Solución:**
- La página debería recargarse automáticamente
- Si no se recarga, haz refresh manual (`F5`)
- Verifica en Supabase → Table Editor → posts que se haya creado el registro

---

## 📈 PRÓXIMOS PASOS (OPCIONALES)

### **A. Mejorar visualización de WODs en el feed**

Puedes crear un componente especial para renderizar posts de tipo `wod` con mejor estilo:

```tsx
// En FeedPost.tsx
{post.post_type === 'wod' && post.wod_data && (
  <WODPostDisplay wod={post.wod_data} />
)}
```

### **B. Agregar botón en navbar**

Para acceso más rápido:

```tsx
// En tu Navbar o Sidebar
<button
  onClick={() => window.openWODGenerator?.()}
  className="flex items-center gap-2"
>
  <Sparkles className="w-5 h-5" />
  <span>Generar WOD</span>
</button>
```

### **C. Historial de WODs generados**

Crear una página para ver todos los WODs que has generado:

```tsx
// app/dashboard/my-wods/page.tsx
const wods = await supabase
  .from('posts')
  .select('*')
  .eq('user_id', user.id)
  .eq('post_type', 'wod');
```

---

## 🎉 ¡LISTO!

Ahora tienes un **generador de WODs con IA completamente funcional** integrado en tu dashboard.

**Flujo completo:**
1. 👤 Usuario hace clic en botón flotante
2. 🎨 Se abre modal con opciones de personalización
3. 🤖 Gemini AI genera WOD personalizado
4. 👀 Usuario revisa el WOD
5. ✅ Usuario hace clic en "Publicar WOD"
6. 📱 WOD se publica en el feed social
7. 🔄 Página se recarga y muestra el nuevo post

---

**¿Preguntas o problemas?**
- Revisa la sección de Troubleshooting arriba
- Verifica los logs en la consola del navegador (F12)
- Revisa los logs del servidor en la terminal

---

**Archivos creados/modificados:**
- ✨ `components/WODGeneratorUI.tsx` (NUEVO)
- ✨ `app/api/wod/generate/route.ts` (NUEVO)
- ✨ `app/api/wod/publish/route.ts` (NUEVO)
- ✨ `lib/wod-generator.ts` (NUEVO)
- ✨ `supabase/migrations/add_wod_support_to_posts.sql` (NUEVO)
- ✏️ `app/dashboard/page.tsx` (MODIFICADO - agregado WODGeneratorUI)

**Estado:** ✅ **LISTO PARA USAR**

---

_Generado el 2026-03-05 por el Equipo C-Level AI de RivalFit_
