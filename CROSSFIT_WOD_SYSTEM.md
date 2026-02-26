# 🏋️ SISTEMA DE WODS PROFESIONALES - AI COACH

## 🎯 Formato Implementado

El AI Coach ahora genera WODs con formato profesional de CrossFit, incluyendo:

1. ✅ **Estructura clara** (EMOM, AMRAP, For Time, TABATA)
2. ✅ **Niveles de peso** (Escalado/Intermedio/Avanzado Rx)
3. ✅ **Descansos especificados** (ej: 4' REST, 2' REST)
4. ✅ **Abreviaciones estándar** (STOH, TTB, RIR, etc.)
5. ✅ **Notas importantes** con asterisco (*)
6. ✅ **Formato limpio** con saltos de línea

---

## 📋 Ejemplo de WOD Generado

### **Formato Visual:**
```
EMOM 12'
1' 3 PUSH PRESS RIR 2
1' 10 TTB OR PRACTICE THE MOVEMENT

4' REST

AMRAP 13'
15 STOH
20 REVERSE SIT UPS

* EVERY 3' 10 BURPEES, START WITH BURPEES

2' REST

FOR TIME (3')
15 PUSH PRESS
30 SIT UPS
15 BURPEES

PESOS:
Push Press - Escalado: 20/15kg | Intermedio: 30/20kg | Avanzado (Rx): 43/30kg
STOH - Escalado: 15/10kg | Intermedio: 25/15kg | Avanzado (Rx): 35/25kg
```

### **Estructura JSON Generada:**
```json
{
  "replyText": "¡Soldado! Hoy vamos a trabajar fuerza de empuje y capacidad metabólica. Este WOD combina trabajo técnico con alta intensidad. ¡Dale duro!",
  "workout": {
    "title": "PUSH & BURN",
    "duration": "35 min",
    "intensity": "Intermedio",
    "sportType": "Cross Training",
    "description": "EMOM 12'\n1' 3 PUSH PRESS RIR 2\n1' 10 TTB OR PRACTICE THE MOVEMENT\n\n4' REST\n\nAMRAP 13'\n15 STOH\n20 REVERSE SIT UPS\n\n* EVERY 3' 10 BURPEES, START WITH BURPEES\n\n2' REST\n\nFOR TIME (3')\n15 PUSH PRESS\n30 SIT UPS\n15 BURPEES\n\nPESOS:\nPush Press - Escalado: 20/15kg | Intermedio: 30/20kg | Avanzado (Rx): 43/30kg\nSTOH - Escalado: 15/10kg | Intermedio: 25/15kg | Avanzado (Rx): 35/25kg",
    "exercises": [
      {
        "name": "Push Press",
        "sets": "EMOM 12' (1' on/1' off)",
        "reps": "3 RIR 2",
        "weight_scaled": "20/15kg",
        "weight_intermediate": "30/20kg",
        "weight_rx": "43/30kg",
        "notes": "RIR 2 = Reps in Reserve (dejar 2 reps en el tanque)"
      },
      {
        "name": "Toes to Bar (TTB)",
        "sets": "EMOM 12' (1' on/1' off)",
        "reps": "10",
        "weight_scaled": "Knee Raises",
        "weight_intermediate": "Hanging Knee to Elbow",
        "weight_rx": "Strict TTB",
        "notes": "Practica el movimiento si aún no dominas TTB"
      },
      {
        "name": "Shoulder to Overhead (STOH)",
        "sets": "AMRAP 13'",
        "reps": "15",
        "weight_scaled": "15/10kg",
        "weight_intermediate": "25/15kg",
        "weight_rx": "35/25kg",
        "notes": "Cualquier técnica: Push Press, Push Jerk, Split Jerk"
      },
      {
        "name": "Reverse Sit Ups",
        "sets": "AMRAP 13'",
        "reps": "20",
        "weight_scaled": "Bodyweight",
        "weight_intermediate": "Bodyweight",
        "weight_rx": "Bodyweight",
        "notes": null
      },
      {
        "name": "Burpees",
        "sets": "Cada 3' durante AMRAP",
        "reps": "10",
        "weight_scaled": "Step Back Burpees",
        "weight_intermediate": "Regular Burpees",
        "weight_rx": "Burpee + Chest to Ground",
        "notes": "Empezar el AMRAP con burpees"
      }
    ]
  }
}
```

---

## 🎨 Abreviaciones Estándar de CrossFit

El AI Coach está entrenado para usar estas abreviaciones:

