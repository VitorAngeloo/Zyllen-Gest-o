CREATE TABLE "VehicleUse" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "checkedOutById" TEXT NOT NULL,
    "checkedOutAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientName" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "odometerOut" INTEGER NOT NULL,
    "fuelOut" TEXT NOT NULL,
    "hadDamageOut" BOOLEAN NOT NULL,
    "checkoutPhotoName" TEXT NOT NULL,
    "checkoutPhotoPath" TEXT NOT NULL,
    "returnedById" TEXT,
    "returnedAt" TIMESTAMP(3),
    "odometerIn" INTEGER,
    "sameDestination" BOOLEAN,
    "returnPhotoName" TEXT,
    "returnPhotoPath" TEXT,
    "lateMinutes" INTEGER,
    CONSTRAINT "VehicleUse_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "VehicleUse_odometer_check" CHECK ("odometerOut" >= 0 AND ("odometerIn" IS NULL OR "odometerIn" >= "odometerOut")),
    CONSTRAINT "VehicleUse_return_check" CHECK (("returnedAt" IS NULL AND "odometerIn" IS NULL AND "sameDestination" IS NULL AND "returnPhotoName" IS NULL AND "returnPhotoPath" IS NULL AND "lateMinutes" IS NULL AND "returnedById" IS NULL) OR ("returnedAt" IS NOT NULL AND "odometerIn" IS NOT NULL AND "sameDestination" IS NOT NULL AND "returnPhotoName" IS NOT NULL AND "returnPhotoPath" IS NOT NULL AND "lateMinutes" IS NOT NULL AND "returnedById" IS NOT NULL))
);

CREATE UNIQUE INDEX "VehicleUse_reservationId_key" ON "VehicleUse"("reservationId");
CREATE UNIQUE INDEX "VehicleUse_one_active_per_vehicle" ON "VehicleUse"("vehicleId") WHERE "returnedAt" IS NULL;
CREATE INDEX "VehicleUse_vehicleId_returnedAt_idx" ON "VehicleUse"("vehicleId", "returnedAt");
CREATE INDEX "VehicleUse_driverId_checkedOutAt_idx" ON "VehicleUse"("driverId", "checkedOutAt");
ALTER TABLE "VehicleUse" ADD CONSTRAINT "VehicleUse_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "VehicleReservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleUse" ADD CONSTRAINT "VehicleUse_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleUse" ADD CONSTRAINT "VehicleUse_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "InternalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleUse" ADD CONSTRAINT "VehicleUse_checkedOutById_fkey" FOREIGN KEY ("checkedOutById") REFERENCES "InternalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleUse" ADD CONSTRAINT "VehicleUse_returnedById_fkey" FOREIGN KEY ("returnedById") REFERENCES "InternalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleUse" ENABLE ROW LEVEL SECURITY;

-- Internos may perform the complete vehicle flow without gaining schedule management.
INSERT INTO "RolePermission" ("id", "roleId", "screenPermissionId")
SELECT gen_random_uuid()::text, r."id", p."id"
FROM "Role" r JOIN "ScreenPermission" p ON p."screen" = 'vehicles' AND p."action" IN ('view', 'reserve')
WHERE r."name" = 'Internos'
ON CONFLICT ("roleId", "screenPermissionId") DO NOTHING;
