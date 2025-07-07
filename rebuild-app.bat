@echo off
echo 🔧 NVDA PDF Editor - Rebuild Script
echo =====================================
echo.

echo 📋 Checking if this is an Electron app...
if not exist "package.json" (
    echo ❌ package.json not found. Make sure you're in the project root directory.
    pause
    exit /b 1
)

echo ✅ Found package.json

echo.
echo 📦 Installing/updating dependencies...
call npm install

echo.
echo 🔨 Building the application...
if exist "scripts\build.js" (
    echo Using custom build script...
    call node scripts\build.js
) else if exist "scripts\build.bat" (
    echo Using build batch file...
    call scripts\build.bat
) else (
    echo Trying standard Electron build commands...
    
    REM Try different common build commands
    call npm run build 2>nul || (
        call npm run build-win 2>nul || (
            call npm run dist 2>nul || (
                call npm run package 2>nul || (
                    echo ❌ Could not find a build command. 
                    echo Please check your package.json scripts section.
                    echo.
                    echo Available scripts:
                    call npm run
                    pause
                    exit /b 1
                )
            )
        )
    )
)

echo.
echo ✅ Build completed!
echo.
echo 🚀 The rebuilt app should now include the AccessiblePDFCoordinator fix.
echo Look for the executable in the 'dist' or 'build' folder.
echo.
pause 