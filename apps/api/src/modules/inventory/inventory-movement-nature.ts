import { Prisma } from '@prisma/client';
/** Structured destinations/mechanisms classify movement; narrative reasons never prove consumption. */
export const movementNatureSql = Prisma.sql`CASE
    WHEN m.qty <= 0 THEN 'UNCLASSIFIED'
    WHEN m."revertedByMovementId" IS NOT NULL THEN 'REVERTED'
    WHEN m."referenceType" = 'REVERSAL' THEN 'REVERSAL'
    WHEN m."referenceType" = 'CLIENT_SHIPMENT' THEN 'SHIPMENT'
    WHEN m."referenceType" = 'CLIENT_RETURN' THEN 'RETURN'
    WHEN m."referenceType" = 'INTERNAL_TRANSFER' THEN 'TRANSFER'
    WHEN t."isFinalWriteOff" = true THEN 'WRITE_OFF'
    WHEN m."fromLocationId" IS NOT NULL AND m."toLocationId" IS NOT NULL THEN 'TRANSFER'
    WHEN m."fromLocationId" IS NULL AND m."toLocationId" IS NOT NULL THEN 'ENTRY'
    WHEN m."fromLocationId" IS NOT NULL AND m."toLocationId" IS NULL THEN 'EXIT'
    ELSE 'UNCLASSIFIED' END`;
