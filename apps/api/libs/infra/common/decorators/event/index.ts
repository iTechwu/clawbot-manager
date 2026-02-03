/**
 * Event Decorators Module Exports
 */

export {
  // Decorators
  EmitEvent,
  EmitEvents,
  // Types
  EmitEventOptions,
  BaseEventPayload,
  // Event Names
  EventNames,
  // Payload Generators
  defaultPayloadGenerator,
  userEventPayloadGenerator,
  cacheInvalidatePayloadGenerator,
  // Metadata Keys
  EMIT_EVENT_METADATA_KEY,
  EMIT_EVENTS_METADATA_KEY,
} from './event.decorator';

export { EventInterceptor } from './event.interceptor';
export { EventDecoratorModule } from './event.module';
export {
  CacheEventHandler,
  CacheInvalidatedPayload,
  UserUpdatedPayload,
} from './handlers/cache-event.handler';
