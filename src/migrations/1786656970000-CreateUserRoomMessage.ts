import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserRoomMessage1786656970000 implements MigrationInterface {
  name = 'CreateUserRoomMessage1786656970000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE "user" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "username" character varying NOT NULL,
        "firstName" character varying,
        "lastName" character varying,
        "status" character varying NOT NULL DEFAULT 'active',
        "password" character varying NOT NULL,
        "hashedRefreshToken" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_username" UNIQUE ("username")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "room" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "type" character varying NOT NULL DEFAULT 'direct',
        CONSTRAINT "PK_room_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_room_name" UNIQUE ("name")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "message" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "content" text NOT NULL,
        "roomId" uuid NOT NULL,
        "senderId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_message_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_message_room" FOREIGN KEY ("roomId")
          REFERENCES "room"("id"),
        CONSTRAINT "FK_message_sender" FOREIGN KEY ("senderId")
          REFERENCES "user"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "room_users" (
        "roomId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        CONSTRAINT "PK_room_users" PRIMARY KEY ("roomId", "userId"),
        CONSTRAINT "FK_room_users_room" FOREIGN KEY ("roomId")
          REFERENCES "room"("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "FK_room_users_user" FOREIGN KEY ("userId")
          REFERENCES "user"("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_room_users_roomId" ON "room_users" ("roomId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_room_users_userId" ON "room_users" ("userId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "room_users"`);
    await queryRunner.query(`DROP TABLE "message"`);
    await queryRunner.query(`DROP TABLE "room"`);
    await queryRunner.query(`DROP TABLE "user"`);
  }
}
