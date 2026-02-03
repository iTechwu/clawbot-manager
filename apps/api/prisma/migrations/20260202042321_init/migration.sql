-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateEnum
CREATE TYPE "sex_type" AS ENUM ('UNKNOWN', 'MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "task_type" AS ENUM ('SMS', 'EMAIL', 'PUSH');

-- CreateEnum
CREATE TYPE "task_status" AS ENUM ('SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "file_bucket_vendor" AS ENUM ('oss', 'us3', 'qiniu', 's3', 'gcs', 'tos', 'tencent', 'ksyun');

-- CreateEnum
CREATE TYPE "file_env_type" AS ENUM ('dev', 'test', 'prod', 'produs', 'prodap');

-- CreateEnum
CREATE TYPE "bot_status" AS ENUM ('created', 'starting', 'running', 'stopped', 'error');

-- CreateTable
CREATE TABLE "u_user_info" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "nickname" VARCHAR(255) NOT NULL DEFAULT '',
    "code" VARCHAR(255),
    "avatar_file_id" UUID,
    "sex" "sex_type" NOT NULL DEFAULT 'UNKNOWN',
    "locale" VARCHAR(20),
    "is_anonymity" BOOLEAN NOT NULL DEFAULT false,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    "device_id" VARCHAR(255),
    "wechat_openid" VARCHAR(255),
    "wechat_union_id" VARCHAR(255),
    "google_sub" VARCHAR(255),
    "discord_id" VARCHAR(255),
    "mobile" VARCHAR(40),
    "email" VARCHAR(255),

    CONSTRAINT "u_user_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "u_wechat_auth" (
    "openid" VARCHAR(255) NOT NULL,
    "session_key" TEXT,
    "refresh_token" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6)
);

-- CreateTable
CREATE TABLE "u_google_auth" (
    "sub" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "verified_email" BOOLEAN NOT NULL DEFAULT true,
    "at_hash" VARCHAR(255),
    "name" VARCHAR(255),
    "picture" TEXT,
    "given_name" VARCHAR(255),
    "family_name" VARCHAR(255),
    "exp" INTEGER NOT NULL,
    "iat" INTEGER NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6)
);

-- CreateTable
CREATE TABLE "u_discord_auth" (
    "discord_id" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "verified_email" BOOLEAN NOT NULL DEFAULT true,
    "name" VARCHAR(255),
    "access_token" TEXT,
    "refresh_token" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6)
);

-- CreateTable
CREATE TABLE "u_mobile_auth" (
    "mobile" VARCHAR(40) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6)
);

-- CreateTable
CREATE TABLE "u_email_auth" (
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6)
);

