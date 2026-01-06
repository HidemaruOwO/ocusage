// @bun
// node_modules/args-tokens/lib/utils-1LQrGCWG.js
function kebabnize(str) {
  return str.replace(/[A-Z]/g, (match, offset) => (offset > 0 ? "-" : "") + match.toLowerCase());
}

// node_modules/gunshi/lib/utils-DA31tfdY.js
function isLazyCommand(cmd) {
  return typeof cmd === "function" && "commandName" in cmd && !!cmd.commandName;
}
async function resolveLazyCommand(cmd, name, needRunResolving = false) {
  let command;
  if (isLazyCommand(cmd)) {
    const baseCommand = {
      name: cmd.commandName,
      description: cmd.description,
      args: cmd.args,
      examples: cmd.examples,
      internal: cmd.internal,
      entry: cmd.entry
    };
    if ("resource" in cmd && cmd.resource)
      baseCommand.resource = cmd.resource;
    command = Object.assign(create(), baseCommand);
    if (needRunResolving) {
      const loaded = await cmd();
      if (typeof loaded === "function")
        command.run = loaded;
      else if (typeof loaded === "object") {
        if (loaded.run == null)
          throw new TypeError(`'run' is required in command: ${cmd.name || name}`);
        command.run = loaded.run;
        command.name = loaded.name;
        command.description = loaded.description;
        command.args = loaded.args;
        command.examples = loaded.examples;
        command.internal = loaded.internal;
        command.entry = loaded.entry;
        if ("resource" in loaded && loaded.resource)
          command.resource = loaded.resource;
      } else
        throw new TypeError(`Cannot resolve command: ${cmd.name || name}`);
    }
  } else
    command = Object.assign(create(), cmd);
  if (command.name == null && name)
    command.name = name;
  return deepFreeze(command);
}
function create(obj = null) {
  return Object.create(obj);
}
function log(...args) {
  console.log(...args);
}
function deepFreeze(obj, ignores = []) {
  if (obj === null || typeof obj !== "object")
    return obj;
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (ignores.includes(key))
      continue;
    if (typeof value === "object" && value !== null)
      deepFreeze(value, ignores);
  }
  return Object.freeze(obj);
}

// node_modules/gunshi/lib/context-DRQZ3doU.js
var ANONYMOUS_COMMAND_NAME = "(anonymous)";
var NOOP = () => {};
var CLI_OPTIONS_DEFAULT = {
  name: undefined,
  description: undefined,
  version: undefined,
  cwd: undefined,
  usageSilent: false,
  subCommands: undefined,
  leftMargin: 2,
  middleMargin: 10,
  usageOptionType: false,
  usageOptionValue: true,
  renderHeader: undefined,
  renderUsage: undefined,
  renderValidationErrors: undefined,
  plugins: undefined,
  fallbackToEntry: false
};
async function createCommandContext({ args = {}, explicit = {}, values = {}, positionals = [], rest = [], argv = [], tokens = [], command = {}, extensions = {}, cliOptions = {}, callMode = "entry", omitted = false, validationError = undefined }) {
  const _args = Object.entries(args).reduce((acc, [key, value]) => {
    acc[key] = Object.assign(create(), value);
    return acc;
  }, create());
  const env = Object.assign(create(), CLI_OPTIONS_DEFAULT, cliOptions);
  if (command.rendering) {
    const { header, usage, validationErrors } = command.rendering;
    if (header !== undefined)
      env.renderHeader = header;
    if (usage !== undefined)
      env.renderUsage = usage;
    if (validationErrors !== undefined)
      env.renderValidationErrors = validationErrors;
  }
  const core = Object.assign(create(), {
    name: getCommandName(command),
    description: command.description,
    omitted,
    callMode,
    env,
    args: _args,
    explicit,
    values,
    positionals,
    rest,
    _: argv,
    tokens,
    toKebab: command.toKebab,
    log: cliOptions.usageSilent ? NOOP : log,
    validationError
  });
  if (Object.keys(extensions).length > 0) {
    const ext = create(null);
    Object.defineProperty(core, "extensions", {
      value: ext,
      writable: false,
      enumerable: true,
      configurable: true
    });
    for (const [key, extension] of Object.entries(extensions)) {
      ext[key] = await extension.factory(core, command);
      if (extension.onFactory)
        await extension.onFactory(core, command);
    }
  }
  return deepFreeze(core, ["extensions"]);
}
function getCommandName(cmd) {
  if (isLazyCommand(cmd))
    return cmd.commandName || cmd.name || ANONYMOUS_COMMAND_NAME;
  else if (typeof cmd === "object")
    return cmd.name || ANONYMOUS_COMMAND_NAME;
  else
    return ANONYMOUS_COMMAND_NAME;
}

