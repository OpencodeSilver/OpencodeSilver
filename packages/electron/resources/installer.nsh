; OpencodeSilver - Custom NSIS hooks (electron-builder "nsis.include")
;
; Provides:
; 1. Fast, reliable termination of running app processes (opencodesilver.exe, OpencodeSilver.exe, opencode.exe)
; 2. Clean uninstallation / file cleanup of previous versions before extracting the new version
; 3. Assisted wizard support (Next, Next, Next, Finish) without locked file errors or Retry loops

!include LogicLib.nsh

; Close all running OpencodeSilver processes and the bundled opencode.exe server
!macro _ocsKillRunning
  DetailPrint "Terminating running OpencodeSilver and OpenCode processes..."
  nsExec::Exec 'cmd.exe /c "taskkill /F /T /IM opencodesilver.exe & taskkill /F /T /IM OpencodeSilver.exe & taskkill /F /T /IM opencode.exe"'
  Pop $R1
  nsExec::Exec `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "Get-Process -Name 'opencodesilver', 'OpencodeSilver', 'opencode' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue"`
  Pop $R1
!macroend

; Number of running OpencodeSilver processes -> $R0
!macro _ocsCountRunning
  nsExec::ExecToStack `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "@(Get-Process -Name 'opencodesilver', 'OpencodeSilver', 'opencode' -ErrorAction SilentlyContinue).Count"`
  Pop $R1
  Pop $R0
  IntOp $R0 $R0 + 0
!macroend

; Clean previous installation files from $INSTDIR before installing the new version
!macro _ocsCleanOldInstallation
  ${If} ${FileExists} "$INSTDIR"
    DetailPrint "Cleaning previous installation files from $INSTDIR..."
    Delete "$INSTDIR\opencodesilver.exe"
    Delete "$INSTDIR\OpencodeSilver.exe"
    Delete "$INSTDIR\resources\opencode-cli\opencode.exe"
    Delete "$INSTDIR\resources\app.asar"
    Delete "$INSTDIR\*.dll"
    Delete "$INSTDIR\*.exe"
    Delete "$INSTDIR\*.pak"
    Delete "$INSTDIR\*.bin"
    Delete "$INSTDIR\*.dat"
    RMDir /r "$INSTDIR\resources"
    RMDir /r "$INSTDIR\locales"
  ${EndIf}
!macroend

!macro customCheckAppRunning
  Push $R0
  Push $R1
  Push $R2

  ; Check if any application processes are currently active
  !insertmacro _ocsCountRunning
  ${If} $R0 > 0
    ${IfNot} ${Silent}
      MessageBox MB_OKCANCEL|MB_ICONINFORMATION|MB_TOPMOST "برنامج OpencodeSilver يعمل الآن (أو في شريط المهام بجانب الساعة).$\r$\n$\r$\nاضغط «موافق» لإغلاقه تلقائياً ومتابعة التثبيت.$\r$\n$\r$\nOpencodeSilver is currently running. Click OK to close it and continue setup." /SD IDOK IDOK ocs_close_confirmed
      Quit
      ocs_close_confirmed:
    ${EndIf}

    DetailPrint "Closing OpencodeSilver..."
    StrCpy $R2 0
    ${Do}
      !insertmacro _ocsKillRunning
      Sleep 800
      !insertmacro _ocsCountRunning
      ${If} $R0 = 0
        ${ExitDo}
      ${EndIf}
      IntOp $R2 $R2 + 1
      ${If} $R2 >= 3
        ; Final force kill attempt
        !insertmacro _ocsKillRunning
        Sleep 500
        ${ExitDo}
      ${EndIf}
    ${Loop}
    ; Allow Windows OS to release file locks
    Sleep 500
  ${EndIf}

  ; Purge old version files from destination before extracting new version
  !ifndef BUILD_UNINSTALLER
    !insertmacro _ocsCleanOldInstallation
  !endif

  Pop $R2
  Pop $R1
  Pop $R0
!macroend
