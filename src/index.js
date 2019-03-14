import '@babel/polyfill';
import './custom-event-polyfill';
/* global window, parent */
/* eslint no-restricted-globals: ["off", "parent"] */

const FUNCTION = 'function';
const UNDEFINED = 'undefined';
const isWeb = typeof window !== UNDEFINED && !window.AndroidBridge && !window.webkit;
const eventType = isWeb ? 'message' : 'VKWebAppEvent';
const promises = {};
let method_counter = 0;

window.addEventListener(eventType, (event) => {
  let promise = null;
  let reponse = {};
  if (isWeb) {
    if (event.data && event.data.data) {
      reponse = { ...event.data };
      promise = promises[reponse.data.request_id];
    }
  } else if (event.detail && event.detail.data) {
    reponse = { ...event.detail };
    promise = promises[reponse.data.request_id];
  }
  if (reponse.data && reponse.data.request_id) {
    promise = promises[reponse.data.request_id];
    if (promise) {
      if (promise.customRequestId) {
        delete reponse.data['request_id'];
      }
      if (reponse.data['error_type']) {
        promise.reject(reponse);
      } else {
        promise.resolve(reponse);
      }
    }
  }
});

export default {
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

    var isClient = typeof window !== UNDEFINED;
    var androidBridge = isClient && window.AndroidBridge;
    var iosBridge = isClient && window.webkit && window.webkit.messageHandlers;
    var isDesktop = !androidBridge && !iosBridge;
    var id = params['request_id'] ? params['request_id'] : `method#${method_counter++}`;
    var customRequestId = false;
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

    if (isDesktop) {
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
};
