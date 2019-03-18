/* global window, parent */
/* eslint no-restricted-globals: ["off", "parent"] */
import '@babel/polyfill';
import './custom-event-polyfill';
import getUrlParams from './get-url-params';

const FUNCTION = 'function';
const UNDEFINED = 'undefined';
const EVENT_PREFIX = 'VKWebApp';
const isClient = typeof window !== UNDEFINED;
const androidBridge = isClient && window.AndroidBridge;
const iosBridge = isClient && window.webkit && window.webkit.messageHandlers;
const isWeb = !androidBridge && !iosBridge;
const eventType = isWeb ? 'message' : 'VKWebAppEvent';
const promises = {};
let desktopEvents = [];
let method_counter = 0;

window.addEventListener(eventType, (event) => {
  let promise = null;
  let response = {};
  if (isWeb) {
    if (event.data && event.data.data) {
      response = { ...event.data };
      promise = promises[response.data.request_id];
      if (response.type === 'VkWebAppInitResult' && response.data['events_list']) {
        desktopEvents = [ ...response.data['events_list'] ];
      }
    }
  } else if (event.detail && event.detail.data) {
    response = { ...event.detail };
    promise = promises[response.data.request_id];
  }

  if (response.data && response.data.request_id) {
    promise = promises[response.data.request_id];
    if (promise) {
      if (promise.customRequestId) {
        delete response.data['request_id'];
      }
      if (response.data['error_type']) {
        return promise.reject(response);
      } else {
        return promise.resolve(response);
      }
    }
  }
});

export default (() => {
  const urlParams = getUrlParams(window.location.href);
  if (urlParams['vk_events']) {
    desktopEvents = urlParams['vk_events'].split(',').map((event) => EVENT_PREFIX + event);
  }
  return {
    /**
     * Sends a message to native client
     *
     *
     * @param {String} handler Message type
     * @param {Object} params Message data
     * @returns {Promise}
     */
    send: (handler, params) => {
      if (!params) {
        params = {};
      }
      const id = params['request_id'] ? params['request_id'] : `method#${method_counter++}`;
      let customRequestId = false;
      if (!params.hasOwnProperty('request_id')) {
        customRequestId = true;
        params['request_id'] = id;
      }

      if (androidBridge && typeof androidBridge[handler] === FUNCTION) {
        androidBridge[handler](JSON.stringify(params));
      }
      if (iosBridge && iosBridge[handler] && typeof iosBridge[handler].postMessage === FUNCTION) {
        iosBridge[handler].postMessage(params);
      }

      if (isWeb) {
        parent.postMessage({
          handler,
          params,
          type: 'vk-connect',
        }, '*');
      }

      return new Promise((resolve, reject) => {
        promises[id] = {
          resolve,
          reject,
          params,
          customRequestId,
        };
      });
    },
    supports: (handler) => {
      if (androidBridge && typeof androidBridge[handler] === FUNCTION) return true;

      if (iosBridge && iosBridge[handler] && typeof iosBridge[handler].postMessage === FUNCTION) return true;

      if (~desktopEvents.indexOf(handler)) return true;

      return false;
    },
  };
})();
