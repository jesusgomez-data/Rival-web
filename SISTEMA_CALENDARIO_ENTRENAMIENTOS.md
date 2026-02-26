# 📅 SISTEMA DE CALENDARIO DE ENTRENAMIENTOS

## 🎯 ¿Dónde se Almacenan los Entrenamientos?

Cuando presionas el botón **"AL CALENDARIO"** en el AI Coach, el entrenamiento se guarda en:

### **Tabla de Base de Datos:**
```
scheduled_workouts
```

### **Campos Almacenados:**
```sql
{
  user_id: UUID,              -- ID del usuario
  title: string,              -- Título del WOD (ej: "PUSH & BURN")
  scheduled_date: date,       -- Fecha programada (hoy por defecto)
  exercises: JSON,            -- Array de ejercicios del WOD
  is_completed: boolean,      -- Si ya se completó (false por defecto)
  created_at: timestamp       -- Cuándo se programó
}
```

---

## 👀 ¿Dónde se Visualizan?

Los entrenamientos programados se muestran en **DOS lugares**:

### **1. Página de Entrenamiento (`/dashboard/training`)**

#### **Ubicación Visual:**
En el **calendario semanal** (parte superior de la página)

#### **Indicador:**
- Aparece un **punto rojo** en el día que tiene un entrenamiento programado
- Si es el día actual, también muestra el texto **"Goal"**

#### **Código Relevante:**
```tsx
// Líneas 221-229 de training/page.tsx
{scheduled.some(s => {
    const sDate = new Date(s.scheduled_date);
    return sDate.toISOString().split('T')[0] === d.fullDate;
}) && (
    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-brand-red shadow-[0_0_5px_rgba(220,38,38,0.5)]" />
        {d.status === 'active' && <span className="text-[6px] font-black uppercase text-white/80">Goal</span>}
    </div>
)}
```

### **2. (Potencial) Sección de Entrenamientos Programados**

Actualmente **NO hay una sección dedicada** que liste todos los entrenamientos programados, pero se puede agregar fácilmente.

---

## 📊 Visualización Actual

### **Calendario Semanal:**

```
┌─────────────────────────────────────────────────────────┐
│  📅 Semana Actual                    VER REGISTROS →    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Lun    Mar    Mié    Jue    Vie    Sáb    Dom         │
│  ───    ───    ───    ───    ───    ───    ───         │
│   12     13     14     15     16     17     18          │
│   ✓      ✓      🔴     ⚡      •      •      •          │
│  Done   Done   Goal  Active                            │
│                 ↑                                       │
│         Entrenamiento programado aquí                   │
└─────────────────────────────────────────────────────────┘
```

### **Leyenda:**
- ✓ = Entrenamiento completado
- 🔴 = Entrenamiento programado (punto rojo)
- ⚡ = Día actual
- • = Día futuro sin actividad

---

## 🔍 ¿Cómo Verificar los Entrenamientos Programados?

### **Opción 1: Visualmente en el Calendario**
1. Ve a `/dashboard/training`
2. Mira el calendario semanal
3. Busca los **puntos rojos** en los días

### **Opción 2: Consulta Directa a la Base de Datos**
```sql
SELECT * FROM scheduled_workouts 
WHERE user_id = 'tu-user-id' 
AND is_completed = false
ORDER BY scheduled_date ASC;
```

### **Opción 3: Usando la Función del Código**
```typescript
// En cualquier componente del dashboard
import { getScheduledWorkouts } from './training/actions';

const scheduled = await getScheduledWorkouts();
console.log(scheduled);
```

---

## 🚀 Mejora Sugerida: Sección de Entrenamientos Programados

Actualmente, los entrenamientos programados **solo se indican con un punto rojo** en el calendario. Sería útil agregar una sección que los liste explícitamente.

### **Propuesta de Mejora:**

```tsx
{/* Scheduled Workouts Section */}
{scheduled.length > 0 && (
  <div className="bg-brand-gray/40 border border-border/10 rounded-3xl p-6">
    <h3 className="font-heading font-bold text-foreground mb-6 flex items-center gap-2">
      <Calendar className="w-5 h-5 text-brand-red" /> Entrenamientos Programados
    </h3>
    <div className="space-y-4">
      {scheduled.map((workout, idx) => (
        <div key={idx} className="bg-white/5 border border-white/5 p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-white">{workout.title}</h4>
            <span className="text-xs text-gray-500">
              {new Date(workout.scheduled_date).toLocaleDateString()}
            </span>
          </div>
          <div className="space-y-2">
            {workout.exercises.map((ex: any, exIdx: number) => (
              <div key={exIdx} className="text-xs text-gray-400">
                • {ex.name} - {ex.sets} x {ex.reps}
              </div>
            ))}
          </div>
          <button className="mt-4 w-full bg-brand-red text-white py-2 rounded-lg text-xs font-bold">
            INICIAR AHORA
          </button>
        </div>
      ))}
    </div>
  </div>
)}
```

