'use strict';

const axios = require('axios');

const BASE_URL = process.env.CLI_BASE_URL || 'https://mock.apifox.cn/m1/2300795-0-default';

const request = axios.create({
  baseURL: BASE_URL,
  timeout: 5000
});

request.interceptors.response.use(
  (response) => {
    if (response.status === 200) {
      return response.data;
    }
  },
  (err) => {
    return Promise.reject(err);
  }
);

module.exports = request;