// node_modules/args-tokens/lib/parser-M-ayhS1h.js
var HYPHEN_CHAR = "-";
var HYPHEN_CODE = HYPHEN_CHAR.codePointAt(0);
var EQUAL_CHAR = "=";
var EQUAL_CODE = EQUAL_CHAR.codePointAt(0);
var TERMINATOR = "--";
var SHORT_OPTION_PREFIX = HYPHEN_CHAR;
var LONG_OPTION_PREFIX = "--";
function parseArgs(args, options = {}) {
  const { allowCompatible = false } = options;
  const tokens = [];
  const remainings = [...args];
  let index = -1;
  let groupCount = 0;
  let hasShortValueSeparator = false;
  while (remainings.length > 0) {
    const arg = remainings.shift();
    if (arg == undefined)
      break;
    const nextArg = remainings[0];
    if (groupCount > 0)
      groupCount--;
    else
      index++;
    if (arg === TERMINATOR) {
      tokens.push({
        kind: "option-terminator",
        index
      });
      const mapped = remainings.map((arg$1) => {
        return {
          kind: "positional",
          index: ++index,
          value: arg$1
        };
      });
      tokens.push(...mapped);
      break;
    }
    if (isShortOption(arg)) {
      const shortOption = arg.charAt(1);
      let value;
      let inlineValue;
      if (groupCount) {
        tokens.push({
          kind: "option",
          name: shortOption,
          rawName: arg,
          index,
          value,
          inlineValue
        });
        if (groupCount === 1 && hasOptionValue(nextArg)) {
          value = remainings.shift();
          if (hasShortValueSeparator) {
            inlineValue = true;
            hasShortValueSeparator = false;
          }
          tokens.push({
            kind: "option",
            index,
            value,
            inlineValue
          });
        }
      } else
        tokens.push({
          kind: "option",
          name: shortOption,
          rawName: arg,
          index,
          value,
          inlineValue
        });
      if (value != null)
        ++index;
      continue;
    }
    if (isShortOptionGroup(arg)) {
      const expanded = [];
      let shortValue = "";
      for (let i = 1;i < arg.length; i++) {
        const shortableOption = arg.charAt(i);
        if (hasShortValueSeparator)
          shortValue += shortableOption;
        else if (!allowCompatible && shortableOption.codePointAt(0) === EQUAL_CODE)
          hasShortValueSeparator = true;
        else
          expanded.push(`${SHORT_OPTION_PREFIX}${shortableOption}`);
      }
      if (shortValue)
        expanded.push(shortValue);
      remainings.unshift(...expanded);
      groupCount = expanded.length;
      continue;
    }
    if (isLongOption(arg)) {
      const longOption = arg.slice(2);
      tokens.push({
        kind: "option",
        name: longOption,
        rawName: arg,
        index,
        value: undefined,
        inlineValue: undefined
      });
      continue;
    }
    if (isLongOptionAndValue(arg)) {
      const equalIndex = arg.indexOf(EQUAL_CHAR);
      const longOption = arg.slice(2, equalIndex);
      const value = arg.slice(equalIndex + 1);
      tokens.push({
        kind: "option",
        name: longOption,
        rawName: `${LONG_OPTION_PREFIX}${longOption}`,
        index,
        value,
        inlineValue: true
      });
      continue;
    }
    tokens.push({
      kind: "positional",
      index,
      value: arg
    });
  }
  return tokens;
}
function isShortOption(arg) {
  return arg.length === 2 && arg.codePointAt(0) === HYPHEN_CODE && arg.codePointAt(1) !== HYPHEN_CODE;
}
function isShortOptionGroup(arg) {
  if (arg.length <= 2)
    return false;
  if (arg.codePointAt(0) !== HYPHEN_CODE)
    return false;
  if (arg.codePointAt(1) === HYPHEN_CODE)
    return false;
  return true;
}
function isLongOption(arg) {
  return hasLongOptionPrefix(arg) && !arg.includes(EQUAL_CHAR, 3);
}
function isLongOptionAndValue(arg) {
  return hasLongOptionPrefix(arg) && arg.includes(EQUAL_CHAR, 3);
}
function hasLongOptionPrefix(arg) {
  return arg.length > 2 && ~arg.indexOf(LONG_OPTION_PREFIX);
}
function hasOptionValue(value) {
  return !(value == null) && value.codePointAt(0) !== HYPHEN_CODE;
}

