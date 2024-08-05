var _yargs = require('yargs');
var helpers = require('yargs/helpers');
var fs$1 = require('fs');
var Bluebird = require('bluebird');
var chalk = require('chalk');
var inquirer = require('inquirer');
var inquirerPromptAutocomplete = require('inquirer-autocomplete-prompt');
var inquirerFileTreeSelection = require('inquirer-file-tree-selection-prompt');
var inquirerParseJsonFile = require('inquirer-parse-json-file');
var ejs$1 = require('ejs');
var jetpack = require('fs-jetpack');
var _path = require('path');
var cp = require('child_process');
var _ = require('underscore');
var lodash = require('lodash');
var parseArgv = require('tiny-parse-argv');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

function _interopNamespace(e) {
  if (e && e.__esModule) return e;
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () { return e[k]; }
        });
      }
    });
  }
  n["default"] = e;
  return n;
}

var _yargs__default = /*#__PURE__*/_interopDefaultLegacy(_yargs);
var fs__default = /*#__PURE__*/_interopDefaultLegacy(fs$1);
var Bluebird__default = /*#__PURE__*/_interopDefaultLegacy(Bluebird);
var chalk__default = /*#__PURE__*/_interopDefaultLegacy(chalk);
var inquirer__default = /*#__PURE__*/_interopDefaultLegacy(inquirer);
var inquirerPromptAutocomplete__default = /*#__PURE__*/_interopDefaultLegacy(inquirerPromptAutocomplete);
var inquirerFileTreeSelection__default = /*#__PURE__*/_interopDefaultLegacy(inquirerFileTreeSelection);
var inquirerParseJsonFile__default = /*#__PURE__*/_interopDefaultLegacy(inquirerParseJsonFile);
var ejs__default = /*#__PURE__*/_interopDefaultLegacy(ejs$1);
var jetpack__default = /*#__PURE__*/_interopDefaultLegacy(jetpack);
var _path__default = /*#__PURE__*/_interopDefaultLegacy(_path);
var cp__default = /*#__PURE__*/_interopDefaultLegacy(cp);
var ___default = /*#__PURE__*/_interopDefaultLegacy(_);
var lodash__default = /*#__PURE__*/_interopDefaultLegacy(lodash);
var parseArgv__default = /*#__PURE__*/_interopDefaultLegacy(parseArgv);

function _extends() {
  _extends = Object.assign ? Object.assign.bind() : function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  };
  return _extends.apply(this, arguments);
}

var nonEmpty = (function (_ref) {
  var input = _ref.input;
  try {
    return Promise.resolve(input && input.length > 0);
  } catch (e) {
    return Promise.reject(e);
  }
});

var getValidators = (function (a) {
  switch (a.type) {
    default:
    case 'nonEmpty':
      {
        return nonEmpty;
      }
  }
});

