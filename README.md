# vkui-connect

Пакет для интеграции VK Apps-приложений с официальными клиентами VK для iOS, Android и Web на основе промисов.

## Подключение
```js
import * as connect from '@vkontakte/vkui-connect';
```

## Пример использования
```js
// Отправляет событие клиенту
connect.send('VKWebAppInit', {})
  .then(data => handleResponse(data))
  .catch(error => handleError(error));
```