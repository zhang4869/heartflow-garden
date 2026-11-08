@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo [1/3] 构建网站...
node tools/build.mjs || goto :err

echo.
echo [2/3] 提交改动...
git add -A
git commit -m "更新心流花园页面"
if errorlevel 1 echo (没有需要提交的改动，跳过)

echo.
echo [3/3] 推送到 GitHub...
git push origin main || goto :err

echo.
echo ============================================
echo  更新完成！约 1-2 分钟后生效
echo  https://garden.qlink0731.cn/
echo  https://zhang4869.github.io/heartflow-garden/
echo ============================================
pause
exit /b 0

:err
echo.
echo 构建或推送失败，请检查：
echo   - 是否已安装 Node.js（node -v）
echo   - 网络是否正常
pause
exit /b 1
