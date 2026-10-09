(function () {
  const storageKey = 'lumae.settings.preferences.v1';
  const translations = {
    'Рекомендации':'Recommendations','Настройки Lumae':'Lumae Settings','Настройте Lumae под себя':'Make Lumae yours',
    'Поиск настроек':'Search settings','По этому запросу настроек не найдено.':'No settings match your search.',
    'Язык':'Language','Регион':'Region','Часовой пояс':'Time zone','Валюта':'Currency','Единицы измерения':'Measurement units',
    'Автозапуск':'Start automatically','Загрузка только по Wi-Fi':'Wi-Fi only downloads','Экономия трафика':'Data saver',
    'Версия Lumae':'Lumae version','Поддержка и сообщение об ошибке':'Support and report a problem','Региональные параметры':'Regional preferences',
    'Аккаунт':'Account','Профиль':'Profile','Lumae ID':'Lumae ID','Имя пользователя':'Username','Смена пароля':'Change password',
    'Сессии и устройства':'Sessions and devices','Входы в аккаунт':'Login activity','Двухфакторная защита':'Two-factor authentication','Удаление аккаунта':'Delete account',
    'Приватность':'Privacy','Кто может писать':'Who can message me','Кто может комментировать':'Who can comment','Кто видит профиль':'Who can view my profile',
    'Кто видит мои публикации':'Who can view my posts','Скрытый профиль':'Private profile','Скрытые чаты':'Hidden chats','Статус «в сети»':'Online status',
    'Последний визит':'Last seen','Видимость лайков':'Like visibility','Видимость подписок':'Following visibility','Блокировки':'Blocked users','Разрешения приложений':'App permissions',
    'Уведомления':'Notifications','Лайки':'Likes','Комментарии':'Comments','Сообщения':'Messages','Подписки':'Follows','Упоминания':'Mentions',
    'Рекомендации':'Recommendations','Обновления Lumae':'Lumae updates','Тихий режим':'Quiet hours',
    'Музыка':'Music','Качество воспроизведения':'Playback quality','Качество загрузки':'Download quality','Автовоспроизведение':'Autoplay',
    'Повтор':'Repeat','Перемешивание':'Shuffle','Эквалайзер':'Equalizer','Нормализация громкости':'Volume normalization','Таймер сна':'Sleep timer',
    'История прослушивания':'Listening history','Скачанные треки':'Downloaded tracks','Управление хранилищем':'Storage management','Музыка в фоне':'Background playback',
    'Заметки':'Notes','Сортировка':'Sort','Вид':'View','Автосохранение':'Autosave','Синхронизация':'Sync','Закреплённые заметки':'Pinned notes',
    'Цвета заметок':'Note colors','Шрифт':'Font','Размер текста':'Text size','Пароль на заметки':'Notes passcode','Архив':'Archive','Корзина':'Trash','Экспорт':'Export','Импорт':'Import',
    'Полотно':'Canvas','Сетка':'Grid','Направляющие':'Guides','Привязка объектов':'Snap to objects','Масштаб':'Zoom','Качество':'Quality',
    'Анимации':'Animations','3D-режим':'3D mode','Физика объектов':'Object physics','История изменений':'Version history','Экспорт полотна':'Export canvas','Совместный доступ':'Share access',
    'Календарь':'Calendar','Первый день недели':'First day of week','Напоминания':'Reminders','Повторяющиеся события':'Recurring events','Общие календари':'Shared calendars',
    'Чаты':'Chats','Тема чатов':'Chat theme','Фон':'Background','Автозагрузка медиа':'Auto-download media','Качество изображений':'Image quality',
    'Звуки сообщений':'Message sounds','Прочитано / не прочитано':'Read receipts','Исчезающие сообщения':'Disappearing messages','Шифрование':'Encryption','Резервное копирование':'Backups',
    'Лента':'Feed','Частота рекомендаций':'Recommendation frequency','Показывать похожее':'Show similar content','Учитывать подписки':'Use followed accounts',
    'Локальные рекомендации':'Local recommendations','Перестроить рекомендации':'Rebuild recommendations','Перестроить':'Rebuild','Сбросить локальные предпочтения ленты':'Reset local feed preferences',
    'Внешний вид':'Appearance','Оформление':'Customization','Тема и оформление':'Theme and appearance','Тема':'Theme','Светлая':'Light','Тёмная':'Dark','Системная':'System','Акцентный цвет':'Accent color',
    'Шрифт интерфейса':'Interface font','Размер интерфейса':'Interface size','Анимации интерфейса':'Interface animations','Эффекты интерфейса':'Interface effects','Размытие':'Blur',
    'Компактный режим':'Compact mode','Собственный фото- или видеофон':'Custom photo or video background','Оформление профиля и чатов':'Profile and chat appearance',
    'Данные и синхронизация':'Data and sync','Хранилище':'Storage','Резервная копия':'Backup','Кэш':'Cache','Скачать локальные настройки':'Download local settings',
    'Устройства':'Devices','Активные устройства':'Active devices','Это устройство':'This device','Общие':'General','Региональные параметры':'Regional preferences',
    'Подписка':'Subscription','Бесплатно':'Free','Написать':'Write','Сохранить':'Save','Отмена':'Cancel','Закрыть':'Close','Удалить':'Delete',
    'Создать':'Create','Поиск':'Search','Загрузить':'Upload','Выбрать файл':'Choose file','Назад':'Back','Далее':'Next','Готово':'Done',
    'Добавить':'Add','Редактировать':'Edit','Поделиться':'Share','Копировать':'Copy','Скопировано':'Copied','Опубликовать':'Publish','Публикация':'Post',
    'Новая публикация':'New post','Написать пост':'Write a post','Пока нет комментариев.':'No comments yet.','Написать комментарий...':'Write a comment...',
    'Отправить':'Send','Загружаем рекомендации':'Loading recommendations','Сохранить заметку':'Save note','Новая заметка':'New note',
    'Создать заметку':'Create note','Создать папку':'Create folder','Новая папка':'New folder','Все заметки':'All notes','Мои заметки':'My notes',
    'Плейлисты':'Playlists','Избранное':'Favorites','Альбомы':'Albums','Все треки':'All tracks','Моя музыка':'My music','Добавить трек':'Add track',
    'Воспроизвести':'Play','Пауза':'Pause','Следующий трек':'Next track','Предыдущий трек':'Previous track','Поиск музыки':'Search music',
    'Светлая тема':'Light theme','Тёмная тема':'Dark theme','Скачать JSON':'Download JSON','English':'English','Русский':'Русский',
    'Без подписки':'No subscription','Базовый доступ':'Basic access','Приватный доступ':'Private access','Медиа пакет':'Media package','Максимум пространства':'Maximum storage',
    'Заметка':'note','заметок':'notes','Папки':'Folders','Здесь пока пусто':'Nothing here yet','Тут лежат заметки без папки. Остальные открываются внутри своих папок':'Unfiled notes appear here. Other notes are inside their folders.',
    'Хранилище':'Storage','Обычные папки':'Regular folders','VIP папки и приватные вложения':'VIP folders and private attachments','Тарифы':'Plans',
    'Сегодня':'Today','Воскресенье':'Sunday','Понедельник':'Monday','Вт':'Tue','Ср':'Wed','Чт':'Thu','Пт':'Fri','Сб':'Sat','Вс':'Sun',
    'Нет результатов':'No results','Загрузка':'Loading','Загрузка...':'Loading...','Сохранено':'Saved','Не сохранено':'Not saved',
    'Управление':'Manage','Настройки':'Settings','Главная':'Home','Команда':'Team','Открыть':'Open','Открыть заметку':'Open note',
    'Лента':'Feed','Войдите в Lumae':'Sign in to Lumae','Вход в Lumae':'Sign in to Lumae','Войди в аккаунт или создай новый, чтобы пользоваться Lumae.':'Sign in or create an account to use Lumae.',
    'Создать профиль':'Create profile','Войти':'Sign in','Создать аккаунт':'Create account','Продолжить без аккаунта':'Continue without an account','Почта':'Email','Пароль':'Password','Забыли пароль?':'Forgot password?',
    'Ошибка':'Error','Успешно':'Done','Недоступно':'Unavailable','Не подключено':'Not connected','Бета-тест · 0.1.1':'Beta test · 0.1.1',
    'Плейлист':'Playlist','Трек':'Track','Треки':'Tracks','Профиль пользователя':'User profile','Поиск публикаций':'Search posts',
    'Фото или видео':'Photo or video','Свой фон':'Custom background','Сохранить изменения':'Save changes','Публикация создана':'Post published',
    'Заметки — Lumae':'Notes — Lumae','Меню папки':'Folder menu',' МБ из ':' MB of ',' ГБ из ':' GB of ','МБ из':'MB of','ГБ из':'GB of','МБ':'MB','ГБ':'GB',
    'Синхронизация между устройствами':'Sync across devices','Предпросмотр файлов':'File preview','Оформление':'Appearance','Файл':'File','Файлы':'Files',
    'Недавние':'Recent','Недавно':'Recently','Не удалось загрузить':'Could not load','Показать ещё':'Show more','Показать все':'Show all',
    'Свойства':'Properties','Переименовать':'Rename','Переместить':'Move','Закрепить':'Pin','Открепить':'Unpin','Переместить в корзину':'Move to trash',
    'Введите название':'Enter a name','Название':'Name','Описание':'Description','Без названия':'Untitled','Пусто':'Empty','Ничего не найдено':'Nothing found'
    ,'Маленький':'Small','Обычный':'Normal','Крупный':'Large','Персональный фон Premium пока не подключён':'Premium background is not available yet','Персональные темы Premium пока не подключены':'Premium themes are not available yet',
    'Не подключено':'Not connected','Бета-тест':'Beta test','Без темы':'No theme','Частная':'Private','Публичная':'Public','Добавить музыку':'Add music',
    'Заметки и оформление':'Notes and appearance','Видео на фоне обложки — Premium':'Video cover backgrounds — Premium','Крупная обложка и большая кнопка play — Premium':'Large cover and play button — Premium',
    'Свой фон':'Custom background','Без результатов поиска':'No search results','Загрузить аудио':'Upload audio','Загрузить музыку':'Upload music','Выбрать аудиофайл':'Choose audio file'
  };
  const reverse = new Map(Object.entries(translations).map(([ru, en]) => [en, ru]));
  const reverseTranslations = Object.fromEntries(reverse);
  let sortedTranslations = Object.entries(translations).sort((a, b) => b[0].length - a[0].length);
  const originalText = new WeakMap();
  const originalAttrs = new WeakMap();
  let language = 'English';
  let observer;

  function savedLanguage() {
    try { return JSON.parse(localStorage.getItem(storageKey) || '{}')['general.language'] || 'English'; }
    catch { return 'English'; }
  }
  function applyAppearance() {
    let values = {};
    try { values = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch {}
    const font = values['appearance.font'] || 'Системный';
    const fonts = {'Системный':'system-ui, sans-serif','Arial':'Arial, sans-serif','Verdana':'Verdana, sans-serif','Tahoma':'Tahoma, sans-serif','Trebuchet MS':'"Trebuchet MS", sans-serif','Georgia':'Georgia, serif','Times New Roman':'"Times New Roman", serif','Courier New':'"Courier New", monospace'};
    document.documentElement.style.setProperty('--lumae-font-family', fonts[font] || fonts['Системный']);
    if (document.body) document.body.style.fontFamily = fonts[font] || fonts['Системный'];
    const theme = ({System:'Системная',Light:'Светлая',Dark:'Тёмная'})[values['appearance.theme']] || values['appearance.theme'] || 'Системная';
    const dark = theme === 'Тёмная' || theme === 'AMOLED' || (theme === 'Системная' && matchMedia('(prefers-color-scheme: dark)').matches);
    if (document.body) {
      document.body.classList.toggle('dark', dark);
      document.body.setAttribute('data-theme', dark ? 'dark' : 'light');
      document.body.classList.toggle('lumae-settings-dark', dark);
      document.body.classList.toggle('lumae-settings-amoled', theme === 'AMOLED');
    }
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    if (values['appearance.accent']) document.documentElement.style.setProperty('--settings-accent', values['appearance.accent']);
    const size = ({Small:'Маленький',Normal:'Обычный',Large:'Крупный'})[values['appearance.text']] || values['appearance.text'];
    if (document.body && size) document.body.style.fontSize = size === 'Крупный' ? '17px' : size === 'Маленький' ? '13px' : '';
  }
  function translateTextNode(node) {
    if (!node || node.nodeType !== Node.TEXT_NODE || !node.parentElement) return;
      if (!originalText.has(node)) originalText.set(node, node.nodeValue);
      const initial = originalText.get(node);
      const trimmed = initial.trim();
      if (!trimmed) return;
      let next = initial;
      const dictionary = language === 'English' ? translations : reverseTranslations;
      if (language === 'Русский' && !Object.keys(dictionary).some(source => initial.includes(source))) {
        if (node.nodeValue !== initial) node.nodeValue = initial;
        return;
      }
      for (const [source, target] of sortedTranslations) {
        if (next.includes(source)) next = next.split(source).join(target);
      }
      if (next !== initial) {
        if (node.nodeValue !== next) node.nodeValue = next;
      }
  }
  function translate(root) {
    if (!root || (root !== document && !root.ownerDocument)) return;
    if (root.nodeType === Node.TEXT_NODE) {
      translateTextNode(root);
      return;
    }
    if (typeof root.querySelectorAll !== 'function') return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) translateTextNode(node);
    const elements = root.nodeType === Node.ELEMENT_NODE ? [root, ...root.querySelectorAll('*')] : [...root.querySelectorAll('*')];
    for (const element of elements) {
      for (const attr of ['placeholder', 'title', 'aria-label']) {
        if (!element.hasAttribute?.(attr)) continue;
        let originals = originalAttrs.get(element);
        if (!originals) originalAttrs.set(element, originals = {});
        if (!(attr in originals)) originals[attr] = element.getAttribute(attr);
        const value = originals[attr];
        const replacement = language === 'English' ? translations[value] : reverse.get(value);
        if (replacement && element.getAttribute(attr) !== replacement) element.setAttribute(attr, replacement);
      }
    }
  }
  function setLanguage(next, persist = true) {
    language = next === 'Русский' ? 'Русский' : 'English';
    sortedTranslations = Object.entries(language === 'English' ? translations : reverseTranslations)
      .sort((a, b) => b[0].length - a[0].length);
    document.documentElement.lang = language === 'Русский' ? 'ru' : 'en';
    if (persist) {
      try {
        const values = JSON.parse(localStorage.getItem(storageKey) || '{}');
        values['general.language'] = language;
        localStorage.setItem(storageKey, JSON.stringify(values));
      } catch {}
    }
    translate(document.body);
    applyAppearance();
    const title = document.querySelector('title');
    if (title) {
      const titleMap = language === 'English' ? translations : Object.fromEntries(reverse);
      const nextTitle = titleMap[title.textContent] || title.textContent;
      if (nextTitle !== title.textContent) title.textContent = nextTitle;
    }
    window.dispatchEvent(new CustomEvent('lumae:languagechange', { detail: { language } }));
  }
  function start() {
    setLanguage(savedLanguage(), false);
    observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'childList') record.addedNodes.forEach(node => { if (node.nodeType === 1 || node.nodeType === 3) translate(node); });
        else if (record.type === 'characterData') translate(record.target);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener('storage', event => { if (event.key === storageKey) { setLanguage(savedLanguage(), false); applyAppearance(); } });
    matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyAppearance);
  }
  window.LumaeI18n = { setLanguage, getLanguage: () => language, translate };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
