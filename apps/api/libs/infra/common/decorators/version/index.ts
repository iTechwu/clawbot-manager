/**
 * Version Decorators Module Exports
 */

export {
  // Decorators
  ApiVersion,
  VersionNeutral,
  DeprecatedVersion,
  // Constants
  API_VERSION_HEADER,
  DEFAULT_API_VERSION,
  VERSION_METADATA_KEY,
  SUPPORTED_VERSIONS,
  // Types
  SupportedVersion,
  // Utilities
  isSupportedVersion,
  getVersionFromRequest,
  compareVersions,
} from './version.decorator';

export { VersionInterceptor } from './version.interceptor';
export { VersionDecoratorModule } from './version.module';