// node_modules/args-tokens/lib/resolver-D0hj6HpX.js
var SKIP_POSITIONAL_DEFAULT = -1;
function resolveArgs(args, tokens, { shortGrouping = false, skipPositional = SKIP_POSITIONAL_DEFAULT, toKebab = false } = {}) {
  const skipPositionalIndex = typeof skipPositional === "number" ? Math.max(skipPositional, SKIP_POSITIONAL_DEFAULT) : SKIP_POSITIONAL_DEFAULT;
  const rest = [];
  const optionTokens = [];
  const positionalTokens = [];
  let currentLongOption;
  let currentShortOption;
  const expandableShortOptions = [];
  function toShortValue() {
    if (expandableShortOptions.length === 0)
      return;
    else {
      const value = expandableShortOptions.map((token) => token.name).join("");
      expandableShortOptions.length = 0;
      return value;
    }
  }
  function applyLongOptionValue(value = undefined) {
    if (currentLongOption) {
      currentLongOption.value = value;
      optionTokens.push({ ...currentLongOption });
      currentLongOption = undefined;
    }
  }
  function applyShortOptionValue(value = undefined) {
    if (currentShortOption) {
      currentShortOption.value = value || toShortValue();
      optionTokens.push({ ...currentShortOption });
      currentShortOption = undefined;
    }
  }
  const schemas = Object.values(args);
  let terminated = false;
  for (let i = 0;i < tokens.length; i++) {
    const token = tokens[i];
    if (token.kind === "positional") {
      if (terminated && token.value) {
        rest.push(token.value);
        continue;
      }
      if (currentShortOption) {
        const found = schemas.find((schema) => schema.short === currentShortOption.name && schema.type === "boolean");
        if (found)
          positionalTokens.push({ ...token });
      } else if (currentLongOption) {
        const found = args[currentLongOption.name]?.type === "boolean";
        if (found)
          positionalTokens.push({ ...token });
      } else
        positionalTokens.push({ ...token });
      applyLongOptionValue(token.value);
      applyShortOptionValue(token.value);
    } else if (token.kind === "option")
      if (token.rawName) {
        if (hasLongOptionPrefix(token.rawName)) {
          applyLongOptionValue();
          if (token.inlineValue)
            optionTokens.push({ ...token });
          else
            currentLongOption = { ...token };
          applyShortOptionValue();
        } else if (isShortOption(token.rawName))
          if (currentShortOption) {
            if (currentShortOption.index === token.index)
              if (shortGrouping) {
                currentShortOption.value = token.value;
                optionTokens.push({ ...currentShortOption });
                currentShortOption = { ...token };
              } else
                expandableShortOptions.push({ ...token });
            else {
              currentShortOption.value = toShortValue();
              optionTokens.push({ ...currentShortOption });
              currentShortOption = { ...token };
            }
            applyLongOptionValue();
          } else {
            currentShortOption = { ...token };
            applyLongOptionValue();
          }
      } else {
        if (currentShortOption && currentShortOption.index == token.index && token.inlineValue) {
          currentShortOption.value = token.value;
          optionTokens.push({ ...currentShortOption });
          currentShortOption = undefined;
        }
        applyLongOptionValue();
      }
    else {
      if (token.kind === "option-terminator")
        terminated = true;
      applyLongOptionValue();
      applyShortOptionValue();
    }
  }
  applyLongOptionValue();
  applyShortOptionValue();
  const values = Object.create(null);
  const errors = [];
  const explicit = Object.create(null);
  const actualInputNames = /* @__PURE__ */ new Map;
  function checkTokenName(option, schema, token) {
    return token.name === (schema.type === "boolean" ? schema.negatable && token.name?.startsWith("no-") ? `no-${option}` : option : option);
  }
  const positionalItemCount = tokens.filter((token) => token.kind === "positional").length;
  function getPositionalSkipIndex() {
    return Math.min(skipPositionalIndex, positionalItemCount);
  }
  let positionalsCount = 0;
  for (const [rawArg, schema] of Object.entries(args)) {
    const arg = toKebab || schema.toKebab ? kebabnize(rawArg) : rawArg;
    explicit[rawArg] = false;
    if (schema.type === "positional") {
      if (skipPositionalIndex > SKIP_POSITIONAL_DEFAULT)
        while (positionalsCount <= getPositionalSkipIndex())
          positionalsCount++;
      if (schema.multiple) {
        const remainingPositionals = positionalTokens.slice(positionalsCount);
        if (remainingPositionals.length > 0) {
          values[rawArg] = remainingPositionals.map((p) => p.value);
          positionalsCount += remainingPositionals.length;
        } else if (schema.required)
          errors.push(createRequireError(arg, schema));
      } else {
        const positional = positionalTokens[positionalsCount];
        if (positional != null)
          values[rawArg] = positional.value;
        else
          errors.push(createRequireError(arg, schema));
        positionalsCount++;
      }
      continue;
    }
    if (schema.required) {
      const found = optionTokens.find((token) => {
        return schema.short && token.name === schema.short || token.rawName && hasLongOptionPrefix(token.rawName) && token.name === arg;
      });
      if (!found) {
        errors.push(createRequireError(arg, schema));
        continue;
      }
    }
    for (let i = 0;i < optionTokens.length; i++) {
      const token = optionTokens[i];
      if (checkTokenName(arg, schema, token) && token.rawName != null && hasLongOptionPrefix(token.rawName) || schema.short === token.name && token.rawName != null && isShortOption(token.rawName)) {
        const invalid = validateRequire(token, arg, schema);
        if (invalid) {
          errors.push(invalid);
          continue;
        }
        explicit[rawArg] = true;
        const actualInputName = isShortOption(token.rawName) ? `-${token.name}` : `--${arg}`;
        actualInputNames.set(rawArg, actualInputName);
        if (schema.type === "boolean")
          token.value = undefined;
        const [parsedValue, error] = parse(token, arg, schema);
        if (error)
          errors.push(error);
        else if (schema.multiple) {
          values[rawArg] ||= [];
          values[rawArg].push(parsedValue);
        } else
          values[rawArg] = parsedValue;
      }
    }
    if (values[rawArg] == null && schema.default != null)
      values[rawArg] = schema.default;
  }
  const conflictErrors = checkConflicts(args, explicit, toKebab, actualInputNames);
  errors.push(...conflictErrors);
  return {
    values,
    positionals: positionalTokens.map((token) => token.value),
    rest,
    error: errors.length > 0 ? new AggregateError(errors) : undefined,
    explicit
  };
}
function parse(token, option, schema) {
  switch (schema.type) {
    case "string":
      return typeof token.value === "string" ? [token.value || schema.default, undefined] : [undefined, createTypeError(option, schema)];
    case "boolean":
      return token.value ? [token.value || schema.default, undefined] : [!(schema.negatable && token.name.startsWith("no-")), undefined];
    case "number":
      if (!isNumeric(token.value))
        return [undefined, createTypeError(option, schema)];
      return token.value ? [+token.value, undefined] : [+(schema.default || ""), undefined];
    case "enum":
      if (schema.choices && !schema.choices.includes(token.value))
        return [undefined, new ArgResolveError(`Optional argument '--${option}' ${schema.short ? `or '-${schema.short}' ` : ""}should be chosen from '${schema.type}' [${schema.choices.map((c) => JSON.stringify(c)).join(", ")}] values`, option, "type", schema)];
      return [token.value || schema.default, undefined];
    case "custom":
      if (typeof schema.parse !== "function")
        throw new TypeError(`argument '${option}' should have a 'parse' function`);
      try {
        return [schema.parse(token.value || String(schema.default || "")), undefined];
      } catch (error) {
        return [undefined, error];
      }
    default:
      throw new Error(`Unsupported argument type '${schema.type}' for option '${option}'`);
  }
}
function createRequireError(option, schema) {
  const message = schema.type === "positional" ? `Positional argument '${option}' is required` : `Optional argument '--${option}' ${schema.short ? `or '-${schema.short}' ` : ""}is required`;
  return new ArgResolveError(message, option, "required", schema);
}
var ArgResolveError = class extends Error {
  name;
  schema;
  type;
  constructor(message, name, type, schema) {
    super(message);
    this.name = name;
    this.type = type;
    this.schema = schema;
  }
};
function validateRequire(token, option, schema) {
  if (schema.required && schema.type !== "boolean" && !token.value)
    return createRequireError(option, schema);
}
function isNumeric(str) {
  return str.trim() !== "" && !isNaN(str);
}
function createTypeError(option, schema) {
  return new ArgResolveError(`Optional argument '--${option}' ${schema.short ? `or '-${schema.short}' ` : ""}should be '${schema.type}'`, option, "type", schema);
}
function checkConflicts(args, explicit, toKebab, actualInputNames) {
  for (const rawArg in args) {
    const schema = args[rawArg];
    if (!explicit[rawArg])
      continue;
    if (!schema.conflicts)
      continue;
    const conflicts = Array.isArray(schema.conflicts) ? schema.conflicts : [schema.conflicts];
    for (let i = 0;i < conflicts.length; i++) {
      const conflictingArg = conflicts[i];
      if (!explicit[conflictingArg])
        continue;
      const arg = toKebab || schema.toKebab ? kebabnize(rawArg) : rawArg;
      const conflictingArgKebab = toKebab || args[conflictingArg]?.toKebab ? kebabnize(conflictingArg) : conflictingArg;
      const optionActualName = actualInputNames.get(rawArg) || `--${arg}`;
      const conflictingActualName = actualInputNames.get(conflictingArg) || `--${conflictingArgKebab}`;
      const message = `Optional argument '${optionActualName}' conflicts with '${conflictingActualName}'`;
      return [new ArgResolveError(message, rawArg, "conflict", schema)];
    }
  }
  return [];
}

