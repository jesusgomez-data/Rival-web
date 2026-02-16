# 🚨 SOLUCIÓN: AI Coach no funciona en rivalfit.app

## Problema Identificado

El AI Coach funciona en **localhost** pero falla en **rivalfit.app** con el mensaje:
> "Soldado, el cuartel de IA está saturado..."

**Causa raíz**: La variable de entorno `GEMINI_API_KEY` NO está configurada en Vercel.

---

## ✅ SOLUCIÓN INMEDIATA

### Paso 1: Agregar Variable de Entorno en Vercel

1. Ve a tu proyecto en Vercel: https://vercel.com/dashboard
2. Selecciona el proyecto **Rival-web**
3. Ve a **Settings** → **Environment Variables**
4. Agrega la siguiente variable:

```
Name: GEMINI_API_KEY
Value: [REDACTED_GEMINI_KEY]
Environment: Production, Preview, Development (selecciona todos)
```

5. Haz clic en **Save**

### Paso 2: Re-deploy la Aplicación

Después de agregar la variable, necesitas hacer un nuevo deploy:

**Opción A - Desde Vercel Dashboard:**
1. Ve a **Deployments**
2. Encuentra el último deployment
3. Haz clic en los tres puntos (...)
4. Selecciona **Redeploy**

**Opción B - Desde Git:**
```bash
git commit --allow-empty -m "Trigger redeploy for env vars"
git push
```

---

## 🔍 Verificación

Una vez que hayas agregado la variable y re-deployado:

1. Ve a https://rivalfit.app/dashboard/coach
2. Envía un mensaje al AI Coach
3. Debería responder normalmente sin el mensaje de "saturado"

---

## 📋 Variables de Entorno Necesarias en Vercel

Asegúrate de tener TODAS estas variables configuradas en Vercel:

### Supabase
```
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[REDACTED_ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[REDACTED_SERVICE_KEY]
```

### Stripe
```
STRIPE_SECRET_KEY=[REDACTED_ST_SECRET]
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=[REDACTED_ST_PUB]
STRIPE_WEBHOOK_SECRET=[REDACTED_ST_WEBHOOK]
NEXT_PUBLIC_STRIPE_PRICE_STARTER=price_...
NEXT_PUBLIC_STRIPE_PRICE_PRO=price_...
NEXT_PUBLIC_STRIPE_PRICE_PREMIUM=price_...
NEXT_PUBLIC_STRIPE_PRICE_ELITE=price_...
```

### App URL
```
NEXT_PUBLIC_APP_URL=https://rivalfit.app
```

### AI Coach (⚠️ FALTANTE - AGREGAR)
```
GEMINI_API_KEY=[REDACTED_GEMINI_KEY]
```

### Email
```
RESEND_API_KEY=[REDACTED_RESEND_KEY]
```

### Push Notifications
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=[REDACTED_VAPID_PUB]
VAPID_PRIVATE_KEY=[REDACTED_VAPID_PRIV]
```

---

## 🔧 Mejora Adicional del Código

He identificado que el código actual intenta 3 modelos diferentes de Gemini, pero todos comparten la misma cuota. Voy a mejorar el manejo de errores para que sea más claro.

---

## ⚡ Tiempo Estimado de Solución

- **Agregar variable en Vercel**: 2 minutos
- **Re-deploy**: 3-5 minutos
- **Verificación**: 1 minuto

**Total: ~10 minutos** para tener el AI Coach funcionando en producción.

---

## 🎯 Resultado Esperado

Después de aplicar esta solución:
- ✅ AI Coach funcionará en rivalfit.app
- ✅ Los usuarios podrán generar entrenamientos personalizados
- ✅ El sistema intentará 3 modelos diferentes antes de fallar
- ✅ Si falla, mostrará un workout de emergencia en lugar de error

---

## 📞 Soporte

Si después de agregar la variable sigue sin funcionar:
1. Verifica que la API key de Gemini sea válida
2. Revisa los logs de Vercel para ver errores específicos
3. Verifica que no hayas excedido la cuota gratuita de Gemini API
