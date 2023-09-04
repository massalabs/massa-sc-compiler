#!/usr/bin/env node

/* eslint-disable no-console */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import asc from 'assemblyscript/dist/asc.js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const dirToCompile = './assembly/contracts';

async function compile(filePath: string) {
  const { error, stdout, stderr } = await asc.main([
    '-o',
    join('build', basename(filePath.replace('.ts', '.wasm'))),
    '-t',
    join('build', basename(filePath.replace('.ts', '.wat'))),
    filePath,
  ]);
  console.info('contract to compile ' + filePath);
  if (error) {
    console.log(stderr.toString());
    throw new Error(`Error compiling contract ${filePath}: ${error.message}`);
  }
  console.log(stdout.toString());
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

export async function compileAll(subdirectories: boolean) {
  let files: string[];
  if (subdirectories) {
    files = searchDirectory(dirToCompile);
  } else {
    files = readdirSync(dirToCompile).map((file) => {
      return join(dirToCompile, file);
    });
  }

  // keep only files ending with `.ts`
  files = files.filter((file) => file.endsWith('.ts'));

  console.log(`${files.length} files to compile`);

  // first pass compilation with file NOT including "fileToByteArray"
  await Promise.all(
    files
      .filter(
        (file) => !readFileSync(file, 'utf-8').includes('fileToByteArray('),
      )
      .map((file) => compile(file)),
  );

  // second pass with the rest of the files
  await Promise.all(
    files
      .filter((file) =>
        readFileSync(file, 'utf-8').includes('fileToByteArray('),
      )
      .map((file) => compile(file)),
  );
}

(async () => {
  await yargs(hideBin(process.argv))
    .command('*', 'Compile files in assembly/contracts', {}, async (argv) => {
      await compileAll(argv.subdirectories as boolean);
    })
    .option('subdirectories', {
      alias: 'r',
      type: 'boolean',
      description: 'Compile files in assembly/contracts and its subdirectories',
    })
    .parseAsync();
})();
