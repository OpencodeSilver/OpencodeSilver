; OpencodeSilver - custom NSIS hooks (electron-builder "nsis.include")
;
; The app keeps running after its window is closed (it hides to the tray) and
; starts a bundled opencode.exe server. Both keep files in the install folder
; open, so electron-builder's default check only offered "Retry".
; This replaces that check: if the app is running, the user is asked once to
; close it; the installer then closes it itself and verifies it has exited.

!include LogicLib.nsh

; Number of running OpencodeSilver processes -> $R0
!macro _ocsCountRunning
  nsExec::ExecToStack `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "@(Get-Process -ErrorAction SilentlyContinue | Where-Object { $$_.Name -eq 'opencodesilver' -or ($$_.Path -and ($$_.Path -like '$INSTDIR\*' -or $$_.Path -like '*\resources\opencode-cli\opencode.exe')) }).Count"`
  Pop $R1
  Pop $R0
  IntOp $R0 $R0 + 0
!macroend

; Close the app, its child processes and the bundled opencode.exe.
; A separately installed OpenCode is never touched.
!macro _ocsKillRunning
  nsExec::Exec 'taskkill /F /T /IM "opencodesilver.exe"'
  Pop $R1
  nsExec::Exec `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "Get-Process -ErrorAction SilentlyContinue | Where-Object { $$_.Name -eq 'opencodesilver' -or ($$_.Path -and ($$_.Path -like '$INSTDIR\*' -or $$_.Path -like '*\resources\opencode-cli\opencode.exe')) } | Stop-Process -Force -ErrorAction SilentlyContinue"`
  Pop $R1
!macroend

!macro customCheckAppRunning
  Push $R0
  Push $R1
  Push $R2

  !insertmacro _ocsCountRunning
  ${If} $R0 > 0
    ${IfNot} ${Silent}
      MessageBox MB_OKCANCEL|MB_ICONINFORMATION|MB_TOPMOST "برنامج OpencodeSilver يعمل الآن (قد يكون مخفياً بجانب الساعة).$\r$\n$\r$\nاضغط «موافق» لإغلاق البرنامج ومتابعة التثبيت.$\r$\n$\r$\nOpencodeSilver is running. Click OK to close it and continue." /SD IDOK IDOK ocs_close_confirmed
      Quit
      ocs_close_confirmed:
    ${EndIf}

    DetailPrint "Closing OpencodeSilver..."
    StrCpy $R2 0
    ${Do}
      !insertmacro _ocsKillRunning
      Sleep 1000
      !insertmacro _ocsCountRunning
      ${If} $R0 = 0
        ${ExitDo}
      ${EndIf}
      IntOp $R2 $R2 + 1
      ${If} $R2 >= 5
        MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION|MB_TOPMOST "تعذّر إغلاق OpencodeSilver تلقائياً. أغلقه من مدير المهام ثم اضغط «إعادة المحاولة».$\r$\n$\r$\nCould not close OpencodeSilver. Close it from Task Manager, then click Retry." /SD IDCANCEL IDRETRY ocs_retry
        Quit
        ocs_retry:
        StrCpy $R2 0
      ${EndIf}
    ${Loop}
    ; Let Windows release the file handles before files are replaced.
    Sleep 1000
  ${EndIf}

  Pop $R2
  Pop $R1
  Pop $R0
!macroend
