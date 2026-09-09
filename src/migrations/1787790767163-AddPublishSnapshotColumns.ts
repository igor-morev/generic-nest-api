import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPublishSnapshotColumns1787790767163 implements MigrationInterface {
    name = 'AddPublishSnapshotColumns1787790767163'

    // Hand-trimmed from the migration:generate output — the generator also wanted to drop and
    // recreate the existing FK constraints/indexes on "project"/"page" (same behavior, just
    // TypeORM's default-generated names differ from this repo's hand-written ones), which is
    // unrelated churn on working constraints. Keeping only the actual new columns.
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "page" ADD "publishedLayers" jsonb`);
        await queryRunner.query(`ALTER TABLE "project" ADD "publishedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "project" ADD "publishedTheme" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "project" DROP COLUMN "publishedTheme"`);
        await queryRunner.query(`ALTER TABLE "project" DROP COLUMN "publishedAt"`);
        await queryRunner.query(`ALTER TABLE "page" DROP COLUMN "publishedLayers"`);
    }

}
