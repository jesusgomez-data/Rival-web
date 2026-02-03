# RIVAL B2B MVP - Setup Instructions & Next Steps

**Fase 1 - Completada (50%)**  
Duración: Semana 1-2  
Status: ✅ Código creado, necesita BD + testing

---

## 🎯 QUÉ HEMOS HECHO

### ✅ Frontend (100% MVP)
- [x] Landing page "Para Centros" (`/for-centers`)
  - Feature cards (6 características clave)
  - Pricing table (Free/Starter/Pro)
  - Testimonials de centros
  - CTA buttons
  
- [x] Center Signup Form (`/center-signup`) 
  - Step 1: Email verification
  - Step 2: Centro type selection (7 tipos)
  - Step 3: Location (nombre, país, ciudad)
  - Step 4: Plan selection (Free/Starter/Pro)
  
- [x] Center Dashboard (`/center/[centerId]`)
  - Overview tab con stats (members, classes, revenue, ocupación)
  - Quick actions (Nueva clase, Miembros, Tienda, Perfil)
  - Recent activity feed
  - Navigation tabs para futuros módulos

### ✅ Backend Schema (100% diseñado)
- [x] Supabase schema SQL actualizado con tablas B2B:
  - `organizations` - Centros
  - `center_roles` - Roles y permisos
  - `classes` - Programación de clases
  - `class_enrollments` - Inscripciones
  - `trial_requests` - Lead management (clases prueba)
  - `memberships` - Suscripciones
  - `center_posts` - Feed social
  - `center_products` - Tienda
  - `orders` / `order_items` - Transacciones
  - `center_reviews` - Reseñas
  - `center_followers` - Seguidores

### ✅ API Endpoint (50% implementado)
- [x] `POST /api/centers` - Crear nuevo centro
- [x] `GET /api/centers` - Listar centros públicos
- [ ] Conexión real a Supabase (necesita credenciales de .env)

### ✅ Integración App Principal
- [x] Botón "Para Centros" en navbar de home page

---

## 🚀 PRÓXIMOS PASOS (Orden de Prioridad)

### PASO 1: Setup Supabase (1-2 horas)
```bash
1. Ir a supabase.com → Crear proyecto en dashboard
2. Copiar ANON KEY y URL a .env.local:
   NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

3. En Supabase SQL Editor:
   - Copiar todo el contenido de supabase_schema.sql
   - Ejecutar en Supabase console
   - Verificar que todas las tablas se crearon
   
4. Configurar RLS policies (Row Level Security) en Supabase:
   - Ir a cada tabla → Authentication → Enable RLS
   - Verificar que las policies estén activadas
```

### PASO 2: Conectar Frontend a Supabase (2 horas)

**A. Crear función para crear centros:**
```typescript
// utils/centers.ts
import { createClient } from '@supabase/supabase-js'

export const createCenter = async (formData: {
  email: string
  centerName: string
  centerType: string
  country: string
  city: string
  plan: string
  userId: string
}) => {
  const response = await fetch('/api/centers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  })
  return response.json()
}
```

**B. Actualizar CenterSignup form:**
```typescript
// app/center-signup/page.tsx
const handlePlanSelect = async (planId: string) => {
  setFormData({ ...formData, plan: planId })
  setLoading(true)
  
  try {
    const result = await createCenter({
      ...formData,
      plan: planId,
      userId: user?.id || ''  // Get from auth context
    })
    
    if (result.success) {
      // Redirect a dashboard
      window.location.href = `/center/${result.organization.id}`
    }
  } catch (err) {
    setError('Error al crear centro')
  }
}
```

**C. Fetch center data en dashboard:**
```typescript
// app/center/[centerId]/page.tsx
useEffect(() => {
  const fetchCenter = async () => {
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', params.centerId)
      .single()
    
    setCenterData(data)
    setLoading(false)
  }
  
  fetchCenter()
}, [params.centerId])
```

