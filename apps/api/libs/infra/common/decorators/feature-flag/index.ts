/**
 * Feature Flag Module Exports
 */

export {
    // Decorators
    FeatureEnabled,
    FeatureFlags,
    IfFeatureEnabled,
    BetaFeature,
    GradualRollout,
    // Constants
    FEATURE_FLAG_METADATA_KEY,
    FEATURE_FLAGS_METADATA_KEY,
    // Types
    FeatureFlagStrategy,
    FeatureFlagOptions,
    FeatureFlagContext,
} from './feature-flag.decorator';

export {
    FeatureFlagService,
    FeatureFlagProvider,
    FeatureFlagConfig,
} from './feature-flag.service';

export { FeatureFlagInterceptor } from './feature-flag.interceptor';
export { FeatureFlagModule } from './feature-flag.module';