-- CreateTable
CREATE TABLE "risk_detection_record" (
    "id" VARCHAR(255) NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "data" JSONB,
    "status" INTEGER NOT NULL DEFAULT 0,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "risk_detection_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_task_queue" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "task_type" "task_type" NOT NULL,
    "status" "task_status" NOT NULL,
    "recipient" VARCHAR(255) NOT NULL,
    "template_code" VARCHAR(100),
    "template_data" JSONB,
    "content" TEXT,
    "subject" VARCHAR(500),
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "processed_at" TIMESTAMPTZ(6) NOT NULL,
    "error_message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "system_task_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "f_file_source" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "is_uploaded" BOOLEAN NOT NULL DEFAULT false,
    "bucket" VARCHAR(255) NOT NULL,
    "key" UUID NOT NULL,
    "hash" VARCHAR(255),
    "thumb_img" VARCHAR(255),
    "fsize" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mime_type" VARCHAR(255) NOT NULL DEFAULT '',
    "type" INTEGER NOT NULL DEFAULT 0,
    "end_user" VARCHAR(255),
    "status" INTEGER NOT NULL DEFAULT 0,
    "sha256" VARCHAR(255),
    "parts" INTEGER[],
    "ext" VARCHAR(255) NOT NULL DEFAULT '',
    "expire_at" TIMESTAMPTZ(6),
    "transition_to_ia_at" TIMESTAMPTZ(6),
    "transition_to_archive_at" TIMESTAMPTZ(6),
    "transition_to_deep_archive_at" TIMESTAMPTZ(6),
    "transition_to_archive_ir_at" TIMESTAMPTZ(6),
    "env" "file_env_type" NOT NULL DEFAULT 'prod',
    "vendor" "file_bucket_vendor" NOT NULL DEFAULT 'us3',
    "region" TEXT NOT NULL DEFAULT 'cn-beijing',
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "f_file_source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "country_code" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "continent" VARCHAR(10) NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "country_code_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b_bot" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "hostname" VARCHAR(64) NOT NULL,
    "ai_provider" VARCHAR(50) NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "channel_type" VARCHAR(50) NOT NULL,
    "container_id" VARCHAR(255),
    "port" INTEGER,
    "gateway_token" VARCHAR(255),
    "tags" TEXT[],
    "status" "bot_status" NOT NULL DEFAULT 'created',
    "created_by_id" UUID NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "b_bot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b_provider_key" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "vendor" VARCHAR(50) NOT NULL,
    "secret_encrypted" BYTEA NOT NULL,
    "label" VARCHAR(255),
    "tag" VARCHAR(100),
    "created_by_id" UUID NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "b_provider_key_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b_bot_provider_key" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "bot_id" UUID NOT NULL,
    "provider_key_id" UUID NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "b_bot_provider_key_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b_usage_log" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "bot_id" UUID NOT NULL,
    "vendor" VARCHAR(50) NOT NULL,
    "provider_key_id" UUID,
    "status_code" INTEGER,
    "request_tokens" INTEGER,
    "response_tokens" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "b_usage_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255),
    "content" JSONB NOT NULL,
    "sender_id" UUID,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_recipient" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "message_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "message_recipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "u_user_info_code_key" ON "u_user_info"("code");

-- CreateIndex
CREATE UNIQUE INDEX "u_user_info_device_id_key" ON "u_user_info"("device_id");

-- CreateIndex
CREATE UNIQUE INDEX "u_user_info_wechat_openid_key" ON "u_user_info"("wechat_openid");

-- CreateIndex
CREATE UNIQUE INDEX "u_user_info_wechat_union_id_key" ON "u_user_info"("wechat_union_id");

-- CreateIndex
CREATE UNIQUE INDEX "u_user_info_google_sub_key" ON "u_user_info"("google_sub");

-- CreateIndex
CREATE UNIQUE INDEX "u_user_info_discord_id_key" ON "u_user_info"("discord_id");

-- CreateIndex
CREATE UNIQUE INDEX "u_user_info_mobile_key" ON "u_user_info"("mobile");

-- CreateIndex
CREATE UNIQUE INDEX "u_user_info_email_key" ON "u_user_info"("email");

-- CreateIndex
CREATE INDEX "u_user_info_code_idx" ON "u_user_info"("code");

-- CreateIndex
CREATE INDEX "u_user_info_is_deleted_is_admin_idx" ON "u_user_info"("is_deleted", "is_admin");

-- CreateIndex
CREATE INDEX "u_user_info_created_at_idx" ON "u_user_info"("created_at" DESC);

-- CreateIndex
CREATE INDEX "u_user_info_nickname_idx" ON "u_user_info"("nickname");

-- CreateIndex
CREATE INDEX "u_user_info_avatar_file_id_idx" ON "u_user_info"("avatar_file_id");

-- CreateIndex
CREATE INDEX "u_user_info_device_id_idx" ON "u_user_info"("device_id");

-- CreateIndex
CREATE INDEX "u_user_info_wechat_openid_idx" ON "u_user_info"("wechat_openid");

-- CreateIndex
CREATE INDEX "u_user_info_google_sub_idx" ON "u_user_info"("google_sub");

-- CreateIndex
CREATE INDEX "u_user_info_discord_id_idx" ON "u_user_info"("discord_id");

-- CreateIndex
CREATE INDEX "u_user_info_mobile_idx" ON "u_user_info"("mobile");

-- CreateIndex
CREATE INDEX "u_user_info_email_idx" ON "u_user_info"("email");

-- CreateIndex
CREATE UNIQUE INDEX "u_wechat_auth_openid_key" ON "u_wechat_auth"("openid");

-- CreateIndex
CREATE INDEX "u_wechat_auth_openid_idx" ON "u_wechat_auth"("openid");

-- CreateIndex
CREATE UNIQUE INDEX "u_google_auth_sub_key" ON "u_google_auth"("sub");

-- CreateIndex
CREATE INDEX "u_google_auth_sub_idx" ON "u_google_auth"("sub");

-- CreateIndex
CREATE INDEX "u_google_auth_email_idx" ON "u_google_auth"("email");

-- CreateIndex
CREATE UNIQUE INDEX "u_discord_auth_discord_id_key" ON "u_discord_auth"("discord_id");

-- CreateIndex
CREATE INDEX "u_discord_auth_discord_id_idx" ON "u_discord_auth"("discord_id");

-- CreateIndex
CREATE INDEX "u_discord_auth_email_idx" ON "u_discord_auth"("email");

-- CreateIndex
CREATE UNIQUE INDEX "u_mobile_auth_mobile_key" ON "u_mobile_auth"("mobile");

-- CreateIndex
CREATE INDEX "u_mobile_auth_mobile_idx" ON "u_mobile_auth"("mobile");

-- CreateIndex
CREATE UNIQUE INDEX "u_email_auth_email_key" ON "u_email_auth"("email");

-- CreateIndex
CREATE INDEX "u_email_auth_email_idx" ON "u_email_auth"("email");

-- CreateIndex
CREATE INDEX "risk_detection_record_action_idx" ON "risk_detection_record"("action");

-- CreateIndex
CREATE INDEX "risk_detection_record_status_idx" ON "risk_detection_record"("status");

-- CreateIndex
CREATE INDEX "risk_detection_record_created_at_idx" ON "risk_detection_record"("created_at" DESC);

-- CreateIndex
CREATE INDEX "system_task_queue_task_type_status_idx" ON "system_task_queue"("task_type", "status");

-- CreateIndex
CREATE INDEX "system_task_queue_recipient_created_at_idx" ON "system_task_queue"("recipient", "created_at" DESC);

-- CreateIndex
CREATE INDEX "system_task_queue_created_at_idx" ON "system_task_queue"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "f_file_source_key_key" ON "f_file_source"("key");

-- CreateIndex
CREATE INDEX "f_file_source_fsize_sha256_idx" ON "f_file_source"("fsize", "sha256");

-- CreateIndex
CREATE INDEX "f_file_source_is_deleted_idx" ON "f_file_source"("is_deleted");

-- CreateIndex
CREATE INDEX "f_file_source_is_uploaded_idx" ON "f_file_source"("is_uploaded");

-- CreateIndex
CREATE INDEX "f_file_source_bucket_idx" ON "f_file_source"("bucket");

-- CreateIndex
CREATE INDEX "f_file_source_key_idx" ON "f_file_source"("key");

-- CreateIndex
CREATE INDEX "country_code_continent_idx" ON "country_code"("continent");

-- CreateIndex
CREATE INDEX "country_code_code_idx" ON "country_code"("code");

-- CreateIndex
CREATE UNIQUE INDEX "country_code_continent_code_key" ON "country_code"("continent", "code");

-- CreateIndex
CREATE UNIQUE INDEX "b_bot_hostname_key" ON "b_bot"("hostname");

-- CreateIndex
CREATE INDEX "b_bot_status_idx" ON "b_bot"("status");

-- CreateIndex
CREATE INDEX "b_bot_hostname_idx" ON "b_bot"("hostname");

-- CreateIndex
CREATE INDEX "b_bot_created_by_id_idx" ON "b_bot"("created_by_id");

-- CreateIndex
CREATE INDEX "b_bot_is_deleted_idx" ON "b_bot"("is_deleted");

-- CreateIndex
CREATE INDEX "b_provider_key_vendor_idx" ON "b_provider_key"("vendor");

-- CreateIndex
CREATE INDEX "b_provider_key_tag_idx" ON "b_provider_key"("tag");

-- CreateIndex
CREATE INDEX "b_provider_key_created_by_id_idx" ON "b_provider_key"("created_by_id");

-- CreateIndex
CREATE INDEX "b_provider_key_is_deleted_idx" ON "b_provider_key"("is_deleted");

-- CreateIndex
CREATE UNIQUE INDEX "b_bot_provider_key_bot_id_provider_key_id_key" ON "b_bot_provider_key"("bot_id", "provider_key_id");

-- CreateIndex
CREATE INDEX "b_usage_log_bot_id_idx" ON "b_usage_log"("bot_id");

-- CreateIndex
CREATE INDEX "b_usage_log_created_at_idx" ON "b_usage_log"("created_at");

-- CreateIndex
CREATE INDEX "b_usage_log_vendor_idx" ON "b_usage_log"("vendor");

-- CreateIndex
CREATE INDEX "message_type_idx" ON "message"("type");

-- CreateIndex
CREATE INDEX "message_sender_id_idx" ON "message"("sender_id");

-- CreateIndex
CREATE INDEX "message_created_at_idx" ON "message"("created_at");

-- CreateIndex
CREATE INDEX "message_is_deleted_idx" ON "message"("is_deleted");

-- CreateIndex
CREATE INDEX "message_recipient_user_id_is_read_idx" ON "message_recipient"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "message_recipient_message_id_idx" ON "message_recipient"("message_id");

-- CreateIndex
CREATE INDEX "message_recipient_is_deleted_idx" ON "message_recipient"("is_deleted");

-- CreateIndex
CREATE INDEX "message_recipient_user_id_is_read_is_deleted_idx" ON "message_recipient"("user_id", "is_read", "is_deleted");

-- CreateIndex
CREATE UNIQUE INDEX "message_recipient_message_id_user_id_key" ON "message_recipient"("message_id", "user_id");

-- AddForeignKey
ALTER TABLE "u_user_info" ADD CONSTRAINT "u_user_info_avatar_file_id_fkey" FOREIGN KEY ("avatar_file_id") REFERENCES "f_file_source"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "u_wechat_auth" ADD CONSTRAINT "u_wechat_auth_openid_fkey" FOREIGN KEY ("openid") REFERENCES "u_user_info"("wechat_openid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "u_google_auth" ADD CONSTRAINT "u_google_auth_sub_fkey" FOREIGN KEY ("sub") REFERENCES "u_user_info"("google_sub") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "u_discord_auth" ADD CONSTRAINT "u_discord_auth_discord_id_fkey" FOREIGN KEY ("discord_id") REFERENCES "u_user_info"("discord_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "u_mobile_auth" ADD CONSTRAINT "u_mobile_auth_mobile_fkey" FOREIGN KEY ("mobile") REFERENCES "u_user_info"("mobile") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "u_email_auth" ADD CONSTRAINT "u_email_auth_email_fkey" FOREIGN KEY ("email") REFERENCES "u_user_info"("email") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b_bot" ADD CONSTRAINT "b_bot_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "u_user_info"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b_provider_key" ADD CONSTRAINT "b_provider_key_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "u_user_info"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b_bot_provider_key" ADD CONSTRAINT "b_bot_provider_key_bot_id_fkey" FOREIGN KEY ("bot_id") REFERENCES "b_bot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b_bot_provider_key" ADD CONSTRAINT "b_bot_provider_key_provider_key_id_fkey" FOREIGN KEY ("provider_key_id") REFERENCES "b_provider_key"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b_usage_log" ADD CONSTRAINT "b_usage_log_bot_id_fkey" FOREIGN KEY ("bot_id") REFERENCES "b_bot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b_usage_log" ADD CONSTRAINT "b_usage_log_provider_key_id_fkey" FOREIGN KEY ("provider_key_id") REFERENCES "b_provider_key"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "u_user_info"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_recipient" ADD CONSTRAINT "message_recipient_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_recipient" ADD CONSTRAINT "message_recipient_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "u_user_info"("id") ON DELETE CASCADE ON UPDATE CASCADE;