### PASO 3: Auth Context (1 hora)
Crear contexto para usuario actual y verificar que existe antes de crear centro:

```typescript
// utils/auth-context.ts
import { createContext, useContext } from 'react'

export const AuthContext = createContext<any>(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('Must be inside AuthProvider')
  return context
}

// En app/layout.tsx:
// <AuthProvider>
//   {children}
// </AuthProvider>
```

### PASO 4: Implementar Perfil Social del Centro (3 horas)
```
Nueva página: /center/[centerId]/profile

Mostrar:
- Logo + Cover photo
- Nombre, tipo, ubicación, horarios
- Bio/descripción
- Botones: Seguir, Compartir, Reseñas
- Feed de posts del centro
- Sección de miembros
- Rating promedio
```

### PASO 5: Módulo de Clases (3-4 horas)
```
Páginas:
- /center/[centerId]/classes - Listado de clases
- /center/[centerId]/classes/new - Crear clase
- /center/[centerId]/classes/[classId] - Editar clase

Funcionalidades:
- Crear/editar clases
- Establecer horarios
- Capacidad máxima
- Sincronizar Google Calendar (optional)
- Ver inscritos
```

### PASO 6: Sistema de Pruebas (Trial Classes) (4 horas)
```
- Endpoint para solicitar clase prueba
- Dashboard de solicitudes (head coach)
- Aprobación/Rechazo automático
- Asignación de fecha/hora
- Check-in QR
- Encuesta post-clase
- Tracking conversión
```

---

## 📋 Checklist Técnico Antes de Producción

- [ ] Supabase proyecto creado y schema ejecutado
- [ ] Variables .env configuradas
- [ ] RLS policies verificadas en todas las tablas
- [ ] Test: Crear centro desde form → aparece en DB
- [ ] Test: Login + crear centro → dashboard funciona
- [ ] Stripe Connect setup (para pagos)
- [ ] Email verification configurada
- [ ] Error handling completo
- [ ] Loading states en todos los forms
- [ ] Mobile responsive testeado
- [ ] Rate limiting en API endpoints
- [ ] CORS configurado correctamente

---

## 📊 Timeline Estimado para MVP

| Semana | Tarea | Horas | Status |
|--------|-------|-------|--------|
| 1-2 | Setup BD + Connect Frontend | 6 | 🔴 Pending |
| 2-3 | Perfil Social + Clases | 7 | 🔴 Pending |
| 3-4 | Trial Classes + Lead Management | 8 | 🔴 Pending |
| 4-5 | Check-in (Manual + QR) + Analytics Básico | 6 | 🔴 Pending |
| 5-6 | Memberships + Stripe Integration | 8 | 🔴 Pending |
| 6 | Testing + Bug Fixes | 4 | 🔴 Pending |
| **Total** | **MVP Listo** | **~40h** | 🔴 |

---

## 🔑 Variables de Entorno Necesarias

Crear `.env.local`:
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ... # Para API routes

# Stripe (después)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...

# Gmail (para emails)
NEXT_PUBLIC_SENDGRID_API_KEY=SG... # O similar

# Google Maps (para descubrimiento)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
```

---

## 🎓 Recursos Útiles

- [Supabase Docs](https://supabase.com/docs)
- [Next.js 16 Docs](https://nextjs.org/docs)
- [Stripe Connect Guide](https://stripe.com/docs/connect)
- [Google Calendar API](https://developers.google.com/calendar)

---

## 💡 Tips Importantes

1. **Testing Early**: Crea 2-3 centros de prueba para testear flujos
2. **Datos Mock**: Usa datos simulados para no depender de Stripe/Google al principio
3. **Incremental**: Termina cada módulo antes de pasar al siguiente
4. **Database Design**: Verifica que las relaciones FK estén bien
5. **Error Handling**: Agrega try/catch en todos los async operations

---

**Próxima sesión**: Empezamos por Setup Supabase + conectar form a BD

¿Listo?
