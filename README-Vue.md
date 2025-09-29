# 贷款计算器 - Vue 3 + Element Plus

这是一个使用 Vue 3.4.29 + Element Plus 架构重构的贷款计算器应用。

## 项目结构

```
loan-calculator/
├── src/
│   ├── components/
│   │   ├── PartialPaymentModal.vue    # 部分还款模态框组件
│   │   └── FullPaymentModal.vue       # 全部还款确认模态框组件
│   ├── composables/
│   │   └── useLoanCalculator.js       # 贷款计算逻辑复用
│   ├── App.vue                        # 主应用组件
│   ├── main.js                        # 应用入口文件
│   └── style.css                      # 自定义样式
├── package.json                       # 项目依赖配置
├── vite.config.js                     # Vite 构建配置
└── index-vue.html                     # Vue 应用入口 HTML
```

## 技术栈

- **Vue 3.4.29** - 使用 Composition API
- **Element Plus 2.7.6** - UI 组件库
- **Vite 5.3.1** - 构建工具
- **@element-plus/icons-vue** - Element Plus 图标库

## 主要特性

### 🏗️ 组件化架构
- **PartialPaymentModal**: 部分还款模态框，支持表单验证和数据回调
- **FullPaymentModal**: 全部还款确认模态框，展示还款详情
- **App.vue**: 主应用组件，集成所有功能模块

### 🔧 组合式 API
- **useLoanCalculator**: 封装所有贷款计算逻辑
- 响应式数据管理
- 统一的格式化和计算方法

### 🎨 Element Plus 集成
- 表单组件 (el-form, el-input-number, el-select 等)
- 表格组件 (el-table)
- 对话框组件 (el-dialog)
- 消息提示 (el-message)
- 完整的主题系统

### 📱 响应式设计
- 移动端适配
- 自适应布局
- 优雅的视觉效果

## 安装和运行

### 1. 安装依赖
```bash
npm install
```

### 2. 开发模式
```bash
npm run dev
```
应用将在 http://localhost:3000 启动

### 3. 构建生产版本
```bash
npm run build
```

### 4. 预览生产版本
```bash
npm run preview
```

## 功能说明

### 贷款计算
- **等额本息**: 每月还款金额固定
- **等额本金**: 每月还款本金固定，利息递减
- **先息后本**: 前期只还利息，最后一期还本金

### 部分还款
- 支持在任意期数进行部分还款
- 两种调整方式：缩短期限 或 减少月供
- 实时预览计算结果
- 表单验证确保数据正确性

### 全部还款
- 在任意期数可选择全部还款
- 显示详细的还款信息
- 自动计算剩余本金和当期利息

### 数据导出
- 支持导出 CSV 格式的还款计划
- 包含完整的计算结果和汇总信息

## 组件使用示例

### PartialPaymentModal
```vue
<PartialPaymentModal
  v-model:visible="partialPaymentVisible"
  :current-period="currentPeriod"
  :original-date="originalDate"
  :remaining-principal="remainingPrincipal"
  :format-number="formatNumber"
  @confirm="handlePartialPaymentConfirm"
/>
```

### FullPaymentModal
```vue
<FullPaymentModal
  v-model:visible="fullPaymentVisible"
  :payment-data="paymentData"
  :format-number="formatNumber"
  @confirm="handleFullPaymentConfirm"
/>
```

## 自定义配置

### Vite 配置
可在 `vite.config.js` 中修改开发服务器端口、构建选项等。

### Element Plus 主题
可通过 CSS 变量自定义 Element Plus 主题色彩。

## 浏览器支持

- Chrome >= 87
- Firefox >= 78
- Safari >= 14
- Edge >= 88

## 迁移说明

从原始 HTML/JS/CSS 架构迁移到 Vue 3 + Element Plus：

1. **HTML 结构** → **Vue 模板语法**
2. **原生 JavaScript** → **Vue 3 Composition API**
3. **原生 CSS** → **Element Plus + 自定义样式**
4. **事件处理** → **Vue 事件系统**
5. **DOM 操作** → **响应式数据绑定**

所有原有功能均已完整迁移，并增强了用户体验和代码可维护性。