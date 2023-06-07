#!/usr/bin/env node
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { join, basename } from 'path';
import asc from 'assemblyscript/dist/asc.js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const asconfigPath = './asconfig.json';

async function compile(argv: string[], options: object = {}): Promise<boolean> {
  // Read the asconfig.json file
  if (existsSync(asconfigPath)) {
    const asconfig = JSON.parse(readFileSync(asconfigPath, 'utf8'));

    // Merge the targets and options present in the asconfig file with the options object
    const target = asconfig.targets[process.env['ASC_ENV'] || 'release'];
    const targetOpts = Object.assign({}, asconfig.options, target);

    // Merge command-line options with asconfig options
    options = { ...targetOpts, ...options };
  }
  const { error, stdout, stderr } = await asc.main(argv, options);
  console.info('contract to compile ' + argv[argv.length - 1]);
  if (error) {
    console.log('Compilation failed: ' + error.message);
    console.log('stderr ' + stderr.toString());
    return Promise.resolve(false);
  } else {
    console.log(stdout.toString());
    return Promise.resolve(true);
  }
}

const dirToCompile = './assembly/contracts';

/**
 * sort the file: compile deployer contract after
 *
 * @param files - files to sort
 */
function sortFiles(files: Array<string>): Array<string> {
  return files.sort((contract) => {
    return readFileSync(contract, 'utf-8').includes('fileToByteArray(')
      ? 1
      : -1;
  });
}

function searchDirectory(dir: string, fileList: string[] = []): string[] {
  readdirSync(dir).forEach((file) => {
    const filePath = join(dir, file);
    if (statSync(filePath).isDirectory() && file !== '__tests__') {
      fileList = searchDirectory(filePath, fileList);
    } else if (filePath.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

export async function compileAll(subdirectories: boolean): Promise<boolean> {
  let files: string[];
  if (subdirectories) {
    files = searchDirectory('./assembly/contracts');
  } else {
    files = readdirSync(dirToCompile).map((file) => {
      return join(dirToCompile, file);
    });
  }

  // keep only files ending with `.ts`
  files = files.filter((file) => file.endsWith('.ts'));
  files = sortFiles(files);

  console.log(`${files.length} files to compile`);

  const res = await Promise.all(
    files.map((file) =>
      compile([
        '-o',
        join(
          'build',
          basename(file.replace('.ts', '.wasm')).replace(
            'assembly/contracts/',
            '',
          ),
        ),
        '-t',
        join(
          'build',
          basename(file.replace('.ts', '.wat')).replace(
            'assembly/contracts/',
            '',
          ),
        ),
        file,
      ]),
    ),
  );

  return res.every((isOk) => isOk);
}

(async () => {
  await yargs(hideBin(process.argv))
    .command('*', 'Compile files in assembly/contracts', {}, async (argv) => {
      const result = await compileAll(argv.subdirectories as boolean);
      process.exit(result ? 0 : 1);
    })
    .option('subdirectories', {
      alias: 'r',
      type: 'boolean',
      description: 'Compile files in assembly/contracts and its subdirectories',
    })
    .parseAsync();
})();