// node_modules/gunshi/lib/core-D15eimMG.js
var EMPTY_RENDERER = () => Promise.resolve("");
function createDecorators() {
  const headerDecorators = [];
  const usageDecorators = [];
  const validationDecorators = [];
  const commandDecorators = [];
  function buildRenderer(decorators, defaultRenderer) {
    if (decorators.length === 0)
      return defaultRenderer;
    let renderer = defaultRenderer;
    for (const decorator of decorators) {
      const previousRenderer = renderer;
      renderer = (ctx) => decorator(previousRenderer, ctx);
    }
    return renderer;
  }
  return Object.freeze({
    addHeaderDecorator(decorator) {
      headerDecorators.push(decorator);
    },
    addUsageDecorator(decorator) {
      usageDecorators.push(decorator);
    },
    addValidationErrorsDecorator(decorator) {
      validationDecorators.push(decorator);
    },
    addCommandDecorator(decorator) {
      commandDecorators.push(decorator);
    },
    get commandDecorators() {
      return [...commandDecorators];
    },
    getHeaderRenderer() {
      return buildRenderer(headerDecorators, EMPTY_RENDERER);
    },
    getUsageRenderer() {
      return buildRenderer(usageDecorators, EMPTY_RENDERER);
    },
    getValidationErrorsRenderer() {
      if (validationDecorators.length === 0)
        return EMPTY_RENDERER;
      let renderer = EMPTY_RENDERER;
      for (const decorator of validationDecorators) {
        const previousRenderer = renderer;
        renderer = (ctx, error) => decorator(previousRenderer, ctx, error);
      }
      return renderer;
    }
  });
}
function createPluginContext(decorators, initialSubCommands) {
  const globalOptions = /* @__PURE__ */ new Map;
  const subCommands = new Map(initialSubCommands || []);
  return Object.freeze({
    get globalOptions() {
      return new Map(globalOptions);
    },
    addGlobalOption(name, schema) {
      if (!name)
        throw new Error("Option name must be a non-empty string");
      if (globalOptions.has(name))
        throw new Error(`Global option '${name}' is already registered`);
      globalOptions.set(name, schema);
    },
    get subCommands() {
      return new Map(subCommands);
    },
    addCommand(name, command) {
      if (!name)
        throw new Error("Command name must be a non-empty string");
      if (subCommands.has(name))
        throw new Error(`Command '${name}' is already registered`);
      subCommands.set(name, command);
    },
    hasCommand(name) {
      return subCommands.has(name);
    },
    decorateHeaderRenderer(decorator) {
      decorators.addHeaderDecorator(decorator);
    },
    decorateUsageRenderer(decorator) {
      decorators.addUsageDecorator(decorator);
    },
    decorateValidationErrorsRenderer(decorator) {
      decorators.addValidationErrorsDecorator(decorator);
    },
    decorateCommand(decorator) {
      decorators.addCommandDecorator(decorator);
    }
  });
}
function resolveDependencies(plugins) {
  const sorted = [];
  const visited = /* @__PURE__ */ new Set;
  const visiting = /* @__PURE__ */ new Set;
  const pluginMap = /* @__PURE__ */ new Map;
  for (const plugin of plugins)
    if (plugin.id) {
      if (pluginMap.has(plugin.id))
        console.warn(`Duplicate plugin id detected: \`${plugin.id}\``);
      pluginMap.set(plugin.id, plugin);
    }
  function visit(plugin) {
    if (!plugin.id)
      return;
    if (visited.has(plugin.id))
      return;
    if (visiting.has(plugin.id))
      throw new Error(`Circular dependency detected: \`${[...visiting].join(` -> `) + " -> " + plugin.id}\``);
    visiting.add(plugin.id);
    const deps = plugin.dependencies || [];
    for (const dep of deps) {
      const depId = typeof dep === "string" ? dep : dep.id;
      const isOptional = typeof dep === "string" ? false : dep.optional || false;
      const depPlugin = pluginMap.get(depId);
      if (!depPlugin && !isOptional)
        throw new Error(`Missing required dependency: \`${depId}\` on \`${plugin.id}\``);
      if (depPlugin)
        visit(depPlugin);
    }
    visiting.delete(plugin.id);
    visited.add(plugin.id);
    sorted.push(plugin);
  }
  for (const plugin of plugins)
    visit(plugin);
  return sorted;
}
async function cliCore(argv, entry, options, plugins) {
  const decorators = createDecorators();
  const pluginContext = createPluginContext(decorators, createInitialSubCommands(options, entry));
  const resolvedPlugins = await applyPlugins(pluginContext, [...plugins, ...options.plugins || []]);
  const cliOptions = normalizeCliOptions(options, decorators, pluginContext);
  const tokens = parseArgs(argv);
  const subCommand = getSubCommand(tokens);
  const { commandName: name, command, callMode } = resolveCommand(subCommand, entry, cliOptions);
  if (!command)
    throw new Error(`Command not found: ${name || ""}`);
  const args = resolveArguments(pluginContext, getCommandArgs(command));
  const { explicit, values, positionals, rest, error } = resolveArgs(args, tokens, {
    shortGrouping: true,
    toKebab: command.toKebab,
    skipPositional: callMode === "subCommand" && cliOptions.subCommands.size > 0 ? 0 : -1
  });
  const omitted = !subCommand;
  const resolvedCommand = isLazyCommand(command) ? await resolveLazyCommand(command, name, true) : command;
  return await executeCommand(resolvedCommand, await createCommandContext({
    args,
    explicit,
    values,
    positionals,
    rest,
    argv,
    tokens,
    omitted,
    callMode,
    command: resolvedCommand,
    extensions: getPluginExtensions(resolvedPlugins),
    validationError: error,
    cliOptions
  }), decorators.commandDecorators);
}
async function applyPlugins(pluginContext, plugins) {
  const sortedPlugins = resolveDependencies(plugins);
  try {
    for (const plugin of sortedPlugins)
      await plugin(pluginContext);
  } catch (error) {
    console.error("Error loading plugin:", error.message);
  }
  return sortedPlugins;
}
function getCommandArgs(cmd) {
  if (isLazyCommand(cmd))
    return cmd.args || create();
  else if (typeof cmd === "object")
    return cmd.args || create();
  else
    return create();
}
function resolveArguments(pluginContext, args) {
  return Object.assign(create(), Object.fromEntries(pluginContext.globalOptions), args);
}
var isObject = (val) => val !== null && typeof val === "object";
function createInitialSubCommands(options, entryCmd) {
  const hasSubCommands = options.subCommands ? options.subCommands instanceof Map ? options.subCommands.size > 0 : isObject(options.subCommands) && Object.keys(options.subCommands).length > 0 : false;
  const subCommands = new Map(options.subCommands instanceof Map ? options.subCommands : []);
  if (!(options.subCommands instanceof Map) && isObject(options.subCommands))
    for (const [name, cmd] of Object.entries(options.subCommands))
      subCommands.set(name, cmd);
  if (hasSubCommands) {
    if (isLazyCommand(entryCmd) || typeof entryCmd === "object") {
      entryCmd.entry = true;
      subCommands.set(resolveEntryName(entryCmd), entryCmd);
    } else if (typeof entryCmd === "function") {
      const name = entryCmd.name || ANONYMOUS_COMMAND_NAME;
      subCommands.set(name, {
        run: entryCmd,
        name,
        entry: true
      });
    }
  }
  return subCommands;
}
function normalizeCliOptions(options, decorators, pluginContext) {
  const subCommands = new Map(pluginContext.subCommands);
  const resolvedOptions = Object.assign(create(), CLI_OPTIONS_DEFAULT, options, { subCommands });
  if (resolvedOptions.renderHeader === undefined)
    resolvedOptions.renderHeader = decorators.getHeaderRenderer();
  if (resolvedOptions.renderUsage === undefined)
    resolvedOptions.renderUsage = decorators.getUsageRenderer();
  if (resolvedOptions.renderValidationErrors === undefined)
    resolvedOptions.renderValidationErrors = decorators.getValidationErrorsRenderer();
  return resolvedOptions;
}
function getSubCommand(tokens) {
  const firstToken = tokens[0];
  return firstToken && firstToken.kind === "positional" && firstToken.index === 0 && firstToken.value ? firstToken.value : "";
}
var CANNOT_RESOLVE_COMMAND = { callMode: "unexpected" };
function resolveCommand(sub, entry, options) {
  const omitted = !sub;
  function doResolveCommand() {
    if (typeof entry === "function")
      if ("commandName" in entry && entry.commandName)
        return {
          commandName: entry.commandName,
          command: entry,
          callMode: "entry"
        };
      else
        return {
          command: {
            run: entry,
            entry: true
          },
          callMode: "entry"
        };
    else if (typeof entry === "object")
      return {
        commandName: resolveEntryName(entry),
        command: entry,
        callMode: "entry"
      };
    else
      return CANNOT_RESOLVE_COMMAND;
  }
  if (omitted || options.subCommands?.size === 0)
    return doResolveCommand();
  const cmd = options.subCommands?.get(sub);
  if (cmd == null) {
    if (options.fallbackToEntry)
      return doResolveCommand();
    return {
      commandName: sub,
      callMode: "unexpected"
    };
  }
  if (isLazyCommand(cmd) && cmd.commandName == null)
    cmd.commandName = sub;
  else if (typeof cmd === "object" && cmd.name == null)
    cmd.name = sub;
  return {
    commandName: sub,
    command: cmd,
    callMode: "subCommand"
  };
}
function resolveEntryName(entry) {
  return isLazyCommand(entry) ? entry.commandName || ANONYMOUS_COMMAND_NAME : entry.name || ANONYMOUS_COMMAND_NAME;
}
function getPluginExtensions(plugins) {
  const extensions = create();
  for (const plugin of plugins)
    if (plugin.extension) {
      const key = plugin.id;
      if (extensions[key])
        console.warn(`Plugin "${key}" is already installed. Ignore it for command context extending.`);
      else
        extensions[key] = plugin.extension;
    }
  return extensions;
}
async function executeCommand(cmd, ctx, decorators) {
  const baseRunner = cmd.run || NOOP;
  const decoratedRunner = decorators.reduceRight((runner, decorator) => decorator(runner), baseRunner);
  try {
    if (ctx.env.onBeforeCommand)
      await ctx.env.onBeforeCommand(ctx);
    const result = await decoratedRunner(ctx);
    if (ctx.env.onAfterCommand)
      await ctx.env.onAfterCommand(ctx, result);
    return typeof result === "string" ? result : undefined;
  } catch (error) {
    if (ctx.env.onErrorCommand)
      try {
        await ctx.env.onErrorCommand(ctx, error);
      } catch (hookError) {
        console.error("Error in onErrorCommand hook:", hookError);
      }
    throw error;
  }
}

