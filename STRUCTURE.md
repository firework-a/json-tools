# 项目结构说明

## 目录结构

```
src/
├── components/          # 组件目录
│   ├── common/         # 通用组件
│   │   ├── Button.tsx         # 按钮组件
│   │   ├── ErrorMessage.tsx   # 错误提示组件
│   │   ├── JsonEditor.tsx     # JSON 编辑器组件
│   │   ├── Toolbar.tsx        # 工具栏组件
│   │   └── index.ts           # 导出文件
│   ├── tools/          # 工具类组件
│   │   ├── JsonFormatter.tsx    # JSON 格式化
│   │   ├── JsonComparator.tsx   # JSON 对比
│   │   ├── JsonCompressor.tsx   # JSON 压缩/转义
│   │   └── index.ts             # 导出文件
│   └── Layout.tsx      # 布局组件
├── hooks/              # 自定义 Hooks（待扩展）
├── utils/              # 工具函数
│   ├── json.ts                # JSON 处理工具
│   ├── jsonCompressor.ts      # JSON 压缩工具
│   └── index.ts               # 导出文件
├── styles/             # 样式文件
│   ├── variables.scss         # Sass 变量
│   ├── mixins.scss            # Sass Mixins
│   └── main.scss              # 主样式文件
├── App.tsx             # 主应用组件
└── main.tsx            # 入口文件
```

## 组件说明

### 通用组件 (common/)
可复用的基础 UI 组件，可在多个工具中使用。

### 工具组件 (tools/)
具体的功能组件，每个对应一个工具页面。

### 工具函数 (utils/)
纯函数工具，处理业务逻辑，与 UI 分离。

## 使用示例

```tsx
import { JsonEditor, Toolbar, Button } from '@/components/common'
import { formatJson } from '@/utils'

function MyComponent() {
  return (
    <div>
      <Toolbar title="我的工具">
        <Button onClick={handleAction}>执行</Button>
      </Toolbar>
      <JsonEditor value={data} onChange={setData} />
    </div>
  )
}
```
