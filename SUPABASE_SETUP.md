# Guía de Configuración Supabase para B2B Rival

## 1. Crear Proyecto Supabase
1. Ve a [supabase.com](https://supabase.com)
2. Crea una nueva organización y proyecto
3. Copia las credenciales:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (para admin)

## 2. Variables de Entorno
En tu archivo `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

## 3. Ejecutar SQL Schema
1. En la consola de Supabase, ve a SQL Editor
2. Copia todo el contenido de `supabase_b2b_schema.sql`
3. Crea una nueva consulta y pégalo
4. Ejecuta la consulta

Esto creará:
- Tablas: users, centers, classes, members, products, class_enrollments, sales
- RLS Policies para seguridad
- Índices para optimización

## 4. Configurar Storage
1. Ve a Storage en la consola de Supabase
2. Crea un nuevo bucket llamado `center-logos`
3. Configura las políticas de acceso:
   - **SELECT**: Todos pueden leer
   - **INSERT**: Solo usuarios autenticados
   - **UPDATE**: Solo propietarios
   - **DELETE**: Solo propietarios

## 5. Configurar Autenticación
En Settings > Authentication:

### Email/Password
- Habilitado por defecto
- Configurar confirmación de email si es necesario

### Políticas de RLS
Ya están configuradas en el SQL schema. Verificar:
- Los propietarios pueden ver solo sus centros
- Los miembros pueden ver solo su información
- Los coaches pueden ver solo sus clases

## 6. Flujo de Aplicación

### Para Propietarios:
1. **Signup**: `/center-owner/login` 
   - Crea usuario en `auth.users`
   - Crea perfil en tabla `users`

2. **Crear Centro**: `/center-owner/centers/new`
   - Inserta en tabla `centers` con `owner_id`
   - Sube logo a Storage si lo proporciona

3. **Listar Centros**: `/center-owner/centers`
   - Filtra centros donde `owner_id = auth.uid()`

4. **Editar Centro**: `/center-owner/centers/[id]/edit`
   - Actualiza centro (RLS valida ownership)

5. **Dashboard**: `/center/[centerId]`
   - Carga datos de `centers`, `classes`, `members`, `products`
   - Las queries de Supabase filtran automáticamente

### Para Miembros:
1. Pueden verse agregados a un centro
2. Ven sus clases y membresía
3. Pueden comprar productos

## 7. Testing

### Test Signup:
```bash
curl -X POST https://[PROJECT_ID].supabase.co/auth/v1/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'
```

### Test Crear Centro:
```bash
# Necesitas token JWT del usuario
curl -X POST http://localhost:3000/api/centers \
  -H "Authorization: Bearer [JWT_TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{...center_data...}'
```

### Test Subir Logo:
```bash
# Usar el endpoint de Storage de Supabase
# Se maneja desde el frontend con client.storage.upload()
```

## 8. Troubleshooting

### Error: "Unauthorized" en API routes
- Verificar que el usuario está autenticado
- Verificar que el JWT es válido
- Ver console logs del servidor

### Error: "Row not found" o "Permission denied"
- Verificar que la RLS policy es correcta
- Verificar que el usuario tiene permisos
- Ver en la consola de Supabase las queries

### Imágenes no se suben
- Verificar que el bucket `center-logos` existe
- Verificar permisos de Storage
- Verificar CORS en Settings

## 9. Próximos Pasos

1. **Webhooks**: Configurar webhooks para notificaciones
2. **Realtime**: Habilitar Realtime para updates en vivo
3. **Functions**: Edge functions para lógica más compleja
4. **Backups**: Configurar backups automáticos
5. **Analytics**: Integrar analytics para tracking

## 10. URLs Útiles

- Dashboard: `/center-owner/centers`
- Login: `/center-owner/login`
- Crear Centro: `/center-owner/centers/new`
- Dashboard Centro: `/center/[centerId]`
- Settings Centro: `/center/[centerId]/settings`
- Crear Clase: `/center/[centerId]/classes/new`

---

**Notas Importantes:**
- Las RLS policies protegen los datos automáticamente
- No es necesario validar `owner_id` en API routes (Supabase lo hace)
- Los tokens expinan, implementar refresh tokens
- Usar `service_role_key` solo en el servidor, nunca en cliente
