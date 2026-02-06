/**
 * 飞书长连接测试脚本
 *
 * 使用方法：
 * 1. 设置环境变量 FEISHU_APP_ID 和 FEISHU_APP_SECRET
 * 2. 运行: npx ts-node libs/infra/clients/internal/feishu/test-connection.ts
 * 3. 等待看到 "WebSocket connected" 日志
 * 4. 然后在飞书开发者后台保存长连接配置
 *
 * 注意：必须先运行此脚本建立连接，然后才能在飞书后台保存长连接配置
 */
import * as lark from '@larksuiteoapi/node-sdk';

const appId = process.env.FEISHU_APP_ID;
const appSecret = process.env.FEISHU_APP_SECRET;
const domain = process.env.FEISHU_DOMAIN || 'feishu'; // 'feishu' 或 'lark'

if (!appId || !appSecret) {
  console.error('请设置环境变量 FEISHU_APP_ID 和 FEISHU_APP_SECRET');
  console.error(
    '示例: FEISHU_APP_ID=xxx FEISHU_APP_SECRET=xxx npx ts-node test-connection.ts',
  );
  process.exit(1);
}

console.log('='.repeat(60));
console.log('飞书长连接测试');
console.log('='.repeat(60));
console.log(`App ID: ${appId}`);
console.log(`Domain: ${domain}`);
console.log('');
console.log('正在建立 WebSocket 连接...');
console.log('');

const wsClient = new lark.WSClient({
  appId,
  appSecret,
  domain: domain === 'lark' ? lark.Domain.Lark : lark.Domain.Feishu,
  loggerLevel: lark.LoggerLevel.info,
});

const eventDispatcher = new lark.EventDispatcher({});

eventDispatcher.register({
  'im.message.receive_v1': async (data) => {
    console.log('收到消息:', JSON.stringify(data, null, 2));
  },
});

wsClient
  .start({ eventDispatcher })
  .then(() => {
    console.log('');
    console.log('='.repeat(60));
    console.log('✅ WebSocket 连接成功！');
    console.log('='.repeat(60));
    console.log('');
    console.log('现在请在飞书开发者后台执行以下操作：');
    console.log('1. 进入 事件订阅 页面');
    console.log('2. 在 请求方式 中选择 长连接');
    console.log('3. 添加需要订阅的事件（如 im.message.receive_v1）');
    console.log('4. 点击 保存');
    console.log('');
    console.log('保持此脚本运行，直到配置保存成功...');
    console.log('按 Ctrl+C 退出');
  })
  .catch((error) => {
    console.error('');
    console.error('='.repeat(60));
    console.error('❌ WebSocket 连接失败！');
    console.error('='.repeat(60));
    console.error('');
    console.error('错误信息:', error.message || error);
    console.error('');
    console.error('可能的原因：');
    console.error('1. App ID 或 App Secret 不正确');
    console.error('2. 应用未发布或未启用');
    console.error('3. 网络问题');
    console.error('');
    process.exit(1);
  });

// 保持进程运行
process.on('SIGINT', () => {
  console.log('\n正在关闭连接...');
  wsClient.close();
  process.exit(0);
});
