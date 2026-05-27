-- ============================================================
-- Agenda Operacional — migração aditiva segura
-- ============================================================

-- Colunas na tabela existente InternalUser
ALTER TABLE "InternalUser" ADD COLUMN IF NOT EXISTS "agendaColor"  TEXT    DEFAULT '#3B82F6';
ALTER TABLE "InternalUser" ADD COLUMN IF NOT EXISTS "agendaActive" BOOLEAN DEFAULT false;

-- Tabela principal de agendamentos
CREATE TABLE IF NOT EXISTS "Schedule" (
  "id"               TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "title"            TEXT        NOT NULL,
  "type"             TEXT        NOT NULL DEFAULT 'INSTALLATION',
  "status"           TEXT        NOT NULL DEFAULT 'SCHEDULED',
  "startDate"        TIMESTAMP(3) NOT NULL,
  "endDate"          TIMESTAMP(3) NOT NULL,
  "address"          TEXT,
  "notes"            TEXT,
  "companyId"        TEXT,
  "projectId"        TEXT,
  "parentScheduleId" TEXT,
  "createdById"      TEXT        NOT NULL,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Schedule_companyId_fkey"        FOREIGN KEY ("companyId")        REFERENCES "Company"("id")       ON DELETE SET NULL  ON UPDATE CASCADE,
  CONSTRAINT "Schedule_projectId_fkey"        FOREIGN KEY ("projectId")        REFERENCES "Project"("id")       ON DELETE SET NULL  ON UPDATE CASCADE,
  CONSTRAINT "Schedule_parentScheduleId_fkey" FOREIGN KEY ("parentScheduleId") REFERENCES "Schedule"("id")      ON DELETE SET NULL  ON UPDATE CASCADE,
  CONSTRAINT "Schedule_createdById_fkey"      FOREIGN KEY ("createdById")      REFERENCES "InternalUser"("id")  ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Schedule_startDate_endDate_idx" ON "Schedule"("startDate", "endDate");
CREATE INDEX IF NOT EXISTS "Schedule_status_idx"            ON "Schedule"("status");
CREATE INDEX IF NOT EXISTS "Schedule_companyId_idx"         ON "Schedule"("companyId");
CREATE INDEX IF NOT EXISTS "Schedule_createdById_idx"       ON "Schedule"("createdById");

-- Tabela pivô: agendamento ↔ instalador
CREATE TABLE IF NOT EXISTS "ScheduleInstaller" (
  "id"          TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "scheduleId"  TEXT        NOT NULL,
  "installerId" TEXT        NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScheduleInstaller_pkey"                        PRIMARY KEY ("id"),
  CONSTRAINT "ScheduleInstaller_scheduleId_installerId_key"  UNIQUE ("scheduleId", "installerId"),
  CONSTRAINT "ScheduleInstaller_scheduleId_fkey"  FOREIGN KEY ("scheduleId")  REFERENCES "Schedule"("id")      ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ScheduleInstaller_installerId_fkey" FOREIGN KEY ("installerId") REFERENCES "InternalUser"("id")  ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ScheduleInstaller_installerId_idx" ON "ScheduleInstaller"("installerId");

-- Tabela de recorrência (apenas no agendamento mestre)
CREATE TABLE IF NOT EXISTS "ScheduleRecurrence" (
  "id"         TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "scheduleId" TEXT        NOT NULL,
  "type"       TEXT        NOT NULL,
  "interval"   INTEGER     NOT NULL DEFAULT 1,
  "daysOfWeek" TEXT,
  "endDate"    TIMESTAMP(3),
  "count"      INTEGER,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScheduleRecurrence_pkey"          PRIMARY KEY ("id"),
  CONSTRAINT "ScheduleRecurrence_scheduleId_key" UNIQUE ("scheduleId"),
  CONSTRAINT "ScheduleRecurrence_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
