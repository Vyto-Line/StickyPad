; Extra steps for the StickyPad installer / uninstaller (electron-builder "nsis.include").

; A direct "Uninstall StickyPad" entry in the Start menu (the normal Windows "Uninstall" on the StickyPad entry always opens Settings > Apps).
!macro customInstall
  CreateShortCut "$SMPROGRAMS\Uninstall ${PRODUCT_FILENAME}.lnk" "$INSTDIR\Uninstall ${PRODUCT_FILENAME}.exe"
!macroend

; Asks whether the notes should go too. Skipped when an update is replacing the old version, and in silent mode (notes are kept).
; Only the normal data folder is ever deleted. A data folder that was moved elsewhere (OneDrive, Dropbox...) is never touched.
!macro customUnInstall
  Delete "$SMPROGRAMS\Uninstall ${PRODUCT_FILENAME}.lnk"
  ${ifNot} ${isUpdated}
    MessageBox MB_YESNO|MB_ICONQUESTION|MB_DEFBUTTON2 "StickyPad has been removed.$\r$\n$\r$\nDo you also want to delete your notes, pictures, settings and backups?$\r$\n$\r$\nYes = delete everything$\r$\nNo = keep them (they will be there if you install StickyPad again)" /SD IDNO IDYES deleteNotes IDNO keepNotes
    deleteNotes:
      RMDir /r "$APPDATA\${APP_FILENAME}"
    keepNotes:
  ${endIf}
!macroend
