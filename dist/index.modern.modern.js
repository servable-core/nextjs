import _yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import fs$1 from 'fs';
import Bluebird from 'bluebird';
import chalk from 'chalk';
import inquirer from 'inquirer';
import inquirerPromptAutocomplete from 'inquirer-autocomplete-prompt';
import inquirerFileTreeSelection from 'inquirer-file-tree-selection-prompt';
import inquirerParseJsonFile from 'inquirer-parse-json-file';
import ejs$1 from 'ejs';
import jetpack from 'fs-jetpack';
import _path from 'path';
import cp from 'child_process';
import _ from 'underscore';
import lodash from 'lodash';
import parseArgv from 'tiny-parse-argv';

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

var nonEmpty = (async ({
  input,
  params
}) => {
  return input && input.length > 0;
});

var getValidators = (a => {
  switch (a.type) {
    default:
    case 'nonEmpty':
      {
        return nonEmpty;
      }
  }
});

var ask = (async props => {
  const {
    payload,
    question,
    generator,
    promptModule,
    promptType
  } = props;
  let {
    name,
    message,
    defaultValue,
    validators = [{
      type: 'nonEmpty'
    }]
  } = question;
  if (!name) {
    return;
  }
  let value = payload[name];
  if (!value && question.alias) {
    value = payload[question.alias];
  }
  const valueIsDefined = !(value === null || value === undefined);
  if (valueIsDefined) {
    generator.print.log(`${chalk.green('✓')} ${chalk.bold(message ? message : name)} ${chalk.italic(value)}`);
    return;
  }
  const isQuick = payload['quick'] || payload['q'];
  if (isQuick && valueIsDefined) {
    generator.print.log(`${chalk.green('✓')} ${chalk.bold(message ? message : name)} ${chalk.italic(value)}`);
    return;
  }
  if (isQuick && !(defaultValue === null || defaultValue === undefined)) {
    payload[name] = defaultValue;
    generator.print.log(`${chalk.green('✓')} ${chalk.bold(message ? message : name)} ${chalk.italic(payload[name])}`);
    return;
  }
  payload[name] = (await promptModule.prompt(_extends({}, props.question, {
    type: promptType,
    name,
    message,
    default: value ? value : defaultValue,
    validate: async input => {
      let isValid = true;
      await Bluebird.Promise.mapSeries(validators, async validator => {
        const validate = getValidators(validator);
        if (validate) {
          const _i = await validate(_extends({
            input
          }, validator));
          if (!_i) {
            isValid = false;
          }
          return;
        }
        if (validate.regex) {
          const f = new RegExp(validate.regex, 'g');
          // isValid = validator.regex.test(input)
          isValid = f.test(input);
        }
      });
      if (props.question.validate) {
        isValid = props.question.validate(input);
      }
      return isValid;
    }
  })))[name];
  return payload[name];
});

var _promptModule = (id => {
  switch (id) {
    default:
    case 'inquirer':
      return inquirer;
  }
});

var prompt = (({
  generator
}) => {
  const prompt = {
    ask: async value => {
      const questions = Array.isArray(value) ? value : [value];
      const result = {};
      await Bluebird.Promise.mapSeries(questions, async question => {
        let fullQuestion = _extends({}, question);
        const items = generator.options.filter(a => a.name === question.name);
        if (items && items.length) {
          fullQuestion = _extends({}, items[0], fullQuestion);
        }
        const {
          type: promptType = 'input',
          module: _f
        } = fullQuestion.prompt ? fullQuestion.prompt : {};
        let promptModule = _f ? _f : _promptModule();
        if (typeof promptModule === 'string') {
          promptModule = _promptModule(_f);
        }
        const v = await ask({
          question: fullQuestion,
          payload: generator.payload,
          generator,
          promptModule,
          promptType
        });
        result[question.name] = v;
        return v;
      });
      return result;
    },
    confirm: async () => {},
    registerPrompt: (promptModule, key, module) => {
      promptModule.registerPrompt(key, module);
    }
  };
  const promptModule = _promptModule();
  prompt.registerPrompt(promptModule, 'autocomplete', inquirerPromptAutocomplete);
  prompt.registerPrompt(promptModule, 'file-tree-selection', inquirerFileTreeSelection);
  prompt.registerPrompt(promptModule, 'json-file', inquirerParseJsonFile);
  return prompt;
});