// node_modules/gunshi/lib/definition.js
function define(definition) {
  return definition;
}

// node_modules/gunshi/lib/plugin-vBhmK2n3.js
var NOOP_EXTENSION = () => {
  return Object.create(null);
};
function plugin(options = {}) {
  const { id, name, setup, onExtension, dependencies } = options;
  const extension = options.extension || NOOP_EXTENSION;
  const pluginFn = async (ctx) => {
    if (setup)
      await setup(ctx);
  };
  const props = {
    writable: false,
    enumerable: true,
    configurable: true
  };
  return Object.defineProperties(pluginFn, {
    id: {
      value: id,
      ...props
    },
    ...name && { name: {
      value: name,
      ...props
    } },
    ...dependencies && { dependencies: {
      value: dependencies,
      ...props
    } },
    ...extension && { extension: {
      value: {
        key: Symbol(id),
        factory: extension,
        onFactory: onExtension
      },
      ...props
    } }
  });
}

// node_modules/gunshi/lib/src-BXKp6yTi.js
var BUILT_IN_PREFIX = "_";
var PLUGIN_PREFIX = "g";
var ARG_PREFIX = "arg";
var BUILT_IN_KEY_SEPARATOR = ":";
var BUILD_IN_PREFIX_AND_KEY_SEPARATOR = `${BUILT_IN_PREFIX}${BUILT_IN_KEY_SEPARATOR}`;
var ARG_PREFIX_AND_KEY_SEPARATOR = `${ARG_PREFIX}${BUILT_IN_KEY_SEPARATOR}`;
var ARG_NEGATABLE_PREFIX = "no-";
var COMMON_ARGS = {
  help: {
    type: "boolean",
    short: "h",
    description: "Display this help message"
  },
  version: {
    type: "boolean",
    short: "v",
    description: "Display this version"
  }
};
var NEGATABLE = "Negatable of";
var en_US_default = {
  COMMAND: "COMMAND",
  COMMANDS: "COMMANDS",
  SUBCOMMAND: "SUBCOMMAND",
  USAGE: "USAGE",
  ARGUMENTS: "ARGUMENTS",
  OPTIONS: "OPTIONS",
  EXAMPLES: "EXAMPLES",
  FORMORE: "For more info, run any command with the `--help` flag",
  NEGATABLE,
  DEFAULT: "default",
  CHOICES: "choices",
  help: "Display this help message",
  version: "Display this version"
};
function resolveBuiltInKey(key) {
  return `${BUILT_IN_PREFIX}${BUILT_IN_KEY_SEPARATOR}${key}`;
}
function resolveArgKey(key, name) {
  return `${name ? `${name}${BUILT_IN_KEY_SEPARATOR}` : ""}${ARG_PREFIX}${BUILT_IN_KEY_SEPARATOR}${key}`;
}
function resolveKey(key, name) {
  return `${name ? `${name}${BUILT_IN_KEY_SEPARATOR}` : ""}${key}`;
}
async function resolveExamples(ctx, examples) {
  return typeof examples === "string" ? examples : typeof examples === "function" ? await examples(ctx) : "";
}
function namespacedId(id) {
  return `${PLUGIN_PREFIX}${BUILT_IN_KEY_SEPARATOR}${id}`;
}
function makeShortLongOptionPair(schema, name, toKebab) {
  let key = `--${toKebab || schema.toKebab ? kebabnize(name) : name}`;
  if (schema.short)
    key = `-${schema.short}, ${key}`;
  return key;
}
function localizable(ctx, cmd, translate) {
  async function localize(key, values) {
    if (translate)
      return translate(key, values);
    if (key.startsWith(BUILD_IN_PREFIX_AND_KEY_SEPARATOR))
      return en_US_default[key.slice(BUILD_IN_PREFIX_AND_KEY_SEPARATOR.length)] || key;
    const namaspacedArgKey = resolveKey(ARG_PREFIX_AND_KEY_SEPARATOR, ctx.name);
    if (key.startsWith(namaspacedArgKey)) {
      let argKey = key.slice(namaspacedArgKey.length);
      let negatable = false;
      if (argKey.startsWith(ARG_NEGATABLE_PREFIX)) {
        argKey = argKey.slice(ARG_NEGATABLE_PREFIX.length);
        negatable = true;
      }
      const schema = ctx.args[argKey];
      if (!schema)
        return argKey;
      return negatable && schema.type === "boolean" && schema.negatable ? `${NEGATABLE} ${makeShortLongOptionPair(schema, argKey, ctx.toKebab)}` : schema.description || "";
    }
    if (key === resolveKey("description", ctx.name))
      return "";
    else if (key === resolveKey("examples", ctx.name))
      return await resolveExamples(ctx, cmd.examples);
    else
      return key;
  }
  return localize;
}
function renderHeader(ctx) {
  const title = ctx.env.description || ctx.env.name || "";
  return Promise.resolve(title ? `${title} (${ctx.env.name || ""}${ctx.env.version ? ` v${ctx.env.version}` : ""})` : title);
}
var pluginId = namespacedId("renderer");
var COMMON_ARGS_KEYS = Object.keys(COMMON_ARGS);
async function renderUsage(ctx) {
  const messages = [];
  if (!ctx.omitted) {
    const description = await resolveDescription(ctx);
    if (description)
      messages.push(description, "");
  }
  messages.push(...await renderUsageSection(ctx), "");
  if (ctx.omitted && await hasCommands(ctx))
    messages.push(...await renderCommandsSection(ctx), "");
  if (hasPositionalArgs(ctx.args))
    messages.push(...await renderPositionalArgsSection(ctx), "");
  if (hasOptionalArgs(ctx.args))
    messages.push(...await renderOptionalArgsSection(ctx), "");
  const examples = await renderExamplesSection(ctx);
  if (examples.length > 0)
    messages.push(...examples, "");
  return messages.join(`
`);
}
async function renderPositionalArgsSection(ctx) {
  const messages = [];
  messages.push(`${await ctx.extensions[pluginId].text(resolveBuiltInKey("ARGUMENTS"))}:`);
  messages.push(await generatePositionalArgsUsage(ctx));
  return messages;
}
async function renderOptionalArgsSection(ctx) {
  const messages = [];
  messages.push(`${await ctx.extensions[pluginId].text(resolveBuiltInKey("OPTIONS"))}:`);
  messages.push(await generateOptionalArgsUsage(ctx, getOptionalArgsPairs(ctx)));
  return messages;
}
async function renderExamplesSection(ctx) {
  const messages = [];
  const resolvedExamples = await resolveExamples$1(ctx);
  if (resolvedExamples) {
    const examples = resolvedExamples.split(`
`).map((example) => example.padStart(ctx.env.leftMargin + example.length));
    messages.push(`${await ctx.extensions[pluginId].text(resolveBuiltInKey("EXAMPLES"))}:`, ...examples);
  }
  return messages;
}
async function renderUsageSection(ctx) {
  const messages = [`${await ctx.extensions[pluginId].text(resolveBuiltInKey("USAGE"))}:`];
  const usageStr = await makeUsageSymbols(ctx);
  messages.push(usageStr.padStart(ctx.env.leftMargin + usageStr.length));
  return messages;
}
async function makeUsageSymbols(ctx) {
  const messages = [await resolveEntry(ctx)];
  if (ctx.omitted)
    if (await hasCommands(ctx))
      messages.push(` [${await ctx.extensions[pluginId].text(resolveBuiltInKey("COMMANDS"))}]`);
    else
      messages.push(`${ctx.callMode === "subCommand" ? ` ${await resolveSubCommand(ctx)}` : ""}`);
  else
    messages.push(`${ctx.callMode === "subCommand" ? ` ${await resolveSubCommand(ctx)}` : ""}`);
  const optionsSymbols = await generateOptionsSymbols(ctx, ctx.args);
  if (optionsSymbols)
    messages.push(" ", optionsSymbols);
  const positionalSymbols = generatePositionalSymbols(ctx.args);
  if (positionalSymbols)
    messages.push(" ", positionalSymbols);
  return messages.join("");
}
async function renderCommandsSection(ctx) {
  const messages = [`${await ctx.extensions[pluginId].text(resolveBuiltInKey("COMMANDS"))}:`];
  const loadedCommands = await ctx.extensions?.[pluginId].loadCommands() || [];
  const commandMaxLength = Math.max(...loadedCommands.map((cmd) => (cmd.name || "").length));
  const commandsStr = await Promise.all(loadedCommands.map(async (cmd) => {
    const desc = cmd.description || "";
    const optionSymbol = await generateOptionsSymbols(ctx, ctx.args);
    const positionalSymbol = generatePositionalSymbols(ctx.args);
    const commandStr = await makeCommandSymbol(ctx, cmd);
    const symbolLength = desc.length > 0 ? commandMaxLength + optionSymbol.length + positionalSymbol.length : 0;
    const command = `${commandStr.padEnd(symbolLength + ctx.env.middleMargin)}${desc}`;
    return `${command.padStart(ctx.env.leftMargin + command.length)}`;
  }));
  messages.push(...commandsStr, "", `${await ctx.extensions[pluginId].text(resolveBuiltInKey("FORMORE"))}:`);
  messages.push(...loadedCommands.map((cmd) => {
    let commandStr = cmd.entry ? "" : cmd.name || "";
    if (commandStr)
      commandStr += " ";
    const commandHelp = `${ctx.env.name} ${commandStr}--help`;
    return `${commandHelp.padStart(ctx.env.leftMargin + commandHelp.length)}`;
  }));
  return messages;
}
async function makeCommandSymbol(ctx, cmd) {
  const optionSymbol = await generateOptionsSymbols(ctx, ctx.args);
  const positionalSymbol = generatePositionalSymbols(ctx.args);
  let commandStr = cmd.entry ? cmd.name === undefined || cmd.name === ANONYMOUS_COMMAND_NAME ? "" : `[${cmd.name}]` : cmd.name || "";
  if (optionSymbol) {
    if (commandStr)
      commandStr += " ";
    commandStr += `${optionSymbol}`;
  }
  if (positionalSymbol) {
    if (commandStr)
      commandStr += " ";
    commandStr += `${positionalSymbol}`;
  }
  return commandStr;
}
async function resolveEntry(ctx) {
  return ctx.env.name || await ctx.extensions[pluginId].text(resolveBuiltInKey("COMMAND"));
}
async function resolveSubCommand(ctx) {
  return ctx.name || await ctx.extensions[pluginId].text(resolveBuiltInKey("SUBCOMMAND"));
}
async function resolveDescription(ctx) {
  return await ctx.extensions[pluginId].text(resolveKey("description", ctx.name)) || ctx.description || "";
}
async function resolveExamples$1(ctx) {
  const ret = await ctx.extensions[pluginId].text(resolveKey("examples", ctx.name));
  if (ret)
    return ret;
  const command = ctx.env.subCommands?.get(ctx.name || "");
  return await resolveExamples(ctx, command?.examples);
}
async function hasCommands(ctx) {
  return (await ctx.extensions?.[pluginId].loadCommands() || []).length > 1;
}
function hasOptionalArgs(args) {
  return Object.values(args).some((arg) => arg.type !== "positional");
}
function hasPositionalArgs(args) {
  return Object.values(args).some((arg) => arg.type === "positional");
}
function hasAllDefaultOptions(args) {
  return !!(args && Object.values(args).every((arg) => arg.default));
}
async function generateOptionsSymbols(ctx, args) {
  return hasOptionalArgs(args) ? hasAllDefaultOptions(args) ? `[${await ctx.extensions[pluginId].text(resolveBuiltInKey("OPTIONS"))}]` : `<${await ctx.extensions[pluginId].text(resolveBuiltInKey("OPTIONS"))}>` : "";
}
function getOptionalArgsPairs(ctx) {
  return Object.entries(ctx.args).reduce((acc, [name, schema]) => {
    if (schema.type === "positional")
      return acc;
    let key = makeShortLongOptionPair(schema, name, ctx.toKebab);
    if (schema.type !== "boolean") {
      const displayName = ctx.toKebab || schema.toKebab ? kebabnize(name) : name;
      key = schema.default ? `${key} [${displayName}]` : `${key} <${displayName}>`;
    }
    acc[name] = key;
    if (schema.type === "boolean" && schema.negatable && !COMMON_ARGS_KEYS.includes(name)) {
      const displayName = ctx.toKebab || schema.toKebab ? kebabnize(name) : name;
      acc[`${ARG_NEGATABLE_PREFIX}${name}`] = `--${ARG_NEGATABLE_PREFIX}${displayName}`;
    }
    return acc;
  }, Object.create(null));
}
var resolveNegatableKey = (key) => key.split(ARG_NEGATABLE_PREFIX)[1];
function resolveNegatableType(key, ctx) {
  return ctx.args[key.startsWith(ARG_NEGATABLE_PREFIX) ? resolveNegatableKey(key) : key].type;
}
async function generateDefaultDisplayValue(ctx, schema) {
  return `${await ctx.extensions[pluginId].text(resolveBuiltInKey("DEFAULT"))}: ${schema.default}`;
}
async function resolveDisplayValue(ctx, key) {
  if (COMMON_ARGS_KEYS.includes(key))
    return "";
  const schema = ctx.args[key];
  if ((schema.type === "boolean" || schema.type === "number" || schema.type === "string" || schema.type === "custom") && schema.default !== undefined)
    return `(${await generateDefaultDisplayValue(ctx, schema)})`;
  if (schema.type === "enum") {
    const _default = schema.default === undefined ? "" : await generateDefaultDisplayValue(ctx, schema);
    const choices = `${await ctx.extensions[pluginId].text(resolveBuiltInKey("CHOICES"))}: ${schema.choices.join(" | ")}`;
    return `(${_default ? `${_default}, ${choices}` : choices})`;
  }
  return "";
}
async function generateOptionalArgsUsage(ctx, optionsPairs) {
  const optionsMaxLength = Math.max(...Object.entries(optionsPairs).map(([_, value]) => value.length));
  const optionSchemaMaxLength = ctx.env.usageOptionType ? Math.max(...Object.entries(optionsPairs).map(([key]) => resolveNegatableType(key, ctx).length)) : 0;
  return (await Promise.all(Object.entries(optionsPairs).map(async ([key, value]) => {
    let rawDesc = await ctx.extensions[pluginId].text(resolveArgKey(key, ctx.name));
    if (!rawDesc && key.startsWith(ARG_NEGATABLE_PREFIX)) {
      const name = resolveNegatableKey(key);
      const schema = ctx.args[name];
      const optionKey = makeShortLongOptionPair(schema, name, ctx.toKebab);
      rawDesc = `${await ctx.extensions[pluginId].text(resolveBuiltInKey("NEGATABLE"))} ${optionKey}`;
    }
    const optionsSchema = ctx.env.usageOptionType ? `[${resolveNegatableType(key, ctx)}] ` : "";
    const valueDesc = key.startsWith(ARG_NEGATABLE_PREFIX) ? "" : await resolveDisplayValue(ctx, key);
    const desc = `${optionsSchema ? optionsSchema.padEnd(optionSchemaMaxLength + 3) : ""}${rawDesc}`;
    const descLength = desc.length + valueDesc.length;
    const option = `${value.padEnd((descLength > 0 ? optionsMaxLength : 0) + ctx.env.middleMargin)}${desc}${valueDesc ? ` ${valueDesc}` : ""}`;
    return `${option.padStart(ctx.env.leftMargin + option.length)}`;
  }))).join(`
`);
}
function getPositionalArgs(args) {
  return Object.entries(args).filter(([_, schema]) => schema.type === "positional");
}
async function generatePositionalArgsUsage(ctx) {
  const positionals = getPositionalArgs(ctx.args);
  const argsMaxLength = Math.max(...positionals.map(([name]) => name.length));
  return (await Promise.all(positionals.map(async ([name]) => {
    const desc = await ctx.extensions[pluginId].text(resolveArgKey(name, ctx.name)) || ctx.args[name].description || "";
    const arg = `${name.padEnd(argsMaxLength + ctx.env.middleMargin)} ${desc}`;
    return `${arg.padStart(ctx.env.leftMargin + arg.length)}`;
  }))).join(`
`);
}
function generatePositionalSymbols(args) {
  return hasPositionalArgs(args) ? getPositionalArgs(args).map(([name, arg]) => {
    const elements = [];
    if (!arg.multiple || arg.required)
      elements.push(`<${name}>`);
    if (arg.multiple)
      elements.push(`[<${name}> ...]`);
    return elements.join(" ");
  }).join(" ") : "";
}
function renderValidationErrors(_ctx, error) {
  const messages = [];
  for (const err of error.errors)
    messages.push(err.message);
  return Promise.resolve(messages.join(`
`));
}
var i18nPluginId = namespacedId("i18n");
var dependencies = [{
  id: i18nPluginId,
  optional: true
}];
function renderer() {
  return plugin({
    id: pluginId,
    name: "usage renderer",
    dependencies,
    extension: (ctx, cmd) => {
      const i18n = ctx.extensions[i18nPluginId];
      let cachedCommands;
      async function loadCommands() {
        if (cachedCommands)
          return cachedCommands;
        const subCommands = [...ctx.env.subCommands || []];
        cachedCommands = (await Promise.all(subCommands.map(async ([name, cmd$1]) => await resolveLazyCommand(cmd$1, name)))).filter((cmd$1) => !cmd$1.internal).filter(Boolean);
        cachedCommands.sort((a, b) => {
          if (a.entry && !b.entry)
            return -1;
          if (!a.entry && b.entry)
            return 1;
          if (a.name && b.name)
            return a.name.localeCompare(b.name);
          if (a.name && !b.name)
            return -1;
          if (!a.name && b.name)
            return 1;
          return 0;
        });
        return cachedCommands;
      }
      return {
        text: localizable(ctx, cmd, i18n?.translate),
        loadCommands
      };
    },
    setup: (ctx) => {
      ctx.decorateHeaderRenderer(async (_baseRenderer, cmdCtx) => await renderHeader(cmdCtx));
      ctx.decorateUsageRenderer(async (_baseRenderer, cmdCtx) => await renderUsage(cmdCtx));
      ctx.decorateValidationErrorsRenderer(async (_baseRenderer, cmdCtx, error) => await renderValidationErrors(cmdCtx, error));
    }
  });
}

