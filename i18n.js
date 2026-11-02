/* Russian source strings with English translations; no network dependency. */
(function (root) {
  const english = {
  "Текущий статус оверлея": "Current overlay status",
  "Мышь активна [{key}]": "Mouse active [{key}]",
  "Нажмите {key} или Esc, чтобы вернуть управление в игру": "Press {key} or Esc to return to the game",
  "Нажмите {key}, чтобы захватить мышь": "Press {key} to enable mouse interaction",
  "Нажмите, чтобы открыть меню обновления": "Open the update menu",
  "Новая версия!": "New version!",
  "Непрозрачность оверлея": "Overlay opacity",
  "Непрозрачность": "Opacity",
  "Настройки оверлея": "Overlay settings",
  "Перезагрузить страницу": "Reload page",
  "Свернуть / Вернуться в игру (Esc)": "Hide / Return to game (Esc)",
  "Любимые сайты": "Favorite sites",
  "БЫСТРЫЙ": "QUICK",
  "ДОСТУП": "ACCESS",
  "Добавить или изменить закладки": "Add or edit bookmarks",
  "Управление закладками": "Manage bookmarks",
  "GAME OVERLAY / НАСТРОЙКИ": "GAME OVERLAY / SETTINGS",
  "Ваше пространство.": "Your space.",
  "Всё нужное. Поверх игры.": "Everything you need. Above the game.",
  "Закрыть": "Close",
  "Разделы настроек": "Settings sections",
  "Основное": "General",
  "Внешний вид": "Appearance",
  "Клавиши": "Hotkeys",
  "Обновления": "Updates",
  "01 / БЫСТРЫЙ ДОСТУП": "01 / QUICK ACCESS",
  "Всё под рукой": "Within reach",
  "Соберите свою коллекцию сайтов и выберите поведение оверлея.": "Build your collection of sites and choose how your overlay behaves.",
  "Адрес сайта": "Website address",
  "Вставьте ссылку на любой сайт — он отобразится поверх игры в оверлее.": "Enter a website address to open it above your game.",
  "Открыть": "Open",
  "До 30 закладок. Переключение сайта перезагружает страницу.": "Up to 30 bookmarks. Switching sites reloads the page.",
  "Название закладки": "Bookmark name",
  "Название": "Name",
  "Адрес закладки": "Bookmark address",
  "Добавить": "Add",
  "Отмена": "Cancel",
  "Добавить открытый адрес": "Bookmark current address",
  "Поведение при скрытии": "When you hide the overlay",
  "Что происходит при повторном нажатии клавиши триггера:": "Choose what happens when you press the overlay hotkey again:",
  "Полное скрытие окна": "Hide the window",
  "Окно исчезает с экрана и не мешает обзору в игре": "The window disappears to give you a clear view of the game",
  "Сквозной HUD поверх игры": "Click-through HUD",
  "Окно остается полупрозрачным, а клики мыши проходят прямо в игру": "The window stays visible while mouse clicks pass through to the game",
  "Система и уведомления": "System & notifications",
  "Запускать оверлей вместе с Windows": "Launch with Windows",
  "Показывать всплывающие уведомления": "Show notifications",
  "02 / КОМПОНОВКА": "02 / LAYOUT",
  "Свой угол обзора": "Your point of view",
  "Расположите окно так, чтобы оно дополняло игру.": "Find a spot that works with your game.",
  "20% (Прозрачно)": "20% (Transparent)",
  "85% (Рекомендуется)": "85% (Recommended)",
  "100% (Непрозрачно)": "100% (Opaque)",
  "Размер и положение": "Size & position",
  "Размер и позиция также сохраняются автоматически при перемещении за шапку.": "Window size and position are saved automatically when you drag the title bar.",
  "Положение окна": "Window position",
  "Слева": "Left",
  "Справа": "Right",
  "По центру": "Center",
  "Компактное": "Compact",
  "Ширина (px)": "Width (px)",
  "Высота (px)": "Height (px)",
  "Применить": "Apply",
  "Сбросить размер и положение по центру текущего экрана": "Reset size and center on the current display",
  "Сбросить": "Reset",
  "03 / УПРАВЛЕНИЕ": "03 / CONTROLS",
  "Одно нажатие — и вы здесь": "One key away",
  "Назначьте удобную клавишу для вызова оверлея.": "Choose a hotkey that feels right.",
  "Клавиша вызова (Триггер)": "Overlay hotkey",
  "Нажмите эту клавишу в игре для открытия оверлея. Повторное нажатие вернет курсор в игру.": "Press this key in-game to open the overlay. Press it again to return to the game.",
  "Нажмите, чтобы назначить новую клавишу": "Click to assign a new hotkey",
  "Нажмите на кнопку выше, чтобы изменить клавишу": "Click the button above to change your hotkey",
  "Быстрый выбор:": "Quick pick:",
  "~ (Ё)": "~",
  "04 / ПРИЛОЖЕНИЕ": "04 / APP",
  "Всегда в форме": "Stay up to date",
  "Проверяйте и устанавливайте новые версии прямо здесь.": "Check for updates and install them right here.",
  "Обновления программы": "App updates",
  "Текущая версия: v{version}": "Current version: v{version}",
  "Проверка наличия обновлений...": "Checking for updates...",
  "Загрузка обновления...": "Downloading update...",
  "{done} МБ / {total} МБ": "{done} MB / {total} MB",
  "{speed} МБ/с": "{speed} MB/s",
  "Проверить обновления": "Check for updates",
  "Скачать установщик": "Download installer",
  "Запустить установщик": "Run installer",
  "Показать в папке": "Show in folder",
  "Автосохранение включено": "Autosave is on",
  "Язык интерфейса": "Interface language",
  "Готово": "Done",
  "Изменить": "Edit",
  "Сохранить": "Save",
  "Изменить {name}": "Edit {name}",
  "Удалить {name}": "Delete {name}",
  "Добавьте любимые сайты через ＋": "Add favorite sites with ＋",
  "Нажмите клавишу...": "Press a key...",
  "Нажмите любую клавишу или комбинацию (Esc для отмены)": "Press a key or combination (Esc to cancel)",
  "Клавиша триггера установлена: [{key}]": "Hotkey set: [{key}]",
  "Ошибка при установке клавиши": "Could not set the hotkey",
  "Перезагрузка страницы...": "Reloading page...",
  "Режим: Полное скрытие оверлея": "Mode: Hide overlay",
  "Режим: Сквозной HUD поверх игры": "Mode: Click-through HUD",
  "Размер окна изменен: {size}": "Window size: {size}",
  "Позиция и размер сброшены": "Window size and position reset",
  "Проверьте адрес сайта": "Check the website address",
  "Автозапуск с Windows включен": "Launch with Windows enabled",
  "Автозапуск отключен": "Launch with Windows disabled",
  "Уведомления включены": "Notifications enabled",
  "Доступна новая версия: {version}": "New version available: {version}",
  "Доступно {version}": "Available: {version}",
  "Скачать установщик {version}": "Download installer {version}",
  "Доступно обновление {version}! Откройте настройки для скачивания": "Update {version} is available! Open settings to download it",
  "У вас установлена актуальная версия (v{version})": "You are up to date (v{version})",
  "Проверка...": "Checking...",
  "Проверяем релизы на GitHub...": "Checking GitHub releases...",
  "У вас установлена актуальная версия": "You are up to date",
  "Ошибка: {error}": "Error: {error}",
  "Ссылка для загрузки не найдена": "Download link not found",
  "Подключение к GitHub...": "Connecting to GitHub...",
  "Загрузка отменена.": "Download cancelled.",
  "Загрузка обновления отменена": "Update download cancelled",
  "Не удалось применить обновление": "Could not apply the update",
  "Обновление скачано и готово к установке": "Update downloaded and ready to install",
  "Установщик готов! Нажмите «Запустить установщик»": "Installer ready! Click “Run installer”",
  "Оверлей активен ({key} — скрыть)": "Overlay active ({key} to hide)",
  "Мышь освобождена — клики идут в игру": "Mouse released — clicks pass through to the game",
  "Положение: {position}": "Position: {position}",
  "Не удалось сохранить закладки": "Could not save bookmarks",
  "Этот адрес уже есть в закладках": "This address is already bookmarked",
  "Можно сохранить до 30 закладок": "You can save up to 30 bookmarks",
  "Не удалось сохранить закладку": "Could not save the bookmark",
  "Оверлей готов! Нажмите [{key}] для вызова в игре": "Overlay ready! Press [{key}] to open it in-game",
  "Введите адрес сайта": "Enter a website address",
  "Проверьте адрес сайта, например https://example.com": "Check the website address, e.g. https://example.com",
  "Укажите адрес сайта с http:// или https://": "Use a website address starting with http:// or https://",
  "Релизы пока не найдены на GitHub": "No releases found on GitHub yet",
  "GitHub API вернул статус {status}": "GitHub API returned status {status}",
  "Ошибка подключения к GitHub": "Could not connect to GitHub",
  "👁️ Скрыть оверлей ({key})": "👁️ Hide overlay ({key})",
  "👁️ Открыть оверлей ({key})": "👁️ Open overlay ({key})",
  "🎉 Новая версия {version}! (Скачать)": "🎉 New version {version}! (Download)",
  "⚙️ Настройки...": "⚙️ Settings...",
  "🔄 Перезагрузить страницу": "🔄 Reload page",
  "🔍 Проверить обновления": "🔍 Check for updates",
  "📍 Сбросить размер и положение": "📍 Reset size and position",
  "❌ Выход": "❌ Quit",
  "Не удалось назначить горячую клавишу {key}. Возможно, она уже используется Windows или другой программой.": "Could not assign {key}. It may already be in use by Windows or another app.",
  "Ссылка для скачивания обновления не найдена": "Update download link not found",
  "Сервер вернул код {status}: {message}": "Server returned {status}: {message}",
  "Ошибка при загрузке файла": "Could not download the file",
  "Файл обновления не найден": "Update file not found"
};
  english['Ошибка скачивания файла'] = 'Could not download the file';
  Object.assign(english, {
  "Сайт в оверлее": "Website in the overlay",
  "Поддержать": "Support",
  "Поддержать проект в Telegram": "Support the project on Telegram",
  "Канал @fullofowndreams в Telegram": "@fullofowndreams on Telegram",
  "Будем на связи": "Let's stay in touch",
  "Наш канал в Telegram": "Our Telegram channel",
  "Поддержка проекта": "Support the project",
  "СДЕЛАНО ДЛЯ ВАШИХ ИГР": "MADE FOR YOUR GAMES",
  "Нравится оверлей?": "Enjoying the overlay?",
  "Поддержите проект или загляните в наш Telegram. Будем рады видеть вас.": "Support the project or stop by our Telegram. We'd love to see you there.",
  "Не удалось открыть Telegram. Попробуйте ещё раз.": "Could not open Telegram. Please try again.",
  "Здесь появятся ваши любимые сайты. Добавьте первую закладку выше.": "Your favorite sites will appear here. Add your first bookmark above."
});
  let language = 'ru';
  const patterns = Object.entries(english).filter(([source]) => source.includes('{')).map(([source, target]) => {
    const names = [...source.matchAll(/\{(\w+)\}/g)].map(match => match[1]);
    const escaped = source.split(/(\{\w+\})/g).map(part => /^\{\w+\}$/.test(part) ? '(.*?)' : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('');
    return { regex: new RegExp(`^${escaped}$`), names, target };
  });
  function t(value, locale = language) {
    const source = String(value ?? '');
    if (locale !== 'en') return source;
    if (english[source]) return english[source];
    for (const { regex, names, target } of patterns) {
      const match = source.match(regex);
      if (match) return target.replace(/\{(\w+)\}/g, (_, name) => {
        const value = match[names.indexOf(name) + 1];
        return ['error', 'position'].includes(name) ? t(value, locale) : value;
      });
    }
    return source;
  }
  const staticText = [], attributes = [], dynamicText = new Map();
  function capture(document) {
    const walker = document.createTreeWalker(document.body, 4);
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentElement.closest('script, style, option, [data-no-i18n]')) continue;
      if (node.textContent.trim()) staticText.push({ node, source: node.textContent });
    }
    document.querySelectorAll('[title], [placeholder], [aria-label]').forEach(element => {
      ['title', 'placeholder', 'aria-label'].forEach(name => {
        if (element.hasAttribute(name)) attributes.push({ element, name, source: element.getAttribute(name) });
      });
    });
  }
  function setText(element, source) {
    dynamicText.set(element, String(source ?? ''));
    element.textContent = t(source);
  }
  function getSource(element) { return dynamicText.get(element) ?? element.textContent; }
  function setLanguage(locale) {
    language = locale === 'en' ? 'en' : 'ru';
    if (typeof document !== 'undefined') document.documentElement.lang = language;
    staticText.forEach(({ node, source }) => {
      if (node.isConnected) node.textContent = source.replace(source.trim(), t(source.trim()));
    });
    attributes.forEach(({ element, name, source }) => { if (element.isConnected) element.setAttribute(name, t(source)); });
    dynamicText.forEach((source, element) => {
      if (element.isConnected) element.textContent = t(source);
      else dynamicText.delete(element);
    });
  }
  const api = { t, setLanguage, capture, setText, getSource, english };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.overlayI18n = api;
})(typeof window !== 'undefined' ? window : globalThis);
