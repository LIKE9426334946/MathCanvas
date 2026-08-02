# MathCanvas

MathCanvas 是一个面向手机探索、电脑管理的交互式数学函数可视化平台。管理员可以配置函数表达式、参数滑块和坐标轴范围，系统会自动生成可触摸调节的函数图像。

## 技术栈

- React + TypeScript + Vite + Tailwind CSS
- Apache ECharts
- Node.js + Express
- SQLite

## 本地开发

```bash
npm install
npm run dev
```

- 前端开发地址：`http://127.0.0.1:5173`
- 后端 API：`http://127.0.0.1:3021`

## 生产构建

```bash
npm install
npm run build
npm start
```

生产环境中 Express 会在 `127.0.0.1:3021` 提供 API 和构建后的前端页面。完整的 Ubuntu、systemd 和 Nginx 部署步骤见 [DEPLOY.md](./DEPLOY.md)。

## 页面

- `/`：函数库与移动端函数探索页面
- `/admin`：电脑端函数管理后台

## 数据

SQLite 数据文件默认保存在 `backend/data/mathcanvas.db`。首次启动会自动写入基础函数、特殊函数、双曲函数、概率分布和神经函数示例。
