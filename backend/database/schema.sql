-- QuotePro database — plain MySQL 8 version of prisma/schema.prisma.
-- You normally don't run this yourself: `npx prisma migrate dev` creates the
-- same tables. It's here for reference and for tools like phpMyAdmin,
-- MySQL Workbench or HeidiSQL.
--
-- To use it directly:  CREATE DATABASE quotepro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--                      USE quotepro;  then run this file.

CREATE TABLE `users` (
    `id`                 VARCHAR(30)  NOT NULL,
    `email`              VARCHAR(191) NOT NULL,
    `name`               VARCHAR(100) NOT NULL,
    `passwordHash`       VARCHAR(100) NOT NULL,
    `role`               ENUM('admin', 'staff') NOT NULL DEFAULT 'admin',
    `mustChangePassword` BOOLEAN      NOT NULL DEFAULT false,
    `createdAt`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`          DATETIME(3)  NOT NULL,
    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `clients` (
    `id`          VARCHAR(30)  NOT NULL,
    `companyName` VARCHAR(200) NOT NULL,
    `contactName` VARCHAR(200) NOT NULL,
    `email`       VARCHAR(191) NOT NULL,
    `phone`       VARCHAR(40)  NOT NULL DEFAULT '',
    `address`     VARCHAR(500) NOT NULL DEFAULT '',
    `city`        VARCHAR(100) NOT NULL DEFAULT '',
    `taxId`       VARCHAR(50)  NULL,
    `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`   DATETIME(3)  NOT NULL,
    INDEX `clients_companyName_idx`(`companyName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `quotations` (
    `id`                VARCHAR(30)   NOT NULL,
    `quoteNumber`       VARCHAR(30)   NOT NULL,
    `status`            ENUM('draft', 'pending', 'approved', 'rejected', 'expired') NOT NULL DEFAULT 'draft',
    `clientId`          VARCHAR(30)   NULL,
    `clientCompanyName` VARCHAR(200)  NOT NULL,
    `clientContactName` VARCHAR(200)  NOT NULL,
    `clientEmail`       VARCHAR(191)  NOT NULL,
    `clientPhone`       VARCHAR(40)   NOT NULL DEFAULT '',
    `clientAddress`     VARCHAR(500)  NOT NULL DEFAULT '',
    `clientCity`        VARCHAR(100)  NOT NULL DEFAULT '',
    `clientTaxId`       VARCHAR(50)   NULL,
    `issueDate`         DATE          NOT NULL,
    `validUntil`        DATE          NOT NULL,
    `validityDays`      INTEGER       NOT NULL,
    `discountType`      ENUM('percentage', 'fixed') NOT NULL DEFAULT 'percentage',
    `discountValue`     DECIMAL(14,2) NOT NULL DEFAULT 0,
    `vatEnabled`        BOOLEAN       NOT NULL DEFAULT true,
    `vatRate`           DECIMAL(5,2)  NOT NULL DEFAULT 18,
    `ssclEnabled`       BOOLEAN       NOT NULL DEFAULT true,
    `ssclRate`          DECIMAL(5,2)  NOT NULL DEFAULT 2.5,
    `subtotal`          DECIMAL(14,2) NOT NULL,
    `discountAmount`    DECIMAL(14,2) NOT NULL,
    `netAmount`         DECIMAL(14,2) NOT NULL,
    `ssclAmount`        DECIMAL(14,2) NOT NULL,
    `vatAmount`         DECIMAL(14,2) NOT NULL,
    `grandTotal`        DECIMAL(14,2) NOT NULL,
    `notes`             TEXT          NOT NULL,
    `createdById`       VARCHAR(30)   NULL,
    `createdAt`         DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`         DATETIME(3)   NOT NULL,
    UNIQUE INDEX `quotations_quoteNumber_key`(`quoteNumber`),
    INDEX `quotations_status_idx`(`status`),
    INDEX `quotations_issueDate_idx`(`issueDate`),
    INDEX `quotations_clientId_idx`(`clientId`),
    INDEX `quotations_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `quotation_items` (
    `id`          VARCHAR(30)   NOT NULL,
    `quotationId` VARCHAR(30)   NOT NULL,
    `position`    INTEGER       NOT NULL,
    `description` VARCHAR(1000) NOT NULL,
    `quantity`    DECIMAL(12,3) NOT NULL,
    `unitPrice`   DECIMAL(14,2) NOT NULL,
    `lineTotal`   DECIMAL(14,2) NOT NULL,
    `imageUrl`    MEDIUMTEXT    NULL,
    INDEX `quotation_items_quotationId_position_idx`(`quotationId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `invoices` (
    `id`            VARCHAR(30)   NOT NULL,
    `invoiceNumber` VARCHAR(30)   NOT NULL,
    `quotationId`   VARCHAR(30)   NOT NULL,
    `clientId`      VARCHAR(30)   NULL,
    `clientName`    VARCHAR(200)  NOT NULL,
    `amount`        DECIMAL(14,2) NOT NULL,
    `status`        ENUM('paid', 'unpaid') NOT NULL DEFAULT 'unpaid',
    `issueDate`     DATE          NOT NULL,
    `dueDate`       DATE          NOT NULL,
    `paidAt`        DATETIME(3)   NULL,
    `createdAt`     DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`     DATETIME(3)   NOT NULL,
    UNIQUE INDEX `invoices_invoiceNumber_key`(`invoiceNumber`),
    INDEX `invoices_status_idx`(`status`),
    INDEX `invoices_quotationId_idx`(`quotationId`),
    INDEX `invoices_clientId_idx`(`clientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `settings` (
    `id`                INTEGER      NOT NULL DEFAULT 1,
    `companyName`       VARCHAR(200) NOT NULL DEFAULT 'My Company (Pvt) Ltd',
    `companyLogo`       MEDIUMTEXT   NULL,
    `companyAddress`    VARCHAR(500) NOT NULL DEFAULT '',
    `companyPhone`      VARCHAR(40)  NOT NULL DEFAULT '',
    `companyEmail`      VARCHAR(191) NOT NULL DEFAULT '',
    `companyWebsite`    VARCHAR(200) NOT NULL DEFAULT '',
    `companyTin`        VARCHAR(50)  NOT NULL DEFAULT '',
    `companyVatRegNo`   VARCHAR(50)  NOT NULL DEFAULT '',
    `vatEnabled`        BOOLEAN      NOT NULL DEFAULT true,
    `vatRate`           DECIMAL(5,2) NOT NULL DEFAULT 18,
    `ssclEnabled`       BOOLEAN      NOT NULL DEFAULT true,
    `ssclRate`          DECIMAL(5,2) NOT NULL DEFAULT 2.5,
    `quotePrefix`       VARCHAR(10)  NOT NULL DEFAULT 'QT',
    `quoteValidityDays` INTEGER      NOT NULL DEFAULT 14,
    `quoteNotes`        TEXT         NOT NULL,
    `updatedAt`         DATETIME(3)  NOT NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `document_sequences` (
    `key`  VARCHAR(30) NOT NULL,
    `last` INTEGER     NOT NULL DEFAULT 0,
    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Foreign keys
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_clientId_fkey`
    FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_createdById_fkey`
    FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `quotation_items` ADD CONSTRAINT `quotation_items_quotationId_fkey`
    FOREIGN KEY (`quotationId`) REFERENCES `quotations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_quotationId_fkey`
    FOREIGN KEY (`quotationId`) REFERENCES `quotations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_clientId_fkey`
    FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
