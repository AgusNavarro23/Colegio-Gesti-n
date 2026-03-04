-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DeclaracionJurada" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numerodj" TEXT NOT NULL,
    "codigodj" TEXT NOT NULL,
    "fecha_acto" DATETIME NOT NULL,
    "fecha_vto" DATETIME NOT NULL,
    "fecha_pago" DATETIME,
    "anio" INTEGER NOT NULL DEFAULT 2026,
    "aranceltip" REAL NOT NULL,
    "rubroA" REAL NOT NULL,
    "rubroB" REAL NOT NULL,
    "rubroC" REAL NOT NULL,
    "rubroD" REAL NOT NULL,
    "total" REAL NOT NULL,
    "registroId" TEXT NOT NULL,
    "escribanoId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DeclaracionJurada_registroId_fkey" FOREIGN KEY ("registroId") REFERENCES "Registro" ("numero") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DeclaracionJurada_escribanoId_fkey" FOREIGN KEY ("escribanoId") REFERENCES "Escribano" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_DeclaracionJurada" ("aranceltip", "codigodj", "createdAt", "escribanoId", "fecha_acto", "fecha_pago", "fecha_vto", "id", "numerodj", "registroId", "rubroA", "rubroB", "rubroC", "rubroD", "total", "updatedAt") SELECT "aranceltip", "codigodj", "createdAt", "escribanoId", "fecha_acto", "fecha_pago", "fecha_vto", "id", "numerodj", "registroId", "rubroA", "rubroB", "rubroC", "rubroD", "total", "updatedAt" FROM "DeclaracionJurada";
DROP TABLE "DeclaracionJurada";
ALTER TABLE "new_DeclaracionJurada" RENAME TO "DeclaracionJurada";
CREATE UNIQUE INDEX "DeclaracionJurada_numerodj_registroId_anio_key" ON "DeclaracionJurada"("numerodj", "registroId", "anio");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