// node_modules/gunshi/lib/cli-BtnhCdFu.js
var pluginId2 = namespacedId("global");
var decorator = (baseRunner) => async (ctx) => {
  const { values, validationError, extensions: { [pluginId2]: { showVersion, showHeader, showUsage, showValidationErrors } } } = ctx;
  if (values.version)
    return showVersion();
  const buf = [];
  const header = await showHeader();
  if (header)
    buf.push(header);
  if (values.help) {
    const usage = await showUsage();
    if (usage) {
      buf.push(usage);
      return buf.join(`
`);
    }
    return;
  }
  if (validationError)
    return await showValidationErrors(validationError);
  return baseRunner(ctx);
};
var decorator_default = decorator;
function extension(ctx) {
  return {
    showVersion: () => {
      const version = ctx.env.version || "unknown";
      if (!ctx.env.usageSilent)
        ctx.log(version);
      return version;
    },
    showHeader: async () => {
      let header;
      if (ctx.env.renderHeader != null) {
        header = await ctx.env.renderHeader(ctx);
        if (header) {
          ctx.log(header);
          ctx.log();
        }
      }
      return header;
    },
    showUsage: async () => {
      if (ctx.env.renderUsage != null) {
        const usage = await ctx.env.renderUsage(ctx);
        if (usage) {
          ctx.log(usage);
          return usage;
        }
      }
    },
    showValidationErrors: async (error) => {
      if (ctx.env.renderValidationErrors === null)
        return;
      if (ctx.env.renderValidationErrors !== undefined) {
        const message = await ctx.env.renderValidationErrors(ctx, error);
        ctx.log(message);
        return message;
      }
    }
  };
}
function global() {
  return plugin({
    id: pluginId2,
    name: "global options",
    extension,
    setup(ctx) {
      for (const [name, schema] of Object.entries(COMMON_ARGS))
        ctx.addGlobalOption(name, schema);
      ctx.decorateCommand(decorator_default);
    }
  });
}
async function cli(args, entry, options = {}) {
  return cliCore(args, entry, options, [global(), renderer()]);
}

