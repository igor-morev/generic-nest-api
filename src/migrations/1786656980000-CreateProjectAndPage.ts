import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProjectAndPage1786656980000 implements MigrationInterface {
  name = 'CreateProjectAndPage1786656980000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE "project" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "industry" character varying,
        "status" character varying NOT NULL DEFAULT 'draft',
        "theme" jsonb,
        "ownerId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_project_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_project_owner" FOREIGN KEY ("ownerId")
          REFERENCES "user"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_project_ownerId" ON "project" ("ownerId")`,
    );

    await queryRunner.query(`
      CREATE TABLE "page" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "pageName" character varying NOT NULL,
        "layers" jsonb NOT NULL DEFAULT '[]',
        "projectId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_page_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_page_project" FOREIGN KEY ("projectId")
          REFERENCES "project"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_page_projectId" ON "page" ("projectId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "page"`);
    await queryRunner.query(`DROP TABLE "project"`);
  }
}