### **Movimientos:**
- **STOH** - Shoulder to Overhead
- **TTB** - Toes to Bar
- **C2B** - Chest to Bar
- **MU** - Muscle Up
- **HSPU** - Handstand Push Up
- **DU** - Double Unders
- **SU** - Single Unders
- **KBS** - Kettlebell Swing
- **WBS** - Wall Ball Shots
- **BJ** - Box Jump
- **BJO** - Box Jump Over
- **DL** - Deadlift
- **BS** - Back Squat
- **FS** - Front Squat
- **OHS** - Overhead Squat
- **S2OH** - Shoulder to Overhead
- **PP** - Push Press
- **PJ** - Push Jerk
- **SJ** - Split Jerk
- **C&J** - Clean & Jerk
- **PC** - Power Clean
- **SC** - Squat Clean
- **PS** - Power Snatch
- **SS** - Squat Snatch
- **T2B** - Toes to Bar
- **K2E** - Knees to Elbows
- **GHD** - Glute Ham Developer
- **SDHP** - Sumo Deadlift High Pull

### **Formatos de WOD:**
- **EMOM** - Every Minute On the Minute
- **AMRAP** - As Many Rounds/Reps As Possible
- **TABATA** - 20s work / 10s rest (8 rounds)
- **FOR TIME** - Completar lo más rápido posible
- **CHIPPER** - Lista larga de ejercicios, una sola ronda
- **RFT** - Rounds For Time
- **AFAP** - As Fast As Possible
- **E2MOM** - Every 2 Minutes On the Minute
- **E3MOM** - Every 3 Minutes On the Minute

### **Términos Técnicos:**
- **RIR** - Reps In Reserve (reps que quedan en el tanque)
- **RPE** - Rate of Perceived Exertion (escala de esfuerzo 1-10)
- **Rx** - As prescribed (peso/movimiento prescrito/avanzado)
- **TC** - Time Cap (límite de tiempo)
- **UB** - Unbroken (sin soltar)
- **TNG** - Touch and Go (tocar y seguir)
- **YGIG** - You Go I Go (alternando con compañero)

---

## 💪 Niveles de Escalado

### **Escalado (Beginner/Scaled):**
- Para atletas principiantes o con limitaciones
- Pesos más ligeros (20-30% menos que Rx)
- Movimientos simplificados (ej: Knee Raises en vez de TTB)
- Menor volumen si es necesario

### **Intermedio:**
- Para atletas con experiencia moderada
- Pesos intermedios (15-20% menos que Rx)
- Movimientos estándar con posibles modificaciones
- Volumen completo

### **Avanzado (Rx):**
- Para atletas experimentados
- Pesos prescritos según estándares de CrossFit
- Movimientos completos y técnicos
- Volumen completo + posibles variantes difíciles

---

## 🔥 Ejemplos de Prompts para el Usuario

### **Prompt 1: WOD General**
```
Usuario: "Dame un WOD de CrossFit para hoy"

AI Coach: "¡Soldado! Hoy vamos con un WOD clásico de alta intensidad..."

WOD Generado:
CINDY
AMRAP 20'
5 PULL UPS
10 PUSH UPS
15 AIR SQUATS

PESOS:
Pull Ups - Escalado: Band Assisted | Intermedio: Kipping | Avanzado (Rx): Strict
```

### **Prompt 2: WOD Específico**
```
Usuario: "Quiero trabajar fuerza de pierna y cardio"

AI Coach: "¡Perfecto! Vamos a combinar sentadillas pesadas con trabajo metabólico..."

WOD Generado:
LEGS & LUNGS
E3MOM 15' (5 rounds)
5 BACK SQUAT @ 80% 1RM
15 CAL ASSAULT BIKE

4' REST

FOR TIME (12' TC)
50 WALL BALLS
40 BOX JUMPS
30 THRUSTERS
20 BURPEES OVER BOX

PESOS:
Back Squat - Escalado: 60/40kg | Intermedio: 80/60kg | Avanzado (Rx): 100/70kg
Wall Balls - Escalado: 6/4kg | Intermedio: 9/6kg | Avanzado (Rx): 14/9kg
Thrusters - Escalado: 20/15kg | Intermedio: 30/20kg | Avanzado (Rx): 43/30kg
```

### **Prompt 3: WOD con Tiempo Limitado**
```
Usuario: "Solo tengo 20 minutos para entrenar"

AI Coach: "¡Entendido! Vamos con un WOD corto pero intenso..."

WOD Generado:
QUICK BURN
EMOM 16'
Min 1: 12 THRUSTERS
Min 2: 15 CAL ROW
Min 3: 20 DU
Min 4: REST

PESOS:
Thrusters - Escalado: 15/10kg | Intermedio: 25/15kg | Avanzado (Rx): 35/25kg
```

