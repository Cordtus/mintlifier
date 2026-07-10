const COMMAND_OPTIONS = {
  auto: {
    '--name': { key: 'name', aliases: ['-n'], takesValue: true },
    '--output': { key: 'output', aliases: ['-o'], takesValue: true }
  },
  freeze: {
    '--version': { key: 'version', aliases: ['-v'], takesValue: true },
    '--next-version': { key: 'nextVersion', aliases: ['--next'], takesValue: true },
    '--scope': { key: 'scope', aliases: ['-s'], takesValue: true },
    '--dry-run': { key: 'dryRun' },
    '--yes': {
      key: 'yes',
      aliases: ['-y', '--automated', '--non-interactive'],
      nonInteractive: true
    }
  },
  init: {},
  versioning: {}
};

const COMMAND_HELP = {
  init: `Usage: mintlifier init

Create a Mintlify project interactively. Existing docs.json files are offered to
the editor before anything is overwritten.`,
  auto: `Usage: mintlifier auto [options]

Create a non-interactive starter project.

Options:
  --name, -n <name>       Documentation site name
  --output, -o <path>     New output directory (default: mintlify-docs)`,
  edit: `Usage: mintlifier edit [docs.json]

Edit an existing configuration. Without a path, Mintlifier checks common
project locations.`,
  versioning: `Usage: mintlifier versioning

Set up version metadata or list available versioned scopes.`,
  freeze: `Usage: mintlifier freeze [options]

Freeze the working documentation into an immutable version snapshot.

Options:
  --version, -v <label>          Version label to freeze
  --next-version, --next <label> Next development label
  --scope, -s <scope>            Product or navigation scope
  --dry-run                      Validate and show the plan without writing
  --yes, -y                      Skip confirmation
  --automated                    Non-interactive alias for --yes
  --non-interactive              Non-interactive alias for --yes`
};

function findDefinition(definitions, argument) {
  return Object.entries(definitions).find(([name, definition]) =>
    argument === name || definition.aliases?.includes(argument)
  );
}

export function parseCommandOptions(command, args = []) {
  const definitions = COMMAND_OPTIONS[command];
  if (!definitions) throw new Error(`Unknown command: ${command}`);

  const result = {};
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    const entry = findDefinition(definitions, argument);
    if (!entry) throw new Error(`Unknown ${command} option: ${argument}`);

    const [, definition] = entry;
    if (definition.takesValue) {
      const value = args[index + 1];
      if (!value || value.startsWith('-')) {
        throw new Error(`${argument} requires a value`);
      }
      result[definition.key] = value;
      index += 1;
    } else {
      result[definition.key] = true;
      if (definition.nonInteractive) result.nonInteractive = true;
    }
  }
  return result;
}

export function parseEditArguments(args = []) {
  if (args.some((argument) => argument.startsWith('-'))) {
    throw new Error(`Unknown edit option: ${args.find((argument) => argument.startsWith('-'))}`);
  }
  if (args.length > 1) throw new Error('The edit command accepts at most one config path');
  return args[0] ? { configPath: args[0] } : {};
}

export function renderCommandHelp(command) {
  const help = COMMAND_HELP[command];
  if (!help) throw new Error(`Unknown command: ${command}`);
  return help;
}
