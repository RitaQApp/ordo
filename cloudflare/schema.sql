CREATE TABLE IF NOT EXISTS paquetes (
  id TEXT PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE COLLATE NOCASE,
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK(tipo IN ('general','especifico')),
  departamentos TEXT NOT NULL DEFAULT '[]',
  compartida INTEGER NOT NULL DEFAULT 0,
  revision TEXT NOT NULL,
  fecha TEXT NOT NULL,
  estado TEXT NOT NULL CHECK(estado IN ('borrador','vigente','obsoleto')),
  texto TEXT NOT NULL DEFAULT '',
  filas TEXT NOT NULL DEFAULT '[]',
  version INTEGER NOT NULL DEFAULT 1,
  actualizado TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS revisiones (
  paquete_id TEXT NOT NULL,
  revision TEXT NOT NULL,
  instantanea TEXT NOT NULL,
  aprobado TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(paquete_id,revision),
  FOREIGN KEY(paquete_id) REFERENCES paquetes(id)
);
CREATE TABLE IF NOT EXISTS eventos (
  id TEXT PRIMARY KEY,
  paquete_id TEXT NOT NULL,
  fecha TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actor_departamento TEXT NOT NULL,
  accion TEXT NOT NULL,
  detalle TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY(paquete_id) REFERENCES paquetes(id)
);
CREATE INDEX IF NOT EXISTS idx_paquetes_estado ON paquetes(estado);
CREATE INDEX IF NOT EXISTS idx_revisiones_paquete ON revisiones(paquete_id);
