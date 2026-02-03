# @repo/utils - 工具函数库

前端共享工具函数库。

## 安装

```json
{
  "dependencies": {
    "@repo/utils": "workspace:*"
  }
}
```

## 使用

```typescript
import { cn, formatDate, encrypt } from '@repo/utils';
```

## 可用工具

### cn - 类名合并

合并 Tailwind CSS 类名，处理冲突：

```typescript
import { cn } from '@repo/utils';

cn('px-2 py-1', 'px-4');
// => 'py-1 px-4'

cn('text-red-500', condition && 'text-blue-500');
// => 条件为真时 'text-blue-500'，否则 'text-red-500'
```

### 数组工具 (array.util.ts)

```typescript
import { chunk, unique, groupBy } from '@repo/utils';

chunk([1, 2, 3, 4, 5], 2);    // [[1, 2], [3, 4], [5]]
unique([1, 2, 2, 3]);          // [1, 2, 3]
```

### 加密工具 (encrypt.ts)

```typescript
import { encrypt, decrypt, hash } from '@repo/utils';

const encrypted = encrypt(data, key);
const decrypted = decrypt(encrypted, key);
```

### HTTP 请求 (fetch.ts)

```typescript
import { fetchWithTimeout, retryFetch } from '@repo/utils';

const response = await fetchWithTimeout(url, { timeout: 5000 });
```

### 文件处理 (file.ts)

```typescript
import { formatFileSize, getFileExtension } from '@repo/utils';

formatFileSize(1024);           // '1 KB'
getFileExtension('doc.pdf');    // 'pdf'
```

### HTTP 头处理 (headers.ts)

```typescript
import { parseHeaders, getContentType } from '@repo/utils';
```

### JSON 工具 (json.util.ts)

```typescript
import { safeJsonParse, safeJsonStringify } from '@repo/utils';

safeJsonParse('{"a":1}');       // { a: 1 }
safeJsonParse('invalid');       // null (不抛错)
```

### 对象工具 (object.util.ts)

```typescript
import { pick, omit, deepClone } from '@repo/utils';

pick({ a: 1, b: 2 }, ['a']);    // { a: 1 }
omit({ a: 1, b: 2 }, ['a']);    // { b: 2 }
```

### 字符串工具 (string.util.ts)

```typescript
import { truncate, capitalize, slugify } from '@repo/utils';

truncate('hello world', 5);     // 'hello...'
capitalize('hello');            // 'Hello'
slugify('Hello World');         // 'hello-world'
```

### 定时器工具 (timer.util.ts)

```typescript
import { debounce, throttle, sleep } from '@repo/utils';

const debouncedFn = debounce(fn, 300);
const throttledFn = throttle(fn, 100);
await sleep(1000);
```

### URL 编码 (urlencode.util.ts)

```typescript
import { encodeQueryParams, parseQueryString } from '@repo/utils';

encodeQueryParams({ a: 1, b: 2 });  // 'a=1&b=2'
parseQueryString('a=1&b=2');        // { a: '1', b: '2' }
```

### 验证工具 (validate.util.ts)

```typescript
import { isEmail, isUrl, isPhone } from '@repo/utils';

isEmail('test@example.com');    // true
isUrl('https://example.com');   // true
```

### BigInt 序列化 (bigint.util.ts)

```typescript
import { serialize } from '@repo/utils';

// 安全序列化包含 BigInt 的对象
serialize({ id: BigInt(123) });
```

### Bcrypt 工具 (bcrypt.util.ts)

```typescript
import { hashPassword, comparePassword } from '@repo/utils';

const hashed = await hashPassword('password');
const match = await comparePassword('password', hashed);
```

## 添加新工具

1. 创建工具文件：

```typescript
// packages/utils/date.util.ts
export function formatDate(date: Date, format: string): string {
  // ...
}
```

2. 在 `index.ts` 中导出：

```typescript
export * from './date.util';
```

## 构建

```bash
pnpm --filter @repo/utils build
```
