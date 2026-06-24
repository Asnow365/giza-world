# Gaza World

AI 3D Exhibition — 基于浏览器的高斯泼溅（3DGS）场景展示与角色动画平台。

## 功能

- **3D 场景展示** — 加载 PLY/SPZ 格式的高斯泼溅场景，支持两个场景切换
- **角色动画展示** — 展示带骨骼动画的 3D 角色，支持多动作切换
- **交互控制** — 拖拽旋转视角、滚轮缩放、拖拽角色位置
- **文生动作（T2M）面板** — 预留 API 接口，后续接入文生动作生成

## 技术栈

- [Three.js](https://threejs.org/) — WebGL 3D 渲染引擎
- [Spark](https://sparkjs.dev/) (World Labs) — 高斯泼溅渲染器
- Tailwind CSS — 界面样式

## 项目结构

```
├── index.html          # 单页面应用（SPA）
├── scene/              # 3D 场景文件
│   ├── 1/              # 场景 1（PLY + SPZ）
│   └── 2/              # 场景 2（PLY + SPZ）
├── motion/             # 角色模型文件
│   ├── 1/              # The Goddess Hathor（5 个动作）
│   ├── 2/              # King Menkaure（4 个动作）
│   └── 4/              # Ranefer（5 个动作）
└── README.md
```

## 本地运行

由于使用了 ES Module importmap，需要用本地服务器打开：

```bash
python -m http.server 8080
```

然后访问 http://localhost:8080

## 部署

项目已部署到 GitHub Pages：

https://asnow365.github.io/gaza-world/

## 未来计划

- 图生 3D 功能
- 文生 3D 功能
- 文生动作 API 集成