---

## 🎯 Características del Sistema

### **1. Adaptación Automática:**
El AI Coach adapta los WODs según:
- Nivel del usuario (Beginner/Intermediate/Advanced)
- Disciplina principal (CrossFit, Gym, Hybrid, OCR)
- Historial de entrenamientos
- Preferencias expresadas

### **2. Variedad de Formatos:**
- EMOM (trabajo por minuto)
- AMRAP (máximas rondas/reps)
- For Time (contra reloj)
- TABATA (intervalos 20/10)
- Chipper (lista larga)
- Híbridos (combinaciones)

### **3. Progresión Inteligente:**
- Pesos progresivos según nivel
- Volumen ajustado a capacidad
- Complejidad técnica escalable
- Descansos apropiados

### **4. Seguridad:**
- Calentamiento recomendado
- Técnica antes que peso
- Descansos adecuados
- Escalado siempre disponible

---

## 📱 Integración en la App

### **Flujo de Usuario:**
1. Usuario abre el **AI Coach**
2. Escribe: "Dame un WOD de CrossFit"
3. AI Coach genera WOD con formato profesional
4. Usuario ve:
   - Estructura clara del WOD
   - Pesos por nivel
   - Instrucciones detalladas
   - Notas importantes
5. Usuario puede:
   - Guardar el WOD
   - Iniciar sesión de entrenamiento
   - Compartir en feed/historias

### **Visualización:**
```
┌─────────────────────────────────┐
│  🏋️ PUSH & BURN                │
│  ⏱️ 35 min | 🔥 Intermedio      │
├─────────────────────────────────┤
│                                 │
│  EMOM 12'                       │
│  1' 3 PUSH PRESS RIR 2          │
│  1' 10 TTB OR PRACTICE          │
│                                 │
│  4' REST                        │
│                                 │
│  AMRAP 13'                      │
│  15 STOH                        │
│  20 REVERSE SIT UPS             │
│                                 │
│  * EVERY 3' 10 BURPEES          │
│                                 │
│  2' REST                        │
│                                 │
│  FOR TIME (3')                  │
│  15 PUSH PRESS                  │
│  30 SIT UPS                     │
│  15 BURPEES                     │
│                                 │
│  📊 PESOS:                      │
│  Push Press                     │
│  Escalado: 20/15kg              │
│  Intermedio: 30/20kg            │
│  Avanzado: 43/30kg              │
│                                 │
│  STOH                           │
│  Escalado: 15/10kg              │
│  Intermedio: 25/15kg            │
│  Avanzado: 35/25kg              │
│                                 │
├─────────────────────────────────┤
│  [INICIAR WOD] [COMPARTIR]      │
└─────────────────────────────────┘
```

---

## ✅ Testing Recomendado

### **Pruebas a Realizar:**
1. ✅ Pedir WOD general → Debe generar formato profesional
2. ✅ Pedir WOD específico (ej: "solo piernas") → Debe adaptar
3. ✅ Pedir WOD corto (ej: "20 minutos") → Debe ajustar duración
4. ✅ Verificar niveles de peso → Deben estar presentes
5. ✅ Verificar descansos → Deben estar especificados
6. ✅ Verificar abreviaciones → Deben ser estándar
7. ✅ Verificar formato → Debe tener saltos de línea correctos

---

## 🎉 Resultado Final

**Los usuarios ahora reciben:**
- ✅ WODs con formato profesional de CrossFit
- ✅ Niveles de peso claros (Escalado/Intermedio/Avanzado)
- ✅ Estructura clara (EMOM/AMRAP/For Time)
- ✅ Descansos especificados
- ✅ Abreviaciones estándar
- ✅ Notas importantes
- ✅ Formato limpio y legible

**Sin preocuparse por:**
- ❌ WODs genéricos sin estructura
- ❌ Pesos no especificados
- ❌ Formato confuso
- ❌ Falta de opciones de escalado
- ❌ Instrucciones poco claras

---

## 📞 Soporte

Si un usuario reporta que los WODs no tienen el formato correcto:
1. Verificar que la API key de Gemini esté configurada
2. Revisar los logs del AI Coach
3. Verificar que el prompt se esté enviando correctamente
4. Como último recurso, regenerar el WOD con un prompt más específico