var _ask = (function (props) {
  try {
    var payload = props.payload,
      question = props.question,
      generator = props.generator,
      promptModule = props.promptModule,
      promptType = props.promptType;
    var name = question.name,
      message = question.message,
      defaultValue = question.defaultValue,
      _question$validators = question.validators,
      validators = _question$validators === void 0 ? [{
        type: 'nonEmpty'
      }] : _question$validators;
    if (!name) {
      return Promise.resolve();
    }
    var value = payload[name];
    if (!value && question.alias) {
      value = payload[question.alias];
    }
    var valueIsDefined = !(value === null || value === undefined);
    if (valueIsDefined) {
      generator.print.log(chalk__default["default"].green('✓') + " " + chalk__default["default"].bold(message ? message : name) + " " + chalk__default["default"].italic(value));
      return Promise.resolve();
    }
    var isQuick = payload['quick'] || payload['q'];
    if (isQuick && valueIsDefined) {
      generator.print.log(chalk__default["default"].green('✓') + " " + chalk__default["default"].bold(message ? message : name) + " " + chalk__default["default"].italic(value));
      return Promise.resolve();
    }
    if (isQuick && !(defaultValue === null || defaultValue === undefined)) {
      payload[name] = defaultValue;
      generator.print.log(chalk__default["default"].green('✓') + " " + chalk__default["default"].bold(message ? message : name) + " " + chalk__default["default"].italic(payload[name]));
      return Promise.resolve();
    }
    return Promise.resolve(promptModule.prompt(_extends({}, props.question, {
      type: promptType,
      name: name,
      message: message,
      "default": value ? value : defaultValue,
      validate: function (input) {
        try {
          var isValid = true;
          return Promise.resolve(Bluebird__default["default"].Promise.mapSeries(validators, function (validator) {
            try {
              var _temp2 = function _temp2(_result) {
                if (_exit) return _result;
                if (validate.regex) {
                  var f = new RegExp(validate.regex, 'g');
                  // isValid = validator.regex.test(input)
                  isValid = f.test(input);
                }
              };
              var _exit;
              var validate = getValidators(validator);
              var _temp = function () {
                if (validate) {
                  return Promise.resolve(validate(_extends({
                    input: input
                  }, validator))).then(function (_i) {
                    if (!_i) {
                      isValid = false;
                    }
                    _exit = 1;
                  });
                }
              }();
              return Promise.resolve(_temp && _temp.then ? _temp.then(_temp2) : _temp2(_temp));
            } catch (e) {
              return Promise.reject(e);
            }
          })).then(function () {
            if (props.question.validate) {
              isValid = props.question.validate(input);
            }
            return isValid;
          });
        } catch (e) {
          return Promise.reject(e);
        }
      }
    }))).then(function (_promptModule$prompt) {
      payload[name] = _promptModule$prompt[name];
      return payload[name];
    });
  } catch (e) {
    return Promise.reject(e);
  }
});

var _promptModule = (function (id) {
  switch (id) {
    default:
    case 'inquirer':
      return inquirer__default["default"];
  }
});

var prompt = (function (_ref) {
  var generator = _ref.generator;
  var prompt = {
    ask: function (value) {
      try {
        var questions = Array.isArray(value) ? value : [value];
        var result = {};
        return Promise.resolve(Bluebird__default["default"].Promise.mapSeries(questions, function (question) {
          try {
            var fullQuestion = _extends({}, question);
            var items = generator.options.filter(function (a) {
              return a.name === question.name;
            });
            if (items && items.length) {
              fullQuestion = _extends({}, items[0], fullQuestion);
            }
            var _ref2 = fullQuestion.prompt ? fullQuestion.prompt : {},
              _ref2$type = _ref2.type,
              promptType = _ref2$type === void 0 ? 'input' : _ref2$type,
              _f = _ref2.module;
            var _promptModule2 = _f ? _f : _promptModule();
            if (typeof _promptModule2 === 'string') {
              _promptModule2 = _promptModule(_f);
            }
            return Promise.resolve(_ask({
              question: fullQuestion,
              payload: generator.payload,
              generator: generator,
              promptModule: _promptModule2,
              promptType: promptType
            })).then(function (v) {
              result[question.name] = v;
              return v;
            });
          } catch (e) {
            return Promise.reject(e);
          }
        })).then(function () {
          return result;
        });
      } catch (e) {
        return Promise.reject(e);
      }
    },
    confirm: function () {
      return Promise.resolve();
    },
    registerPrompt: function registerPrompt(promptModule, key, module) {
      promptModule.registerPrompt(key, module);
    }
  };
  var promptModule = _promptModule();
  prompt.registerPrompt(promptModule, 'autocomplete', inquirerPromptAutocomplete__default["default"]);
  prompt.registerPrompt(promptModule, 'file-tree-selection', inquirerFileTreeSelection__default["default"]);
  prompt.registerPrompt(promptModule, 'json-file', inquirerParseJsonFile__default["default"]);
  return prompt;
});

var template = (function (_ref) {
  return {
    render: function render(text, data) {
      return ejs__default["default"].render(text, data);
    }
  };
});

var getFileCallerURL = (function () {
  var _error$stack;
  var error = new Error();
  var stack = (_error$stack = error.stack) == null ? void 0 : _error$stack.split('\n');
  var data = stack[3];
  var filePathPattern = new RegExp("(file:[/]{2}.+[^:0-9]):{1}[0-9]+:{1}[0-9]+");
  var result = filePathPattern.exec(data);
  var filePath = '';
  if (result && result.length > 1) {
    filePath = result[1];
  }
  return filePath;
});

