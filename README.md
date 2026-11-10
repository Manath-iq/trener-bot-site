# Дарья — персональный фитнес-тренер (Нижнекамск)

Статический сайт-визитка на GitHub Pages: https://manath-iq.github.io/trener-bot-site/

## Структура

- `index.html` — вся разметка страницы
- `assets/css/styles.css` — стили и цветовые токены
- `assets/js/app.js` — скрипты (тема, анимации, Telegram и др.), настройки в объекте `CONFIG`
- `assets/fonts/` — локальные шрифты (`fonts.css` + woff2)
- `assets/img/` — фотографии и favicon

## Локальный запуск

```bash
python -m http.server 8000
```

Затем открыть http://localhost:8000

## Что где править

- **Цены** — секция `#formats` в `index.html`, строки `li.pricerow` (название в `.pricerow__main`, цена в `.pricebox`).
- **Отзывы** — секция `#reviews`, блоки `article.review` с датой `<time datetime="ГГГГ-ММ-ДД">`. Новые отзывы добавлять сверху (сначала свежие).
- **Контакты** — Telegram `iamddasha1` (ссылки `t.me` в `index.html` и `CONFIG.telegram` в `app.js`), Instagram `iamddasha`, WhatsApp `wa.me/79178510187` и телефон `tel:+79178510187`.

## Тема

Светлая/тёмная: по умолчанию следует системной настройке; выбор переключателем сохраняется в `localStorage` под ключом `theme`. Цвета задаются CSS-токенами в `:root` файла `styles.css` (тёмные значения — в блоках `prefers-color-scheme: dark` и `:root[data-theme="dark"]`).

## Сброс кэша

В `index.html` к `styles.css` и `app.js` добавлен параметр `?v=N`. После изменения файла увеличьте номер, иначе браузеры могут показывать старую версию.
