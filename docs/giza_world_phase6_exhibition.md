# Phase 6：沉浸式展示版本

## 本轮目标

Phase 6 将单页原型重构为更接近展览系统的结构：

- `index.html` 只保留语义化页面结构。
- `styles.css` 管理视觉、HUD、路线图、徽章和响应式布局。
- `src/app.js` 负责加载 JSON 数据、渲染导览、路线、对象记录、审核备注和 workflow。
- `data/immersiveScenes.json` 描述场景节点、hotspot、camera target 和 caption，为未来接入真实 Giza World 3DGS / Three.js viewport 做准备。

## 展览特性

1. Immersive viewport shell：目前是 CSS/Web 展示壳，未来应替换为真实 3DGS / Three.js scene。
2. Hotspots：三个 scene hotspot 对应 Hathor、Menkaure、Ranefer / comparative Old Kingdom stop。
3. HUD：显示当前 stop、motion preset、accuracy status、objective 和 uncertainty badges。
4. Metadata panels：所有角色仍然绑定 object records、source URLs、review workflow 和 expert-review notes。
5. Transcript：记录用户预览路径，方便作为 museum education script 复核。

## 仍未达到 10/10 的原因

- 尚未接入真实 Giza World renderer。
- 尚未播放真实 rigged character animation。
- 尚未取得 3D scan / model rights。
- 尚未完成 Egyptologist written review。
- 尚未加入音频、字幕轨和 WebXR headset navigation。
