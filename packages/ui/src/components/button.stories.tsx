import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button';

/**
 * Button 组件是最基础的交互元素，用于触发操作或事件。
 *
 * ## 使用方式
 *
 * ```tsx
 * import { Button } from '@repo/ui/components/button';
 *
 * <Button variant="default">点击我</Button>
 * ```
 */
const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'default',
        'destructive',
        'outline',
        'secondary',
        'ghost',
        'link',
      ],
      description: '按钮样式变体',
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon', 'icon-sm', 'icon-lg'],
      description: '按钮尺寸',
    },
    disabled: {
      control: 'boolean',
      description: '是否禁用',
    },
    asChild: {
      control: 'boolean',
      description: '是否作为子元素渲染（用于组合其他组件）',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 默认按钮样式
 */
export const Default: Story = {
  args: {
    children: '默认按钮',
    variant: 'default',
  },
};

/**
 * 危险操作按钮，用于删除等破坏性操作
 */
export const Destructive: Story = {
  args: {
    children: '删除',
    variant: 'destructive',
  },
};

/**
 * 轮廓按钮，用于次要操作
 */
export const Outline: Story = {
  args: {
    children: '取消',
    variant: 'outline',
  },
};

/**
 * 次要按钮
 */
export const Secondary: Story = {
  args: {
    children: '次要操作',
    variant: 'secondary',
  },
};

/**
 * 幽灵按钮，无背景
 */
export const Ghost: Story = {
  args: {
    children: '幽灵按钮',
    variant: 'ghost',
  },
};

/**
 * 链接样式按钮
 */
export const Link: Story = {
  args: {
    children: '链接按钮',
    variant: 'link',
  },
};

/**
 * 小尺寸按钮
 */
export const Small: Story = {
  args: {
    children: '小按钮',
    size: 'sm',
  },
};

/**
 * 大尺寸按钮
 */
export const Large: Story = {
  args: {
    children: '大按钮',
    size: 'lg',
  },
};

/**
 * 禁用状态
 */
export const Disabled: Story = {
  args: {
    children: '禁用按钮',
    disabled: true,
  },
};

/**
 * 所有变体展示
 */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button variant="default">Default</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
};

/**
 * 所有尺寸展示
 */
export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};