var fs = (function (_ref) {
  return _extends({}, jetpack__default["default"], {
    copy: function (_ref2) {
      var source = _ref2.source,
        destination = _ref2.destination;
      try {
        return Promise.resolve(fs__default["default"].promises.cp(source, destination));
      } catch (e) {
        return Promise.reject(e);
      }
    },
    copyTpl: function (source, destination, data) {
      try {
        return Promise.resolve(fs__default["default"].promises.readFile(source)).then(function (entry) {
          var result = ejs.render(entry, data);
          return Promise.resolve(fs__default["default"].promises.writeFile(destination, result)).then(function () {});
        });
      } catch (e) {
        return Promise.reject(e);
      }
    },
    copyFraction: function (_ref3) {
      var source = _ref3.source,
        destination = _ref3.destination,
        _ref3$useRelativeCall = _ref3.useRelativeCall,
        useRelativeCall = _ref3$useRelativeCall === void 0 ? true : _ref3$useRelativeCall;
      try {
        var _source = source;
        if (useRelativeCall) {
          var sou = getFileCallerURL();
          sou = _path__default["default"].dirname(sou);
          sou = sou.replace('file://', '');
          _source = sou + "/template/" + _source;
        }
        return Promise.resolve(jetpack__default["default"].copyAsync(_source, destination, {
          overwrite: true
        })); // return fs.promises.copyFile(_source, destination)
      } catch (e) {
        return Promise.reject(e);
      }
    }
  });
});

var ui = (function (_ref) {
  var generator = _ref.generator;
  return {
    drawSectionHeader: function drawSectionHeader(_ref2) {
      var title = _ref2.title,
        subTitle = _ref2.subTitle,
        _ref2$type = _ref2.type,
        type = _ref2$type === void 0 ? 'text' : _ref2$type;
      switch (type) {
        case 'h1':
          {
            generator.print.log("\n");
            generator.print.log(chalk__default["default"].white.bgRed.bold("" + title));
            if (subTitle) {
              generator.print.log(chalk__default["default"].italic(subTitle + "\n"));
            }
            generator.print.log("----");
            generator.print.log("");
          }
          break;
        case 'h2':
          {
            generator.print.log("\n");
            generator.print.log(chalk__default["default"].white.bgGreen.bold("" + title));
            if (subTitle) {
              generator.print.log(chalk__default["default"].italic(subTitle + "\n"));
            }
          }
          break;
        default:
          {
            generator.print.log(chalk__default["default"].blue.bold("\n" + title));
            if (subTitle) {
              generator.print.log(chalk__default["default"].italic(subTitle + "\n"));
            }
          }
          break;
      }
    }
  };
});

var mergeOptions = (function (_ref) {
  var _ref$handlerOptions = _ref.handlerOptions,
    handlerOptions = _ref$handlerOptions === void 0 ? [] : _ref$handlerOptions,
    generator = _ref.generator;
  generator.options = handlerOptions.map(function (option) {
    switch (option.scope) {
      case 'private':
        {
          return option;
        }
    }
    var i = ___default["default"].findWhere(generator.libraryOptions, {
      name: option.name
    });
    if (!i) {
      return option;
    }
    var result = _extends({}, option);
    lodash__default["default"].merge(result, i);
    return result;
  });
});

var buildGenerator = (function (_ref) {
  var payload = _ref.payload,
    _ref$options = _ref.options,
    options = _ref$options === void 0 ? [] : _ref$options;
  var generator = {
    payload: payload,
    print: console,
    libraryOptions: options,
    options: []
  };
  generator.mergeOptions = function (op) {
    return mergeOptions({
      handlerOptions: op,
      generator: generator
    });
  };
  generator.ui = ui({
    generator: generator
  });
  generator.prompt = prompt({
    generator: generator
  });
  generator.template = template();
  generator.fs = fs();
  generator.spawn = function (command, args, options) {
    try {
      return Promise.resolve(new Promise(function (resolve) {
        var result = cp__default["default"].spawn(command, args, options);
        result.on('close', function () {
          resolve();
        });
      }));
    } catch (e) {
      return Promise.reject(e);
    }
  };
  return generator;
});

