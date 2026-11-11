# STRINGS

DENZA 线条视觉网页工程。包含 9 个实时形态、独立控制面板、镜头控制、MIDI 参数映射及手柄输入。

## 本地运行

需要 Node.js，以及支持 WebGL2 和浮点纹理的 Chrome / Edge。

Windows 下双击 `start.bat`，会启动本地服务并打开输出窗口和控制面板。也可以运行：

```sh
node server.js
```

- 输出：<http://localhost:8787/>
- 控制面板：<http://localhost:8787/control.html>
- 输出窗口按 **F** 或双击画面全屏，按 **H** 显示／隐藏信息。
- 密度范围 **0–10**；1 对应 4,000 条线，10 对应 40,000 条线。
- MIDI／手柄映射资料位于 `docs/`。设备识别和映射需在实际硬件上核对。

输出和控制面板通过同源 BroadcastChannel 通信。多个输出窗口各自运行模拟，参数同步不代表逐帧画面完全一致。

## 视频导出

`export.ps1` 默认导出全部形态，3840×2160、60 fps、每段 10 秒，需要 FFmpeg 在 PATH 中。先结束已占用 8787 端口的本项目服务，再运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\export.ps1
```

默认使用 NVIDIA NVENC。无可用 NVIDIA 编码器时，可在当前 PowerShell 中先设置 `$env:ENCODER = 'x264'`，再执行导出脚本。生成的视频位于 `out/`。

## 仓库内容

仓库包含网页源码、本地服务、启动／导出脚本及控制器说明。`out/` 视频、`shots/` 测试截图和 `browser-profile/` 本地浏览器数据不纳入 Git，仍保留在本地。

本仓库仅包含网页工程，不包含 TouchDesigner 实验工程。此次上传进行源码语法检查，不代表已完成现场投影、硬件控制器或持续 4K 帧率验收。
