; Extend electron-builder's assisted installer. Keep its update/uninstall logic
; and app GUID, so installations of Game Overlay are upgraded in place.
!include nsDialogs.nsh

!ifndef BUILD_UNINSTALLER
Var NimboDesktopCheckbox
Var NimboDesktopState

!macro customHeader
  LangString NimboWelcomeTitle ${LANG_ENGLISH} "Welcome to Nimbo"
  LangString NimboWelcomeTitle ${LANG_RUSSIAN} "Добро пожаловать в Nimbo"
  LangString NimboWelcomeText ${LANG_ENGLISH} "Your favorite sites, one key above the game.$\r$\n$\r$\nKeep guides, videos and tools close without switching windows.$\r$\n$\r$\nNimbo installs for your account. Your bookmarks and settings are kept when you upgrade.$\r$\n$\r$\nClick Next to get started."
  LangString NimboWelcomeText ${LANG_RUSSIAN} "Всё нужное. Поверх игры.$\r$\n$\r$\nГайды, видео и любимые сайты рядом — без переключения окон.$\r$\n$\r$\nNimbo устанавливается для вашей учётной записи. При обновлении закладки и настройки сохраняются.$\r$\n$\r$\nНажмите «Далее», чтобы начать."
  LangString NimboOptionsTitle ${LANG_ENGLISH} "Make yourself at home"
  LangString NimboOptionsTitle ${LANG_RUSSIAN} "Удобный доступ"
  LangString NimboOptionsSubtitle ${LANG_ENGLISH} "Choose how you open Nimbo."
  LangString NimboOptionsSubtitle ${LANG_RUSSIAN} "Выберите, как открывать Nimbo."
  LangString NimboDesktopLabel ${LANG_ENGLISH} "Create a desktop shortcut"
  LangString NimboDesktopLabel ${LANG_RUSSIAN} "Создать ярлык на рабочем столе"
  LangString NimboOptionsHint ${LANG_ENGLISH} "Nimbo will also be available in the Start menu.$\r$\n$\r$\nOn first launch, a short guide will help you get ready.$\r$\nYou can enable launch with Windows in the app."
  LangString NimboOptionsHint ${LANG_RUSSIAN} "Nimbo также появится в меню «Пуск».$\r$\n$\r$\nПри первом запуске вас встретит краткая инструкция.$\r$\nАвтозапуск с Windows можно включить в приложении."
!macroend

!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "$(NimboWelcomeTitle)"
  !define MUI_WELCOMEPAGE_TEXT "$(NimboWelcomeText)"
  !define MUI_WELCOMEPAGE_TITLE_3LINES
  !insertmacro MUI_PAGE_WELCOME
!macroend

!macro customInit
  StrCpy $NimboDesktopState ${BST_CHECKED}
!macroend

!macro customInstallMode
  ; Fresh installs need no elevation or account-selection page. Preserve access
  ; to machine-wide upgrades for users of the previous installer.
  ${If} $hasPerMachineInstallation != "1"
    StrCpy $isForceCurrentInstall "1"
  ${EndIf}
!macroend

!macro customPageAfterChangeDir
  Page custom NimboOptionsPage NimboOptionsLeave

  Function NimboOptionsPage
    ${If} ${isUpdated}
      Abort
    ${EndIf}
    !insertmacro MUI_HEADER_TEXT "$(NimboOptionsTitle)" "$(NimboOptionsSubtitle)"
    nsDialogs::Create 1018
    Pop $0
    ${If} $0 == error
      Abort
    ${EndIf}
    ${NSD_CreateCheckbox} 0 8u 100% 20u "$(NimboDesktopLabel)"
    Pop $NimboDesktopCheckbox
    ${NSD_SetState} $NimboDesktopCheckbox $NimboDesktopState
    ${NSD_CreateLabel} 0 42u 100% 90u "$(NimboOptionsHint)"
    Pop $0
    nsDialogs::Show
  FunctionEnd

  Function NimboOptionsLeave
    ${NSD_GetState} $NimboDesktopCheckbox $NimboDesktopState
  FunctionEnd
!macroend

!macro customInstall
  ${If} $NimboDesktopState == ${BST_UNCHECKED}
    Delete "$newDesktopLink"
  ${ElseIfNot} ${Silent}
    ${IfNot} ${isUpdated}
      ; Also honor an explicit request when reinstalling after deleting a shortcut.
      CreateShortCut "$newDesktopLink" "$appExe" "" "$appExe" 0
      WinShell::SetLnkAUMI "$newDesktopLink" "${APP_ID}"
    ${EndIf}
  ${EndIf}
!macroend

!endif ; BUILD_UNINSTALLER
