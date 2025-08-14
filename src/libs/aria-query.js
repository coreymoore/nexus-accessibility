var AriaQuery = (function (exports) {
  'use strict';

  var lib = {};

  var ariaPropsMap = {};

  var iterationDecorator = {};

  var iteratorProxy = {};

  var hasRequiredIteratorProxy;

  function requireIteratorProxy () {
  	if (hasRequiredIteratorProxy) return iteratorProxy;
  	hasRequiredIteratorProxy = 1;

  	Object.defineProperty(iteratorProxy, "__esModule", {
  	  value: true
  	});
  	iteratorProxy.default = void 0;
  	// eslint-disable-next-line no-unused-vars
  	function iteratorProxy$1() {
  	  var values = this;
  	  var index = 0;
  	  var iter = {
  	    '@@iterator': function iterator() {
  	      return iter;
  	    },
  	    next: function next() {
  	      if (index < values.length) {
  	        var value = values[index];
  	        index = index + 1;
  	        return {
  	          done: false,
  	          value: value
  	        };
  	      } else {
  	        return {
  	          done: true
  	        };
  	      }
  	    }
  	  };
  	  return iter;
  	}
  	iteratorProxy.default = iteratorProxy$1;
  	return iteratorProxy;
  }

  var hasRequiredIterationDecorator;

  function requireIterationDecorator () {
  	if (hasRequiredIterationDecorator) return iterationDecorator;
  	hasRequiredIterationDecorator = 1;

  	Object.defineProperty(iterationDecorator, "__esModule", {
  	  value: true
  	});
  	iterationDecorator.default = iterationDecorator$1;
  	var _iteratorProxy = _interopRequireDefault(requireIteratorProxy());
  	function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  	function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
  	function iterationDecorator$1(collection, entries) {
  	  if (typeof Symbol === 'function' && _typeof(Symbol.iterator) === 'symbol') {
  	    Object.defineProperty(collection, Symbol.iterator, {
  	      value: _iteratorProxy.default.bind(entries)
  	    });
  	  }
  	  return collection;
  	}
  	return iterationDecorator;
  }

  var hasRequiredAriaPropsMap;

  function requireAriaPropsMap () {
  	if (hasRequiredAriaPropsMap) return ariaPropsMap;
  	hasRequiredAriaPropsMap = 1;

  	Object.defineProperty(ariaPropsMap, "__esModule", {
  	  value: true
  	});
  	ariaPropsMap.default = void 0;
  	var _iterationDecorator = _interopRequireDefault(requireIterationDecorator());
  	function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  	function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
  	function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
  	function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
  	function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
  	function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = true, o = false; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = true, n = r; } finally { try { if (!f && null != t.return && (u = t.return(), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
  	function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
  	var properties = [['aria-activedescendant', {
  	  'type': 'id'
  	}], ['aria-atomic', {
  	  'type': 'boolean'
  	}], ['aria-autocomplete', {
  	  'type': 'token',
  	  'values': ['inline', 'list', 'both', 'none']
  	}], ['aria-braillelabel', {
  	  'type': 'string'
  	}], ['aria-brailleroledescription', {
  	  'type': 'string'
  	}], ['aria-busy', {
  	  'type': 'boolean'
  	}], ['aria-checked', {
  	  'type': 'tristate'
  	}], ['aria-colcount', {
  	  type: 'integer'
  	}], ['aria-colindex', {
  	  type: 'integer'
  	}], ['aria-colspan', {
  	  type: 'integer'
  	}], ['aria-controls', {
  	  'type': 'idlist'
  	}], ['aria-current', {
  	  type: 'token',
  	  values: ['page', 'step', 'location', 'date', 'time', true, false]
  	}], ['aria-describedby', {
  	  'type': 'idlist'
  	}], ['aria-description', {
  	  'type': 'string'
  	}], ['aria-details', {
  	  'type': 'id'
  	}], ['aria-disabled', {
  	  'type': 'boolean'
  	}], ['aria-dropeffect', {
  	  'type': 'tokenlist',
  	  'values': ['copy', 'execute', 'link', 'move', 'none', 'popup']
  	}], ['aria-errormessage', {
  	  'type': 'id'
  	}], ['aria-expanded', {
  	  'type': 'boolean',
  	  'allowundefined': true
  	}], ['aria-flowto', {
  	  'type': 'idlist'
  	}], ['aria-grabbed', {
  	  'type': 'boolean',
  	  'allowundefined': true
  	}], ['aria-haspopup', {
  	  'type': 'token',
  	  'values': [false, true, 'menu', 'listbox', 'tree', 'grid', 'dialog']
  	}], ['aria-hidden', {
  	  'type': 'boolean',
  	  'allowundefined': true
  	}], ['aria-invalid', {
  	  'type': 'token',
  	  'values': ['grammar', false, 'spelling', true]
  	}], ['aria-keyshortcuts', {
  	  type: 'string'
  	}], ['aria-label', {
  	  'type': 'string'
  	}], ['aria-labelledby', {
  	  'type': 'idlist'
  	}], ['aria-level', {
  	  'type': 'integer'
  	}], ['aria-live', {
  	  'type': 'token',
  	  'values': ['assertive', 'off', 'polite']
  	}], ['aria-modal', {
  	  type: 'boolean'
  	}], ['aria-multiline', {
  	  'type': 'boolean'
  	}], ['aria-multiselectable', {
  	  'type': 'boolean'
  	}], ['aria-orientation', {
  	  'type': 'token',
  	  'values': ['vertical', 'undefined', 'horizontal']
  	}], ['aria-owns', {
  	  'type': 'idlist'
  	}], ['aria-placeholder', {
  	  type: 'string'
  	}], ['aria-posinset', {
  	  'type': 'integer'
  	}], ['aria-pressed', {
  	  'type': 'tristate'
  	}], ['aria-readonly', {
  	  'type': 'boolean'
  	}], ['aria-relevant', {
  	  'type': 'tokenlist',
  	  'values': ['additions', 'all', 'removals', 'text']
  	}], ['aria-required', {
  	  'type': 'boolean'
  	}], ['aria-roledescription', {
  	  type: 'string'
  	}], ['aria-rowcount', {
  	  type: 'integer'
  	}], ['aria-rowindex', {
  	  type: 'integer'
  	}], ['aria-rowspan', {
  	  type: 'integer'
  	}], ['aria-selected', {
  	  'type': 'boolean',
  	  'allowundefined': true
  	}], ['aria-setsize', {
  	  'type': 'integer'
  	}], ['aria-sort', {
  	  'type': 'token',
  	  'values': ['ascending', 'descending', 'none', 'other']
  	}], ['aria-valuemax', {
  	  'type': 'number'
  	}], ['aria-valuemin', {
  	  'type': 'number'
  	}], ['aria-valuenow', {
  	  'type': 'number'
  	}], ['aria-valuetext', {
  	  'type': 'string'
  	}]];
  	var ariaPropsMap$1 = {
  	  entries: function entries() {
  	    return properties;
  	  },
  	  forEach: function forEach(fn) {
  	    var thisArg = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  	    for (var _i = 0, _properties = properties; _i < _properties.length; _i++) {
  	      var _properties$_i = _slicedToArray(_properties[_i], 2),
  	        key = _properties$_i[0],
  	        values = _properties$_i[1];
  	      fn.call(thisArg, values, key, properties);
  	    }
  	  },
  	  get: function get(key) {
  	    var item = properties.filter(function (tuple) {
  	      return tuple[0] === key ? true : false;
  	    })[0];
  	    return item && item[1];
  	  },
  	  has: function has(key) {
  	    return !!ariaPropsMap$1.get(key);
  	  },
  	  keys: function keys() {
  	    return properties.map(function (_ref) {
  	      var _ref2 = _slicedToArray(_ref, 1),
  	        key = _ref2[0];
  	      return key;
  	    });
  	  },
  	  values: function values() {
  	    return properties.map(function (_ref3) {
  	      var _ref4 = _slicedToArray(_ref3, 2),
  	        values = _ref4[1];
  	      return values;
  	    });
  	  }
  	};
  	ariaPropsMap.default = (0, _iterationDecorator.default)(ariaPropsMap$1, ariaPropsMap$1.entries());
  	return ariaPropsMap;
  }

  var domMap = {};

  var hasRequiredDomMap;

  function requireDomMap () {
  	if (hasRequiredDomMap) return domMap;
  	hasRequiredDomMap = 1;

  	Object.defineProperty(domMap, "__esModule", {
  	  value: true
  	});
  	domMap.default = void 0;
  	var _iterationDecorator = _interopRequireDefault(requireIterationDecorator());
  	function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  	function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
  	function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
  	function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
  	function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
  	function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = true, o = false; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = true, n = r; } finally { try { if (!f && null != t.return && (u = t.return(), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
  	function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
  	var dom = [['a', {
  	  reserved: false
  	}], ['abbr', {
  	  reserved: false
  	}], ['acronym', {
  	  reserved: false
  	}], ['address', {
  	  reserved: false
  	}], ['applet', {
  	  reserved: false
  	}], ['area', {
  	  reserved: false
  	}], ['article', {
  	  reserved: false
  	}], ['aside', {
  	  reserved: false
  	}], ['audio', {
  	  reserved: false
  	}], ['b', {
  	  reserved: false
  	}], ['base', {
  	  reserved: true
  	}], ['bdi', {
  	  reserved: false
  	}], ['bdo', {
  	  reserved: false
  	}], ['big', {
  	  reserved: false
  	}], ['blink', {
  	  reserved: false
  	}], ['blockquote', {
  	  reserved: false
  	}], ['body', {
  	  reserved: false
  	}], ['br', {
  	  reserved: false
  	}], ['button', {
  	  reserved: false
  	}], ['canvas', {
  	  reserved: false
  	}], ['caption', {
  	  reserved: false
  	}], ['center', {
  	  reserved: false
  	}], ['cite', {
  	  reserved: false
  	}], ['code', {
  	  reserved: false
  	}], ['col', {
  	  reserved: true
  	}], ['colgroup', {
  	  reserved: true
  	}], ['content', {
  	  reserved: false
  	}], ['data', {
  	  reserved: false
  	}], ['datalist', {
  	  reserved: false
  	}], ['dd', {
  	  reserved: false
  	}], ['del', {
  	  reserved: false
  	}], ['details', {
  	  reserved: false
  	}], ['dfn', {
  	  reserved: false
  	}], ['dialog', {
  	  reserved: false
  	}], ['dir', {
  	  reserved: false
  	}], ['div', {
  	  reserved: false
  	}], ['dl', {
  	  reserved: false
  	}], ['dt', {
  	  reserved: false
  	}], ['em', {
  	  reserved: false
  	}], ['embed', {
  	  reserved: false
  	}], ['fieldset', {
  	  reserved: false
  	}], ['figcaption', {
  	  reserved: false
  	}], ['figure', {
  	  reserved: false
  	}], ['font', {
  	  reserved: false
  	}], ['footer', {
  	  reserved: false
  	}], ['form', {
  	  reserved: false
  	}], ['frame', {
  	  reserved: false
  	}], ['frameset', {
  	  reserved: false
  	}], ['h1', {
  	  reserved: false
  	}], ['h2', {
  	  reserved: false
  	}], ['h3', {
  	  reserved: false
  	}], ['h4', {
  	  reserved: false
  	}], ['h5', {
  	  reserved: false
  	}], ['h6', {
  	  reserved: false
  	}], ['head', {
  	  reserved: true
  	}], ['header', {
  	  reserved: false
  	}], ['hgroup', {
  	  reserved: false
  	}], ['hr', {
  	  reserved: false
  	}], ['html', {
  	  reserved: true
  	}], ['i', {
  	  reserved: false
  	}], ['iframe', {
  	  reserved: false
  	}], ['img', {
  	  reserved: false
  	}], ['input', {
  	  reserved: false
  	}], ['ins', {
  	  reserved: false
  	}], ['kbd', {
  	  reserved: false
  	}], ['keygen', {
  	  reserved: false
  	}], ['label', {
  	  reserved: false
  	}], ['legend', {
  	  reserved: false
  	}], ['li', {
  	  reserved: false
  	}], ['link', {
  	  reserved: true
  	}], ['main', {
  	  reserved: false
  	}], ['map', {
  	  reserved: false
  	}], ['mark', {
  	  reserved: false
  	}], ['marquee', {
  	  reserved: false
  	}], ['menu', {
  	  reserved: false
  	}], ['menuitem', {
  	  reserved: false
  	}], ['meta', {
  	  reserved: true
  	}], ['meter', {
  	  reserved: false
  	}], ['nav', {
  	  reserved: false
  	}], ['noembed', {
  	  reserved: true
  	}], ['noscript', {
  	  reserved: true
  	}], ['object', {
  	  reserved: false
  	}], ['ol', {
  	  reserved: false
  	}], ['optgroup', {
  	  reserved: false
  	}], ['option', {
  	  reserved: false
  	}], ['output', {
  	  reserved: false
  	}], ['p', {
  	  reserved: false
  	}], ['param', {
  	  reserved: true
  	}], ['picture', {
  	  reserved: true
  	}], ['pre', {
  	  reserved: false
  	}], ['progress', {
  	  reserved: false
  	}], ['q', {
  	  reserved: false
  	}], ['rp', {
  	  reserved: false
  	}], ['rt', {
  	  reserved: false
  	}], ['rtc', {
  	  reserved: false
  	}], ['ruby', {
  	  reserved: false
  	}], ['s', {
  	  reserved: false
  	}], ['samp', {
  	  reserved: false
  	}], ['script', {
  	  reserved: true
  	}], ['section', {
  	  reserved: false
  	}], ['select', {
  	  reserved: false
  	}], ['small', {
  	  reserved: false
  	}], ['source', {
  	  reserved: true
  	}], ['spacer', {
  	  reserved: false
  	}], ['span', {
  	  reserved: false
  	}], ['strike', {
  	  reserved: false
  	}], ['strong', {
  	  reserved: false
  	}], ['style', {
  	  reserved: true
  	}], ['sub', {
  	  reserved: false
  	}], ['summary', {
  	  reserved: false
  	}], ['sup', {
  	  reserved: false
  	}], ['table', {
  	  reserved: false
  	}], ['tbody', {
  	  reserved: false
  	}], ['td', {
  	  reserved: false
  	}], ['textarea', {
  	  reserved: false
  	}], ['tfoot', {
  	  reserved: false
  	}], ['th', {
  	  reserved: false
  	}], ['thead', {
  	  reserved: false
  	}], ['time', {
  	  reserved: false
  	}], ['title', {
  	  reserved: true
  	}], ['tr', {
  	  reserved: false
  	}], ['track', {
  	  reserved: true
  	}], ['tt', {
  	  reserved: false
  	}], ['u', {
  	  reserved: false
  	}], ['ul', {
  	  reserved: false
  	}], ['var', {
  	  reserved: false
  	}], ['video', {
  	  reserved: false
  	}], ['wbr', {
  	  reserved: false
  	}], ['xmp', {
  	  reserved: false
  	}]];
  	var domMap$1 = {
  	  entries: function entries() {
  	    return dom;
  	  },
  	  forEach: function forEach(fn) {
  	    var thisArg = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  	    for (var _i = 0, _dom = dom; _i < _dom.length; _i++) {
  	      var _dom$_i = _slicedToArray(_dom[_i], 2),
  	        key = _dom$_i[0],
  	        values = _dom$_i[1];
  	      fn.call(thisArg, values, key, dom);
  	    }
  	  },
  	  get: function get(key) {
  	    var item = dom.filter(function (tuple) {
  	      return tuple[0] === key ? true : false;
  	    })[0];
  	    return item && item[1];
  	  },
  	  has: function has(key) {
  	    return !!domMap$1.get(key);
  	  },
  	  keys: function keys() {
  	    return dom.map(function (_ref) {
  	      var _ref2 = _slicedToArray(_ref, 1),
  	        key = _ref2[0];
  	      return key;
  	    });
  	  },
  	  values: function values() {
  	    return dom.map(function (_ref3) {
  	      var _ref4 = _slicedToArray(_ref3, 2),
  	        values = _ref4[1];
  	      return values;
  	    });
  	  }
  	};
  	domMap.default = (0, _iterationDecorator.default)(domMap$1, domMap$1.entries());
  	return domMap;
  }

  var rolesMap = {};

  var ariaAbstractRoles = {};

  var commandRole = {};

  var hasRequiredCommandRole;

  function requireCommandRole () {
  	if (hasRequiredCommandRole) return commandRole;
  	hasRequiredCommandRole = 1;

  	Object.defineProperty(commandRole, "__esModule", {
  	  value: true
  	});
  	commandRole.default = void 0;
  	var commandRole$1 = {
  	  abstract: true,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {},
  	  relatedConcepts: [],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'widget']]
  	};
  	commandRole.default = commandRole$1;
  	return commandRole;
  }

  var compositeRole = {};

  var hasRequiredCompositeRole;

  function requireCompositeRole () {
  	if (hasRequiredCompositeRole) return compositeRole;
  	hasRequiredCompositeRole = 1;

  	Object.defineProperty(compositeRole, "__esModule", {
  	  value: true
  	});
  	compositeRole.default = void 0;
  	var compositeRole$1 = {
  	  abstract: true,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-activedescendant': null,
  	    'aria-disabled': null
  	  },
  	  relatedConcepts: [],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'widget']]
  	};
  	compositeRole.default = compositeRole$1;
  	return compositeRole;
  }

  var inputRole = {};

  var hasRequiredInputRole;

  function requireInputRole () {
  	if (hasRequiredInputRole) return inputRole;
  	hasRequiredInputRole = 1;

  	Object.defineProperty(inputRole, "__esModule", {
  	  value: true
  	});
  	inputRole.default = void 0;
  	var inputRole$1 = {
  	  abstract: true,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-disabled': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'input'
  	    },
  	    module: 'XForms'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'widget']]
  	};
  	inputRole.default = inputRole$1;
  	return inputRole;
  }

  var landmarkRole = {};

  var hasRequiredLandmarkRole;

  function requireLandmarkRole () {
  	if (hasRequiredLandmarkRole) return landmarkRole;
  	hasRequiredLandmarkRole = 1;

  	Object.defineProperty(landmarkRole, "__esModule", {
  	  value: true
  	});
  	landmarkRole.default = void 0;
  	var landmarkRole$1 = {
  	  abstract: true,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {},
  	  relatedConcepts: [],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section']]
  	};
  	landmarkRole.default = landmarkRole$1;
  	return landmarkRole;
  }

  var rangeRole = {};

  var hasRequiredRangeRole;

  function requireRangeRole () {
  	if (hasRequiredRangeRole) return rangeRole;
  	hasRequiredRangeRole = 1;

  	Object.defineProperty(rangeRole, "__esModule", {
  	  value: true
  	});
  	rangeRole.default = void 0;
  	var rangeRole$1 = {
  	  abstract: true,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-valuemax': null,
  	    'aria-valuemin': null,
  	    'aria-valuenow': null
  	  },
  	  relatedConcepts: [],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure']]
  	};
  	rangeRole.default = rangeRole$1;
  	return rangeRole;
  }

  var roletypeRole = {};

  var hasRequiredRoletypeRole;

  function requireRoletypeRole () {
  	if (hasRequiredRoletypeRole) return roletypeRole;
  	hasRequiredRoletypeRole = 1;

  	Object.defineProperty(roletypeRole, "__esModule", {
  	  value: true
  	});
  	roletypeRole.default = void 0;
  	var roletypeRole$1 = {
  	  abstract: true,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: [],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-atomic': null,
  	    'aria-busy': null,
  	    'aria-controls': null,
  	    'aria-current': null,
  	    'aria-describedby': null,
  	    'aria-details': null,
  	    'aria-dropeffect': null,
  	    'aria-flowto': null,
  	    'aria-grabbed': null,
  	    'aria-hidden': null,
  	    'aria-keyshortcuts': null,
  	    'aria-label': null,
  	    'aria-labelledby': null,
  	    'aria-live': null,
  	    'aria-owns': null,
  	    'aria-relevant': null,
  	    'aria-roledescription': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'role'
  	    },
  	    module: 'XHTML'
  	  }, {
  	    concept: {
  	      name: 'type'
  	    },
  	    module: 'Dublin Core'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: []
  	};
  	roletypeRole.default = roletypeRole$1;
  	return roletypeRole;
  }

  var sectionRole = {};

  var hasRequiredSectionRole;

  function requireSectionRole () {
  	if (hasRequiredSectionRole) return sectionRole;
  	hasRequiredSectionRole = 1;

  	Object.defineProperty(sectionRole, "__esModule", {
  	  value: true
  	});
  	sectionRole.default = void 0;
  	var sectionRole$1 = {
  	  abstract: true,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: [],
  	  prohibitedProps: [],
  	  props: {},
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'frontmatter'
  	    },
  	    module: 'DTB'
  	  }, {
  	    concept: {
  	      name: 'level'
  	    },
  	    module: 'DTB'
  	  }, {
  	    concept: {
  	      name: 'level'
  	    },
  	    module: 'SMIL'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure']]
  	};
  	sectionRole.default = sectionRole$1;
  	return sectionRole;
  }

  var sectionheadRole = {};

  var hasRequiredSectionheadRole;

  function requireSectionheadRole () {
  	if (hasRequiredSectionheadRole) return sectionheadRole;
  	hasRequiredSectionheadRole = 1;

  	Object.defineProperty(sectionheadRole, "__esModule", {
  	  value: true
  	});
  	sectionheadRole.default = void 0;
  	var sectionheadRole$1 = {
  	  abstract: true,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author', 'contents'],
  	  prohibitedProps: [],
  	  props: {},
  	  relatedConcepts: [],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure']]
  	};
  	sectionheadRole.default = sectionheadRole$1;
  	return sectionheadRole;
  }

  var selectRole = {};

  var hasRequiredSelectRole;

  function requireSelectRole () {
  	if (hasRequiredSelectRole) return selectRole;
  	hasRequiredSelectRole = 1;

  	Object.defineProperty(selectRole, "__esModule", {
  	  value: true
  	});
  	selectRole.default = void 0;
  	var selectRole$1 = {
  	  abstract: true,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-orientation': null
  	  },
  	  relatedConcepts: [],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'widget', 'composite'], ['roletype', 'structure', 'section', 'group']]
  	};
  	selectRole.default = selectRole$1;
  	return selectRole;
  }

  var structureRole = {};

  var hasRequiredStructureRole;

  function requireStructureRole () {
  	if (hasRequiredStructureRole) return structureRole;
  	hasRequiredStructureRole = 1;

  	Object.defineProperty(structureRole, "__esModule", {
  	  value: true
  	});
  	structureRole.default = void 0;
  	var structureRole$1 = {
  	  abstract: true,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: [],
  	  prohibitedProps: [],
  	  props: {},
  	  relatedConcepts: [],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype']]
  	};
  	structureRole.default = structureRole$1;
  	return structureRole;
  }

  var widgetRole = {};

  var hasRequiredWidgetRole;

  function requireWidgetRole () {
  	if (hasRequiredWidgetRole) return widgetRole;
  	hasRequiredWidgetRole = 1;

  	Object.defineProperty(widgetRole, "__esModule", {
  	  value: true
  	});
  	widgetRole.default = void 0;
  	var widgetRole$1 = {
  	  abstract: true,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: [],
  	  prohibitedProps: [],
  	  props: {},
  	  relatedConcepts: [],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype']]
  	};
  	widgetRole.default = widgetRole$1;
  	return widgetRole;
  }

  var windowRole = {};

  var hasRequiredWindowRole;

  function requireWindowRole () {
  	if (hasRequiredWindowRole) return windowRole;
  	hasRequiredWindowRole = 1;

  	Object.defineProperty(windowRole, "__esModule", {
  	  value: true
  	});
  	windowRole.default = void 0;
  	var windowRole$1 = {
  	  abstract: true,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-modal': null
  	  },
  	  relatedConcepts: [],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype']]
  	};
  	windowRole.default = windowRole$1;
  	return windowRole;
  }

  var hasRequiredAriaAbstractRoles;

  function requireAriaAbstractRoles () {
  	if (hasRequiredAriaAbstractRoles) return ariaAbstractRoles;
  	hasRequiredAriaAbstractRoles = 1;

  	Object.defineProperty(ariaAbstractRoles, "__esModule", {
  	  value: true
  	});
  	ariaAbstractRoles.default = void 0;
  	var _commandRole = _interopRequireDefault(requireCommandRole());
  	var _compositeRole = _interopRequireDefault(requireCompositeRole());
  	var _inputRole = _interopRequireDefault(requireInputRole());
  	var _landmarkRole = _interopRequireDefault(requireLandmarkRole());
  	var _rangeRole = _interopRequireDefault(requireRangeRole());
  	var _roletypeRole = _interopRequireDefault(requireRoletypeRole());
  	var _sectionRole = _interopRequireDefault(requireSectionRole());
  	var _sectionheadRole = _interopRequireDefault(requireSectionheadRole());
  	var _selectRole = _interopRequireDefault(requireSelectRole());
  	var _structureRole = _interopRequireDefault(requireStructureRole());
  	var _widgetRole = _interopRequireDefault(requireWidgetRole());
  	var _windowRole = _interopRequireDefault(requireWindowRole());
  	function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  	var ariaAbstractRoles$1 = [['command', _commandRole.default], ['composite', _compositeRole.default], ['input', _inputRole.default], ['landmark', _landmarkRole.default], ['range', _rangeRole.default], ['roletype', _roletypeRole.default], ['section', _sectionRole.default], ['sectionhead', _sectionheadRole.default], ['select', _selectRole.default], ['structure', _structureRole.default], ['widget', _widgetRole.default], ['window', _windowRole.default]];
  	ariaAbstractRoles.default = ariaAbstractRoles$1;
  	return ariaAbstractRoles;
  }

  var ariaLiteralRoles = {};

  var alertRole = {};

  var hasRequiredAlertRole;

  function requireAlertRole () {
  	if (hasRequiredAlertRole) return alertRole;
  	hasRequiredAlertRole = 1;

  	Object.defineProperty(alertRole, "__esModule", {
  	  value: true
  	});
  	alertRole.default = void 0;
  	var alertRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-atomic': 'true',
  	    'aria-live': 'assertive'
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'alert'
  	    },
  	    module: 'XForms'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section']]
  	};
  	alertRole.default = alertRole$1;
  	return alertRole;
  }

  var alertdialogRole = {};

  var hasRequiredAlertdialogRole;

  function requireAlertdialogRole () {
  	if (hasRequiredAlertdialogRole) return alertdialogRole;
  	hasRequiredAlertdialogRole = 1;

  	Object.defineProperty(alertdialogRole, "__esModule", {
  	  value: true
  	});
  	alertdialogRole.default = void 0;
  	var alertdialogRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: true,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {},
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'alert'
  	    },
  	    module: 'XForms'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section', 'alert'], ['roletype', 'window', 'dialog']]
  	};
  	alertdialogRole.default = alertdialogRole$1;
  	return alertdialogRole;
  }

  var applicationRole = {};

  var hasRequiredApplicationRole;

  function requireApplicationRole () {
  	if (hasRequiredApplicationRole) return applicationRole;
  	hasRequiredApplicationRole = 1;

  	Object.defineProperty(applicationRole, "__esModule", {
  	  value: true
  	});
  	applicationRole.default = void 0;
  	var applicationRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: true,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-activedescendant': null,
  	    'aria-disabled': null,
  	    'aria-errormessage': null,
  	    'aria-expanded': null,
  	    'aria-haspopup': null,
  	    'aria-invalid': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'Device Independence Delivery Unit'
  	    }
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure']]
  	};
  	applicationRole.default = applicationRole$1;
  	return applicationRole;
  }

  var articleRole = {};

  var hasRequiredArticleRole;

  function requireArticleRole () {
  	if (hasRequiredArticleRole) return articleRole;
  	hasRequiredArticleRole = 1;

  	Object.defineProperty(articleRole, "__esModule", {
  	  value: true
  	});
  	articleRole.default = void 0;
  	var articleRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-posinset': null,
  	    'aria-setsize': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'article'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'document']]
  	};
  	articleRole.default = articleRole$1;
  	return articleRole;
  }

  var bannerRole = {};

  var hasRequiredBannerRole;

  function requireBannerRole () {
  	if (hasRequiredBannerRole) return bannerRole;
  	hasRequiredBannerRole = 1;

  	Object.defineProperty(bannerRole, "__esModule", {
  	  value: true
  	});
  	bannerRole.default = void 0;
  	var bannerRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {},
  	  relatedConcepts: [{
  	    concept: {
  	      constraints: ['scoped to the body element'],
  	      name: 'header'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section', 'landmark']]
  	};
  	bannerRole.default = bannerRole$1;
  	return bannerRole;
  }

  var blockquoteRole = {};

  var hasRequiredBlockquoteRole;

  function requireBlockquoteRole () {
  	if (hasRequiredBlockquoteRole) return blockquoteRole;
  	hasRequiredBlockquoteRole = 1;

  	Object.defineProperty(blockquoteRole, "__esModule", {
  	  value: true
  	});
  	blockquoteRole.default = void 0;
  	var blockquoteRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {},
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'blockquote'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section']]
  	};
  	blockquoteRole.default = blockquoteRole$1;
  	return blockquoteRole;
  }

  var buttonRole = {};

  var hasRequiredButtonRole;

  function requireButtonRole () {
  	if (hasRequiredButtonRole) return buttonRole;
  	hasRequiredButtonRole = 1;

  	Object.defineProperty(buttonRole, "__esModule", {
  	  value: true
  	});
  	buttonRole.default = void 0;
  	var buttonRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: true,
  	  baseConcepts: [],
  	  childrenPresentational: true,
  	  nameFrom: ['author', 'contents'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-disabled': null,
  	    'aria-expanded': null,
  	    'aria-haspopup': null,
  	    'aria-pressed': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      attributes: [{
  	        name: 'type',
  	        value: 'button'
  	      }],
  	      name: 'input'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      attributes: [{
  	        name: 'type',
  	        value: 'image'
  	      }],
  	      name: 'input'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      attributes: [{
  	        name: 'type',
  	        value: 'reset'
  	      }],
  	      name: 'input'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      attributes: [{
  	        name: 'type',
  	        value: 'submit'
  	      }],
  	      name: 'input'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      name: 'button'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      name: 'trigger'
  	    },
  	    module: 'XForms'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'widget', 'command']]
  	};
  	buttonRole.default = buttonRole$1;
  	return buttonRole;
  }

  var captionRole = {};

  var hasRequiredCaptionRole;

  function requireCaptionRole () {
  	if (hasRequiredCaptionRole) return captionRole;
  	hasRequiredCaptionRole = 1;

  	Object.defineProperty(captionRole, "__esModule", {
  	  value: true
  	});
  	captionRole.default = void 0;
  	var captionRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['prohibited'],
  	  prohibitedProps: ['aria-label', 'aria-labelledby'],
  	  props: {},
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'caption'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: ['figure', 'grid', 'table'],
  	  requiredContextRole: ['figure', 'grid', 'table'],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section']]
  	};
  	captionRole.default = captionRole$1;
  	return captionRole;
  }

  var cellRole = {};

  var hasRequiredCellRole;

  function requireCellRole () {
  	if (hasRequiredCellRole) return cellRole;
  	hasRequiredCellRole = 1;

  	Object.defineProperty(cellRole, "__esModule", {
  	  value: true
  	});
  	cellRole.default = void 0;
  	var cellRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author', 'contents'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-colindex': null,
  	    'aria-colspan': null,
  	    'aria-rowindex': null,
  	    'aria-rowspan': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      constraints: ['ancestor table element has table role'],
  	      name: 'td'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: ['row'],
  	  requiredContextRole: ['row'],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section']]
  	};
  	cellRole.default = cellRole$1;
  	return cellRole;
  }

  var checkboxRole = {};

  var hasRequiredCheckboxRole;

  function requireCheckboxRole () {
  	if (hasRequiredCheckboxRole) return checkboxRole;
  	hasRequiredCheckboxRole = 1;

  	Object.defineProperty(checkboxRole, "__esModule", {
  	  value: true
  	});
  	checkboxRole.default = void 0;
  	var checkboxRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: true,
  	  baseConcepts: [],
  	  childrenPresentational: true,
  	  nameFrom: ['author', 'contents'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-checked': null,
  	    'aria-errormessage': null,
  	    'aria-expanded': null,
  	    'aria-invalid': null,
  	    'aria-readonly': null,
  	    'aria-required': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      attributes: [{
  	        name: 'type',
  	        value: 'checkbox'
  	      }],
  	      name: 'input'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      name: 'option'
  	    },
  	    module: 'ARIA'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {
  	    'aria-checked': null
  	  },
  	  superClass: [['roletype', 'widget', 'input']]
  	};
  	checkboxRole.default = checkboxRole$1;
  	return checkboxRole;
  }

  var codeRole = {};

  var hasRequiredCodeRole;

  function requireCodeRole () {
  	if (hasRequiredCodeRole) return codeRole;
  	hasRequiredCodeRole = 1;

  	Object.defineProperty(codeRole, "__esModule", {
  	  value: true
  	});
  	codeRole.default = void 0;
  	var codeRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['prohibited'],
  	  prohibitedProps: ['aria-label', 'aria-labelledby'],
  	  props: {},
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'code'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section']]
  	};
  	codeRole.default = codeRole$1;
  	return codeRole;
  }

  var columnheaderRole = {};

  var hasRequiredColumnheaderRole;

  function requireColumnheaderRole () {
  	if (hasRequiredColumnheaderRole) return columnheaderRole;
  	hasRequiredColumnheaderRole = 1;

  	Object.defineProperty(columnheaderRole, "__esModule", {
  	  value: true
  	});
  	columnheaderRole.default = void 0;
  	var columnheaderRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: true,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author', 'contents'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-sort': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'th'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      attributes: [{
  	        name: 'scope',
  	        value: 'col'
  	      }],
  	      name: 'th'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      attributes: [{
  	        name: 'scope',
  	        value: 'colgroup'
  	      }],
  	      name: 'th'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: ['row'],
  	  requiredContextRole: ['row'],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section', 'cell'], ['roletype', 'structure', 'section', 'cell', 'gridcell'], ['roletype', 'widget', 'gridcell'], ['roletype', 'structure', 'sectionhead']]
  	};
  	columnheaderRole.default = columnheaderRole$1;
  	return columnheaderRole;
  }

  var comboboxRole = {};

  var hasRequiredComboboxRole;

  function requireComboboxRole () {
  	if (hasRequiredComboboxRole) return comboboxRole;
  	hasRequiredComboboxRole = 1;

  	Object.defineProperty(comboboxRole, "__esModule", {
  	  value: true
  	});
  	comboboxRole.default = void 0;
  	var comboboxRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: true,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-activedescendant': null,
  	    'aria-autocomplete': null,
  	    'aria-errormessage': null,
  	    'aria-invalid': null,
  	    'aria-readonly': null,
  	    'aria-required': null,
  	    'aria-expanded': 'false',
  	    'aria-haspopup': 'listbox'
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      attributes: [{
  	        constraints: ['set'],
  	        name: 'list'
  	      }, {
  	        name: 'type',
  	        value: 'email'
  	      }],
  	      name: 'input'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      attributes: [{
  	        constraints: ['set'],
  	        name: 'list'
  	      }, {
  	        name: 'type',
  	        value: 'search'
  	      }],
  	      name: 'input'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      attributes: [{
  	        constraints: ['set'],
  	        name: 'list'
  	      }, {
  	        name: 'type',
  	        value: 'tel'
  	      }],
  	      name: 'input'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      attributes: [{
  	        constraints: ['set'],
  	        name: 'list'
  	      }, {
  	        name: 'type',
  	        value: 'text'
  	      }],
  	      name: 'input'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      attributes: [{
  	        constraints: ['set'],
  	        name: 'list'
  	      }, {
  	        name: 'type',
  	        value: 'url'
  	      }],
  	      name: 'input'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      attributes: [{
  	        constraints: ['set'],
  	        name: 'list'
  	      }, {
  	        name: 'type',
  	        value: 'url'
  	      }],
  	      name: 'input'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      attributes: [{
  	        constraints: ['undefined'],
  	        name: 'multiple'
  	      }, {
  	        constraints: ['undefined'],
  	        name: 'size'
  	      }],
  	      constraints: ['the multiple attribute is not set and the size attribute does not have a value greater than 1'],
  	      name: 'select'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      name: 'select'
  	    },
  	    module: 'XForms'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {
  	    'aria-controls': null,
  	    'aria-expanded': 'false'
  	  },
  	  superClass: [['roletype', 'widget', 'input']]
  	};
  	comboboxRole.default = comboboxRole$1;
  	return comboboxRole;
  }

  var complementaryRole = {};

  var hasRequiredComplementaryRole;

  function requireComplementaryRole () {
  	if (hasRequiredComplementaryRole) return complementaryRole;
  	hasRequiredComplementaryRole = 1;

  	Object.defineProperty(complementaryRole, "__esModule", {
  	  value: true
  	});
  	complementaryRole.default = void 0;
  	var complementaryRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {},
  	  relatedConcepts: [{
  	    concept: {
  	      constraints: ['scoped to the body element', 'scoped to the main element'],
  	      name: 'aside'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      attributes: [{
  	        constraints: ['set'],
  	        name: 'aria-label'
  	      }],
  	      constraints: ['scoped to a sectioning content element', 'scoped to a sectioning root element other than body'],
  	      name: 'aside'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      attributes: [{
  	        constraints: ['set'],
  	        name: 'aria-labelledby'
  	      }],
  	      constraints: ['scoped to a sectioning content element', 'scoped to a sectioning root element other than body'],
  	      name: 'aside'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section', 'landmark']]
  	};
  	complementaryRole.default = complementaryRole$1;
  	return complementaryRole;
  }

  var contentinfoRole = {};

  var hasRequiredContentinfoRole;

  function requireContentinfoRole () {
  	if (hasRequiredContentinfoRole) return contentinfoRole;
  	hasRequiredContentinfoRole = 1;

  	Object.defineProperty(contentinfoRole, "__esModule", {
  	  value: true
  	});
  	contentinfoRole.default = void 0;
  	var contentinfoRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {},
  	  relatedConcepts: [{
  	    concept: {
  	      constraints: ['scoped to the body element'],
  	      name: 'footer'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section', 'landmark']]
  	};
  	contentinfoRole.default = contentinfoRole$1;
  	return contentinfoRole;
  }

  var definitionRole = {};

  var hasRequiredDefinitionRole;

  function requireDefinitionRole () {
  	if (hasRequiredDefinitionRole) return definitionRole;
  	hasRequiredDefinitionRole = 1;

  	Object.defineProperty(definitionRole, "__esModule", {
  	  value: true
  	});
  	definitionRole.default = void 0;
  	var definitionRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {},
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'dd'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section']]
  	};
  	definitionRole.default = definitionRole$1;
  	return definitionRole;
  }

  var deletionRole = {};

  var hasRequiredDeletionRole;

  function requireDeletionRole () {
  	if (hasRequiredDeletionRole) return deletionRole;
  	hasRequiredDeletionRole = 1;

  	Object.defineProperty(deletionRole, "__esModule", {
  	  value: true
  	});
  	deletionRole.default = void 0;
  	var deletionRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['prohibited'],
  	  prohibitedProps: ['aria-label', 'aria-labelledby'],
  	  props: {},
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'del'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section']]
  	};
  	deletionRole.default = deletionRole$1;
  	return deletionRole;
  }

  var dialogRole = {};

  var hasRequiredDialogRole;

  function requireDialogRole () {
  	if (hasRequiredDialogRole) return dialogRole;
  	hasRequiredDialogRole = 1;

  	Object.defineProperty(dialogRole, "__esModule", {
  	  value: true
  	});
  	dialogRole.default = void 0;
  	var dialogRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: true,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {},
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'dialog'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'window']]
  	};
  	dialogRole.default = dialogRole$1;
  	return dialogRole;
  }

  var directoryRole = {};

  var hasRequiredDirectoryRole;

  function requireDirectoryRole () {
  	if (hasRequiredDirectoryRole) return directoryRole;
  	hasRequiredDirectoryRole = 1;

  	Object.defineProperty(directoryRole, "__esModule", {
  	  value: true
  	});
  	directoryRole.default = void 0;
  	var directoryRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {},
  	  relatedConcepts: [{
  	    module: 'DAISY Guide'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section', 'list']]
  	};
  	directoryRole.default = directoryRole$1;
  	return directoryRole;
  }

  var documentRole = {};

  var hasRequiredDocumentRole;

  function requireDocumentRole () {
  	if (hasRequiredDocumentRole) return documentRole;
  	hasRequiredDocumentRole = 1;

  	Object.defineProperty(documentRole, "__esModule", {
  	  value: true
  	});
  	documentRole.default = void 0;
  	var documentRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {},
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'Device Independence Delivery Unit'
  	    }
  	  }, {
  	    concept: {
  	      name: 'html'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure']]
  	};
  	documentRole.default = documentRole$1;
  	return documentRole;
  }

  var emphasisRole = {};

  var hasRequiredEmphasisRole;

  function requireEmphasisRole () {
  	if (hasRequiredEmphasisRole) return emphasisRole;
  	hasRequiredEmphasisRole = 1;

  	Object.defineProperty(emphasisRole, "__esModule", {
  	  value: true
  	});
  	emphasisRole.default = void 0;
  	var emphasisRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['prohibited'],
  	  prohibitedProps: ['aria-label', 'aria-labelledby'],
  	  props: {},
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'em'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section']]
  	};
  	emphasisRole.default = emphasisRole$1;
  	return emphasisRole;
  }

  var feedRole = {};

  var hasRequiredFeedRole;

  function requireFeedRole () {
  	if (hasRequiredFeedRole) return feedRole;
  	hasRequiredFeedRole = 1;

  	Object.defineProperty(feedRole, "__esModule", {
  	  value: true
  	});
  	feedRole.default = void 0;
  	var feedRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {},
  	  relatedConcepts: [],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [['article']],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section', 'list']]
  	};
  	feedRole.default = feedRole$1;
  	return feedRole;
  }

  var figureRole = {};

  var hasRequiredFigureRole;

  function requireFigureRole () {
  	if (hasRequiredFigureRole) return figureRole;
  	hasRequiredFigureRole = 1;

  	Object.defineProperty(figureRole, "__esModule", {
  	  value: true
  	});
  	figureRole.default = void 0;
  	var figureRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {},
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'figure'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section']]
  	};
  	figureRole.default = figureRole$1;
  	return figureRole;
  }

  var formRole = {};

  var hasRequiredFormRole;

  function requireFormRole () {
  	if (hasRequiredFormRole) return formRole;
  	hasRequiredFormRole = 1;

  	Object.defineProperty(formRole, "__esModule", {
  	  value: true
  	});
  	formRole.default = void 0;
  	var formRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {},
  	  relatedConcepts: [{
  	    concept: {
  	      attributes: [{
  	        constraints: ['set'],
  	        name: 'aria-label'
  	      }],
  	      name: 'form'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      attributes: [{
  	        constraints: ['set'],
  	        name: 'aria-labelledby'
  	      }],
  	      name: 'form'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      attributes: [{
  	        constraints: ['set'],
  	        name: 'name'
  	      }],
  	      name: 'form'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section', 'landmark']]
  	};
  	formRole.default = formRole$1;
  	return formRole;
  }

  var genericRole = {};

  var hasRequiredGenericRole;

  function requireGenericRole () {
  	if (hasRequiredGenericRole) return genericRole;
  	hasRequiredGenericRole = 1;

  	Object.defineProperty(genericRole, "__esModule", {
  	  value: true
  	});
  	genericRole.default = void 0;
  	var genericRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['prohibited'],
  	  prohibitedProps: ['aria-label', 'aria-labelledby'],
  	  props: {},
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'a'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      name: 'area'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      name: 'aside'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      name: 'b'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      name: 'bdo'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      name: 'body'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      name: 'data'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      name: 'div'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      constraints: ['scoped to the main element', 'scoped to a sectioning content element', 'scoped to a sectioning root element other than body'],
  	      name: 'footer'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      constraints: ['scoped to the main element', 'scoped to a sectioning content element', 'scoped to a sectioning root element other than body'],
  	      name: 'header'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      name: 'hgroup'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      name: 'i'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      name: 'pre'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      name: 'q'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      name: 'samp'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      name: 'section'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      name: 'small'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      name: 'span'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      name: 'u'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure']]
  	};
  	genericRole.default = genericRole$1;
  	return genericRole;
  }

  var gridRole = {};

  var hasRequiredGridRole;

  function requireGridRole () {
  	if (hasRequiredGridRole) return gridRole;
  	hasRequiredGridRole = 1;

  	Object.defineProperty(gridRole, "__esModule", {
  	  value: true
  	});
  	gridRole.default = void 0;
  	var gridRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: true,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-multiselectable': null,
  	    'aria-readonly': null
  	  },
  	  relatedConcepts: [],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [['row'], ['row', 'rowgroup']],
  	  requiredProps: {},
  	  superClass: [['roletype', 'widget', 'composite'], ['roletype', 'structure', 'section', 'table']]
  	};
  	gridRole.default = gridRole$1;
  	return gridRole;
  }

  var gridcellRole = {};

  var hasRequiredGridcellRole;

  function requireGridcellRole () {
  	if (hasRequiredGridcellRole) return gridcellRole;
  	hasRequiredGridcellRole = 1;

  	Object.defineProperty(gridcellRole, "__esModule", {
  	  value: true
  	});
  	gridcellRole.default = void 0;
  	var gridcellRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author', 'contents'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-disabled': null,
  	    'aria-errormessage': null,
  	    'aria-expanded': null,
  	    'aria-haspopup': null,
  	    'aria-invalid': null,
  	    'aria-readonly': null,
  	    'aria-required': null,
  	    'aria-selected': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      constraints: ['ancestor table element has grid role', 'ancestor table element has treegrid role'],
  	      name: 'td'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: ['row'],
  	  requiredContextRole: ['row'],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section', 'cell'], ['roletype', 'widget']]
  	};
  	gridcellRole.default = gridcellRole$1;
  	return gridcellRole;
  }

  var groupRole = {};

  var hasRequiredGroupRole;

  function requireGroupRole () {
  	if (hasRequiredGroupRole) return groupRole;
  	hasRequiredGroupRole = 1;

  	Object.defineProperty(groupRole, "__esModule", {
  	  value: true
  	});
  	groupRole.default = void 0;
  	var groupRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-activedescendant': null,
  	    'aria-disabled': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'details'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      name: 'fieldset'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      name: 'optgroup'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      name: 'address'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section']]
  	};
  	groupRole.default = groupRole$1;
  	return groupRole;
  }

  var headingRole = {};

  var hasRequiredHeadingRole;

  function requireHeadingRole () {
  	if (hasRequiredHeadingRole) return headingRole;
  	hasRequiredHeadingRole = 1;

  	Object.defineProperty(headingRole, "__esModule", {
  	  value: true
  	});
  	headingRole.default = void 0;
  	var headingRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: true,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author', 'contents'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-level': '2'
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'h1'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      name: 'h2'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      name: 'h3'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      name: 'h4'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      name: 'h5'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      name: 'h6'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {
  	    'aria-level': '2'
  	  },
  	  superClass: [['roletype', 'structure', 'sectionhead']]
  	};
  	headingRole.default = headingRole$1;
  	return headingRole;
  }

  var imgRole = {};

  var hasRequiredImgRole;

  function requireImgRole () {
  	if (hasRequiredImgRole) return imgRole;
  	hasRequiredImgRole = 1;

  	Object.defineProperty(imgRole, "__esModule", {
  	  value: true
  	});
  	imgRole.default = void 0;
  	var imgRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: true,
  	  baseConcepts: [],
  	  childrenPresentational: true,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {},
  	  relatedConcepts: [{
  	    concept: {
  	      attributes: [{
  	        constraints: ['set'],
  	        name: 'alt'
  	      }],
  	      name: 'img'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      attributes: [{
  	        constraints: ['undefined'],
  	        name: 'alt'
  	      }],
  	      name: 'img'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      name: 'imggroup'
  	    },
  	    module: 'DTB'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section']]
  	};
  	imgRole.default = imgRole$1;
  	return imgRole;
  }

  var insertionRole = {};

  var hasRequiredInsertionRole;

  function requireInsertionRole () {
  	if (hasRequiredInsertionRole) return insertionRole;
  	hasRequiredInsertionRole = 1;

  	Object.defineProperty(insertionRole, "__esModule", {
  	  value: true
  	});
  	insertionRole.default = void 0;
  	var insertionRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['prohibited'],
  	  prohibitedProps: ['aria-label', 'aria-labelledby'],
  	  props: {},
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'ins'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section']]
  	};
  	insertionRole.default = insertionRole$1;
  	return insertionRole;
  }

  var linkRole = {};

  var hasRequiredLinkRole;

  function requireLinkRole () {
  	if (hasRequiredLinkRole) return linkRole;
  	hasRequiredLinkRole = 1;

  	Object.defineProperty(linkRole, "__esModule", {
  	  value: true
  	});
  	linkRole.default = void 0;
  	var linkRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: true,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author', 'contents'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-disabled': null,
  	    'aria-expanded': null,
  	    'aria-haspopup': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      attributes: [{
  	        constraints: ['set'],
  	        name: 'href'
  	      }],
  	      name: 'a'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      attributes: [{
  	        constraints: ['set'],
  	        name: 'href'
  	      }],
  	      name: 'area'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'widget', 'command']]
  	};
  	linkRole.default = linkRole$1;
  	return linkRole;
  }

  var listRole = {};

  var hasRequiredListRole;

  function requireListRole () {
  	if (hasRequiredListRole) return listRole;
  	hasRequiredListRole = 1;

  	Object.defineProperty(listRole, "__esModule", {
  	  value: true
  	});
  	listRole.default = void 0;
  	var listRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {},
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'menu'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      name: 'ol'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      name: 'ul'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [['listitem']],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section']]
  	};
  	listRole.default = listRole$1;
  	return listRole;
  }

  var listboxRole = {};

  var hasRequiredListboxRole;

  function requireListboxRole () {
  	if (hasRequiredListboxRole) return listboxRole;
  	hasRequiredListboxRole = 1;

  	Object.defineProperty(listboxRole, "__esModule", {
  	  value: true
  	});
  	listboxRole.default = void 0;
  	var listboxRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: true,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-errormessage': null,
  	    'aria-expanded': null,
  	    'aria-invalid': null,
  	    'aria-multiselectable': null,
  	    'aria-readonly': null,
  	    'aria-required': null,
  	    'aria-orientation': 'vertical'
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      attributes: [{
  	        constraints: ['>1'],
  	        name: 'size'
  	      }],
  	      constraints: ['the size attribute value is greater than 1'],
  	      name: 'select'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      attributes: [{
  	        name: 'multiple'
  	      }],
  	      name: 'select'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      name: 'datalist'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      name: 'list'
  	    },
  	    module: 'ARIA'
  	  }, {
  	    concept: {
  	      name: 'select'
  	    },
  	    module: 'XForms'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [['option', 'group'], ['option']],
  	  requiredProps: {},
  	  superClass: [['roletype', 'widget', 'composite', 'select'], ['roletype', 'structure', 'section', 'group', 'select']]
  	};
  	listboxRole.default = listboxRole$1;
  	return listboxRole;
  }

  var listitemRole = {};

  var hasRequiredListitemRole;

  function requireListitemRole () {
  	if (hasRequiredListitemRole) return listitemRole;
  	hasRequiredListitemRole = 1;

  	Object.defineProperty(listitemRole, "__esModule", {
  	  value: true
  	});
  	listitemRole.default = void 0;
  	var listitemRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-level': null,
  	    'aria-posinset': null,
  	    'aria-setsize': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      constraints: ['direct descendant of ol', 'direct descendant of ul', 'direct descendant of menu'],
  	      name: 'li'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      name: 'item'
  	    },
  	    module: 'XForms'
  	  }],
  	  requireContextRole: ['directory', 'list'],
  	  requiredContextRole: ['directory', 'list'],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section']]
  	};
  	listitemRole.default = listitemRole$1;
  	return listitemRole;
  }

  var logRole = {};

  var hasRequiredLogRole;

  function requireLogRole () {
  	if (hasRequiredLogRole) return logRole;
  	hasRequiredLogRole = 1;

  	Object.defineProperty(logRole, "__esModule", {
  	  value: true
  	});
  	logRole.default = void 0;
  	var logRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-live': 'polite'
  	  },
  	  relatedConcepts: [],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section']]
  	};
  	logRole.default = logRole$1;
  	return logRole;
  }

  var mainRole = {};

  var hasRequiredMainRole;

  function requireMainRole () {
  	if (hasRequiredMainRole) return mainRole;
  	hasRequiredMainRole = 1;

  	Object.defineProperty(mainRole, "__esModule", {
  	  value: true
  	});
  	mainRole.default = void 0;
  	var mainRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {},
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'main'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section', 'landmark']]
  	};
  	mainRole.default = mainRole$1;
  	return mainRole;
  }

  var markRole = {};

  var hasRequiredMarkRole;

  function requireMarkRole () {
  	if (hasRequiredMarkRole) return markRole;
  	hasRequiredMarkRole = 1;

  	Object.defineProperty(markRole, "__esModule", {
  	  value: true
  	});
  	markRole.default = void 0;
  	var markRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['prohibited'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-braillelabel': null,
  	    'aria-brailleroledescription': null,
  	    'aria-description': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'mark'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section']]
  	};
  	markRole.default = markRole$1;
  	return markRole;
  }

  var marqueeRole = {};

  var hasRequiredMarqueeRole;

  function requireMarqueeRole () {
  	if (hasRequiredMarqueeRole) return marqueeRole;
  	hasRequiredMarqueeRole = 1;

  	Object.defineProperty(marqueeRole, "__esModule", {
  	  value: true
  	});
  	marqueeRole.default = void 0;
  	var marqueeRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: true,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {},
  	  relatedConcepts: [],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section']]
  	};
  	marqueeRole.default = marqueeRole$1;
  	return marqueeRole;
  }

  var mathRole = {};

  var hasRequiredMathRole;

  function requireMathRole () {
  	if (hasRequiredMathRole) return mathRole;
  	hasRequiredMathRole = 1;

  	Object.defineProperty(mathRole, "__esModule", {
  	  value: true
  	});
  	mathRole.default = void 0;
  	var mathRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {},
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'math'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section']]
  	};
  	mathRole.default = mathRole$1;
  	return mathRole;
  }

  var menuRole = {};

  var hasRequiredMenuRole;

  function requireMenuRole () {
  	if (hasRequiredMenuRole) return menuRole;
  	hasRequiredMenuRole = 1;

  	Object.defineProperty(menuRole, "__esModule", {
  	  value: true
  	});
  	menuRole.default = void 0;
  	var menuRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-orientation': 'vertical'
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'MENU'
  	    },
  	    module: 'JAPI'
  	  }, {
  	    concept: {
  	      name: 'list'
  	    },
  	    module: 'ARIA'
  	  }, {
  	    concept: {
  	      name: 'select'
  	    },
  	    module: 'XForms'
  	  }, {
  	    concept: {
  	      name: 'sidebar'
  	    },
  	    module: 'DTB'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [['menuitem', 'group'], ['menuitemradio', 'group'], ['menuitemcheckbox', 'group'], ['menuitem'], ['menuitemcheckbox'], ['menuitemradio']],
  	  requiredProps: {},
  	  superClass: [['roletype', 'widget', 'composite', 'select'], ['roletype', 'structure', 'section', 'group', 'select']]
  	};
  	menuRole.default = menuRole$1;
  	return menuRole;
  }

  var menubarRole = {};

  var hasRequiredMenubarRole;

  function requireMenubarRole () {
  	if (hasRequiredMenubarRole) return menubarRole;
  	hasRequiredMenubarRole = 1;

  	Object.defineProperty(menubarRole, "__esModule", {
  	  value: true
  	});
  	menubarRole.default = void 0;
  	var menubarRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-orientation': 'horizontal'
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'toolbar'
  	    },
  	    module: 'ARIA'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [['menuitem', 'group'], ['menuitemradio', 'group'], ['menuitemcheckbox', 'group'], ['menuitem'], ['menuitemcheckbox'], ['menuitemradio']],
  	  requiredProps: {},
  	  superClass: [['roletype', 'widget', 'composite', 'select', 'menu'], ['roletype', 'structure', 'section', 'group', 'select', 'menu']]
  	};
  	menubarRole.default = menubarRole$1;
  	return menubarRole;
  }

  var menuitemRole = {};

  var hasRequiredMenuitemRole;

  function requireMenuitemRole () {
  	if (hasRequiredMenuitemRole) return menuitemRole;
  	hasRequiredMenuitemRole = 1;

  	Object.defineProperty(menuitemRole, "__esModule", {
  	  value: true
  	});
  	menuitemRole.default = void 0;
  	var menuitemRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: true,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author', 'contents'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-disabled': null,
  	    'aria-expanded': null,
  	    'aria-haspopup': null,
  	    'aria-posinset': null,
  	    'aria-setsize': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'MENU_ITEM'
  	    },
  	    module: 'JAPI'
  	  }, {
  	    concept: {
  	      name: 'listitem'
  	    },
  	    module: 'ARIA'
  	  }, {
  	    concept: {
  	      name: 'option'
  	    },
  	    module: 'ARIA'
  	  }],
  	  requireContextRole: ['group', 'menu', 'menubar'],
  	  requiredContextRole: ['group', 'menu', 'menubar'],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'widget', 'command']]
  	};
  	menuitemRole.default = menuitemRole$1;
  	return menuitemRole;
  }

  var menuitemcheckboxRole = {};

  var hasRequiredMenuitemcheckboxRole;

  function requireMenuitemcheckboxRole () {
  	if (hasRequiredMenuitemcheckboxRole) return menuitemcheckboxRole;
  	hasRequiredMenuitemcheckboxRole = 1;

  	Object.defineProperty(menuitemcheckboxRole, "__esModule", {
  	  value: true
  	});
  	menuitemcheckboxRole.default = void 0;
  	var menuitemcheckboxRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: true,
  	  baseConcepts: [],
  	  childrenPresentational: true,
  	  nameFrom: ['author', 'contents'],
  	  prohibitedProps: [],
  	  props: {},
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'menuitem'
  	    },
  	    module: 'ARIA'
  	  }],
  	  requireContextRole: ['group', 'menu', 'menubar'],
  	  requiredContextRole: ['group', 'menu', 'menubar'],
  	  requiredOwnedElements: [],
  	  requiredProps: {
  	    'aria-checked': null
  	  },
  	  superClass: [['roletype', 'widget', 'input', 'checkbox'], ['roletype', 'widget', 'command', 'menuitem']]
  	};
  	menuitemcheckboxRole.default = menuitemcheckboxRole$1;
  	return menuitemcheckboxRole;
  }

  var menuitemradioRole = {};

  var hasRequiredMenuitemradioRole;

  function requireMenuitemradioRole () {
  	if (hasRequiredMenuitemradioRole) return menuitemradioRole;
  	hasRequiredMenuitemradioRole = 1;

  	Object.defineProperty(menuitemradioRole, "__esModule", {
  	  value: true
  	});
  	menuitemradioRole.default = void 0;
  	var menuitemradioRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: true,
  	  baseConcepts: [],
  	  childrenPresentational: true,
  	  nameFrom: ['author', 'contents'],
  	  prohibitedProps: [],
  	  props: {},
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'menuitem'
  	    },
  	    module: 'ARIA'
  	  }],
  	  requireContextRole: ['group', 'menu', 'menubar'],
  	  requiredContextRole: ['group', 'menu', 'menubar'],
  	  requiredOwnedElements: [],
  	  requiredProps: {
  	    'aria-checked': null
  	  },
  	  superClass: [['roletype', 'widget', 'input', 'checkbox', 'menuitemcheckbox'], ['roletype', 'widget', 'command', 'menuitem', 'menuitemcheckbox'], ['roletype', 'widget', 'input', 'radio']]
  	};
  	menuitemradioRole.default = menuitemradioRole$1;
  	return menuitemradioRole;
  }

  var meterRole = {};

  var hasRequiredMeterRole;

  function requireMeterRole () {
  	if (hasRequiredMeterRole) return meterRole;
  	hasRequiredMeterRole = 1;

  	Object.defineProperty(meterRole, "__esModule", {
  	  value: true
  	});
  	meterRole.default = void 0;
  	var meterRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: true,
  	  baseConcepts: [],
  	  childrenPresentational: true,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-valuetext': null,
  	    'aria-valuemax': '100',
  	    'aria-valuemin': '0'
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'meter'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {
  	    'aria-valuenow': null
  	  },
  	  superClass: [['roletype', 'structure', 'range']]
  	};
  	meterRole.default = meterRole$1;
  	return meterRole;
  }

  var navigationRole = {};

  var hasRequiredNavigationRole;

  function requireNavigationRole () {
  	if (hasRequiredNavigationRole) return navigationRole;
  	hasRequiredNavigationRole = 1;

  	Object.defineProperty(navigationRole, "__esModule", {
  	  value: true
  	});
  	navigationRole.default = void 0;
  	var navigationRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {},
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'nav'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section', 'landmark']]
  	};
  	navigationRole.default = navigationRole$1;
  	return navigationRole;
  }

  var noneRole = {};

  var hasRequiredNoneRole;

  function requireNoneRole () {
  	if (hasRequiredNoneRole) return noneRole;
  	hasRequiredNoneRole = 1;

  	Object.defineProperty(noneRole, "__esModule", {
  	  value: true
  	});
  	noneRole.default = void 0;
  	var noneRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: [],
  	  prohibitedProps: [],
  	  props: {},
  	  relatedConcepts: [],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: []
  	};
  	noneRole.default = noneRole$1;
  	return noneRole;
  }

  var noteRole = {};

  var hasRequiredNoteRole;

  function requireNoteRole () {
  	if (hasRequiredNoteRole) return noteRole;
  	hasRequiredNoteRole = 1;

  	Object.defineProperty(noteRole, "__esModule", {
  	  value: true
  	});
  	noteRole.default = void 0;
  	var noteRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {},
  	  relatedConcepts: [],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section']]
  	};
  	noteRole.default = noteRole$1;
  	return noteRole;
  }

  var optionRole = {};

  var hasRequiredOptionRole;

  function requireOptionRole () {
  	if (hasRequiredOptionRole) return optionRole;
  	hasRequiredOptionRole = 1;

  	Object.defineProperty(optionRole, "__esModule", {
  	  value: true
  	});
  	optionRole.default = void 0;
  	var optionRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: true,
  	  baseConcepts: [],
  	  childrenPresentational: true,
  	  nameFrom: ['author', 'contents'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-checked': null,
  	    'aria-posinset': null,
  	    'aria-setsize': null,
  	    'aria-selected': 'false'
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'item'
  	    },
  	    module: 'XForms'
  	  }, {
  	    concept: {
  	      name: 'listitem'
  	    },
  	    module: 'ARIA'
  	  }, {
  	    concept: {
  	      name: 'option'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {
  	    'aria-selected': 'false'
  	  },
  	  superClass: [['roletype', 'widget', 'input']]
  	};
  	optionRole.default = optionRole$1;
  	return optionRole;
  }

  var paragraphRole = {};

  var hasRequiredParagraphRole;

  function requireParagraphRole () {
  	if (hasRequiredParagraphRole) return paragraphRole;
  	hasRequiredParagraphRole = 1;

  	Object.defineProperty(paragraphRole, "__esModule", {
  	  value: true
  	});
  	paragraphRole.default = void 0;
  	var paragraphRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['prohibited'],
  	  prohibitedProps: ['aria-label', 'aria-labelledby'],
  	  props: {},
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'p'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section']]
  	};
  	paragraphRole.default = paragraphRole$1;
  	return paragraphRole;
  }

  var presentationRole = {};

  var hasRequiredPresentationRole;

  function requirePresentationRole () {
  	if (hasRequiredPresentationRole) return presentationRole;
  	hasRequiredPresentationRole = 1;

  	Object.defineProperty(presentationRole, "__esModule", {
  	  value: true
  	});
  	presentationRole.default = void 0;
  	var presentationRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['prohibited'],
  	  prohibitedProps: ['aria-label', 'aria-labelledby'],
  	  props: {},
  	  relatedConcepts: [{
  	    concept: {
  	      attributes: [{
  	        name: 'alt',
  	        value: ''
  	      }],
  	      name: 'img'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure']]
  	};
  	presentationRole.default = presentationRole$1;
  	return presentationRole;
  }

  var progressbarRole = {};

  var hasRequiredProgressbarRole;

  function requireProgressbarRole () {
  	if (hasRequiredProgressbarRole) return progressbarRole;
  	hasRequiredProgressbarRole = 1;

  	Object.defineProperty(progressbarRole, "__esModule", {
  	  value: true
  	});
  	progressbarRole.default = void 0;
  	var progressbarRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: true,
  	  baseConcepts: [],
  	  childrenPresentational: true,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-valuetext': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'progress'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      name: 'status'
  	    },
  	    module: 'ARIA'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'range'], ['roletype', 'widget']]
  	};
  	progressbarRole.default = progressbarRole$1;
  	return progressbarRole;
  }

  var radioRole = {};

  var hasRequiredRadioRole;

  function requireRadioRole () {
  	if (hasRequiredRadioRole) return radioRole;
  	hasRequiredRadioRole = 1;

  	Object.defineProperty(radioRole, "__esModule", {
  	  value: true
  	});
  	radioRole.default = void 0;
  	var radioRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: true,
  	  baseConcepts: [],
  	  childrenPresentational: true,
  	  nameFrom: ['author', 'contents'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-checked': null,
  	    'aria-posinset': null,
  	    'aria-setsize': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      attributes: [{
  	        name: 'type',
  	        value: 'radio'
  	      }],
  	      name: 'input'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {
  	    'aria-checked': null
  	  },
  	  superClass: [['roletype', 'widget', 'input']]
  	};
  	radioRole.default = radioRole$1;
  	return radioRole;
  }

  var radiogroupRole = {};

  var hasRequiredRadiogroupRole;

  function requireRadiogroupRole () {
  	if (hasRequiredRadiogroupRole) return radiogroupRole;
  	hasRequiredRadiogroupRole = 1;

  	Object.defineProperty(radiogroupRole, "__esModule", {
  	  value: true
  	});
  	radiogroupRole.default = void 0;
  	var radiogroupRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: true,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-errormessage': null,
  	    'aria-invalid': null,
  	    'aria-readonly': null,
  	    'aria-required': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'list'
  	    },
  	    module: 'ARIA'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [['radio']],
  	  requiredProps: {},
  	  superClass: [['roletype', 'widget', 'composite', 'select'], ['roletype', 'structure', 'section', 'group', 'select']]
  	};
  	radiogroupRole.default = radiogroupRole$1;
  	return radiogroupRole;
  }

  var regionRole = {};

  var hasRequiredRegionRole;

  function requireRegionRole () {
  	if (hasRequiredRegionRole) return regionRole;
  	hasRequiredRegionRole = 1;

  	Object.defineProperty(regionRole, "__esModule", {
  	  value: true
  	});
  	regionRole.default = void 0;
  	var regionRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: true,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {},
  	  relatedConcepts: [{
  	    concept: {
  	      attributes: [{
  	        constraints: ['set'],
  	        name: 'aria-label'
  	      }],
  	      name: 'section'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      attributes: [{
  	        constraints: ['set'],
  	        name: 'aria-labelledby'
  	      }],
  	      name: 'section'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      name: 'Device Independence Glossart perceivable unit'
  	    }
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section', 'landmark']]
  	};
  	regionRole.default = regionRole$1;
  	return regionRole;
  }

  var rowRole = {};

  var hasRequiredRowRole;

  function requireRowRole () {
  	if (hasRequiredRowRole) return rowRole;
  	hasRequiredRowRole = 1;

  	Object.defineProperty(rowRole, "__esModule", {
  	  value: true
  	});
  	rowRole.default = void 0;
  	var rowRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author', 'contents'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-colindex': null,
  	    'aria-expanded': null,
  	    'aria-level': null,
  	    'aria-posinset': null,
  	    'aria-rowindex': null,
  	    'aria-selected': null,
  	    'aria-setsize': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'tr'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: ['grid', 'rowgroup', 'table', 'treegrid'],
  	  requiredContextRole: ['grid', 'rowgroup', 'table', 'treegrid'],
  	  requiredOwnedElements: [['cell'], ['columnheader'], ['gridcell'], ['rowheader']],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section', 'group'], ['roletype', 'widget']]
  	};
  	rowRole.default = rowRole$1;
  	return rowRole;
  }

  var rowgroupRole = {};

  var hasRequiredRowgroupRole;

  function requireRowgroupRole () {
  	if (hasRequiredRowgroupRole) return rowgroupRole;
  	hasRequiredRowgroupRole = 1;

  	Object.defineProperty(rowgroupRole, "__esModule", {
  	  value: true
  	});
  	rowgroupRole.default = void 0;
  	var rowgroupRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author', 'contents'],
  	  prohibitedProps: [],
  	  props: {},
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'tbody'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      name: 'tfoot'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      name: 'thead'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: ['grid', 'table', 'treegrid'],
  	  requiredContextRole: ['grid', 'table', 'treegrid'],
  	  requiredOwnedElements: [['row']],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure']]
  	};
  	rowgroupRole.default = rowgroupRole$1;
  	return rowgroupRole;
  }

  var rowheaderRole = {};

  var hasRequiredRowheaderRole;

  function requireRowheaderRole () {
  	if (hasRequiredRowheaderRole) return rowheaderRole;
  	hasRequiredRowheaderRole = 1;

  	Object.defineProperty(rowheaderRole, "__esModule", {
  	  value: true
  	});
  	rowheaderRole.default = void 0;
  	var rowheaderRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: true,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author', 'contents'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-sort': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      attributes: [{
  	        name: 'scope',
  	        value: 'row'
  	      }],
  	      name: 'th'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      attributes: [{
  	        name: 'scope',
  	        value: 'rowgroup'
  	      }],
  	      name: 'th'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: ['row', 'rowgroup'],
  	  requiredContextRole: ['row', 'rowgroup'],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section', 'cell'], ['roletype', 'structure', 'section', 'cell', 'gridcell'], ['roletype', 'widget', 'gridcell'], ['roletype', 'structure', 'sectionhead']]
  	};
  	rowheaderRole.default = rowheaderRole$1;
  	return rowheaderRole;
  }

  var scrollbarRole = {};

  var hasRequiredScrollbarRole;

  function requireScrollbarRole () {
  	if (hasRequiredScrollbarRole) return scrollbarRole;
  	hasRequiredScrollbarRole = 1;

  	Object.defineProperty(scrollbarRole, "__esModule", {
  	  value: true
  	});
  	scrollbarRole.default = void 0;
  	var scrollbarRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: true,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-disabled': null,
  	    'aria-valuetext': null,
  	    'aria-orientation': 'vertical',
  	    'aria-valuemax': '100',
  	    'aria-valuemin': '0'
  	  },
  	  relatedConcepts: [],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {
  	    'aria-controls': null,
  	    'aria-valuenow': null
  	  },
  	  superClass: [['roletype', 'structure', 'range'], ['roletype', 'widget']]
  	};
  	scrollbarRole.default = scrollbarRole$1;
  	return scrollbarRole;
  }

  var searchRole = {};

  var hasRequiredSearchRole;

  function requireSearchRole () {
  	if (hasRequiredSearchRole) return searchRole;
  	hasRequiredSearchRole = 1;

  	Object.defineProperty(searchRole, "__esModule", {
  	  value: true
  	});
  	searchRole.default = void 0;
  	var searchRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {},
  	  relatedConcepts: [],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section', 'landmark']]
  	};
  	searchRole.default = searchRole$1;
  	return searchRole;
  }

  var searchboxRole = {};

  var hasRequiredSearchboxRole;

  function requireSearchboxRole () {
  	if (hasRequiredSearchboxRole) return searchboxRole;
  	hasRequiredSearchboxRole = 1;

  	Object.defineProperty(searchboxRole, "__esModule", {
  	  value: true
  	});
  	searchboxRole.default = void 0;
  	var searchboxRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: true,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {},
  	  relatedConcepts: [{
  	    concept: {
  	      attributes: [{
  	        constraints: ['undefined'],
  	        name: 'list'
  	      }, {
  	        name: 'type',
  	        value: 'search'
  	      }],
  	      constraints: ['the list attribute is not set'],
  	      name: 'input'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'widget', 'input', 'textbox']]
  	};
  	searchboxRole.default = searchboxRole$1;
  	return searchboxRole;
  }

  var separatorRole = {};

  var hasRequiredSeparatorRole;

  function requireSeparatorRole () {
  	if (hasRequiredSeparatorRole) return separatorRole;
  	hasRequiredSeparatorRole = 1;

  	Object.defineProperty(separatorRole, "__esModule", {
  	  value: true
  	});
  	separatorRole.default = void 0;
  	var separatorRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: true,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-disabled': null,
  	    'aria-orientation': 'horizontal',
  	    'aria-valuemax': '100',
  	    'aria-valuemin': '0',
  	    'aria-valuenow': null,
  	    'aria-valuetext': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'hr'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure']]
  	};
  	separatorRole.default = separatorRole$1;
  	return separatorRole;
  }

  var sliderRole = {};

  var hasRequiredSliderRole;

  function requireSliderRole () {
  	if (hasRequiredSliderRole) return sliderRole;
  	hasRequiredSliderRole = 1;

  	Object.defineProperty(sliderRole, "__esModule", {
  	  value: true
  	});
  	sliderRole.default = void 0;
  	var sliderRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: true,
  	  baseConcepts: [],
  	  childrenPresentational: true,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-errormessage': null,
  	    'aria-haspopup': null,
  	    'aria-invalid': null,
  	    'aria-readonly': null,
  	    'aria-valuetext': null,
  	    'aria-orientation': 'horizontal',
  	    'aria-valuemax': '100',
  	    'aria-valuemin': '0'
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      attributes: [{
  	        name: 'type',
  	        value: 'range'
  	      }],
  	      name: 'input'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {
  	    'aria-valuenow': null
  	  },
  	  superClass: [['roletype', 'widget', 'input'], ['roletype', 'structure', 'range']]
  	};
  	sliderRole.default = sliderRole$1;
  	return sliderRole;
  }

  var spinbuttonRole = {};

  var hasRequiredSpinbuttonRole;

  function requireSpinbuttonRole () {
  	if (hasRequiredSpinbuttonRole) return spinbuttonRole;
  	hasRequiredSpinbuttonRole = 1;

  	Object.defineProperty(spinbuttonRole, "__esModule", {
  	  value: true
  	});
  	spinbuttonRole.default = void 0;
  	var spinbuttonRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: true,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-errormessage': null,
  	    'aria-invalid': null,
  	    'aria-readonly': null,
  	    'aria-required': null,
  	    'aria-valuetext': null,
  	    'aria-valuenow': '0'
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      attributes: [{
  	        name: 'type',
  	        value: 'number'
  	      }],
  	      name: 'input'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'widget', 'composite'], ['roletype', 'widget', 'input'], ['roletype', 'structure', 'range']]
  	};
  	spinbuttonRole.default = spinbuttonRole$1;
  	return spinbuttonRole;
  }

  var statusRole = {};

  var hasRequiredStatusRole;

  function requireStatusRole () {
  	if (hasRequiredStatusRole) return statusRole;
  	hasRequiredStatusRole = 1;

  	Object.defineProperty(statusRole, "__esModule", {
  	  value: true
  	});
  	statusRole.default = void 0;
  	var statusRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-atomic': 'true',
  	    'aria-live': 'polite'
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'output'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section']]
  	};
  	statusRole.default = statusRole$1;
  	return statusRole;
  }

  var strongRole = {};

  var hasRequiredStrongRole;

  function requireStrongRole () {
  	if (hasRequiredStrongRole) return strongRole;
  	hasRequiredStrongRole = 1;

  	Object.defineProperty(strongRole, "__esModule", {
  	  value: true
  	});
  	strongRole.default = void 0;
  	var strongRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['prohibited'],
  	  prohibitedProps: ['aria-label', 'aria-labelledby'],
  	  props: {},
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'strong'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section']]
  	};
  	strongRole.default = strongRole$1;
  	return strongRole;
  }

  var subscriptRole = {};

  var hasRequiredSubscriptRole;

  function requireSubscriptRole () {
  	if (hasRequiredSubscriptRole) return subscriptRole;
  	hasRequiredSubscriptRole = 1;

  	Object.defineProperty(subscriptRole, "__esModule", {
  	  value: true
  	});
  	subscriptRole.default = void 0;
  	var subscriptRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['prohibited'],
  	  prohibitedProps: ['aria-label', 'aria-labelledby'],
  	  props: {},
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'sub'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section']]
  	};
  	subscriptRole.default = subscriptRole$1;
  	return subscriptRole;
  }

  var superscriptRole = {};

  var hasRequiredSuperscriptRole;

  function requireSuperscriptRole () {
  	if (hasRequiredSuperscriptRole) return superscriptRole;
  	hasRequiredSuperscriptRole = 1;

  	Object.defineProperty(superscriptRole, "__esModule", {
  	  value: true
  	});
  	superscriptRole.default = void 0;
  	var superscriptRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['prohibited'],
  	  prohibitedProps: ['aria-label', 'aria-labelledby'],
  	  props: {},
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'sup'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section']]
  	};
  	superscriptRole.default = superscriptRole$1;
  	return superscriptRole;
  }

  var switchRole = {};

  var hasRequiredSwitchRole;

  function requireSwitchRole () {
  	if (hasRequiredSwitchRole) return switchRole;
  	hasRequiredSwitchRole = 1;

  	Object.defineProperty(switchRole, "__esModule", {
  	  value: true
  	});
  	switchRole.default = void 0;
  	var switchRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: true,
  	  baseConcepts: [],
  	  childrenPresentational: true,
  	  nameFrom: ['author', 'contents'],
  	  prohibitedProps: [],
  	  props: {},
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'button'
  	    },
  	    module: 'ARIA'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {
  	    'aria-checked': null
  	  },
  	  superClass: [['roletype', 'widget', 'input', 'checkbox']]
  	};
  	switchRole.default = switchRole$1;
  	return switchRole;
  }

  var tabRole = {};

  var hasRequiredTabRole;

  function requireTabRole () {
  	if (hasRequiredTabRole) return tabRole;
  	hasRequiredTabRole = 1;

  	Object.defineProperty(tabRole, "__esModule", {
  	  value: true
  	});
  	tabRole.default = void 0;
  	var tabRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: true,
  	  nameFrom: ['author', 'contents'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-disabled': null,
  	    'aria-expanded': null,
  	    'aria-haspopup': null,
  	    'aria-posinset': null,
  	    'aria-setsize': null,
  	    'aria-selected': 'false'
  	  },
  	  relatedConcepts: [],
  	  requireContextRole: ['tablist'],
  	  requiredContextRole: ['tablist'],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'sectionhead'], ['roletype', 'widget']]
  	};
  	tabRole.default = tabRole$1;
  	return tabRole;
  }

  var tableRole = {};

  var hasRequiredTableRole;

  function requireTableRole () {
  	if (hasRequiredTableRole) return tableRole;
  	hasRequiredTableRole = 1;

  	Object.defineProperty(tableRole, "__esModule", {
  	  value: true
  	});
  	tableRole.default = void 0;
  	var tableRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: true,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-colcount': null,
  	    'aria-rowcount': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'table'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [['row'], ['row', 'rowgroup']],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section']]
  	};
  	tableRole.default = tableRole$1;
  	return tableRole;
  }

  var tablistRole = {};

  var hasRequiredTablistRole;

  function requireTablistRole () {
  	if (hasRequiredTablistRole) return tablistRole;
  	hasRequiredTablistRole = 1;

  	Object.defineProperty(tablistRole, "__esModule", {
  	  value: true
  	});
  	tablistRole.default = void 0;
  	var tablistRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-level': null,
  	    'aria-multiselectable': null,
  	    'aria-orientation': 'horizontal'
  	  },
  	  relatedConcepts: [{
  	    module: 'DAISY',
  	    concept: {
  	      name: 'guide'
  	    }
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [['tab']],
  	  requiredProps: {},
  	  superClass: [['roletype', 'widget', 'composite']]
  	};
  	tablistRole.default = tablistRole$1;
  	return tablistRole;
  }

  var tabpanelRole = {};

  var hasRequiredTabpanelRole;

  function requireTabpanelRole () {
  	if (hasRequiredTabpanelRole) return tabpanelRole;
  	hasRequiredTabpanelRole = 1;

  	Object.defineProperty(tabpanelRole, "__esModule", {
  	  value: true
  	});
  	tabpanelRole.default = void 0;
  	var tabpanelRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: true,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {},
  	  relatedConcepts: [],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section']]
  	};
  	tabpanelRole.default = tabpanelRole$1;
  	return tabpanelRole;
  }

  var termRole = {};

  var hasRequiredTermRole;

  function requireTermRole () {
  	if (hasRequiredTermRole) return termRole;
  	hasRequiredTermRole = 1;

  	Object.defineProperty(termRole, "__esModule", {
  	  value: true
  	});
  	termRole.default = void 0;
  	var termRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {},
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'dfn'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      name: 'dt'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section']]
  	};
  	termRole.default = termRole$1;
  	return termRole;
  }

  var textboxRole = {};

  var hasRequiredTextboxRole;

  function requireTextboxRole () {
  	if (hasRequiredTextboxRole) return textboxRole;
  	hasRequiredTextboxRole = 1;

  	Object.defineProperty(textboxRole, "__esModule", {
  	  value: true
  	});
  	textboxRole.default = void 0;
  	var textboxRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: true,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-activedescendant': null,
  	    'aria-autocomplete': null,
  	    'aria-errormessage': null,
  	    'aria-haspopup': null,
  	    'aria-invalid': null,
  	    'aria-multiline': null,
  	    'aria-placeholder': null,
  	    'aria-readonly': null,
  	    'aria-required': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      attributes: [{
  	        constraints: ['undefined'],
  	        name: 'type'
  	      }, {
  	        constraints: ['undefined'],
  	        name: 'list'
  	      }],
  	      constraints: ['the list attribute is not set'],
  	      name: 'input'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      attributes: [{
  	        constraints: ['undefined'],
  	        name: 'list'
  	      }, {
  	        name: 'type',
  	        value: 'email'
  	      }],
  	      constraints: ['the list attribute is not set'],
  	      name: 'input'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      attributes: [{
  	        constraints: ['undefined'],
  	        name: 'list'
  	      }, {
  	        name: 'type',
  	        value: 'tel'
  	      }],
  	      constraints: ['the list attribute is not set'],
  	      name: 'input'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      attributes: [{
  	        constraints: ['undefined'],
  	        name: 'list'
  	      }, {
  	        name: 'type',
  	        value: 'text'
  	      }],
  	      constraints: ['the list attribute is not set'],
  	      name: 'input'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      attributes: [{
  	        constraints: ['undefined'],
  	        name: 'list'
  	      }, {
  	        name: 'type',
  	        value: 'url'
  	      }],
  	      constraints: ['the list attribute is not set'],
  	      name: 'input'
  	    },
  	    module: 'HTML'
  	  }, {
  	    concept: {
  	      name: 'input'
  	    },
  	    module: 'XForms'
  	  }, {
  	    concept: {
  	      name: 'textarea'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'widget', 'input']]
  	};
  	textboxRole.default = textboxRole$1;
  	return textboxRole;
  }

  var timeRole = {};

  var hasRequiredTimeRole;

  function requireTimeRole () {
  	if (hasRequiredTimeRole) return timeRole;
  	hasRequiredTimeRole = 1;

  	Object.defineProperty(timeRole, "__esModule", {
  	  value: true
  	});
  	timeRole.default = void 0;
  	var timeRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {},
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'time'
  	    },
  	    module: 'HTML'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section']]
  	};
  	timeRole.default = timeRole$1;
  	return timeRole;
  }

  var timerRole = {};

  var hasRequiredTimerRole;

  function requireTimerRole () {
  	if (hasRequiredTimerRole) return timerRole;
  	hasRequiredTimerRole = 1;

  	Object.defineProperty(timerRole, "__esModule", {
  	  value: true
  	});
  	timerRole.default = void 0;
  	var timerRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {},
  	  relatedConcepts: [],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section', 'status']]
  	};
  	timerRole.default = timerRole$1;
  	return timerRole;
  }

  var toolbarRole = {};

  var hasRequiredToolbarRole;

  function requireToolbarRole () {
  	if (hasRequiredToolbarRole) return toolbarRole;
  	hasRequiredToolbarRole = 1;

  	Object.defineProperty(toolbarRole, "__esModule", {
  	  value: true
  	});
  	toolbarRole.default = void 0;
  	var toolbarRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-orientation': 'horizontal'
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'menubar'
  	    },
  	    module: 'ARIA'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section', 'group']]
  	};
  	toolbarRole.default = toolbarRole$1;
  	return toolbarRole;
  }

  var tooltipRole = {};

  var hasRequiredTooltipRole;

  function requireTooltipRole () {
  	if (hasRequiredTooltipRole) return tooltipRole;
  	hasRequiredTooltipRole = 1;

  	Object.defineProperty(tooltipRole, "__esModule", {
  	  value: true
  	});
  	tooltipRole.default = void 0;
  	var tooltipRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: true,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author', 'contents'],
  	  prohibitedProps: [],
  	  props: {},
  	  relatedConcepts: [],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section']]
  	};
  	tooltipRole.default = tooltipRole$1;
  	return tooltipRole;
  }

  var treeRole = {};

  var hasRequiredTreeRole;

  function requireTreeRole () {
  	if (hasRequiredTreeRole) return treeRole;
  	hasRequiredTreeRole = 1;

  	Object.defineProperty(treeRole, "__esModule", {
  	  value: true
  	});
  	treeRole.default = void 0;
  	var treeRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: true,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-errormessage': null,
  	    'aria-invalid': null,
  	    'aria-multiselectable': null,
  	    'aria-required': null,
  	    'aria-orientation': 'vertical'
  	  },
  	  relatedConcepts: [],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [['treeitem', 'group'], ['treeitem']],
  	  requiredProps: {},
  	  superClass: [['roletype', 'widget', 'composite', 'select'], ['roletype', 'structure', 'section', 'group', 'select']]
  	};
  	treeRole.default = treeRole$1;
  	return treeRole;
  }

  var treegridRole = {};

  var hasRequiredTreegridRole;

  function requireTreegridRole () {
  	if (hasRequiredTreegridRole) return treegridRole;
  	hasRequiredTreegridRole = 1;

  	Object.defineProperty(treegridRole, "__esModule", {
  	  value: true
  	});
  	treegridRole.default = void 0;
  	var treegridRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: true,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {},
  	  relatedConcepts: [],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [['row'], ['row', 'rowgroup']],
  	  requiredProps: {},
  	  superClass: [['roletype', 'widget', 'composite', 'grid'], ['roletype', 'structure', 'section', 'table', 'grid'], ['roletype', 'widget', 'composite', 'select', 'tree'], ['roletype', 'structure', 'section', 'group', 'select', 'tree']]
  	};
  	treegridRole.default = treegridRole$1;
  	return treegridRole;
  }

  var treeitemRole = {};

  var hasRequiredTreeitemRole;

  function requireTreeitemRole () {
  	if (hasRequiredTreeitemRole) return treeitemRole;
  	hasRequiredTreeitemRole = 1;

  	Object.defineProperty(treeitemRole, "__esModule", {
  	  value: true
  	});
  	treeitemRole.default = void 0;
  	var treeitemRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: true,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author', 'contents'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-expanded': null,
  	    'aria-haspopup': null
  	  },
  	  relatedConcepts: [],
  	  requireContextRole: ['group', 'tree'],
  	  requiredContextRole: ['group', 'tree'],
  	  requiredOwnedElements: [],
  	  requiredProps: {
  	    'aria-selected': null
  	  },
  	  superClass: [['roletype', 'structure', 'section', 'listitem'], ['roletype', 'widget', 'input', 'option']]
  	};
  	treeitemRole.default = treeitemRole$1;
  	return treeitemRole;
  }

  var hasRequiredAriaLiteralRoles;

  function requireAriaLiteralRoles () {
  	if (hasRequiredAriaLiteralRoles) return ariaLiteralRoles;
  	hasRequiredAriaLiteralRoles = 1;

  	Object.defineProperty(ariaLiteralRoles, "__esModule", {
  	  value: true
  	});
  	ariaLiteralRoles.default = void 0;
  	var _alertRole = _interopRequireDefault(requireAlertRole());
  	var _alertdialogRole = _interopRequireDefault(requireAlertdialogRole());
  	var _applicationRole = _interopRequireDefault(requireApplicationRole());
  	var _articleRole = _interopRequireDefault(requireArticleRole());
  	var _bannerRole = _interopRequireDefault(requireBannerRole());
  	var _blockquoteRole = _interopRequireDefault(requireBlockquoteRole());
  	var _buttonRole = _interopRequireDefault(requireButtonRole());
  	var _captionRole = _interopRequireDefault(requireCaptionRole());
  	var _cellRole = _interopRequireDefault(requireCellRole());
  	var _checkboxRole = _interopRequireDefault(requireCheckboxRole());
  	var _codeRole = _interopRequireDefault(requireCodeRole());
  	var _columnheaderRole = _interopRequireDefault(requireColumnheaderRole());
  	var _comboboxRole = _interopRequireDefault(requireComboboxRole());
  	var _complementaryRole = _interopRequireDefault(requireComplementaryRole());
  	var _contentinfoRole = _interopRequireDefault(requireContentinfoRole());
  	var _definitionRole = _interopRequireDefault(requireDefinitionRole());
  	var _deletionRole = _interopRequireDefault(requireDeletionRole());
  	var _dialogRole = _interopRequireDefault(requireDialogRole());
  	var _directoryRole = _interopRequireDefault(requireDirectoryRole());
  	var _documentRole = _interopRequireDefault(requireDocumentRole());
  	var _emphasisRole = _interopRequireDefault(requireEmphasisRole());
  	var _feedRole = _interopRequireDefault(requireFeedRole());
  	var _figureRole = _interopRequireDefault(requireFigureRole());
  	var _formRole = _interopRequireDefault(requireFormRole());
  	var _genericRole = _interopRequireDefault(requireGenericRole());
  	var _gridRole = _interopRequireDefault(requireGridRole());
  	var _gridcellRole = _interopRequireDefault(requireGridcellRole());
  	var _groupRole = _interopRequireDefault(requireGroupRole());
  	var _headingRole = _interopRequireDefault(requireHeadingRole());
  	var _imgRole = _interopRequireDefault(requireImgRole());
  	var _insertionRole = _interopRequireDefault(requireInsertionRole());
  	var _linkRole = _interopRequireDefault(requireLinkRole());
  	var _listRole = _interopRequireDefault(requireListRole());
  	var _listboxRole = _interopRequireDefault(requireListboxRole());
  	var _listitemRole = _interopRequireDefault(requireListitemRole());
  	var _logRole = _interopRequireDefault(requireLogRole());
  	var _mainRole = _interopRequireDefault(requireMainRole());
  	var _markRole = _interopRequireDefault(requireMarkRole());
  	var _marqueeRole = _interopRequireDefault(requireMarqueeRole());
  	var _mathRole = _interopRequireDefault(requireMathRole());
  	var _menuRole = _interopRequireDefault(requireMenuRole());
  	var _menubarRole = _interopRequireDefault(requireMenubarRole());
  	var _menuitemRole = _interopRequireDefault(requireMenuitemRole());
  	var _menuitemcheckboxRole = _interopRequireDefault(requireMenuitemcheckboxRole());
  	var _menuitemradioRole = _interopRequireDefault(requireMenuitemradioRole());
  	var _meterRole = _interopRequireDefault(requireMeterRole());
  	var _navigationRole = _interopRequireDefault(requireNavigationRole());
  	var _noneRole = _interopRequireDefault(requireNoneRole());
  	var _noteRole = _interopRequireDefault(requireNoteRole());
  	var _optionRole = _interopRequireDefault(requireOptionRole());
  	var _paragraphRole = _interopRequireDefault(requireParagraphRole());
  	var _presentationRole = _interopRequireDefault(requirePresentationRole());
  	var _progressbarRole = _interopRequireDefault(requireProgressbarRole());
  	var _radioRole = _interopRequireDefault(requireRadioRole());
  	var _radiogroupRole = _interopRequireDefault(requireRadiogroupRole());
  	var _regionRole = _interopRequireDefault(requireRegionRole());
  	var _rowRole = _interopRequireDefault(requireRowRole());
  	var _rowgroupRole = _interopRequireDefault(requireRowgroupRole());
  	var _rowheaderRole = _interopRequireDefault(requireRowheaderRole());
  	var _scrollbarRole = _interopRequireDefault(requireScrollbarRole());
  	var _searchRole = _interopRequireDefault(requireSearchRole());
  	var _searchboxRole = _interopRequireDefault(requireSearchboxRole());
  	var _separatorRole = _interopRequireDefault(requireSeparatorRole());
  	var _sliderRole = _interopRequireDefault(requireSliderRole());
  	var _spinbuttonRole = _interopRequireDefault(requireSpinbuttonRole());
  	var _statusRole = _interopRequireDefault(requireStatusRole());
  	var _strongRole = _interopRequireDefault(requireStrongRole());
  	var _subscriptRole = _interopRequireDefault(requireSubscriptRole());
  	var _superscriptRole = _interopRequireDefault(requireSuperscriptRole());
  	var _switchRole = _interopRequireDefault(requireSwitchRole());
  	var _tabRole = _interopRequireDefault(requireTabRole());
  	var _tableRole = _interopRequireDefault(requireTableRole());
  	var _tablistRole = _interopRequireDefault(requireTablistRole());
  	var _tabpanelRole = _interopRequireDefault(requireTabpanelRole());
  	var _termRole = _interopRequireDefault(requireTermRole());
  	var _textboxRole = _interopRequireDefault(requireTextboxRole());
  	var _timeRole = _interopRequireDefault(requireTimeRole());
  	var _timerRole = _interopRequireDefault(requireTimerRole());
  	var _toolbarRole = _interopRequireDefault(requireToolbarRole());
  	var _tooltipRole = _interopRequireDefault(requireTooltipRole());
  	var _treeRole = _interopRequireDefault(requireTreeRole());
  	var _treegridRole = _interopRequireDefault(requireTreegridRole());
  	var _treeitemRole = _interopRequireDefault(requireTreeitemRole());
  	function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  	var ariaLiteralRoles$1 = [['alert', _alertRole.default], ['alertdialog', _alertdialogRole.default], ['application', _applicationRole.default], ['article', _articleRole.default], ['banner', _bannerRole.default], ['blockquote', _blockquoteRole.default], ['button', _buttonRole.default], ['caption', _captionRole.default], ['cell', _cellRole.default], ['checkbox', _checkboxRole.default], ['code', _codeRole.default], ['columnheader', _columnheaderRole.default], ['combobox', _comboboxRole.default], ['complementary', _complementaryRole.default], ['contentinfo', _contentinfoRole.default], ['definition', _definitionRole.default], ['deletion', _deletionRole.default], ['dialog', _dialogRole.default], ['directory', _directoryRole.default], ['document', _documentRole.default], ['emphasis', _emphasisRole.default], ['feed', _feedRole.default], ['figure', _figureRole.default], ['form', _formRole.default], ['generic', _genericRole.default], ['grid', _gridRole.default], ['gridcell', _gridcellRole.default], ['group', _groupRole.default], ['heading', _headingRole.default], ['img', _imgRole.default], ['insertion', _insertionRole.default], ['link', _linkRole.default], ['list', _listRole.default], ['listbox', _listboxRole.default], ['listitem', _listitemRole.default], ['log', _logRole.default], ['main', _mainRole.default], ['mark', _markRole.default], ['marquee', _marqueeRole.default], ['math', _mathRole.default], ['menu', _menuRole.default], ['menubar', _menubarRole.default], ['menuitem', _menuitemRole.default], ['menuitemcheckbox', _menuitemcheckboxRole.default], ['menuitemradio', _menuitemradioRole.default], ['meter', _meterRole.default], ['navigation', _navigationRole.default], ['none', _noneRole.default], ['note', _noteRole.default], ['option', _optionRole.default], ['paragraph', _paragraphRole.default], ['presentation', _presentationRole.default], ['progressbar', _progressbarRole.default], ['radio', _radioRole.default], ['radiogroup', _radiogroupRole.default], ['region', _regionRole.default], ['row', _rowRole.default], ['rowgroup', _rowgroupRole.default], ['rowheader', _rowheaderRole.default], ['scrollbar', _scrollbarRole.default], ['search', _searchRole.default], ['searchbox', _searchboxRole.default], ['separator', _separatorRole.default], ['slider', _sliderRole.default], ['spinbutton', _spinbuttonRole.default], ['status', _statusRole.default], ['strong', _strongRole.default], ['subscript', _subscriptRole.default], ['superscript', _superscriptRole.default], ['switch', _switchRole.default], ['tab', _tabRole.default], ['table', _tableRole.default], ['tablist', _tablistRole.default], ['tabpanel', _tabpanelRole.default], ['term', _termRole.default], ['textbox', _textboxRole.default], ['time', _timeRole.default], ['timer', _timerRole.default], ['toolbar', _toolbarRole.default], ['tooltip', _tooltipRole.default], ['tree', _treeRole.default], ['treegrid', _treegridRole.default], ['treeitem', _treeitemRole.default]];
  	ariaLiteralRoles.default = ariaLiteralRoles$1;
  	return ariaLiteralRoles;
  }

  var ariaDpubRoles = {};

  var docAbstractRole = {};

  var hasRequiredDocAbstractRole;

  function requireDocAbstractRole () {
  	if (hasRequiredDocAbstractRole) return docAbstractRole;
  	hasRequiredDocAbstractRole = 1;

  	Object.defineProperty(docAbstractRole, "__esModule", {
  	  value: true
  	});
  	docAbstractRole.default = void 0;
  	var docAbstractRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-disabled': null,
  	    'aria-errormessage': null,
  	    'aria-expanded': null,
  	    'aria-haspopup': null,
  	    'aria-invalid': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'abstract [EPUB-SSV]'
  	    },
  	    module: 'EPUB'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section']]
  	};
  	docAbstractRole.default = docAbstractRole$1;
  	return docAbstractRole;
  }

  var docAcknowledgmentsRole = {};

  var hasRequiredDocAcknowledgmentsRole;

  function requireDocAcknowledgmentsRole () {
  	if (hasRequiredDocAcknowledgmentsRole) return docAcknowledgmentsRole;
  	hasRequiredDocAcknowledgmentsRole = 1;

  	Object.defineProperty(docAcknowledgmentsRole, "__esModule", {
  	  value: true
  	});
  	docAcknowledgmentsRole.default = void 0;
  	var docAcknowledgmentsRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-disabled': null,
  	    'aria-errormessage': null,
  	    'aria-expanded': null,
  	    'aria-haspopup': null,
  	    'aria-invalid': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'acknowledgments [EPUB-SSV]'
  	    },
  	    module: 'EPUB'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section', 'landmark']]
  	};
  	docAcknowledgmentsRole.default = docAcknowledgmentsRole$1;
  	return docAcknowledgmentsRole;
  }

  var docAfterwordRole = {};

  var hasRequiredDocAfterwordRole;

  function requireDocAfterwordRole () {
  	if (hasRequiredDocAfterwordRole) return docAfterwordRole;
  	hasRequiredDocAfterwordRole = 1;

  	Object.defineProperty(docAfterwordRole, "__esModule", {
  	  value: true
  	});
  	docAfterwordRole.default = void 0;
  	var docAfterwordRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-disabled': null,
  	    'aria-errormessage': null,
  	    'aria-expanded': null,
  	    'aria-haspopup': null,
  	    'aria-invalid': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'afterword [EPUB-SSV]'
  	    },
  	    module: 'EPUB'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section', 'landmark']]
  	};
  	docAfterwordRole.default = docAfterwordRole$1;
  	return docAfterwordRole;
  }

  var docAppendixRole = {};

  var hasRequiredDocAppendixRole;

  function requireDocAppendixRole () {
  	if (hasRequiredDocAppendixRole) return docAppendixRole;
  	hasRequiredDocAppendixRole = 1;

  	Object.defineProperty(docAppendixRole, "__esModule", {
  	  value: true
  	});
  	docAppendixRole.default = void 0;
  	var docAppendixRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-disabled': null,
  	    'aria-errormessage': null,
  	    'aria-expanded': null,
  	    'aria-haspopup': null,
  	    'aria-invalid': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'appendix [EPUB-SSV]'
  	    },
  	    module: 'EPUB'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section', 'landmark']]
  	};
  	docAppendixRole.default = docAppendixRole$1;
  	return docAppendixRole;
  }

  var docBacklinkRole = {};

  var hasRequiredDocBacklinkRole;

  function requireDocBacklinkRole () {
  	if (hasRequiredDocBacklinkRole) return docBacklinkRole;
  	hasRequiredDocBacklinkRole = 1;

  	Object.defineProperty(docBacklinkRole, "__esModule", {
  	  value: true
  	});
  	docBacklinkRole.default = void 0;
  	var docBacklinkRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: true,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author', 'contents'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-errormessage': null,
  	    'aria-invalid': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'referrer [EPUB-SSV]'
  	    },
  	    module: 'EPUB'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'widget', 'command', 'link']]
  	};
  	docBacklinkRole.default = docBacklinkRole$1;
  	return docBacklinkRole;
  }

  var docBiblioentryRole = {};

  var hasRequiredDocBiblioentryRole;

  function requireDocBiblioentryRole () {
  	if (hasRequiredDocBiblioentryRole) return docBiblioentryRole;
  	hasRequiredDocBiblioentryRole = 1;

  	Object.defineProperty(docBiblioentryRole, "__esModule", {
  	  value: true
  	});
  	docBiblioentryRole.default = void 0;
  	var docBiblioentryRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: true,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-disabled': null,
  	    'aria-errormessage': null,
  	    'aria-expanded': null,
  	    'aria-haspopup': null,
  	    'aria-invalid': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'EPUB biblioentry [EPUB-SSV]'
  	    },
  	    module: 'EPUB'
  	  }],
  	  requireContextRole: ['doc-bibliography'],
  	  requiredContextRole: ['doc-bibliography'],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section', 'listitem']]
  	};
  	docBiblioentryRole.default = docBiblioentryRole$1;
  	return docBiblioentryRole;
  }

  var docBibliographyRole = {};

  var hasRequiredDocBibliographyRole;

  function requireDocBibliographyRole () {
  	if (hasRequiredDocBibliographyRole) return docBibliographyRole;
  	hasRequiredDocBibliographyRole = 1;

  	Object.defineProperty(docBibliographyRole, "__esModule", {
  	  value: true
  	});
  	docBibliographyRole.default = void 0;
  	var docBibliographyRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-disabled': null,
  	    'aria-errormessage': null,
  	    'aria-expanded': null,
  	    'aria-haspopup': null,
  	    'aria-invalid': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'bibliography [EPUB-SSV]'
  	    },
  	    module: 'EPUB'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [['doc-biblioentry']],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section', 'landmark']]
  	};
  	docBibliographyRole.default = docBibliographyRole$1;
  	return docBibliographyRole;
  }

  var docBibliorefRole = {};

  var hasRequiredDocBibliorefRole;

  function requireDocBibliorefRole () {
  	if (hasRequiredDocBibliorefRole) return docBibliorefRole;
  	hasRequiredDocBibliorefRole = 1;

  	Object.defineProperty(docBibliorefRole, "__esModule", {
  	  value: true
  	});
  	docBibliorefRole.default = void 0;
  	var docBibliorefRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: true,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author', 'contents'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-errormessage': null,
  	    'aria-invalid': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'biblioref [EPUB-SSV]'
  	    },
  	    module: 'EPUB'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'widget', 'command', 'link']]
  	};
  	docBibliorefRole.default = docBibliorefRole$1;
  	return docBibliorefRole;
  }

  var docChapterRole = {};

  var hasRequiredDocChapterRole;

  function requireDocChapterRole () {
  	if (hasRequiredDocChapterRole) return docChapterRole;
  	hasRequiredDocChapterRole = 1;

  	Object.defineProperty(docChapterRole, "__esModule", {
  	  value: true
  	});
  	docChapterRole.default = void 0;
  	var docChapterRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-disabled': null,
  	    'aria-errormessage': null,
  	    'aria-expanded': null,
  	    'aria-haspopup': null,
  	    'aria-invalid': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'chapter [EPUB-SSV]'
  	    },
  	    module: 'EPUB'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section', 'landmark']]
  	};
  	docChapterRole.default = docChapterRole$1;
  	return docChapterRole;
  }

  var docColophonRole = {};

  var hasRequiredDocColophonRole;

  function requireDocColophonRole () {
  	if (hasRequiredDocColophonRole) return docColophonRole;
  	hasRequiredDocColophonRole = 1;

  	Object.defineProperty(docColophonRole, "__esModule", {
  	  value: true
  	});
  	docColophonRole.default = void 0;
  	var docColophonRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-disabled': null,
  	    'aria-errormessage': null,
  	    'aria-expanded': null,
  	    'aria-haspopup': null,
  	    'aria-invalid': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'colophon [EPUB-SSV]'
  	    },
  	    module: 'EPUB'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section']]
  	};
  	docColophonRole.default = docColophonRole$1;
  	return docColophonRole;
  }

  var docConclusionRole = {};

  var hasRequiredDocConclusionRole;

  function requireDocConclusionRole () {
  	if (hasRequiredDocConclusionRole) return docConclusionRole;
  	hasRequiredDocConclusionRole = 1;

  	Object.defineProperty(docConclusionRole, "__esModule", {
  	  value: true
  	});
  	docConclusionRole.default = void 0;
  	var docConclusionRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-disabled': null,
  	    'aria-errormessage': null,
  	    'aria-expanded': null,
  	    'aria-haspopup': null,
  	    'aria-invalid': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'conclusion [EPUB-SSV]'
  	    },
  	    module: 'EPUB'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section', 'landmark']]
  	};
  	docConclusionRole.default = docConclusionRole$1;
  	return docConclusionRole;
  }

  var docCoverRole = {};

  var hasRequiredDocCoverRole;

  function requireDocCoverRole () {
  	if (hasRequiredDocCoverRole) return docCoverRole;
  	hasRequiredDocCoverRole = 1;

  	Object.defineProperty(docCoverRole, "__esModule", {
  	  value: true
  	});
  	docCoverRole.default = void 0;
  	var docCoverRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-disabled': null,
  	    'aria-errormessage': null,
  	    'aria-expanded': null,
  	    'aria-haspopup': null,
  	    'aria-invalid': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'cover [EPUB-SSV]'
  	    },
  	    module: 'EPUB'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section', 'img']]
  	};
  	docCoverRole.default = docCoverRole$1;
  	return docCoverRole;
  }

  var docCreditRole = {};

  var hasRequiredDocCreditRole;

  function requireDocCreditRole () {
  	if (hasRequiredDocCreditRole) return docCreditRole;
  	hasRequiredDocCreditRole = 1;

  	Object.defineProperty(docCreditRole, "__esModule", {
  	  value: true
  	});
  	docCreditRole.default = void 0;
  	var docCreditRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-disabled': null,
  	    'aria-errormessage': null,
  	    'aria-expanded': null,
  	    'aria-haspopup': null,
  	    'aria-invalid': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'credit [EPUB-SSV]'
  	    },
  	    module: 'EPUB'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section']]
  	};
  	docCreditRole.default = docCreditRole$1;
  	return docCreditRole;
  }

  var docCreditsRole = {};

  var hasRequiredDocCreditsRole;

  function requireDocCreditsRole () {
  	if (hasRequiredDocCreditsRole) return docCreditsRole;
  	hasRequiredDocCreditsRole = 1;

  	Object.defineProperty(docCreditsRole, "__esModule", {
  	  value: true
  	});
  	docCreditsRole.default = void 0;
  	var docCreditsRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-disabled': null,
  	    'aria-errormessage': null,
  	    'aria-expanded': null,
  	    'aria-haspopup': null,
  	    'aria-invalid': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'credits [EPUB-SSV]'
  	    },
  	    module: 'EPUB'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section', 'landmark']]
  	};
  	docCreditsRole.default = docCreditsRole$1;
  	return docCreditsRole;
  }

  var docDedicationRole = {};

  var hasRequiredDocDedicationRole;

  function requireDocDedicationRole () {
  	if (hasRequiredDocDedicationRole) return docDedicationRole;
  	hasRequiredDocDedicationRole = 1;

  	Object.defineProperty(docDedicationRole, "__esModule", {
  	  value: true
  	});
  	docDedicationRole.default = void 0;
  	var docDedicationRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-disabled': null,
  	    'aria-errormessage': null,
  	    'aria-expanded': null,
  	    'aria-haspopup': null,
  	    'aria-invalid': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'dedication [EPUB-SSV]'
  	    },
  	    module: 'EPUB'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section']]
  	};
  	docDedicationRole.default = docDedicationRole$1;
  	return docDedicationRole;
  }

  var docEndnoteRole = {};

  var hasRequiredDocEndnoteRole;

  function requireDocEndnoteRole () {
  	if (hasRequiredDocEndnoteRole) return docEndnoteRole;
  	hasRequiredDocEndnoteRole = 1;

  	Object.defineProperty(docEndnoteRole, "__esModule", {
  	  value: true
  	});
  	docEndnoteRole.default = void 0;
  	var docEndnoteRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-disabled': null,
  	    'aria-errormessage': null,
  	    'aria-expanded': null,
  	    'aria-haspopup': null,
  	    'aria-invalid': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'rearnote [EPUB-SSV]'
  	    },
  	    module: 'EPUB'
  	  }],
  	  requireContextRole: ['doc-endnotes'],
  	  requiredContextRole: ['doc-endnotes'],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section', 'listitem']]
  	};
  	docEndnoteRole.default = docEndnoteRole$1;
  	return docEndnoteRole;
  }

  var docEndnotesRole = {};

  var hasRequiredDocEndnotesRole;

  function requireDocEndnotesRole () {
  	if (hasRequiredDocEndnotesRole) return docEndnotesRole;
  	hasRequiredDocEndnotesRole = 1;

  	Object.defineProperty(docEndnotesRole, "__esModule", {
  	  value: true
  	});
  	docEndnotesRole.default = void 0;
  	var docEndnotesRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-disabled': null,
  	    'aria-errormessage': null,
  	    'aria-expanded': null,
  	    'aria-haspopup': null,
  	    'aria-invalid': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'rearnotes [EPUB-SSV]'
  	    },
  	    module: 'EPUB'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [['doc-endnote']],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section', 'landmark']]
  	};
  	docEndnotesRole.default = docEndnotesRole$1;
  	return docEndnotesRole;
  }

  var docEpigraphRole = {};

  var hasRequiredDocEpigraphRole;

  function requireDocEpigraphRole () {
  	if (hasRequiredDocEpigraphRole) return docEpigraphRole;
  	hasRequiredDocEpigraphRole = 1;

  	Object.defineProperty(docEpigraphRole, "__esModule", {
  	  value: true
  	});
  	docEpigraphRole.default = void 0;
  	var docEpigraphRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-disabled': null,
  	    'aria-errormessage': null,
  	    'aria-expanded': null,
  	    'aria-haspopup': null,
  	    'aria-invalid': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'epigraph [EPUB-SSV]'
  	    },
  	    module: 'EPUB'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section']]
  	};
  	docEpigraphRole.default = docEpigraphRole$1;
  	return docEpigraphRole;
  }

  var docEpilogueRole = {};

  var hasRequiredDocEpilogueRole;

  function requireDocEpilogueRole () {
  	if (hasRequiredDocEpilogueRole) return docEpilogueRole;
  	hasRequiredDocEpilogueRole = 1;

  	Object.defineProperty(docEpilogueRole, "__esModule", {
  	  value: true
  	});
  	docEpilogueRole.default = void 0;
  	var docEpilogueRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-disabled': null,
  	    'aria-errormessage': null,
  	    'aria-expanded': null,
  	    'aria-haspopup': null,
  	    'aria-invalid': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'epilogue [EPUB-SSV]'
  	    },
  	    module: 'EPUB'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section', 'landmark']]
  	};
  	docEpilogueRole.default = docEpilogueRole$1;
  	return docEpilogueRole;
  }

  var docErrataRole = {};

  var hasRequiredDocErrataRole;

  function requireDocErrataRole () {
  	if (hasRequiredDocErrataRole) return docErrataRole;
  	hasRequiredDocErrataRole = 1;

  	Object.defineProperty(docErrataRole, "__esModule", {
  	  value: true
  	});
  	docErrataRole.default = void 0;
  	var docErrataRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-disabled': null,
  	    'aria-errormessage': null,
  	    'aria-expanded': null,
  	    'aria-haspopup': null,
  	    'aria-invalid': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'errata [EPUB-SSV]'
  	    },
  	    module: 'EPUB'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section', 'landmark']]
  	};
  	docErrataRole.default = docErrataRole$1;
  	return docErrataRole;
  }

  var docExampleRole = {};

  var hasRequiredDocExampleRole;

  function requireDocExampleRole () {
  	if (hasRequiredDocExampleRole) return docExampleRole;
  	hasRequiredDocExampleRole = 1;

  	Object.defineProperty(docExampleRole, "__esModule", {
  	  value: true
  	});
  	docExampleRole.default = void 0;
  	var docExampleRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-disabled': null,
  	    'aria-errormessage': null,
  	    'aria-expanded': null,
  	    'aria-haspopup': null,
  	    'aria-invalid': null
  	  },
  	  relatedConcepts: [],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section']]
  	};
  	docExampleRole.default = docExampleRole$1;
  	return docExampleRole;
  }

  var docFootnoteRole = {};

  var hasRequiredDocFootnoteRole;

  function requireDocFootnoteRole () {
  	if (hasRequiredDocFootnoteRole) return docFootnoteRole;
  	hasRequiredDocFootnoteRole = 1;

  	Object.defineProperty(docFootnoteRole, "__esModule", {
  	  value: true
  	});
  	docFootnoteRole.default = void 0;
  	var docFootnoteRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-disabled': null,
  	    'aria-errormessage': null,
  	    'aria-expanded': null,
  	    'aria-haspopup': null,
  	    'aria-invalid': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'footnote [EPUB-SSV]'
  	    },
  	    module: 'EPUB'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section']]
  	};
  	docFootnoteRole.default = docFootnoteRole$1;
  	return docFootnoteRole;
  }

  var docForewordRole = {};

  var hasRequiredDocForewordRole;

  function requireDocForewordRole () {
  	if (hasRequiredDocForewordRole) return docForewordRole;
  	hasRequiredDocForewordRole = 1;

  	Object.defineProperty(docForewordRole, "__esModule", {
  	  value: true
  	});
  	docForewordRole.default = void 0;
  	var docForewordRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-disabled': null,
  	    'aria-errormessage': null,
  	    'aria-expanded': null,
  	    'aria-haspopup': null,
  	    'aria-invalid': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'foreword [EPUB-SSV]'
  	    },
  	    module: 'EPUB'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section', 'landmark']]
  	};
  	docForewordRole.default = docForewordRole$1;
  	return docForewordRole;
  }

  var docGlossaryRole = {};

  var hasRequiredDocGlossaryRole;

  function requireDocGlossaryRole () {
  	if (hasRequiredDocGlossaryRole) return docGlossaryRole;
  	hasRequiredDocGlossaryRole = 1;

  	Object.defineProperty(docGlossaryRole, "__esModule", {
  	  value: true
  	});
  	docGlossaryRole.default = void 0;
  	var docGlossaryRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-disabled': null,
  	    'aria-errormessage': null,
  	    'aria-expanded': null,
  	    'aria-haspopup': null,
  	    'aria-invalid': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'glossary [EPUB-SSV]'
  	    },
  	    module: 'EPUB'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [['definition'], ['term']],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section', 'landmark']]
  	};
  	docGlossaryRole.default = docGlossaryRole$1;
  	return docGlossaryRole;
  }

  var docGlossrefRole = {};

  var hasRequiredDocGlossrefRole;

  function requireDocGlossrefRole () {
  	if (hasRequiredDocGlossrefRole) return docGlossrefRole;
  	hasRequiredDocGlossrefRole = 1;

  	Object.defineProperty(docGlossrefRole, "__esModule", {
  	  value: true
  	});
  	docGlossrefRole.default = void 0;
  	var docGlossrefRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: true,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author', 'contents'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-errormessage': null,
  	    'aria-invalid': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'glossref [EPUB-SSV]'
  	    },
  	    module: 'EPUB'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'widget', 'command', 'link']]
  	};
  	docGlossrefRole.default = docGlossrefRole$1;
  	return docGlossrefRole;
  }

  var docIndexRole = {};

  var hasRequiredDocIndexRole;

  function requireDocIndexRole () {
  	if (hasRequiredDocIndexRole) return docIndexRole;
  	hasRequiredDocIndexRole = 1;

  	Object.defineProperty(docIndexRole, "__esModule", {
  	  value: true
  	});
  	docIndexRole.default = void 0;
  	var docIndexRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-disabled': null,
  	    'aria-errormessage': null,
  	    'aria-expanded': null,
  	    'aria-haspopup': null,
  	    'aria-invalid': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'index [EPUB-SSV]'
  	    },
  	    module: 'EPUB'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section', 'landmark', 'navigation']]
  	};
  	docIndexRole.default = docIndexRole$1;
  	return docIndexRole;
  }

  var docIntroductionRole = {};

  var hasRequiredDocIntroductionRole;

  function requireDocIntroductionRole () {
  	if (hasRequiredDocIntroductionRole) return docIntroductionRole;
  	hasRequiredDocIntroductionRole = 1;

  	Object.defineProperty(docIntroductionRole, "__esModule", {
  	  value: true
  	});
  	docIntroductionRole.default = void 0;
  	var docIntroductionRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-disabled': null,
  	    'aria-errormessage': null,
  	    'aria-expanded': null,
  	    'aria-haspopup': null,
  	    'aria-invalid': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'introduction [EPUB-SSV]'
  	    },
  	    module: 'EPUB'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section', 'landmark']]
  	};
  	docIntroductionRole.default = docIntroductionRole$1;
  	return docIntroductionRole;
  }

  var docNoterefRole = {};

  var hasRequiredDocNoterefRole;

  function requireDocNoterefRole () {
  	if (hasRequiredDocNoterefRole) return docNoterefRole;
  	hasRequiredDocNoterefRole = 1;

  	Object.defineProperty(docNoterefRole, "__esModule", {
  	  value: true
  	});
  	docNoterefRole.default = void 0;
  	var docNoterefRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: true,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author', 'contents'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-errormessage': null,
  	    'aria-invalid': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'noteref [EPUB-SSV]'
  	    },
  	    module: 'EPUB'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'widget', 'command', 'link']]
  	};
  	docNoterefRole.default = docNoterefRole$1;
  	return docNoterefRole;
  }

  var docNoticeRole = {};

  var hasRequiredDocNoticeRole;

  function requireDocNoticeRole () {
  	if (hasRequiredDocNoticeRole) return docNoticeRole;
  	hasRequiredDocNoticeRole = 1;

  	Object.defineProperty(docNoticeRole, "__esModule", {
  	  value: true
  	});
  	docNoticeRole.default = void 0;
  	var docNoticeRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-disabled': null,
  	    'aria-errormessage': null,
  	    'aria-expanded': null,
  	    'aria-haspopup': null,
  	    'aria-invalid': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'notice [EPUB-SSV]'
  	    },
  	    module: 'EPUB'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section', 'note']]
  	};
  	docNoticeRole.default = docNoticeRole$1;
  	return docNoticeRole;
  }

  var docPagebreakRole = {};

  var hasRequiredDocPagebreakRole;

  function requireDocPagebreakRole () {
  	if (hasRequiredDocPagebreakRole) return docPagebreakRole;
  	hasRequiredDocPagebreakRole = 1;

  	Object.defineProperty(docPagebreakRole, "__esModule", {
  	  value: true
  	});
  	docPagebreakRole.default = void 0;
  	var docPagebreakRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: true,
  	  baseConcepts: [],
  	  childrenPresentational: true,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-errormessage': null,
  	    'aria-expanded': null,
  	    'aria-haspopup': null,
  	    'aria-invalid': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'pagebreak [EPUB-SSV]'
  	    },
  	    module: 'EPUB'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'separator']]
  	};
  	docPagebreakRole.default = docPagebreakRole$1;
  	return docPagebreakRole;
  }

  var docPagefooterRole = {};

  var hasRequiredDocPagefooterRole;

  function requireDocPagefooterRole () {
  	if (hasRequiredDocPagefooterRole) return docPagefooterRole;
  	hasRequiredDocPagefooterRole = 1;

  	Object.defineProperty(docPagefooterRole, "__esModule", {
  	  value: true
  	});
  	docPagefooterRole.default = void 0;
  	var docPagefooterRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['prohibited'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-braillelabel': null,
  	    'aria-brailleroledescription': null,
  	    'aria-description': null,
  	    'aria-disabled': null,
  	    'aria-errormessage': null,
  	    'aria-haspopup': null,
  	    'aria-invalid': null
  	  },
  	  relatedConcepts: [],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section']]
  	};
  	docPagefooterRole.default = docPagefooterRole$1;
  	return docPagefooterRole;
  }

  var docPageheaderRole = {};

  var hasRequiredDocPageheaderRole;

  function requireDocPageheaderRole () {
  	if (hasRequiredDocPageheaderRole) return docPageheaderRole;
  	hasRequiredDocPageheaderRole = 1;

  	Object.defineProperty(docPageheaderRole, "__esModule", {
  	  value: true
  	});
  	docPageheaderRole.default = void 0;
  	var docPageheaderRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['prohibited'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-braillelabel': null,
  	    'aria-brailleroledescription': null,
  	    'aria-description': null,
  	    'aria-disabled': null,
  	    'aria-errormessage': null,
  	    'aria-haspopup': null,
  	    'aria-invalid': null
  	  },
  	  relatedConcepts: [],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section']]
  	};
  	docPageheaderRole.default = docPageheaderRole$1;
  	return docPageheaderRole;
  }

  var docPagelistRole = {};

  var hasRequiredDocPagelistRole;

  function requireDocPagelistRole () {
  	if (hasRequiredDocPagelistRole) return docPagelistRole;
  	hasRequiredDocPagelistRole = 1;

  	Object.defineProperty(docPagelistRole, "__esModule", {
  	  value: true
  	});
  	docPagelistRole.default = void 0;
  	var docPagelistRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-disabled': null,
  	    'aria-errormessage': null,
  	    'aria-expanded': null,
  	    'aria-haspopup': null,
  	    'aria-invalid': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'page-list [EPUB-SSV]'
  	    },
  	    module: 'EPUB'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section', 'landmark', 'navigation']]
  	};
  	docPagelistRole.default = docPagelistRole$1;
  	return docPagelistRole;
  }

  var docPartRole = {};

  var hasRequiredDocPartRole;

  function requireDocPartRole () {
  	if (hasRequiredDocPartRole) return docPartRole;
  	hasRequiredDocPartRole = 1;

  	Object.defineProperty(docPartRole, "__esModule", {
  	  value: true
  	});
  	docPartRole.default = void 0;
  	var docPartRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: true,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-disabled': null,
  	    'aria-errormessage': null,
  	    'aria-expanded': null,
  	    'aria-haspopup': null,
  	    'aria-invalid': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'part [EPUB-SSV]'
  	    },
  	    module: 'EPUB'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section', 'landmark']]
  	};
  	docPartRole.default = docPartRole$1;
  	return docPartRole;
  }

  var docPrefaceRole = {};

  var hasRequiredDocPrefaceRole;

  function requireDocPrefaceRole () {
  	if (hasRequiredDocPrefaceRole) return docPrefaceRole;
  	hasRequiredDocPrefaceRole = 1;

  	Object.defineProperty(docPrefaceRole, "__esModule", {
  	  value: true
  	});
  	docPrefaceRole.default = void 0;
  	var docPrefaceRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-disabled': null,
  	    'aria-errormessage': null,
  	    'aria-expanded': null,
  	    'aria-haspopup': null,
  	    'aria-invalid': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'preface [EPUB-SSV]'
  	    },
  	    module: 'EPUB'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section', 'landmark']]
  	};
  	docPrefaceRole.default = docPrefaceRole$1;
  	return docPrefaceRole;
  }

  var docPrologueRole = {};

  var hasRequiredDocPrologueRole;

  function requireDocPrologueRole () {
  	if (hasRequiredDocPrologueRole) return docPrologueRole;
  	hasRequiredDocPrologueRole = 1;

  	Object.defineProperty(docPrologueRole, "__esModule", {
  	  value: true
  	});
  	docPrologueRole.default = void 0;
  	var docPrologueRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-disabled': null,
  	    'aria-errormessage': null,
  	    'aria-expanded': null,
  	    'aria-haspopup': null,
  	    'aria-invalid': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'prologue [EPUB-SSV]'
  	    },
  	    module: 'EPUB'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section', 'landmark']]
  	};
  	docPrologueRole.default = docPrologueRole$1;
  	return docPrologueRole;
  }

  var docPullquoteRole = {};

  var hasRequiredDocPullquoteRole;

  function requireDocPullquoteRole () {
  	if (hasRequiredDocPullquoteRole) return docPullquoteRole;
  	hasRequiredDocPullquoteRole = 1;

  	Object.defineProperty(docPullquoteRole, "__esModule", {
  	  value: true
  	});
  	docPullquoteRole.default = void 0;
  	var docPullquoteRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {},
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'pullquote [EPUB-SSV]'
  	    },
  	    module: 'EPUB'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['none']]
  	};
  	docPullquoteRole.default = docPullquoteRole$1;
  	return docPullquoteRole;
  }

  var docQnaRole = {};

  var hasRequiredDocQnaRole;

  function requireDocQnaRole () {
  	if (hasRequiredDocQnaRole) return docQnaRole;
  	hasRequiredDocQnaRole = 1;

  	Object.defineProperty(docQnaRole, "__esModule", {
  	  value: true
  	});
  	docQnaRole.default = void 0;
  	var docQnaRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-disabled': null,
  	    'aria-errormessage': null,
  	    'aria-expanded': null,
  	    'aria-haspopup': null,
  	    'aria-invalid': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'qna [EPUB-SSV]'
  	    },
  	    module: 'EPUB'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section']]
  	};
  	docQnaRole.default = docQnaRole$1;
  	return docQnaRole;
  }

  var docSubtitleRole = {};

  var hasRequiredDocSubtitleRole;

  function requireDocSubtitleRole () {
  	if (hasRequiredDocSubtitleRole) return docSubtitleRole;
  	hasRequiredDocSubtitleRole = 1;

  	Object.defineProperty(docSubtitleRole, "__esModule", {
  	  value: true
  	});
  	docSubtitleRole.default = void 0;
  	var docSubtitleRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-disabled': null,
  	    'aria-errormessage': null,
  	    'aria-expanded': null,
  	    'aria-haspopup': null,
  	    'aria-invalid': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'subtitle [EPUB-SSV]'
  	    },
  	    module: 'EPUB'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'sectionhead']]
  	};
  	docSubtitleRole.default = docSubtitleRole$1;
  	return docSubtitleRole;
  }

  var docTipRole = {};

  var hasRequiredDocTipRole;

  function requireDocTipRole () {
  	if (hasRequiredDocTipRole) return docTipRole;
  	hasRequiredDocTipRole = 1;

  	Object.defineProperty(docTipRole, "__esModule", {
  	  value: true
  	});
  	docTipRole.default = void 0;
  	var docTipRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-disabled': null,
  	    'aria-errormessage': null,
  	    'aria-expanded': null,
  	    'aria-haspopup': null,
  	    'aria-invalid': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'help [EPUB-SSV]'
  	    },
  	    module: 'EPUB'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section', 'note']]
  	};
  	docTipRole.default = docTipRole$1;
  	return docTipRole;
  }

  var docTocRole = {};

  var hasRequiredDocTocRole;

  function requireDocTocRole () {
  	if (hasRequiredDocTocRole) return docTocRole;
  	hasRequiredDocTocRole = 1;

  	Object.defineProperty(docTocRole, "__esModule", {
  	  value: true
  	});
  	docTocRole.default = void 0;
  	var docTocRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-disabled': null,
  	    'aria-errormessage': null,
  	    'aria-expanded': null,
  	    'aria-haspopup': null,
  	    'aria-invalid': null
  	  },
  	  relatedConcepts: [{
  	    concept: {
  	      name: 'toc [EPUB-SSV]'
  	    },
  	    module: 'EPUB'
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section', 'landmark', 'navigation']]
  	};
  	docTocRole.default = docTocRole$1;
  	return docTocRole;
  }

  var hasRequiredAriaDpubRoles;

  function requireAriaDpubRoles () {
  	if (hasRequiredAriaDpubRoles) return ariaDpubRoles;
  	hasRequiredAriaDpubRoles = 1;

  	Object.defineProperty(ariaDpubRoles, "__esModule", {
  	  value: true
  	});
  	ariaDpubRoles.default = void 0;
  	var _docAbstractRole = _interopRequireDefault(requireDocAbstractRole());
  	var _docAcknowledgmentsRole = _interopRequireDefault(requireDocAcknowledgmentsRole());
  	var _docAfterwordRole = _interopRequireDefault(requireDocAfterwordRole());
  	var _docAppendixRole = _interopRequireDefault(requireDocAppendixRole());
  	var _docBacklinkRole = _interopRequireDefault(requireDocBacklinkRole());
  	var _docBiblioentryRole = _interopRequireDefault(requireDocBiblioentryRole());
  	var _docBibliographyRole = _interopRequireDefault(requireDocBibliographyRole());
  	var _docBibliorefRole = _interopRequireDefault(requireDocBibliorefRole());
  	var _docChapterRole = _interopRequireDefault(requireDocChapterRole());
  	var _docColophonRole = _interopRequireDefault(requireDocColophonRole());
  	var _docConclusionRole = _interopRequireDefault(requireDocConclusionRole());
  	var _docCoverRole = _interopRequireDefault(requireDocCoverRole());
  	var _docCreditRole = _interopRequireDefault(requireDocCreditRole());
  	var _docCreditsRole = _interopRequireDefault(requireDocCreditsRole());
  	var _docDedicationRole = _interopRequireDefault(requireDocDedicationRole());
  	var _docEndnoteRole = _interopRequireDefault(requireDocEndnoteRole());
  	var _docEndnotesRole = _interopRequireDefault(requireDocEndnotesRole());
  	var _docEpigraphRole = _interopRequireDefault(requireDocEpigraphRole());
  	var _docEpilogueRole = _interopRequireDefault(requireDocEpilogueRole());
  	var _docErrataRole = _interopRequireDefault(requireDocErrataRole());
  	var _docExampleRole = _interopRequireDefault(requireDocExampleRole());
  	var _docFootnoteRole = _interopRequireDefault(requireDocFootnoteRole());
  	var _docForewordRole = _interopRequireDefault(requireDocForewordRole());
  	var _docGlossaryRole = _interopRequireDefault(requireDocGlossaryRole());
  	var _docGlossrefRole = _interopRequireDefault(requireDocGlossrefRole());
  	var _docIndexRole = _interopRequireDefault(requireDocIndexRole());
  	var _docIntroductionRole = _interopRequireDefault(requireDocIntroductionRole());
  	var _docNoterefRole = _interopRequireDefault(requireDocNoterefRole());
  	var _docNoticeRole = _interopRequireDefault(requireDocNoticeRole());
  	var _docPagebreakRole = _interopRequireDefault(requireDocPagebreakRole());
  	var _docPagefooterRole = _interopRequireDefault(requireDocPagefooterRole());
  	var _docPageheaderRole = _interopRequireDefault(requireDocPageheaderRole());
  	var _docPagelistRole = _interopRequireDefault(requireDocPagelistRole());
  	var _docPartRole = _interopRequireDefault(requireDocPartRole());
  	var _docPrefaceRole = _interopRequireDefault(requireDocPrefaceRole());
  	var _docPrologueRole = _interopRequireDefault(requireDocPrologueRole());
  	var _docPullquoteRole = _interopRequireDefault(requireDocPullquoteRole());
  	var _docQnaRole = _interopRequireDefault(requireDocQnaRole());
  	var _docSubtitleRole = _interopRequireDefault(requireDocSubtitleRole());
  	var _docTipRole = _interopRequireDefault(requireDocTipRole());
  	var _docTocRole = _interopRequireDefault(requireDocTocRole());
  	function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  	var ariaDpubRoles$1 = [['doc-abstract', _docAbstractRole.default], ['doc-acknowledgments', _docAcknowledgmentsRole.default], ['doc-afterword', _docAfterwordRole.default], ['doc-appendix', _docAppendixRole.default], ['doc-backlink', _docBacklinkRole.default], ['doc-biblioentry', _docBiblioentryRole.default], ['doc-bibliography', _docBibliographyRole.default], ['doc-biblioref', _docBibliorefRole.default], ['doc-chapter', _docChapterRole.default], ['doc-colophon', _docColophonRole.default], ['doc-conclusion', _docConclusionRole.default], ['doc-cover', _docCoverRole.default], ['doc-credit', _docCreditRole.default], ['doc-credits', _docCreditsRole.default], ['doc-dedication', _docDedicationRole.default], ['doc-endnote', _docEndnoteRole.default], ['doc-endnotes', _docEndnotesRole.default], ['doc-epigraph', _docEpigraphRole.default], ['doc-epilogue', _docEpilogueRole.default], ['doc-errata', _docErrataRole.default], ['doc-example', _docExampleRole.default], ['doc-footnote', _docFootnoteRole.default], ['doc-foreword', _docForewordRole.default], ['doc-glossary', _docGlossaryRole.default], ['doc-glossref', _docGlossrefRole.default], ['doc-index', _docIndexRole.default], ['doc-introduction', _docIntroductionRole.default], ['doc-noteref', _docNoterefRole.default], ['doc-notice', _docNoticeRole.default], ['doc-pagebreak', _docPagebreakRole.default], ['doc-pagefooter', _docPagefooterRole.default], ['doc-pageheader', _docPageheaderRole.default], ['doc-pagelist', _docPagelistRole.default], ['doc-part', _docPartRole.default], ['doc-preface', _docPrefaceRole.default], ['doc-prologue', _docPrologueRole.default], ['doc-pullquote', _docPullquoteRole.default], ['doc-qna', _docQnaRole.default], ['doc-subtitle', _docSubtitleRole.default], ['doc-tip', _docTipRole.default], ['doc-toc', _docTocRole.default]];
  	ariaDpubRoles.default = ariaDpubRoles$1;
  	return ariaDpubRoles;
  }

  var ariaGraphicsRoles = {};

  var graphicsDocumentRole = {};

  var hasRequiredGraphicsDocumentRole;

  function requireGraphicsDocumentRole () {
  	if (hasRequiredGraphicsDocumentRole) return graphicsDocumentRole;
  	hasRequiredGraphicsDocumentRole = 1;

  	Object.defineProperty(graphicsDocumentRole, "__esModule", {
  	  value: true
  	});
  	graphicsDocumentRole.default = void 0;
  	var graphicsDocumentRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: true,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-disabled': null,
  	    'aria-errormessage': null,
  	    'aria-expanded': null,
  	    'aria-haspopup': null,
  	    'aria-invalid': null
  	  },
  	  relatedConcepts: [{
  	    module: 'GRAPHICS',
  	    concept: {
  	      name: 'graphics-object'
  	    }
  	  }, {
  	    module: 'ARIA',
  	    concept: {
  	      name: 'img'
  	    }
  	  }, {
  	    module: 'ARIA',
  	    concept: {
  	      name: 'article'
  	    }
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'document']]
  	};
  	graphicsDocumentRole.default = graphicsDocumentRole$1;
  	return graphicsDocumentRole;
  }

  var graphicsObjectRole = {};

  var hasRequiredGraphicsObjectRole;

  function requireGraphicsObjectRole () {
  	if (hasRequiredGraphicsObjectRole) return graphicsObjectRole;
  	hasRequiredGraphicsObjectRole = 1;

  	Object.defineProperty(graphicsObjectRole, "__esModule", {
  	  value: true
  	});
  	graphicsObjectRole.default = void 0;
  	var graphicsObjectRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: false,
  	  baseConcepts: [],
  	  childrenPresentational: false,
  	  nameFrom: ['author', 'contents'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-errormessage': null,
  	    'aria-expanded': null,
  	    'aria-haspopup': null,
  	    'aria-invalid': null
  	  },
  	  relatedConcepts: [{
  	    module: 'GRAPHICS',
  	    concept: {
  	      name: 'graphics-document'
  	    }
  	  }, {
  	    module: 'ARIA',
  	    concept: {
  	      name: 'group'
  	    }
  	  }, {
  	    module: 'ARIA',
  	    concept: {
  	      name: 'img'
  	    }
  	  }, {
  	    module: 'GRAPHICS',
  	    concept: {
  	      name: 'graphics-symbol'
  	    }
  	  }],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section', 'group']]
  	};
  	graphicsObjectRole.default = graphicsObjectRole$1;
  	return graphicsObjectRole;
  }

  var graphicsSymbolRole = {};

  var hasRequiredGraphicsSymbolRole;

  function requireGraphicsSymbolRole () {
  	if (hasRequiredGraphicsSymbolRole) return graphicsSymbolRole;
  	hasRequiredGraphicsSymbolRole = 1;

  	Object.defineProperty(graphicsSymbolRole, "__esModule", {
  	  value: true
  	});
  	graphicsSymbolRole.default = void 0;
  	var graphicsSymbolRole$1 = {
  	  abstract: false,
  	  accessibleNameRequired: true,
  	  baseConcepts: [],
  	  childrenPresentational: true,
  	  nameFrom: ['author'],
  	  prohibitedProps: [],
  	  props: {
  	    'aria-disabled': null,
  	    'aria-errormessage': null,
  	    'aria-expanded': null,
  	    'aria-haspopup': null,
  	    'aria-invalid': null
  	  },
  	  relatedConcepts: [],
  	  requireContextRole: [],
  	  requiredContextRole: [],
  	  requiredOwnedElements: [],
  	  requiredProps: {},
  	  superClass: [['roletype', 'structure', 'section', 'img']]
  	};
  	graphicsSymbolRole.default = graphicsSymbolRole$1;
  	return graphicsSymbolRole;
  }

  var hasRequiredAriaGraphicsRoles;

  function requireAriaGraphicsRoles () {
  	if (hasRequiredAriaGraphicsRoles) return ariaGraphicsRoles;
  	hasRequiredAriaGraphicsRoles = 1;

  	Object.defineProperty(ariaGraphicsRoles, "__esModule", {
  	  value: true
  	});
  	ariaGraphicsRoles.default = void 0;
  	var _graphicsDocumentRole = _interopRequireDefault(requireGraphicsDocumentRole());
  	var _graphicsObjectRole = _interopRequireDefault(requireGraphicsObjectRole());
  	var _graphicsSymbolRole = _interopRequireDefault(requireGraphicsSymbolRole());
  	function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  	var ariaGraphicsRoles$1 = [['graphics-document', _graphicsDocumentRole.default], ['graphics-object', _graphicsObjectRole.default], ['graphics-symbol', _graphicsSymbolRole.default]];
  	ariaGraphicsRoles.default = ariaGraphicsRoles$1;
  	return ariaGraphicsRoles;
  }

  var hasRequiredRolesMap;

  function requireRolesMap () {
  	if (hasRequiredRolesMap) return rolesMap;
  	hasRequiredRolesMap = 1;

  	Object.defineProperty(rolesMap, "__esModule", {
  	  value: true
  	});
  	rolesMap.default = void 0;
  	var _ariaAbstractRoles = _interopRequireDefault(requireAriaAbstractRoles());
  	var _ariaLiteralRoles = _interopRequireDefault(requireAriaLiteralRoles());
  	var _ariaDpubRoles = _interopRequireDefault(requireAriaDpubRoles());
  	var _ariaGraphicsRoles = _interopRequireDefault(requireAriaGraphicsRoles());
  	var _iterationDecorator = _interopRequireDefault(requireIterationDecorator());
  	function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  	function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: true } : { done: false, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = true, u = false; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = true, o = r; }, f: function f() { try { a || null == t.return || t.return(); } finally { if (u) throw o; } } }; }
  	function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
  	function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
  	function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
  	function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
  	function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = true, o = false; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = true, n = r; } finally { try { if (!f && null != t.return && (u = t.return(), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
  	function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
  	var roles = [].concat(_ariaAbstractRoles.default, _ariaLiteralRoles.default, _ariaDpubRoles.default, _ariaGraphicsRoles.default);
  	roles.forEach(function (_ref) {
  	  var _ref2 = _slicedToArray(_ref, 2),
  	    roleDefinition = _ref2[1];
  	  // Conglomerate the properties
  	  var _iterator = _createForOfIteratorHelper(roleDefinition.superClass),
  	    _step;
  	  try {
  	    for (_iterator.s(); !(_step = _iterator.n()).done;) {
  	      var superClassIter = _step.value;
  	      var _iterator2 = _createForOfIteratorHelper(superClassIter),
  	        _step2;
  	      try {
  	        var _loop = function _loop() {
  	          var superClassName = _step2.value;
  	          var superClassRoleTuple = roles.filter(function (_ref3) {
  	            var _ref4 = _slicedToArray(_ref3, 1),
  	              name = _ref4[0];
  	            return name === superClassName;
  	          })[0];
  	          if (superClassRoleTuple) {
  	            var superClassDefinition = superClassRoleTuple[1];
  	            for (var _i = 0, _Object$keys = Object.keys(superClassDefinition.props); _i < _Object$keys.length; _i++) {
  	              var prop = _Object$keys[_i];
  	              if (
  	              // $FlowIssue Accessing the hasOwnProperty on the Object prototype is fine.
  	              !Object.prototype.hasOwnProperty.call(roleDefinition.props, prop)) {
  	                // $FlowIgnore assigning without an index signature is fine
  	                roleDefinition.props[prop] = superClassDefinition.props[prop];
  	              }
  	            }
  	          }
  	        };
  	        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
  	          _loop();
  	        }
  	      } catch (err) {
  	        _iterator2.e(err);
  	      } finally {
  	        _iterator2.f();
  	      }
  	    }
  	  } catch (err) {
  	    _iterator.e(err);
  	  } finally {
  	    _iterator.f();
  	  }
  	});
  	var rolesMap$1 = {
  	  entries: function entries() {
  	    return roles;
  	  },
  	  forEach: function forEach(fn) {
  	    var thisArg = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  	    var _iterator3 = _createForOfIteratorHelper(roles),
  	      _step3;
  	    try {
  	      for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
  	        var _step3$value = _slicedToArray(_step3.value, 2),
  	          key = _step3$value[0],
  	          values = _step3$value[1];
  	        fn.call(thisArg, values, key, roles);
  	      }
  	    } catch (err) {
  	      _iterator3.e(err);
  	    } finally {
  	      _iterator3.f();
  	    }
  	  },
  	  get: function get(key) {
  	    var item = roles.filter(function (tuple) {
  	      return tuple[0] === key ? true : false;
  	    })[0];
  	    return item && item[1];
  	  },
  	  has: function has(key) {
  	    return !!rolesMap$1.get(key);
  	  },
  	  keys: function keys() {
  	    return roles.map(function (_ref5) {
  	      var _ref6 = _slicedToArray(_ref5, 1),
  	        key = _ref6[0];
  	      return key;
  	    });
  	  },
  	  values: function values() {
  	    return roles.map(function (_ref7) {
  	      var _ref8 = _slicedToArray(_ref7, 2),
  	        values = _ref8[1];
  	      return values;
  	    });
  	  }
  	};
  	rolesMap.default = (0, _iterationDecorator.default)(rolesMap$1, rolesMap$1.entries());
  	return rolesMap;
  }

  var elementRoleMap = {};

  var hasRequiredElementRoleMap;

  function requireElementRoleMap () {
  	if (hasRequiredElementRoleMap) return elementRoleMap;
  	hasRequiredElementRoleMap = 1;

  	Object.defineProperty(elementRoleMap, "__esModule", {
  	  value: true
  	});
  	elementRoleMap.default = void 0;
  	var _iterationDecorator = _interopRequireDefault(requireIterationDecorator());
  	var _rolesMap = _interopRequireDefault(requireRolesMap());
  	function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  	function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
  	function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
  	function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
  	function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
  	function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = true, o = false; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = true, n = r; } finally { try { if (!f && null != t.return && (u = t.return(), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
  	function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
  	var elementRoles = [];
  	var keys = _rolesMap.default.keys();
  	for (var i = 0; i < keys.length; i++) {
  	  var key = keys[i];
  	  var role = _rolesMap.default.get(key);
  	  if (role) {
  	    var concepts = [].concat(role.baseConcepts, role.relatedConcepts);
  	    var _loop = function _loop() {
  	      var relation = concepts[k];
  	      if (relation.module === 'HTML') {
  	        var concept = relation.concept;
  	        if (concept) {
  	          var elementRoleRelation = elementRoles.filter(function (relation) {
  	            return ariaRoleRelationConceptEquals(relation[0], concept);
  	          })[0];
  	          var roles;
  	          if (elementRoleRelation) {
  	            roles = elementRoleRelation[1];
  	          } else {
  	            roles = [];
  	          }
  	          var isUnique = true;
  	          for (var _i = 0; _i < roles.length; _i++) {
  	            if (roles[_i] === key) {
  	              isUnique = false;
  	              break;
  	            }
  	          }
  	          if (isUnique) {
  	            roles.push(key);
  	          }
  	          if (!elementRoleRelation) {
  	            elementRoles.push([concept, roles]);
  	          }
  	        }
  	      }
  	    };
  	    for (var k = 0; k < concepts.length; k++) {
  	      _loop();
  	    }
  	  }
  	}
  	var elementRoleMap$1 = {
  	  entries: function entries() {
  	    return elementRoles;
  	  },
  	  forEach: function forEach(fn) {
  	    var thisArg = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  	    for (var _i2 = 0, _elementRoles = elementRoles; _i2 < _elementRoles.length; _i2++) {
  	      var _elementRoles$_i = _slicedToArray(_elementRoles[_i2], 2),
  	        _key = _elementRoles$_i[0],
  	        values = _elementRoles$_i[1];
  	      fn.call(thisArg, values, _key, elementRoles);
  	    }
  	  },
  	  get: function get(key) {
  	    var item = elementRoles.filter(function (tuple) {
  	      return key.name === tuple[0].name && ariaRoleRelationConceptAttributeEquals(key.attributes, tuple[0].attributes);
  	    })[0];
  	    return item && item[1];
  	  },
  	  has: function has(key) {
  	    return !!elementRoleMap$1.get(key);
  	  },
  	  keys: function keys() {
  	    return elementRoles.map(function (_ref) {
  	      var _ref2 = _slicedToArray(_ref, 1),
  	        key = _ref2[0];
  	      return key;
  	    });
  	  },
  	  values: function values() {
  	    return elementRoles.map(function (_ref3) {
  	      var _ref4 = _slicedToArray(_ref3, 2),
  	        values = _ref4[1];
  	      return values;
  	    });
  	  }
  	};
  	function ariaRoleRelationConceptEquals(a, b) {
  	  return a.name === b.name && ariaRoleRelationConstraintsEquals(a.constraints, b.constraints) && ariaRoleRelationConceptAttributeEquals(a.attributes, b.attributes);
  	}
  	function ariaRoleRelationConstraintsEquals(a, b) {
  	  if (a === undefined && b !== undefined) {
  	    return false;
  	  }
  	  if (a !== undefined && b === undefined) {
  	    return false;
  	  }
  	  if (a !== undefined && b !== undefined) {
  	    if (a.length !== b.length) {
  	      return false;
  	    }
  	    for (var _i3 = 0; _i3 < a.length; _i3++) {
  	      if (a[_i3] !== b[_i3]) {
  	        return false;
  	      }
  	    }
  	  }
  	  return true;
  	}
  	function ariaRoleRelationConceptAttributeEquals(a, b) {
  	  if (a === undefined && b !== undefined) {
  	    return false;
  	  }
  	  if (a !== undefined && b === undefined) {
  	    return false;
  	  }
  	  if (a !== undefined && b !== undefined) {
  	    if (a.length !== b.length) {
  	      return false;
  	    }
  	    for (var _i4 = 0; _i4 < a.length; _i4++) {
  	      if (a[_i4].name !== b[_i4].name || a[_i4].value !== b[_i4].value) {
  	        return false;
  	      }
  	      if (a[_i4].constraints === undefined && b[_i4].constraints !== undefined) {
  	        return false;
  	      }
  	      if (a[_i4].constraints !== undefined && b[_i4].constraints === undefined) {
  	        return false;
  	      }
  	      if (a[_i4].constraints !== undefined && b[_i4].constraints !== undefined) {
  	        if (a[_i4].constraints.length !== b[_i4].constraints.length) {
  	          return false;
  	        }
  	        for (var j = 0; j < a[_i4].constraints.length; j++) {
  	          if (a[_i4].constraints[j] !== b[_i4].constraints[j]) {
  	            return false;
  	          }
  	        }
  	      }
  	    }
  	  }
  	  return true;
  	}
  	elementRoleMap.default = (0, _iterationDecorator.default)(elementRoleMap$1, elementRoleMap$1.entries());
  	return elementRoleMap;
  }

  var roleElementMap = {};

  var hasRequiredRoleElementMap;

  function requireRoleElementMap () {
  	if (hasRequiredRoleElementMap) return roleElementMap;
  	hasRequiredRoleElementMap = 1;

  	Object.defineProperty(roleElementMap, "__esModule", {
  	  value: true
  	});
  	roleElementMap.default = void 0;
  	var _iterationDecorator = _interopRequireDefault(requireIterationDecorator());
  	var _rolesMap = _interopRequireDefault(requireRolesMap());
  	function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  	function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
  	function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
  	function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
  	function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
  	function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = true, o = false; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = true, n = r; } finally { try { if (!f && null != t.return && (u = t.return(), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
  	function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
  	var roleElement = [];
  	var keys = _rolesMap.default.keys();
  	for (var i = 0; i < keys.length; i++) {
  	  var key = keys[i];
  	  var role = _rolesMap.default.get(key);
  	  var relationConcepts = [];
  	  if (role) {
  	    var concepts = [].concat(role.baseConcepts, role.relatedConcepts);
  	    for (var k = 0; k < concepts.length; k++) {
  	      var relation = concepts[k];
  	      if (relation.module === 'HTML') {
  	        var concept = relation.concept;
  	        if (concept != null) {
  	          relationConcepts.push(concept);
  	        }
  	      }
  	    }
  	    if (relationConcepts.length > 0) {
  	      roleElement.push([key, relationConcepts]);
  	    }
  	  }
  	}
  	var roleElementMap$1 = {
  	  entries: function entries() {
  	    return roleElement;
  	  },
  	  forEach: function forEach(fn) {
  	    var thisArg = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  	    for (var _i = 0, _roleElement = roleElement; _i < _roleElement.length; _i++) {
  	      var _roleElement$_i = _slicedToArray(_roleElement[_i], 2),
  	        _key = _roleElement$_i[0],
  	        values = _roleElement$_i[1];
  	      fn.call(thisArg, values, _key, roleElement);
  	    }
  	  },
  	  get: function get(key) {
  	    var item = roleElement.filter(function (tuple) {
  	      return tuple[0] === key ? true : false;
  	    })[0];
  	    return item && item[1];
  	  },
  	  has: function has(key) {
  	    return !!roleElementMap$1.get(key);
  	  },
  	  keys: function keys() {
  	    return roleElement.map(function (_ref) {
  	      var _ref2 = _slicedToArray(_ref, 1),
  	        key = _ref2[0];
  	      return key;
  	    });
  	  },
  	  values: function values() {
  	    return roleElement.map(function (_ref3) {
  	      var _ref4 = _slicedToArray(_ref3, 2),
  	        values = _ref4[1];
  	      return values;
  	    });
  	  }
  	};
  	roleElementMap.default = (0, _iterationDecorator.default)(roleElementMap$1, roleElementMap$1.entries());
  	return roleElementMap;
  }

  var hasRequiredLib;

  function requireLib () {
  	if (hasRequiredLib) return lib;
  	hasRequiredLib = 1;

  	Object.defineProperty(lib, "__esModule", {
  	  value: true
  	});
  	lib.roles = lib.roleElements = lib.elementRoles = lib.dom = lib.aria = void 0;
  	var _ariaPropsMap = _interopRequireDefault(requireAriaPropsMap());
  	var _domMap = _interopRequireDefault(requireDomMap());
  	var _rolesMap = _interopRequireDefault(requireRolesMap());
  	var _elementRoleMap = _interopRequireDefault(requireElementRoleMap());
  	var _roleElementMap = _interopRequireDefault(requireRoleElementMap());
  	function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  	lib.aria = _ariaPropsMap.default;
  	lib.dom = _domMap.default;
  	lib.roles = _rolesMap.default;
  	lib.elementRoles = _elementRoleMap.default;
  	lib.roleElements = _roleElementMap.default;
  	return lib;
  }

  var libExports = requireLib();

  /*
   * Entry point for ARIA Query bundle
   * Apache 2.0 License - Copyright 2020 A11yance
   * https://github.com/A11yance/aria-query
   */


  // Helper function to get implicit role from element
  function getImplicitRole(element) {
    if (!element || !element.tagName) return null;

    const tagName = element.tagName.toLowerCase();
    const attributes = {};

    // Collect relevant attributes
    if (element.hasAttribute("type")) {
      attributes.type = element.getAttribute("type");
    }
    if (element.hasAttribute("href")) {
      attributes.href = element.getAttribute("href");
    }
    if (element.hasAttribute("multiple")) {
      attributes.multiple = element.getAttribute("multiple");
    }
    if (element.hasAttribute("size")) {
      attributes.size = element.getAttribute("size");
    }
    if (element.hasAttribute("scope")) {
      attributes.scope = element.getAttribute("scope");
    }
    if (element.hasAttribute("alt")) {
      attributes.alt = element.getAttribute("alt");
    }

    // Create concept object for elementRoles lookup
    const concept = {
      name: tagName,
      attributes:
        Object.keys(attributes).length > 0
          ? Object.entries(attributes).map(([name, value]) => ({ name, value }))
          : undefined,
    };

    // Look up the role in elementRoles
    const roles = libExports.elementRoles.get(concept);
    return roles && roles.length > 0 ? roles[0] : null;
  }

  exports.elementRoles = libExports.elementRoles;
  exports.getImplicitRole = getImplicitRole;

  return exports;

})({});