---

## 📝 Flujo Completo del Sistema

### **1. Usuario Genera WOD en AI Coach**
```
Usuario: "Dame un WOD de CrossFit"
AI Coach: Genera WOD profesional
```

### **2. Usuario Programa el WOD**
```
Usuario: Presiona "AL CALENDARIO"
Sistema: Llama a scheduleWorkout()
```

### **3. Almacenamiento**
```sql
INSERT INTO scheduled_workouts (
  user_id,
  title,
  scheduled_date,
  exercises,
  is_completed
) VALUES (
  'user-uuid',
  'PUSH & BURN',
  '2026-02-15',
  '[{...ejercicios...}]',
  false
);
```

### **4. Visualización**
```
Usuario: Va a /dashboard/training
Sistema: Carga scheduled_workouts
UI: Muestra punto rojo en el calendario
```

### **5. Ejecución (Futuro)**
```
Usuario: Click en día con punto rojo
Sistema: Abre el WOD programado
Usuario: Completa el entrenamiento
Sistema: Marca is_completed = true
```

---

## 🎨 Mejoras Recomendadas

### **1. Sección Dedicada de Programados**
Agregar una sección que liste todos los entrenamientos programados con:
- Título del WOD
- Fecha programada
- Vista previa de ejercicios
- Botón "INICIAR AHORA"

### **2. Click en Día del Calendario**
Permitir hacer click en un día con punto rojo para:
- Ver el WOD programado
- Iniciarlo directamente
- Editarlo o eliminarlo

### **3. Notificaciones**
Enviar notificación push cuando:
- Se acerca la hora del entrenamiento programado
- El día del entrenamiento programado llega

### **4. Vista de Lista**
Agregar una vista alternativa que muestre:
- Todos los entrenamientos programados
- Ordenados por fecha
- Con opción de marcar como completado

---

## 🔧 Funciones Disponibles

### **`scheduleWorkout()`**
```typescript
// Ubicación: app/dashboard/training/actions.ts (línea 654)
export async function scheduleWorkout(data: { 
  title: string, 
  date: string, 
  exercises: any[] 
}) {
  // Guarda el entrenamiento en scheduled_workouts
  // Revalida la ruta /dashboard/training
  // Retorna { success: true } o { error: string }
}
```

### **`getScheduledWorkouts()`**
```typescript
// Ubicación: app/dashboard/training/actions.ts (línea 747)
export async function getScheduledWorkouts() {
  // Obtiene todos los entrenamientos programados
  // Filtra por user_id y is_completed = false
  // Ordena por scheduled_date ascendente
  // Retorna array de scheduled_workouts
}
```

---

## ✅ Resumen

### **¿Dónde se almacena?**
- Tabla: `scheduled_workouts` en Supabase
- Fecha: Campo `scheduled_date` (hoy por defecto)
- Estado: `is_completed = false` (pendiente)

### **¿Dónde se ve?**
- **Calendario semanal** en `/dashboard/training`
- **Punto rojo** en el día programado
- **Texto "Goal"** si es el día actual

### **¿Cómo se usa?**
1. Generar WOD en AI Coach
2. Presionar "AL CALENDARIO"
3. Ver punto rojo en calendario
4. (Futuro) Click para iniciar

### **¿Qué falta?**
- Sección dedicada que liste los WODs programados
- Funcionalidad para iniciar desde el calendario
- Editar/eliminar entrenamientos programados
- Notificaciones de recordatorio

---

## 🎯 Próximos Pasos Sugeridos

Si quieres mejorar esta funcionalidad, puedo:

1. **Agregar sección de entrenamientos programados** en la página de training
2. **Hacer clickeable el calendario** para ver/iniciar WODs programados
3. **Agregar botones de editar/eliminar** para gestionar los programados
4. **Implementar notificaciones** de recordatorio

¿Qué te gustaría implementar primero?
