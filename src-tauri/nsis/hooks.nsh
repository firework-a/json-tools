; NSIS Installer Hooks for JSON Tools
; These hooks are called at specific points during installation/uninstallation

; Hook: Runs before copying files, setting registry keys, and creating shortcuts
!macro NSIS_HOOK_PREINSTALL
    ; Verify the install directory exists and has the expected structure
    ; This runs after the user has selected the install directory
    ; We can use this to ensure the registry will be written correctly
!macroend

; Hook: Runs after the installer has finished copying all files, setting registry keys, and creating shortcuts
!macro NSIS_HOOK_POSTINSTALL
    ; Ensure the InstallLocation registry value is set correctly
    ; This is a safety net in case the default template missed it
    ReadRegStr $R0 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\com.fireworka.jsontools" "InstallLocation"
    StrCmp $R0 "$INSTDIR" 0 FixInstallLocation
    Goto Done
FixInstallLocation:
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\com.fireworka.jsontools" "InstallLocation" "$INSTDIR"
Done:
!macroend

; Hook: Runs before removing any files, registry keys, and shortcuts
!macro NSIS_HOOK_PREUNINSTALL
    ; Read the install location from registry before uninstalling
    ReadRegStr $R0 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\com.fireworka.jsontools" "InstallLocation"
    StrCmp $R0 "" Done
    ; Verify it matches our expected install directory
    StrCmp $R0 "$INSTDIR" Done
    ; If different, update INSTDIR to match registry (for clean uninstall)
    StrCpy $INSTDIR $R0
Done:
!macroend

; Hook: Runs after files, registry keys, and shortcuts have been removed
!macro NSIS_HOOK_POSTUNINSTALL
    ; Cleanup any remaining registry entries
    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\com.fireworka.jsontools"
!macroend