'use strict';
const items = require('../../../source/js/site-navigation');
hexo.extend.helper.register('site_navigation_items', () => items);
