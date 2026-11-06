# Nimbo 3.1.1 · Обновления без мастера

- Новые версии скачиваются в фоне через electron-updater с прогрессом и возможностью отмены.
- Кнопка «Перезапустить и обновить» применяет обновление без страниц мастера и снова открывает Nimbo. Приложение не закрывается само во время игры.
- Перед установкой проверяется SHA-512; для подписанных сборок также проверяется издатель. Незавершённая или повреждённая загрузка не запускается.
- Настройки, закладки, положение окна и сеансы сайтов сохраняются.
- В релиз добавлены `latest.yml` и `.blockmap` для автоматического обновления.
- Подготовлено подключение сертификата подписи Windows через секреты GitHub Actions. При настроенном сертификате сборка и публикация требуют корректной подписи приложения и установщика.

С версии 3.0.0 потребуется **один раз** обновиться прежним способом через установщик. Начиная с 3.1.1 последующие обновления применяются по кнопке в приложении.

**Цифровая подпись:** сертификат пока не настроен, поэтому текущая сборка остаётся неподписанной. Имя автора «Dreamer» в метаданных не является подтверждённым издателем Windows. Даже после подключения доверенной подписи SmartScreen отдельно учитывает репутацию приложения.

Windows 10/11, x64. Для предыдущей установки «для всех пользователей» обновление может запросить права администратора.

---

Updates download in the background and are applied with **Restart and update**, without installer pages. Settings, bookmarks and site sessions are preserved. Downloads are checked against SHA-512 and, for signed builds, the configured publisher. Incomplete or invalid downloads cannot be installed.

Upgrading from 3.0.0 requires one last manual installer run. From 3.1.1 onward, updates are applied inside Nimbo. Windows code-signing integration is prepared, but no certificate is configured yet, so this build remains unsigned.