var template = (({
  generator
}) => {
  return {
    render: (text, data) => {
      return ejs$1.render(text, data);
    }
  };
});

var getFileCallerURL = (() => {
  var _error$stack;
  const error = new Error();
  const stack = (_error$stack = error.stack) == null ? void 0 : _error$stack.split('\n');
  const data = stack[3];
  const filePathPattern = new RegExp(`(file:[/]{2}.+[^:0-9]):{1}[0-9]+:{1}[0-9]+`);
  const result = filePathPattern.exec(data);
  let filePath = '';
  if (result && result.length > 1) {
    filePath = result[1];
  }
  return filePath;
});

var fs = (({
  generator
}) => {
  return _extends({}, jetpack, {
    copy: async ({
      source,
      destination,
      useRelativeCall: _useRelativeCall = false
    }) => {
      return fs$1.promises.cp(source, destination);
    },
    copyTpl: async (source, destination, data) => {
      const entry = await fs$1.promises.readFile(source);
      const result = ejs.render(entry, data);
      await fs$1.promises.writeFile(destination, result);
    },
    copyFraction: async ({
      source,
      destination,
      data,
      useRelativeCall: _useRelativeCall2 = true
    }) => {
      let _source = source;
      if (_useRelativeCall2) {
        let sou = getFileCallerURL();
        sou = _path.dirname(sou);
        sou = sou.replace('file://', '');
        _source = `${sou}/template/${_source}`;
      }
      const re = await jetpack.copyAsync(_source, destination, {
        overwrite: true
      });
      return re;
      // return fs.promises.copyFile(_source, destination)
    }
  });
});

var ui = (({
  generator
}) => {
  return {
    drawSectionHeader: ({
      title,
      subTitle,
      type: _type = 'text'
    }) => {
      switch (_type) {
        case 'h1':
          {
            generator.print.log(`\n`);
            generator.print.log(chalk.white.bgRed.bold(`${title}`));
            if (subTitle) {
              generator.print.log(chalk.italic(`${subTitle}\n`));
            }
            generator.print.log(`----`);
            generator.print.log(``);
          }
          break;
        case 'h2':
          {
            generator.print.log(`\n`);
            generator.print.log(chalk.white.bgGreen.bold(`${title}`));
            if (subTitle) {
              generator.print.log(chalk.italic(`${subTitle}\n`));
            }
          }
          break;
        default:
          {
            generator.print.log(chalk.blue.bold(`\n${title}`));
            if (subTitle) {
              generator.print.log(chalk.italic(`${subTitle}\n`));
            }
          }
          break;
      }
    }
  };
});

var mergeOptions = (({
  handlerOptions: _handlerOptions = [],
  generator
}) => {
  generator.options = _handlerOptions.map(option => {
    switch (option.scope) {
      case 'private':
        {
          return option;
        }
    }
    const i = _.findWhere(generator.libraryOptions, {
      name: option.name
    });
    if (!i) {
      return option;
    }
    let result = _extends({}, option);
    lodash.merge(result, i);
    return result;
  });
});

var buildGenerator = (({
  payload,
  options: _options = []
}) => {
  const generator = {
    payload,
    print: console,
    libraryOptions: _options,
    options: []
  };
  generator.mergeOptions = op => mergeOptions({
    handlerOptions: op,
    generator
  });
  generator.ui = ui({
    generator
  });
  generator.prompt = prompt({
    generator
  });
  generator.template = template({
    generator
  });
  generator.fs = fs({
    generator
  });
  generator.spawn = async (command, args, options) => {
    return new Promise(resolve => {
      const result = cp.spawn(command, args, options);
      result.on('close', () => {
        resolve();
      });
    });
  };
  return generator;
});

