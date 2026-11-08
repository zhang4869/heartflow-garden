# 心流花园 · GitHub Pages

🌷 卧室（白天 / 夜晚）· 柳枝轻摆 · 猫咪互动 · 《茉莉花》古筝 · 心流工作台

## 在线地址

- 默认地址：<https://zhang4869.github.io/heartflow-garden/>
- 自定义域名：<https://garden.qlink0731.cn/>

## 仓库结构

| 路径 | 说明 |
| --- | --- |
| `index.html` | **构建产物**，GitHub Pages 实际发布的文件（请勿手改） |
| `assets/` | 构建产出的静态资源（底图、猫咪图、音乐、favicon） |
| `source/` | 原始单文件版《心流花园》V1.6（唯一真源，改动请在这里做） |
| `tools/build.mjs` | 构建脚本：把 `source/` 编译成 `index.html` + `assets/` |

## 一键更新网页

在项目根目录执行：

```bash
node tools/build.mjs
git add -A
git commit -m "更新心流花园页面"
git push origin main
```

推送后 GitHub Pages 会在 1～2 分钟内自动重新发布。

### 更省事的写法（Windows）

在仓库根目录新建 `更新网页.bat`，内容如下：

```bat
@echo off
chcp 65001 >nul
cd /d "%~dp0"
node tools/build.mjs || goto :err
git add -A
git commit -m "更新心流花园页面"
git push origin main
echo.
echo 更新完成，约 1-2 分钟后访问 https://garden.qlink0731.cn/
goto :eof
:err
echo 构建失败，请检查 node 是否已安装
pause
```

以后双击这个 `.bat` 即可。

## 修改页面内容

`source/Heartflow_CatFix_V16_Scroll.html` 是**唯一真源**（单文件、资源全部内联 base64）。
直接用编辑器打开它修改，保存后跑 `node tools/build.mjs` 即可。

构建脚本会自动完成：

1. 把内联的 base64 资源抽成 `assets/*`（白天 / 夜晚底图、猫咪精灵图、《茉莉花》古筝、工作台猫咪插画）
2. 修复 CSP 放行同源资源
3. 隐藏未使用的 `game` canvas（消除工作台顶部空白、修正滚动高度）
4. 修复进入 / 返回房间的重复闪烁
5. 自动播放被拦截时给出明确的点击播放提示
6. 补充公网环境下 AI 问答的降级说明

## 关于 AI 综合回答（DeepSeek）

前端**不包含任何 API Key**。密钥只保存在运行在你本机的 Python 服务里（`127.0.0.1:8765`），
通过环境变量 `DEEPSEEK_API_KEY` 读取。

因此在公开的 GitHub Pages 站点上：

- ✅ 本地资料检索、资料库导入与阅读、七日历、工作台滚动 —— 全部正常
- ⚠️ **AI 综合回答**不可用（浏览器的沙箱无法访问你电脑上的本地服务），点击时页面会给出说明

要使用 AI 综合回答，请在本机运行配套的 Python 服务，此时网页从 `file://` 或本地服务器打开即可使用。

## 验证记录

已用真实 Chrome（无头模式）跑通 26 项端到端检查，覆盖 PC / iPad 横屏 / 手机竖屏、
白天夜晚切换、柳树动画、猫咪点击、《茉莉花》播放控制、点击电脑进入工作台、返回房间、
工作台滚动、七日历、智能问答本地检索，以及进入/返回房间无重复闪烁。
