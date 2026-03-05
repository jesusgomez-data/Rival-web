# 🏆 RIVALFIT - Sistema de Leaderboards de WODs

**Fecha:** 2026-03-05
**Estado:** ✅ **BACKEND COMPLETADO** | ⏳ UI en progreso

---

## 🎯 **¿QUÉ ES ESTO?**

Un sistema completo para que los usuarios puedan:
1. ✅ **Hacer WODs de otros usuarios** ("Repostear WOD")
2. ✅ **Registrar sus resultados** (tiempo, reps, rounds, etc.)
3. ✅ **Ver rankings compartidos** (leaderboards)
4. ✅ **Competir con amigos** y la comunidad global

---

## 🚀 **LO QUE SE HA CREADO**

### **1. Base de Datos** ([add_wod_completions_leaderboard.sql](supabase/migrations/add_wod_completions_leaderboard.sql))

#### **Tabla `wod_completions`:**
Registra cada vez que un usuario completa un WOD.

Campos principales:
- `user_id` - Quién lo completó
- `original_wod_post_id` - Qué WOD hizo
- `completion_type` - Tipo: time, rounds, reps, weight, score
- `completion_time_seconds` - Para WODs "For Time"
- `rounds_completed` - Para WODs "AMRAP"
- `total_reps` - Total de repeticiones
- `weight_kg` - Peso levantado (para fuerza)
- `score` - Puntuación general
- `rx` - ¿Lo hizo Rx (como está prescrito) o Scaled?
- `notes` - Notas del usuario

#### **Contador en `posts`:**
- `completions_count` - Cuántas personas completaron este WOD
- Se actualiza automáticamente con triggers

#### **Vistas para Leaderboards:**
- `wod_leaderboard_time` - Ranking para WODs "For Time" (menor tiempo = mejor)
- `wod_leaderboard_rounds` - Ranking para WODs "AMRAP" (más rounds = mejor)

#### **Función Helper:**
- `get_user_rank_in_wod(user_id, wod_id)` - Obtiene el ranking de un usuario

---

### **2. Servicio Backend** ([lib/wod-completions.ts](lib/wod-completions.ts))

Clase `WODCompletionsService` con métodos:

```typescript
// Registrar que completaste un WOD
completeWOD(data: {
  originalWodPostId: string;
  completionType: 'time' | 'rounds' | 'reps' | 'weight' | 'score';
  completionTimeSeconds?: number;
  roundsCompleted?: number;
  // ...
})

// Obtener leaderboard
getLeaderboard(wodPostId: string, options?: {
  limit?: number;
  rxOnly?: boolean; // Solo ver resultados Rx
  friendsOnly?: boolean; // Solo ver amigos
})

// Obtener estadísticas de un WOD
getWODStats(wodPostId: string) // → { totalCompletions, averageTime, fastestTime, rxPercentage, ... }

// Verificar si ya completaste un WOD
hasUserCompleted(userId: string, wodPostId: string)

// Obtener tu ranking
getUserRank(userId: string, wodPostId: string) // → { rank: 5, total: 138, percentile: 3.6 }
```

Utilidades:
```typescript
formatTime(750) // → "12:30"
formatRounds(8.5) // → "8 + 50%"
```

---

### **3. APIs REST**

#### **POST `/api/wod/complete`** - Registrar completion
```json
{
  "originalWodPostId": "uuid",
  "completionType": "time",
  "completionTimeSeconds": 750,
  "rx": true,
  "notes": "Brutal! 🔥"
}
```

Respuesta:
```json
{
  "success": true,
  "completion": { ... },
  "message": "¡WOD completado exitosamente!"
}
```

#### **GET `/api/wod/leaderboard?wodPostId=xxx`** - Obtener ranking
Query params:
- `wodPostId` (requerido)
- `limit` (default: 50)
- `rxOnly=true` (solo Rx)
- `friendsOnly=true` (solo amigos)

Respuesta:
```json
{
  "success": true,
  "leaderboard": [
    {
      "rank": 1,
      "userId": "...",
      "username": "athlete_pro",
      "fullName": "John Doe",
      "avatarUrl": "...",
      "completionTimeSeconds": 450,
      "rx": true,
      "completedAt": "2026-03-05T10:30:00Z"
    },
    // ...
  ],
  "stats": {
    "totalCompletions": 138,
    "averageTime": 680,
    "fastestTime": 450,
    "rxPercentage": 65
  }
}
```