var buildCommand = (async ({
  path,
  generator,
  payload,
  fileName
}) => {
  const data = (await import(path)).default;
  const {
    name = '',
    description = '',
    // options = {},
    handler,
    example
  } = data;
  const command = {
    command: name,
    desc: description,
    builder: {},
    handler: argv => {
      data.handler({
        generator,
        payload,
        argv
      });
    }
  };
  return {
    command,
    data: _extends({}, data, {
      options: data.options && data.options.length ? data.options : []
    })
  };
});

var formatOptionForYargs = (({
  option,
  yargs
}) => {
  const {
    name,
    description,
    message,
    type = 'string',
    global = false,
    alias,
    defaultValue
  } = option;
  yargs.option(name, {
    desc: description ? description : message,
    type,
    global,
    alias,
    default: defaultValue
  });
});

const operation = async ({
  path,
  generator,
  yargs,
  root: _root = false,
  payload
}) => {
  const candidates = await jetpack.listAsync(path);
  if (!candidates || !candidates.length) {
    return;
  }
  const commands = [];
  let index = null;
  let subCommands = [];
  await Promise.all(candidates.map(async item => {
    const __path = `${path}/${item}`;
    const stat = await fs$1.promises.stat(__path);
    if (!stat || !stat.isDirectory()) {
      return null;
    }
    const subCommand = await operation({
      path: __path,
      generator,
      payload,
      yargs
    });
    subCommands.push(subCommand);
  }));
  await Promise.all(candidates.map(async item => {
    const __path = `${path}/${item}`;
    const stat = await fs$1.promises.stat(__path);
    if (!stat || stat.isDirectory()) {
      return null;
    }
    const {
      data: commandData,
      command
    } = await buildCommand({
      path: __path,
      generator,
      fileName: item,
      payload
    });
    if (item === 'index.js') {
      return;
    }
    command.builder = yargs => {
      fixOptions({
        generator,
        commandOptions: commandData.options,
        yargs
      });
      if (commandData.example) {
        yargs.example(commandData.example);
      }
    };
    commands.push(command);
  }));
  await Promise.all(candidates.map(async item => {
    const __path = `${path}/${item}`;
    const stat = await fs$1.promises.stat(__path);
    if (!stat || stat.isDirectory()) {
      return null;
    }
    if (item !== 'index.js') {
      return;
    }
    const {
      data: commandData,
      command
    } = await buildCommand({
      path: __path,
      generator,
      fileName: item,
      payload
    });
    if (!_root) {
      command.builder = yargs => {
        fixOptions({
          generator,
          commandOptions: commandData.options,
          yargs
        });
        // commandData.options.forEach(option => formatOptionForYargs({ option, yargs }))
        if (commandData.example) {
          yargs.example(commandData.example);
        }
        commands.forEach(subCommand => {
          yargs.command(subCommand);
        });
        subCommands.forEach(subCommand => {
          yargs.command(subCommand.index);
        });
      };
    } else {
      subCommands.forEach(subCommand => {
        yargs.command(subCommand.index);
      });
    }
    index = command;
  }));
  return {
    index,
    commands
  };
};
const fixOptions = ({
  generator,
  commandOptions,
  yargs
}) => {
  let nativeArgv = parseArgv(process.argv);
  delete nativeArgv["--"];
  delete nativeArgv["_"];
  Object.keys(nativeArgv).forEach(n => {
    generator.payload[n] = nativeArgv[n];
  });
  const _options = commandOptions && commandOptions.length ? commandOptions : [];
  const options = _options.map(option => {
    const value = nativeArgv[option.name];
    return _extends({}, option, {
      value
    });
  });
  generator.mergeOptions(options);
  generator.options.forEach(option => formatOptionForYargs({
    option,
    yargs
  }));
};

var registerCommands = (async ({
  path,
  yargs,
  options
}) => {
  const commandsPath = `${path}/commands`;
  const payload = {};
  const generator = buildGenerator({
    payload,
    options,
    yargs
  });
  const {
    index,
    commands
  } = await operation({
    path: commandsPath,
    generator,
    yargs,
    root: true,
    payload
  });
  commands.forEach(command => {
    yargs.command(command);
  });
  return commands;
});