var buildCommand = (function (_ref) {
  var path = _ref.path,
    generator = _ref.generator,
    payload = _ref.payload;
  try {
    return Promise.resolve((function (t) { return Promise.resolve().then(function () { return /*#__PURE__*/_interopNamespace(require(t)); }); })(path)).then(function (_import) {
      var data = _import["default"];
      var _data$name = data.name,
        name = _data$name === void 0 ? '' : _data$name,
        _data$description = data.description,
        description = _data$description === void 0 ? '' : _data$description,
        handler = data.handler,
        example = data.example;
      var command = {
        command: name,
        desc: description,
        builder: {},
        handler: function handler(argv) {
          data.handler({
            generator: generator,
            payload: payload,
            argv: argv
          });
        }
      };
      return {
        command: command,
        data: _extends({}, data, {
          options: data.options && data.options.length ? data.options : []
        })
      };
    });
  } catch (e) {
    return Promise.reject(e);
  }
});

var formatOptionForYargs = (function (_ref) {
  var option = _ref.option,
    yargs = _ref.yargs;
  var name = option.name,
    description = option.description,
    message = option.message,
    _option$type = option.type,
    type = _option$type === void 0 ? 'string' : _option$type,
    _option$global = option.global,
    global = _option$global === void 0 ? false : _option$global,
    alias = option.alias,
    defaultValue = option.defaultValue;
  yargs.option(name, {
    desc: description ? description : message,
    type: type,
    global: global,
    alias: alias,
    "default": defaultValue
  });
});