---

## 📦 **ARCHIVOS CREADOS**

```
✨ NUEVOS (Backend completo):
├── supabase/migrations/add_wod_completions_leaderboard.sql
├── lib/wod-completions.ts
├── app/api/wod/complete/route.ts
└── app/api/wod/leaderboard/route.ts

⏳ PENDIENTES (UI):
├── components/WODTracker.tsx          (Modal para registrar resultados)
├── components/WODLeaderboard.tsx      (Vista de ranking)
└── components/WODCompletionBadge.tsx  (Badge "138 personas completaron")
```

---

## 🔧 **INSTALACIÓN - EJECUTAR SQL**

### **PASO 1: Ejecutar en Supabase**

1. **Abre Supabase Dashboard:**
   👉 https://supabase.com/dashboard/project/ralskslspvskjqqgzbiv

2. **Ve a SQL Editor**

3. **Copia y pega** el contenido de:
   ```
   supabase/migrations/add_wod_completions_leaderboard.sql
   ```

4. **Haz clic en "Run"**

5. **Verifica:**
   - Ve a Table Editor → Busca `wod_completions`
   - Debería aparecer la nueva tabla

---

## 🎨 **PRÓXIMOS PASOS - UI COMPONENTS**

### **1. Componente: WODTracker** (Modal de Tracking)

**Función:** Modal que se abre cuando haces clic en "💪 Hacer este WOD"

**Features:**
- ⏱️ Timer en tiempo real (para For Time, EMOM)
- 🔢 Contador de rounds/reps (para AMRAP)
- ✅ Checkbox por ejercicio
- 📝 Campo de notas
- 🎯 Toggle Rx / Scaled
- 💾 Botón "Guardar Resultado"

**UX:**
```
┌─────────────────────────────────────┐
│  🏋️ WARRIOR AMRAP                  │
│  AMRAP 15 min                       │
├─────────────────────────────────────┤
│  ⏱️  TIEMPO: 15:00                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                     │
│  ROUND 8.5                          │
│                                     │
│  ✅ 10 Burpees                      │
│  ✅ 20 Air Squats                   │
│  ⬜ 15 Push-ups (6/15)              │
│                                     │
│  📝 Notas:                          │
│  [Reducí push-ups a rodillas]      │
│                                     │
│  ⚡ RX  |  🔥 SCALED               │
│                                     │
│  [  PAUSAR  ] [  TERMINAR WOD  ]   │
└─────────────────────────────────────┘
```

---

### **2. Componente: WODLeaderboard**

**Función:** Vista de ranking completo

**Features:**
- 🥇 Top 3 con colores especiales
- 👤 Tu posición destacada
- 🎚️ Filtros: Todos / Solo Rx / Solo Amigos
- 📊 Estadísticas del WOD

**UX:**
```
┌─────────────────────────────────────────────┐
│  🏆 LEADERBOARD - WARRIOR AMRAP            │
│  138 atletas completaron este WOD          │
├─────────────────────────────────────────────┤
│  📊 Estadísticas:                           │
│  ⏱️  Tiempo promedio: 11:20                │
│  🔥 Rounds promedio: 8.2                   │
│  ⚡ 65% lo hizo Rx                         │
├─────────────────────────────────────────────┤
│  Filtros: [Todos] [Solo Rx] [Amigos]      │
├─────────────────────────────────────────────┤
│  🥇 1. @athlete_pro        12.5 rounds  Rx │
│  🥈 2. @crossfit_beast     11.0 rounds  Rx │
│  🥉 3. @fit_girl           10.5 rounds  Rx │
│  4. @john_doe              9.5 rounds   Rx │
│  5. @training_hard         9.0 rounds   Sc │
│  → TÚ (#23)                7.5 rounds   Rx │
│  24. @beginner_gains       7.0 rounds   Sc │
│  ...                                        │
└─────────────────────────────────────────────┘
```

---

### **3. Componente: WODCompletionBadge**

**Función:** Badge que aparece en el WOD original

**UX:**
```
Post de WOD:
┌──────────────────────────────┐
│ 💪 WARRIOR AMRAP            │
│ ...contenido del WOD...      │
├──────────────────────────────┤
│ 🔥 138 atletas completaron  │
│    este WOD                  │
│                              │
│ [💪 Hacer este WOD]          │
│ [🏆 Ver Ranking]             │
└──────────────────────────────┘
```

