# Giza World 本地实现与迁移方案

## 已实现

- Motion Prompt Lab / Text-to-Motion Prototype。
- Accuracy Review Mode。
- Story Moments / Museum Quest。
- Museum Metadata Schema。
- Phase 4 Giza World bridge。
- Phase 5 source anchors and expert-review notes。

## 迁移步骤

1. 在 Giza World 仓库中新建 `data/characters.json`、`data/storyMoments.json`、`data/objects.json`、`data/sources.json`、`data/reviewWorkflow.json`、`data/expertReviewNotes.json`。
2. 复制 `integrations/giza-world/giza-world-bridge.js`。
3. 将 bridge hooks 接入真实 scene switching、character focusing、animation mixer、T2M prompt box、HUD、accuracy panel。
4. 保留 source / reconstructed / speculative / needs review badges。
5. 公开展示前补齐 rights、bibliography、Egyptologist written review。

## Phase 6 update

- Add `styles.css` and `src/app.js` so the prototype is maintainable instead of relying on a dense inline page.
- Add `data/immersiveScenes.json` for future camera targets and scene hotspots.
- Use the immersive shell as a placeholder until the real Giza World renderer is available.
