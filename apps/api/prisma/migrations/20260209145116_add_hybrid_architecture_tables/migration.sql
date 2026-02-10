-- AlterTable
ALTER TABLE "b_model_pricing" ADD COLUMN     "cache_read_price" DECIMAL(10,6),
ADD COLUMN     "cache_write_price" DECIMAL(10,6),
ADD COLUMN     "coding_score" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "context_length" INTEGER NOT NULL DEFAULT 128,
ADD COLUMN     "creativity_score" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "deprecation_date" TIMESTAMPTZ(6),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "is_deprecated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "reasoning_score" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "recommended_scenarios" JSONB,
ADD COLUMN     "speed_score" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "supports_cache_control" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "supports_extended_thinking" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "supports_function_calling" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "supports_streaming" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "supports_vision" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "thinking_price" DECIMAL(10,6);

-- AlterTable
ALTER TABLE "b_usage_log" ADD COLUMN     "cache_cost" DECIMAL(10,6),
ADD COLUMN     "cache_read_tokens" INTEGER,
ADD COLUMN     "cache_write_tokens" INTEGER,
ADD COLUMN     "fallback_level" INTEGER,
ADD COLUMN     "fallback_used" BOOLEAN,
ADD COLUMN     "input_cost" DECIMAL(10,6),
ADD COLUMN     "original_model" VARCHAR(100),
ADD COLUMN     "output_cost" DECIMAL(10,6),
ADD COLUMN     "protocol_type" VARCHAR(50),
ADD COLUMN     "thinking_cost" DECIMAL(10,6),
ADD COLUMN     "thinking_tokens" INTEGER,
ADD COLUMN     "total_cost" DECIMAL(10,6);

-- CreateTable
CREATE TABLE "b_capability_tag" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tag_id" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(50) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "required_protocol" VARCHAR(50),
    "required_skills" JSONB,
    "required_models" JSONB,
    "requires_extended_thinking" BOOLEAN NOT NULL DEFAULT false,
    "requires_cache_control" BOOLEAN NOT NULL DEFAULT false,
    "requires_vision" BOOLEAN NOT NULL DEFAULT false,
    "max_cost_per_m_token" DECIMAL(10,6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_builtin" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "b_capability_tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b_fallback_chain" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "chain_id" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "models" JSONB NOT NULL,
    "trigger_status_codes" JSONB NOT NULL DEFAULT '[429, 500, 502, 503, 504]',
    "trigger_error_types" JSONB NOT NULL DEFAULT '["rate_limit", "overloaded", "timeout"]',
    "trigger_timeout_ms" INTEGER NOT NULL DEFAULT 60000,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "retry_delay_ms" INTEGER NOT NULL DEFAULT 2000,
    "preserve_protocol" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_builtin" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "b_fallback_chain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b_cost_strategy" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "strategy_id" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "cost_weight" DECIMAL(3,2) NOT NULL DEFAULT 0.5,
    "performance_weight" DECIMAL(3,2) NOT NULL DEFAULT 0.3,
    "capability_weight" DECIMAL(3,2) NOT NULL DEFAULT 0.2,
    "max_cost_per_request" DECIMAL(10,6),
    "max_latency_ms" INTEGER,
    "min_capability_score" INTEGER,
    "scenario_weights" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_builtin" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "b_cost_strategy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b_bot_routing_config" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "bot_id" UUID NOT NULL,
    "routing_enabled" BOOLEAN NOT NULL DEFAULT true,
    "routing_mode" VARCHAR(20) NOT NULL DEFAULT 'auto',
    "fallback_enabled" BOOLEAN NOT NULL DEFAULT true,
    "fallback_chain_id" VARCHAR(50),
    "cost_control_enabled" BOOLEAN NOT NULL DEFAULT false,
    "cost_strategy_id" VARCHAR(50),
    "daily_budget" DECIMAL(10,2),
    "monthly_budget" DECIMAL(10,2),
    "alert_threshold" DECIMAL(3,2) DEFAULT 0.8,
    "auto_downgrade" BOOLEAN NOT NULL DEFAULT false,
    "downgrade_model" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "b_bot_routing_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "b_capability_tag_tag_id_key" ON "b_capability_tag"("tag_id");

-- CreateIndex
CREATE INDEX "b_capability_tag_category_idx" ON "b_capability_tag"("category");

-- CreateIndex
CREATE INDEX "b_capability_tag_is_active_idx" ON "b_capability_tag"("is_active");

-- CreateIndex
CREATE INDEX "b_capability_tag_is_builtin_idx" ON "b_capability_tag"("is_builtin");

-- CreateIndex
CREATE INDEX "b_capability_tag_is_deleted_idx" ON "b_capability_tag"("is_deleted");

-- CreateIndex
CREATE UNIQUE INDEX "b_fallback_chain_chain_id_key" ON "b_fallback_chain"("chain_id");

-- CreateIndex
CREATE INDEX "b_fallback_chain_is_active_idx" ON "b_fallback_chain"("is_active");

-- CreateIndex
CREATE INDEX "b_fallback_chain_is_builtin_idx" ON "b_fallback_chain"("is_builtin");

-- CreateIndex
CREATE INDEX "b_fallback_chain_is_deleted_idx" ON "b_fallback_chain"("is_deleted");

-- CreateIndex
CREATE UNIQUE INDEX "b_cost_strategy_strategy_id_key" ON "b_cost_strategy"("strategy_id");

-- CreateIndex
CREATE INDEX "b_cost_strategy_is_active_idx" ON "b_cost_strategy"("is_active");

-- CreateIndex
CREATE INDEX "b_cost_strategy_is_builtin_idx" ON "b_cost_strategy"("is_builtin");

-- CreateIndex
CREATE INDEX "b_cost_strategy_is_deleted_idx" ON "b_cost_strategy"("is_deleted");

-- CreateIndex
CREATE UNIQUE INDEX "b_bot_routing_config_bot_id_key" ON "b_bot_routing_config"("bot_id");

-- CreateIndex
CREATE INDEX "b_bot_routing_config_bot_id_idx" ON "b_bot_routing_config"("bot_id");

-- CreateIndex
CREATE INDEX "b_bot_routing_config_routing_enabled_idx" ON "b_bot_routing_config"("routing_enabled");

-- CreateIndex
CREATE INDEX "b_bot_routing_config_cost_control_enabled_idx" ON "b_bot_routing_config"("cost_control_enabled");

-- CreateIndex
CREATE INDEX "b_model_pricing_is_deprecated_idx" ON "b_model_pricing"("is_deprecated");

-- CreateIndex
CREATE INDEX "b_model_pricing_supports_extended_thinking_idx" ON "b_model_pricing"("supports_extended_thinking");

-- CreateIndex
CREATE INDEX "b_model_pricing_supports_cache_control_idx" ON "b_model_pricing"("supports_cache_control");

-- CreateIndex
CREATE INDEX "b_usage_log_protocol_type_idx" ON "b_usage_log"("protocol_type");

-- CreateIndex
CREATE INDEX "b_usage_log_fallback_used_idx" ON "b_usage_log"("fallback_used");

-- AddForeignKey
ALTER TABLE "b_bot_routing_config" ADD CONSTRAINT "b_bot_routing_config_bot_id_fkey" FOREIGN KEY ("bot_id") REFERENCES "b_bot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
