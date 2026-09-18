# Data Minds SQL Academy

Plataforma de aprendizaje de SQL para adultos de habla hispana en América Latina: ejercicios con datos de negocio realistas, ejecución segura de consultas, retroalimentación estructurada, pistas progresivas, gamificación profesional y certificados verificables.

**Organización:** Data Minds Solutions · **Fundador e instructor:** Marcelo Pisner

> Estado actual: **Fase 0 (descubrimiento y decisiones) completada; aún no hay código de aplicación.** Ver [docs/ROADMAP.md](docs/ROADMAP.md).

## Documentación
| Documento | Contenido |
|---|---|
| [docs/PRODUCT_REQUIREMENTS.md](docs/PRODUCT_REQUIREMENTS.md) | Requisitos, alcance del MVP, contradicciones resueltas, métricas |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, zonas de confianza, flujos, estructura del repositorio, costos, riesgos |
| [docs/SQL_SANDBOX.md](docs/SQL_SANDBOX.md) | Comparación y diseño del motor seguro de SQL (PGlite híbrido) |
| [docs/DATABASE_DESIGN.md](docs/DATABASE_DESIGN.md) | Modelo de datos de Supabase y matriz de políticas RLS |
| [docs/CURRICULUM.md](docs/CURRICULUM.md) | Ruta de aprendizaje (39 secciones), volumen inicial, datasets |
| [docs/CONTENT_GUIDELINES.md](docs/CONTENT_GUIDELINES.md) | Reglas de redacción, ejercicios, pistas, preguntas, recompensas, datasets |
| [docs/SECURITY.md](docs/SECURITY.md) | Modelo de seguridad y privacidad |
| [docs/PAYMENTS.md](docs/PAYMENTS.md) | Análisis de pagos para LATAM y recomendación |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Dirección visual, tokens, componentes, pantallas |
| [docs/ANALYTICS.md](docs/ANALYTICS.md) | Especificación de eventos de producto |
| [docs/TESTING.md](docs/TESTING.md) | Estrategia de pruebas y quality gate |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Entornos, configuración externa, CI/CD, rollback |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Registro de decisiones y preguntas pendientes del propietario |
| [docs/CLAUDE_CODE_SETUP.md](docs/CLAUDE_CODE_SETUP.md) | Agentes, skills, hooks y reglas de Claude Code |

## Requisitos locales (Fase 1 en adelante)
Node.js ≥ 22 (probado con 24), npm ≥ 10, Docker Desktop (para Supabase local), Supabase CLI (`npx supabase`), Git. Vercel CLI opcional.

## Puesta en marcha (disponible al finalizar la Fase 1)
```bash
npm install
cp .env.example .env.local        # completar valores
npx supabase start                 # Postgres local con migraciones y seed
npm run dev                        # http://localhost:3000
npm run quality                    # formato, lint, tipos, pruebas, build
```

## Licencia
Propietario. © Data Minds Solutions.
