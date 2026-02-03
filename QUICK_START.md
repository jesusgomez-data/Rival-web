# 🚀 Guía Rápida de Inicio - Rival B2B

## 5 Pasos para Empezar

### 1️⃣ Crear Proyecto Supabase

Ir a: https://supabase.com

1. Click en "New Project"
2. Selecciona organización y región
3. Anota las credenciales:
   - URL del proyecto
   - Anon Key
   - Service Role Key

### 2️⃣ Configurar Variables de Entorno

Crea archivo `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://[proyecto].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 3️⃣ Crear Tablas y Seguridad

En la consola de Supabase:

1. Ve a "SQL Editor"
2. New Query
3. Copia TODO el contenido de `supabase_b2b_schema.sql`
4. Pega en el editor
5. Click "Run"

✅ Esto crea 7 tablas + RLS policies + índices

### 4️⃣ Crear Bucket para Imágenes

En la consola de Supabase:

1. Ve a "Storage"
2. New bucket
3. Nombre: `center-logos`
4. Public (marcar casilla)
5. Create bucket

### 5️⃣ Iniciar la App

En terminal:

```bash
cd tu-proyecto
npm install  # si es primera vez
npm run dev
```

Abre: http://localhost:3000

---

## 🎯 Flujo de Prueba

### A. Crear Cuenta
```
http://localhost:3000/center-owner/login
- Click "Regístrate aquí"
- Email: tuEmail@example.com
- Password: cualquier contraseña
- Click "Crear Cuenta"
```

### B. Crear Centro
```
http://localhost:3000/center-owner/centers/new
- Nombre: "Mi Primer Centro"
- Tipo: Selecciona uno (CrossFit, Gym, etc)
- Ubicación: Completa los campos
- Plan: STARTER (recomendado)
- Click "Crear Centro"
```

### C. Ver Dashboard
```
Automáticamente redirige a:
http://localhost:3000/center/[id]

Puedes navegar en los tabs:
- Overview (estadísticas)
- Clases (lista y crear)
- Miembros (tabla)
- Tienda (productos)
- Analytics (gráficos)
```

### D. Crear una Clase
```
En el dashboard:
- Click en tab "Clases"
- Click botón "Nueva Clase"
- Completa formulario:
  - Nombre: "CrossFit Básico"
  - Entrenador: "Juan"
  - Día: Lunes
  - Hora: 08:00
  - Capacidad: 15
  - Duración: 60
- Click "Crear Clase"
```

### E. Editar Centro
```
Opción 1: Desde dashboard
- Click en Settings (engranaje)
- Edita los campos
- Click "Guardar Cambios"

Opción 2: Desde lista de centros
- http://localhost:3000/center-owner/centers
- Click edit (icono de lápiz)
- Edita y guarda
```

---

## 🎨 Personalizar Colores

Colores por defecto en `tailwind.config.ts`:
- `brand-red`: #EF4444 (rojo principal)
- `brand-accent`: #DC2626 (rojo oscuro)
- `brand-gray`: #1F2937 (gris oscuro)

Para cambiar, edita `tailwind.config.ts`:

```ts
colors: {
  'brand-red': '#TU_COLOR',
  'brand-accent': '#TU_COLOR',
  'brand-gray': '#TU_COLOR',
}
```

---

## 🔒 Verificar Seguridad

### Probar que RLS funciona

1. Crea dos usuarios diferentes
2. Cada uno crea un centro
3. Intenta ver el centro del otro:
   - No deberías poder verlo
   - Supabase rechaza automáticamente

---

## 📱 URLs Principales

```
Login: /center-owner/login
Mis Centros: /center-owner/centers
Crear Centro: /center-owner/centers/new
Editar Centro: /center-owner/centers/[id]/edit

Dashboard: /center/[centerId]
Settings Centro: /center/[centerId]/settings
Crear Clase: /center/[centerId]/classes/new
```

---

## 🆘 Solucionar Problemas

### "Unauthorized" en API
- Verifica que estés logueado
- Verifica que el JWT es válido
- Ve a browser DevTools > Network > Headers

### "Row not found" o "Permission denied"
- Verifica que eres owner del centro
- Las RLS policies protegen los datos
- No intentes acceder a datos de otros

### Imágenes no se suben
- Verifica que existe bucket `center-logos`
- Verifica que está como "Public"
- Verifica CORS en Storage Settings

### Datos no se guardan
- Verifica que el usuario está autenticado
- Verifica la consola del servidor (terminal)
- Ve a "SQL Editor" en Supabase para debug

---

## 📚 Documentación

- **SUPABASE_SETUP.md** - Configuración detallada
- **IMPLEMENTATION_COMPLETE.md** - Resumen de implementación
- Código comentado en los archivos .tsx

---

## 🎓 Aprender Más

- [Supabase Docs](https://supabase.com/docs)
- [Next.js 16 Docs](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Lucide Icons](https://lucide.dev)

---

## ✅ Checklist

- [ ] Crear proyecto Supabase
- [ ] Copiar credenciales a .env.local
- [ ] Ejecutar SQL schema
- [ ] Crear bucket center-logos
- [ ] npm run dev
- [ ] Crear cuenta
- [ ] Crear primer centro
- [ ] Ver dashboard
- [ ] Crear una clase
- [ ] ¡Listo! 🎉

---

**¿Necesitas ayuda?**

Cada archivo tiene comentarios explicativos. Revisa:
1. `/app/center-owner/login/page.tsx` - Autenticación
2. `/app/center-owner/centers/new/page.tsx` - Crear centro
3. `/app/center/[centerId]/page.tsx` - Dashboard

¡Diviértete construyendo! 🚀
