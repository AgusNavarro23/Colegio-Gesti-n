-- CreateTable
CREATE TABLE "DeclaracionJurada" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numerodj" TEXT NOT NULL,
    "codigodj" TEXT NOT NULL,
    "fecha_acto" DATETIME NOT NULL,
    "fecha_vto" DATETIME NOT NULL,
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

-- CreateTable
CREATE TABLE "DetalleDeclaracion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "monto" REAL NOT NULL,
    "arancelCalculado" REAL NOT NULL,
    "declaracionJuradaId" TEXT NOT NULL,
    "arancelId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DetalleDeclaracion_declaracionJuradaId_fkey" FOREIGN KEY ("declaracionJuradaId") REFERENCES "DeclaracionJurada" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DetalleDeclaracion_arancelId_fkey" FOREIGN KEY ("arancelId") REFERENCES "Arancel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DeclaracionJurada_numerodj_key" ON "DeclaracionJurada"("numerodj");
