-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Registro" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "localidad" TEXT NOT NULL DEFAULT 'Salta Capital',
    "estado" TEXT NOT NULL DEFAULT 'Activo',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Registro" ("createdAt", "direccion", "estado", "id", "numero", "updatedAt") SELECT "createdAt", "direccion", "estado", "id", "numero", "updatedAt" FROM "Registro";
DROP TABLE "Registro";
ALTER TABLE "new_Registro" RENAME TO "Registro";
CREATE UNIQUE INDEX "Registro_numero_key" ON "Registro"("numero");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