var operation = function operation(_ref) {
  var path = _ref.path,
    generator = _ref.generator,
    yargs = _ref.yargs,
    _ref$root = _ref.root,
    root = _ref$root === void 0 ? false : _ref$root,
    payload = _ref.payload;
  try {
    return Promise.resolve(jetpack__default["default"].listAsync(path)).then(function (candidates) {
      if (!candidates || !candidates.length) {
        return;
      }
      var commands = [];
      var index = null;
      var subCommands = [];
      return Promise.resolve(Promise.all(candidates.map(function (item) {
        try {
          var __path = path + "/" + item;
          return Promise.resolve(fs__default["default"].promises.stat(__path)).then(function (stat) {
            return !stat || !stat.isDirectory() ? null : Promise.resolve(operation({
              path: __path,
              generator: generator,
              payload: payload,
              yargs: yargs
            })).then(function (subCommand) {
              subCommands.push(subCommand);
            });
          });
        } catch (e) {
          return Promise.reject(e);
        }
      }))).then(function () {
        return Promise.resolve(Promise.all(candidates.map(function (item) {
          try {
            var __path = path + "/" + item;
            return Promise.resolve(fs__default["default"].promises.stat(__path)).then(function (stat) {
              return !stat || stat.isDirectory() ? null : Promise.resolve(buildCommand({
                path: __path,
                generator: generator,
                fileName: item,
                payload: payload
              })).then(function (_ref2) {
                var commandData = _ref2.data,
                  command = _ref2.command;
                if (item === 'index.js') {
                  return;
                }
                command.builder = function (yargs) {
                  fixOptions({
                    generator: generator,
                    commandOptions: commandData.options,
                    yargs: yargs
                  });
                  if (commandData.example) {
                    yargs.example(commandData.example);
                  }
                };
                if (commandData.usage) {}
                commands.push(command);
              });
            });
          } catch (e) {
            return Promise.reject(e);
          }
        }))).then(function () {
          return Promise.resolve(Promise.all(candidates.map(function (item) {
            try {
              var __path = path + "/" + item;
              return Promise.resolve(fs__default["default"].promises.stat(__path)).then(function (stat) {
                if (!stat || stat.isDirectory()) {
                  return null;
                }
                if (item !== 'index.js') {
                  return;
                }
                return Promise.resolve(buildCommand({
                  path: __path,
                  generator: generator,
                  fileName: item,
                  payload: payload
                })).then(function (_ref3) {
                  var commandData = _ref3.data,
                    command = _ref3.command;
                  if (!root) {
                    command.builder = function (yargs) {
                      fixOptions({
                        generator: generator,
                        commandOptions: commandData.options,
                        yargs: yargs
                      });
                      // commandData.options.forEach(option => formatOptionForYargs({ option, yargs }))
                      if (commandData.example) {
                        yargs.example(commandData.example);
                      }
                      commands.forEach(function (subCommand) {
                        yargs.command(subCommand);
                      });
                      subCommands.forEach(function (subCommand) {
                        yargs.command(subCommand.index);
                      });
                    };
                  } else {
                    subCommands.forEach(function (subCommand) {
                      yargs.command(subCommand.index);
                    });
                  }
                  index = command;
                });
              });
            } catch (e) {
              return Promise.reject(e);
            }
          }))).then(function () {
            return {
              index: index,
              commands: commands
            };
          });
        });
      });
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
var fixOptions = function fixOptions(_ref4) {
  var generator = _ref4.generator,
    commandOptions = _ref4.commandOptions,
    yargs = _ref4.yargs;
  var nativeArgv = parseArgv__default["default"](process.argv);
  delete nativeArgv["--"];
  delete nativeArgv["_"];
  Object.keys(nativeArgv).forEach(function (n) {
    generator.payload[n] = nativeArgv[n];
  });
  var _options = commandOptions && commandOptions.length ? commandOptions : [];
  var options = _options.map(function (option) {
    var value = nativeArgv[option.name];
    return _extends({}, option, {
      value: value
    });
  });
  generator.mergeOptions(options);
  generator.options.forEach(function (option) {
    return formatOptionForYargs({
      option: option,
      yargs: yargs
    });
  });
};

var registerCommands = (function (_ref) {
  var path = _ref.path,
    yargs = _ref.yargs,
    options = _ref.options;
  try {
    var commandsPath = path + "/commands";
    var payload = {};
    var generator = buildGenerator({
      payload: payload,
      options: options,
      yargs: yargs
    });
    return Promise.resolve(operation({
      path: commandsPath,
      generator: generator,
      yargs: yargs,
      root: true,
      payload: payload
    })).then(function (_ref2) {
      var index = _ref2.index,
        commands = _ref2.commands;
      commands.forEach(function (command) {
        yargs.command(command);
      });
      yargs.argv;
      return commands;
    });
  } catch (e) {
    return Promise.reject(e);
  }
});

var checkFileExists = (function (file) {
  try {
    return Promise.resolve(fs__default["default"].promises.access(file, fs__default["default"].constants.F_OK).then(function () {
      return true;
    })["catch"](function () {
      return false;
    }));
  } catch (e) {
    return Promise.reject(e);
  }
});

//https://www.npmjs.com/package/directory-import

function _catch(body, recover) {
  try {
    var result = body();
  } catch (e) {
    return recover(e);
  }
  if (result && result.then) {
    return result.then(void 0, recover);
  }
  return result;
}
var perform = function perform(_ref) {
  var path = _ref.path,
    _ref$includeMeta = _ref.includeMeta,
    includeMeta = _ref$includeMeta === void 0 ? false : _ref$includeMeta,
    _ref$includeExtension = _ref.includeExtensions,
    includeExtensions = _ref$includeExtension === void 0 ? ['.js', '.ts', '.json'] : _ref$includeExtension;
  try {
    var _exit;
    return Promise.resolve(_catch(function () {
      var _exit2;
      return Promise.resolve(checkFileExists(path)).then(function (_checkFileExists) {
        if (!_checkFileExists) {
          var _temp = null;
          _exit = 1;
          return _temp;
        }
        return Promise.resolve(fs__default["default"].promises.readdir(path)).then(function (items) {
          return !items || !items.length ? null : Promise.resolve(Promise.all(items.map(function (item) {
            try {
              var __path = _path__default["default"].join(path, item);
              return Promise.resolve(fs__default["default"].promises.stat(__path)).then(function (_stat) {
                var _exit3;
                if (!_stat) {
                  return null;
                }
                var isDir = _stat.isDirectory();
                return isDir ? perform({
                  path: __path
                }) : Promise.resolve(checkFileExists(__path)).then(function (_checkFileExists2) {
                  if (!_checkFileExists2) {
                    var _temp2 = null;
                    _exit3 = 1;
                    return _temp2;
                  }
                  if (item.includes('spec.js')) {
                    return null;
                  }
                  var extension = getExtension(item);
                  if (!includeExtensions.includes(extension)) {
                    return null;
                  }
                  if (includeMeta) {
                    var racine = getFileRaw(__path);
                    return Promise.resolve((function (t) { return Promise.resolve().then(function () { return /*#__PURE__*/_interopNamespace(require(t)); }); })(__path)).then(function (_module) {
                      var md = racine + ".md";
                      var documentation = null;
                      return Promise.resolve(checkFileExists(md)).then(function (_checkFileExists3) {
                        function _temp4() {
                          return [{
                            module: _module,
                            path: __path,
                            documentation: documentation
                          }];
                        }
                        var _temp3 = function () {
                          if (_checkFileExists3) {
                            return Promise.resolve(fs__default["default"].promises.readFile(md, 'utf8')).then(function (_fs$promises$readFile) {
                              documentation = _fs$promises$readFile;
                            });
                          }
                        }();
                        return _temp3 && _temp3.then ? _temp3.then(_temp4) : _temp4(_temp3);
                      });
                    });
                  } else {
                    return Promise.resolve((function (t) { return Promise.resolve().then(function () { return /*#__PURE__*/_interopNamespace(require(t)); }); })(__path)).then(function (_import) {
                      return [_import];
                    });
                  }
                });
              });
            } catch (e) {
              return Promise.reject(e);
            }
          }))).then(function (_Promise$all) {
            var results = _Promise$all.filter(function (a) {
              return a;
            });
            results = ___default["default"].flatten(results);
            return results;
          });
        });
      });
    }, function (e) {
      console.error(e);
      return null;
    }));
  } catch (e) {
    return Promise.reject(e);
  }
};
var getExtension = function getExtension(str) {
  return str.slice(str.lastIndexOf("."));
};
var getFileRaw = function getFileRaw(str) {
  return str.split('.').slice(0, -1).join('.');
};

var loadOptions = (function (_ref) {
  var path = _ref.path;
  try {
    var optionsPath = path + "/options";
    return Promise.resolve(perform({
      path: optionsPath,
      includeMeta: false
    })).then(function (files) {
      files = files ? files.map(function (f) {
        return f["default"];
      }) : [];
      return files;
    });
  } catch (e) {
    return Promise.reject(e);
  }
});

// https://medium.com/netscape/a-guide-to-create-a-nodejs-command-line-package-c2166ad0452e
var launch = (function (_temp) {
  var _ref = _temp === void 0 ? {} : _temp,
    path = _ref.path,
    npmPackage = _ref.npmPackage,
    config = _ref.config;
  try {
    // import options from './options.js';
    var __actualPath = path;
    if (!__actualPath) {
      var ce = getFileCallerURL();
      __actualPath = _path__default["default"].dirname(ce);
      __actualPath = __actualPath.replace('file://', '');
    }
    var __actualNpmPackage = npmPackage;
    if (!__actualNpmPackage) {
      var __d = _path__default["default"].resolve(__actualPath, '../package.json');
      if (fs__default["default"].existsSync(__d)) {
        __actualNpmPackage = JSON.parse(fs__default["default"].readFileSync(__d).toString());
      }
    }
    if (!__actualNpmPackage) {
      __actualNpmPackage = {
        version: "0.0.0"
      };
    }
    var __actualConfig = config;
    if (!__actualConfig) {
      var _d = _path__default["default"].resolve(__actualPath, '../cli.config.json');
      if (fs__default["default"].existsSync(_d)) {
        __actualConfig = JSON.parse(fs__default["default"].readFileSync(_d).toString());
      }
    }
    if (!__actualConfig) {
      __actualConfig = {};
    }
    //https://github.com/yargs/yargs/issues/569

    var yargs = _yargs__default["default"](helpers.hideBin(process.argv));
    yargs
    // .options(options)
    .usage('Usage: servable <command>').demandCommand(1).wrap(Math.min(yargs.terminalWidth(), 160)).help('help').alias('help', 'h').version(__actualNpmPackage.version).alias('version', 'v').hide('help').hide('version').epilog('Made by Servable.');
    return Promise.resolve(loadOptions({
      path: __actualPath,
      config: __actualConfig
    })).then(function (options) {
      return Promise.resolve(registerCommands({
        path: __actualPath,
        yargs: yargs,
        config: __actualConfig,
        options: options
      })).then(function () {});
    });
  } catch (e) {
    return Promise.reject(e);
  }
});

exports.launch = launch;
//# sourceMappingURL=index.modern.cjs.map
