# Changelog

## v1.1.0 — 2026-11-14

- 新增 `zline.html` 直线折角版本，由 `zline-engine.js` 和 `zline-scenes.js` 实现。线条全部为直线段与折角，节点用欠阻尼弹簧追随编舞目标，产生回弹；拉长时细丝散开形成拉丝，长度突变时产生弹拨振动，折角两端保持固定。
- 墙面与地面分开输出：墙面 2:1（2560×1280，90° 折角位于中线），地面 1:1（2048×2048）。两者共用时间轴。
- 新增 9 个场景，对应 DENZA Z breakdown：ORIGIN、AXIS、PARALLEL、WEAVE、ARRAY、Z-FORM、TETHER、TIRE、FIELD。
- 新增 `export-zline.ps1` 离线导出脚本；`server.js` 增加 `/still` PNG 静帧接口。
- 新增 `tests/zline.test.js`，覆盖弹簧回弹、振动衰减，以及全部场景无 NaN。原 `index.html` 未改动。

## v1.0.0 — 2026-11-12

STRINGS SPACE 的首个独立仓库版本，发布于 `kuanfuweimu/strings-space` 的 `main` 分支。原 `kuanfuweimu/strings-web` 仓库继续保留。

- 增加空间网格、拱形结构、线束、移动灯光与地面镜像反射。
- 增加金属材质面板：粗糙度、拉丝、高光、环境反射、反射方向、灯带宽度、冷暖与自发光。
- 增加抛光铬、拉丝钢、暗钛、原版对照预设，以及浏览器内自定义材质保存。
- 增加真实生长线头的 GPU 取样与平滑镜头追踪，按钮或 T 开关；支持跟随强度、缓动与镜头复位。
- 数值参数和预设以约 0.2 秒平滑过渡；默认场景过渡与按钮状态渐变也为 0.2 秒。
- 修正低帧率时 FPS 读数被模拟时间步长限制的问题。
- 使用独立本地端口 8788；保留 MIDI、手柄、WebM 和默认 4K60 离线导出。

验证：7 项 Node 自动测试通过；7 组着色器通过独立 OpenGL 编译，并运行 GPU 生长模拟与材质渲染。浏览器实机性能、外设和完整录制流程仍需在目标设备验收。

TouchDesigner 接入暂未合入此分支。