---

### **4. Integración en FeedPost.tsx**

Agregar botones cuando `post.post_type === 'wod'`:

```tsx
{post.post_type === 'wod' && (
  <div className="mt-4 space-y-2">
    {/* Badge de completions */}
    <WODCompletionBadge
      wodPostId={post.id}
      completionsCount={post.completions_count}
    />

    {/* Botones de acción */}
    <div className="flex gap-2">
      <button
        onClick={() => setShowTracker(true)}
        className="flex-1 bg-brand-red hover:bg-brand-accent text-white font-bold py-3 rounded-xl"
      >
        💪 Hacer este WOD
      </button>
      <button
        onClick={() => setShowLeaderboard(true)}
        className="px-6 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl"
      >
        🏆 Ver Ranking
      </button>
    </div>

    {/* Modales */}
    {showTracker && (
      <WODTracker
        wodPost={post}
        onClose={() => setShowTracker(false)}
        onComplete={(result) => {
          // Guardar y actualizar
        }}
      />
    )}

    {showLeaderboard && (
      <WODLeaderboard
        wodPostId={post.id}
        onClose={() => setShowLeaderboard(false)}
      />
    )}
  </div>
)}
```

---

## 🎯 **FLUJO COMPLETO (Usuario final)**

### **Como creador del WOD:**
1. Genero WOD con IA ✅
2. Lo publico en el feed ✅
3. Otros usuarios lo ven
4. Badge muestra: "🔥 138 personas completaron"
5. Puedo ver el leaderboard completo

### **Como usuario que quiere hacer el WOD:**
1. Veo WOD en el feed
2. Click "💪 Hacer este WOD"
3. Se abre modal con timer/contador
4. Hago el WOD (timer corriendo)
5. Termino → Click "Guardar Resultado"
6. Registro: tiempo 12:30, 8.5 rounds, Rx
7. Mi resultado se guarda en BD
8. Aparezco en el leaderboard (#23 de 138)
9. Opcionalmente se publica en mi feed: "¡Completé el WOD de @athlete_pro!"

---

## 📊 **MÉTRICAS DE ÉXITO**

### **KPIs a trackear:**

| Métrica | Target (30 días) | Herramienta |
|---------|------------------|-------------|
| **WODs completados/día** | 500+ | Supabase Analytics |
| **Usuarios activos (hicieron ≥1 WOD)** | 2,000+ | Query SQL |
| **WOD completion rate** | 15% | % de usuarios que ven WOD y lo completan |
| **Engagement en leaderboards** | 40% | % que abren leaderboard después de completar |
| **Repost/reshare de resultados** | 25% | % que publican su resultado en feed |

---

## 🎉 **ESTADO ACTUAL**

### ✅ **COMPLETADO:**
- [x] Schema SQL completo
- [x] Triggers automáticos
- [x] RLS policies
- [x] Servicio backend (WODCompletionsService)
- [x] API `/api/wod/complete`
- [x] API `/api/wod/leaderboard`
- [x] Vistas optimizadas
- [x] Función de ranking

### ⏳ **PENDIENTE:**
- [ ] Componente WODTracker (modal de tracking)
- [ ] Componente WODLeaderboard (vista de ranking)
- [ ] Componente WODCompletionBadge (badge de contador)
- [ ] Integración en FeedPost.tsx
- [ ] Testing end-to-end

---

## 🚀 **¿CONTINUAMOS CON LA UI?**

**Opciones:**

**A) 🎨 Implementar UI completa AHORA**
- Crear los 3 componentes
- Integrar en FeedPost
- Testing completo
- Tiempo estimado: ~2-3 horas

**B) ⏸️ Pausa y testing del backend**
- Ejecutar SQL en Supabase
- Testing manual de las APIs con Postman
- Validar que todo funciona
- Continuar UI después

**C) 🎯 Implementación gradual**
- Solo crear botón "Hacer WOD" básico
- Modal simple de registro de resultado
- Sin timer/contador por ahora
- Leaderboard básico

---

**¿Cuál prefieres?** 😊

---

**Fecha:** 2026-03-05
**Versión:** 1.0 - Backend
**Estado:** ✅ **BACKEND LISTO** | ⏳ UI pendiente
