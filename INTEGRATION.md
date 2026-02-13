# Conexión Frontend-Backend

## Estado de la Integración ✅

El formulario de "Agregar Aplicación de Candidato" ahora está completamente conectado con el backend Django.

### Cambios Realizados:

1. **API Client (`src/lib/api.ts`)**
   - ✅ Agregadas funciones para candidatos: `getCandidates()`, `createCandidate()`, etc.
   - ✅ Agregadas funciones para aplicaciones: `getApplications()`, `createApplication()`, etc.
   - ✅ Agregadas funciones para perfiles: `getProfiles()`, `getProfile()`

2. **Componente ApplicationFormModal**
   - ✅ Carga automática de candidatos desde la base de datos
   - ✅ Carga automática de perfiles disponibles
   - ✅ Selects dinámicos en lugar de campos de texto
   - ✅ Envío de datos al backend al guardar
   - ✅ Indicadores de carga (loading states)
   - ✅ Manejo de errores con mensajes al usuario
   - ✅ Mapeo correcto de estados del formulario a estados del backend

3. **Configuración**
   - ✅ `.env.local` configurado con `NEXT_PUBLIC_API_URL=http://localhost:8000`

### Endpoints Utilizados:

```
GET  /candidates/candidates/     - Listar candidatos
POST /candidates/applications/   - Crear aplicación
GET  /profiles/profiles/         - Listar perfiles
```

### Mapeo de Estados:

| Estado en Formulario | Estado en Backend |
|---------------------|-------------------|
| Aplicó              | applied           |
| Preseleccionado     | shortlisted       |
| Entrevista          | interview_scheduled |
| Oferta              | offered           |
| Contratado          | accepted          |
| Rechazado           | rejected          |

### Estructura de Datos Enviados:

```typescript
{
  candidate: number,              // ID del candidato
  profile: number,                // ID del perfil
  status: string,                 // Estado mapeado
  match_percentage: number | null,
  overall_rating: number | null,
  notes: string,
  rejection_reason: string,
  interview_date: string | null,  // ISO 8601 format
  offer_date: string | null       // ISO 8601 format
}
```

## Cómo Probar:

### 1. Iniciar el Backend Django

```bash
cd ProcesoReclutamiento
python manage.py runserver
```

O con Docker:
```bash
cd ProcesoReclutamiento
docker-compose up
```

### 2. Iniciar el Frontend Next.js

```bash
cd frontend3
npm run dev
```

### 3. Probar el Formulario

1. Ir a la vista del Director
2. Click en "Nueva Aplicación"
3. Los candidatos y perfiles se cargarán automáticamente desde la base de datos
4. Llenar el formulario
5. Click en "Guardar Aplicación"
6. Los datos se guardarán en PostgreSQL

### Verificar en la Base de Datos:

```sql
-- Ver aplicaciones creadas
SELECT * FROM candidates_candidateprofile ORDER BY applied_at DESC;

-- Ver con detalles del candidato y perfil
SELECT 
    cp.*,
    c.first_name || ' ' || c.last_name as candidate_name,
    p.position_title
FROM candidates_candidateprofile cp
JOIN candidates_candidate c ON cp.candidate_id = c.id
JOIN profiles_profile p ON cp.profile_id = p.id
ORDER BY cp.applied_at DESC;
```

## Solución de Problemas:

### Error: "Failed to fetch"
- ✅ Verificar que el backend esté corriendo en `http://localhost:8000`
- ✅ Verificar CORS configurado en Django (`DJANGO_CORS_CONFIG.py`)
- ✅ Verificar que `.env.local` tenga `NEXT_PUBLIC_API_URL=http://localhost:8000`

### Error: "401 Unauthorized"
- ✅ Hacer login primero en el sistema
- ✅ Verificar que el token esté en localStorage
- ✅ Token válido y no expirado

### No se cargan candidatos/perfiles
- ✅ Verificar que existan registros en la base de datos
- ✅ Crear candidatos y perfiles de prueba si es necesario

## Próximos Pasos (Opcional):

- [ ] Agregar modal para crear candidato nuevo desde el formulario
- [ ] Agregar modal para crear perfil nuevo desde el formulario
- [ ] Agregar vista previa de candidato/perfil seleccionado
- [ ] Agregar validaciones más robustas
- [ ] Agregar autocompletado con búsqueda en candidatos
- [ ] Mostrar lista de aplicaciones creadas en el dashboard

---

**¡Listo!** El formulario ahora guarda directamente en la base de datos PostgreSQL a través del API REST de Django. 🚀