// node_modules/gunshi/lib/index.js
var DefaultTranslation = class {
  #resources = /* @__PURE__ */ new Map;
  #options;
  constructor(options) {
    this.#options = options;
    this.#resources.set(options.locale, Object.create(null));
    if (options.locale !== options.fallbackLocale)
      this.#resources.set(options.fallbackLocale, Object.create(null));
  }
  getResource(locale) {
    return this.#resources.get(locale);
  }
  setResource(locale, resource) {
    this.#resources.set(locale, resource);
  }
  getMessage(locale, key) {
    const resource = this.getResource(locale);
    if (resource)
      return resource[key];
  }
  translate(locale, key, values = Object.create(null)) {
    let message = this.getMessage(locale, key);
    if (message === undefined && locale !== this.#options.fallbackLocale)
      message = this.getMessage(this.#options.fallbackLocale, key);
    if (message === undefined)
      return;
    return message.replaceAll(/\{\$(\w+)\}/g, (_, name) => {
      return values[name] == null ? "" : values[name];
    });
  }
};
var pluginId3 = namespacedId("i18n");
var BUILT_IN_PREFIX_CODE = BUILT_IN_PREFIX.codePointAt(0);

// src/index.ts
var main = define({
  name: "ocusage",
  version: "0.1.0",
  description: "OpenCode usage tracker - Track and analyze token usage",
  run: async () => {
    console.log("Usage: ocusage <command> [options]");
    console.log("");
    console.log("Commands:");
    console.log("  sessions    List all sessions");
    console.log("  session     Show session details");
    console.log("  models      Show usage by model");
    console.log("  daily       Show daily usage");
    console.log("  weekly      Show weekly usage");
    console.log("  monthly     Show monthly usage");
    console.log("  export      Export data to CSV/JSON");
    console.log("  live        Real-time monitoring");
    console.log("");
    console.log('Run "ocusage <command> --help" for more information');
  }
});
await cli(process.argv.slice(2), main, {
  name: "ocusage",
  version: "0.1.0"
});
