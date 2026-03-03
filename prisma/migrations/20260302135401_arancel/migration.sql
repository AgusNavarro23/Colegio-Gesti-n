-- CreateTable
CREATE TABLE "Arancel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codigoRenta" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "minimo" REAL NOT NULL,
    "maximo" REAL NOT NULL,
    "porcentaje1" REAL NOT NULL,
    "porcentaje2" REAL NOT NULL,
    "porcentaje3" REAL NOT NULL,
    "adicional" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