var checkFileExists = (async file => {
  return fs$1.promises.access(file, fs$1.constants.F_OK).then(() => true).catch(() => false);
});

//https://www.npmjs.com/package/directory-import

const perform = async ({
  path,
  includeMeta: _includeMeta = false,
  excludes: _excludes = ['spec.js'],
  includeExtensions: _includeExtensions = ['.js', '.ts', '.json']
}) => {
  try {
    if (!(await checkFileExists(path))) {
      return null;
    }
    const items = await fs$1.promises.readdir(path);
    if (!items || !items.length) {
      return null;
    }
    let results = (await Promise.all(items.map(async item => {
      const __path = _path.join(path, item);
      const _stat = await fs$1.promises.stat(__path);
      if (!_stat) {
        return null;
      }
      const isDir = _stat.isDirectory();
      if (isDir) {
        return perform({
          path: __path
        });
      }
      if (!(await checkFileExists(__path))) {
        return null;
      }
      if (item.includes('spec.js')) {
        return null;
      }
      const extension = getExtension(item);
      if (!_includeExtensions.includes(extension)) {
        return null;
      }
      if (_includeMeta) {
        const racine = getFileRaw(__path);
        const _module = await import(__path);
        const md = `${racine}.md`;
        let documentation = null;
        if (await checkFileExists(md)) {
          documentation = await fs$1.promises.readFile(md, 'utf8');
        }
        return [{
          module: _module,
          path: __path,
          documentation
        }];
      } else {
        return [await import(__path)];
      }
    }))).filter(a => a);
    results = _.flatten(results);
    return results;
  } catch (e) {
    console.error(e);
    return null;
  }
};
const getExtension = str => str.slice(str.lastIndexOf("."));
const getFileRaw = str => str.split('.').slice(0, -1).join('.');

var loadOptions = (async ({
  path,
  config
}) => {
  const optionsPath = `${path}/options`;
  let files = await perform({
    path: optionsPath,
    includeMeta: false
  });
  files = files ? files.map(f => f.default) : [];
  return files;
});

// https://medium.com/netscape/a-guide-to-create-a-nodejs-command-line-package-c2166ad0452e
var launch = (async ({
  path,
  npmPackage,
  config
} = {}) => {
  // import options from './options.js';
  let __actualPath = path;
  if (!__actualPath) {
    const ce = getFileCallerURL();
    __actualPath = _path.dirname(ce);
    __actualPath = __actualPath.replace('file://', '');
  }
  let __actualNpmPackage = npmPackage;
  if (!__actualNpmPackage) {
    const __d = _path.resolve(__actualPath, '../package.json');
    if (fs$1.existsSync(__d)) {
      __actualNpmPackage = JSON.parse(fs$1.readFileSync(__d).toString());
    }
  }
  if (!__actualNpmPackage) {
    __actualNpmPackage = {
      version: "0.0.0"
    };
  }
  let __actualConfig = config;
  if (!__actualConfig) {
    const __d = _path.resolve(__actualPath, '../cli.config.json');
    if (fs$1.existsSync(__d)) {
      __actualConfig = JSON.parse(fs$1.readFileSync(__d).toString());
    }
  }
  if (!__actualConfig) {
    __actualConfig = {};
  }
  //https://github.com/yargs/yargs/issues/569

  const yargs = _yargs(hideBin(process.argv));
  yargs
  // .options(options)
  .usage('Usage: servable <command>').demandCommand(1).wrap(Math.min(yargs.terminalWidth(), 160)).help('help').alias('help', 'h').version(__actualNpmPackage.version).alias('version', 'v').hide('help').hide('version').epilog('Made by Servable.');
  const options = await loadOptions({
    path: __actualPath,
    config: __actualConfig
  });
  await registerCommands({
    path: __actualPath,
    yargs,
    config: __actualConfig,
    options
  });
});

export { launch };
//# sourceMappingURL=index.modern.modern.js.map
