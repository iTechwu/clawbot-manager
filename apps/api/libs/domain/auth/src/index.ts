export * from './auth.module';
export * from './auth.service';
export * from './auth-validation.service';
export * from './auth.guard';
export * from './auth';
export * from './dto/auth.dto';
// RBAC exports
export * from './decorators/rbac.decorator';
export * from './decorators/presets.decorator'; // 新增：预设装饰器
export * from './decorators/resource-owner.decorator'; // 新增：资源所有者装饰器
export * from './guards/streaming-asr-session.guard'; // 新增：流式识别会话守卫
export * from './types/auth.interface';
