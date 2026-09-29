-- New reservations require an explicit manager decision. NULL preserves legacy reservations as approved.
ALTER TABLE "VehicleReservation"
    ADD COLUMN "approvalStatus" TEXT,
    ADD COLUMN "reviewedById" TEXT,
    ADD COLUMN "reviewedAt" TIMESTAMP(3),
    ADD COLUMN "rejectionReason" TEXT;

-- Maintenance references are optional until a manager records the first known service.
ALTER TABLE "Vehicle"
    ADD COLUMN "lastServiceOdometer" INTEGER,
    ADD COLUMN "lastServiceAt" TIMESTAMP(3),
    ADD COLUMN "serviceDueSince" TIMESTAMP(3);

-- Existing uses remain readable; every new checkout is validated by the API with both photos.
ALTER TABLE "VehicleUse"
    ADD COLUMN "vehiclePhotoName" TEXT,
    ADD COLUMN "vehiclePhotoPath" TEXT;

CREATE INDEX "VehicleReservation_approvalStatus_startDate_idx" ON "VehicleReservation"("approvalStatus", "startDate");

ALTER TABLE "VehicleReservation" ADD CONSTRAINT "VehicleReservation_reviewedById_fkey"
    FOREIGN KEY ("reviewedById") REFERENCES "InternalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleReservation" ADD CONSTRAINT "VehicleReservation_approval_status_check"
    CHECK ("approvalStatus" IS NULL OR "approvalStatus" IN ('PENDING', 'APPROVED', 'REJECTED'));
ALTER TABLE "VehicleReservation" ADD CONSTRAINT "VehicleReservation_approval_review_check"
    CHECK (("approvalStatus" IS NULL AND "reviewedById" IS NULL AND "reviewedAt" IS NULL AND "rejectionReason" IS NULL)
        OR ("approvalStatus" = 'PENDING' AND "reviewedById" IS NULL AND "reviewedAt" IS NULL AND "rejectionReason" IS NULL)
        OR ("approvalStatus" = 'APPROVED' AND "reviewedById" IS NOT NULL AND "reviewedAt" IS NOT NULL AND "rejectionReason" IS NULL)
        OR ("approvalStatus" = 'REJECTED' AND "reviewedById" IS NOT NULL AND "reviewedAt" IS NOT NULL AND "rejectionReason" IS NOT NULL));
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_service_odometer_check"
    CHECK ("lastServiceOdometer" IS NULL OR "lastServiceOdometer" >= 0);
ALTER TABLE "VehicleUse" ADD CONSTRAINT "VehicleUse_vehicle_photo_check"
    CHECK (("vehiclePhotoName" IS NULL AND "vehiclePhotoPath" IS NULL) OR ("vehiclePhotoName" IS NOT NULL AND "vehiclePhotoPath" IS NOT NULL));
