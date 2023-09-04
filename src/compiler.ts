#!/usr/bin/env node

/* eslint-disable no-console */

import { readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import asc from 'assemblyscript/dist/asc.js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { readdir, readFile } from 'fs/promises';

const dirToCompile = './assembly/contracts';

/**
 * Compiles a file and logs the process and potential errors.
 * @param filePath - The path of the file to compile.
 */
export async function compile(filePath: string): Promise<void> {
  try {
    const { error, stdout, stderr } = await asc.main([
      '-o',
      join('build', basename(filePath.replace('.ts', '.wasm'))),
      '-t',
      join('build', basename(filePath.replace('.ts', '.wat'))),
      filePath,
    ]);
    console.info('Contract to compile: ' + filePath);
    if (error) {
      console.error(stderr.toString());
      throw new Error(`Error compiling contract ${filePath}: ${error.message}`);
    }
    console.info(stdout.toString());
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Failed to compile ${filePath}: ${error.message}`);
    } else {
      console.error(`Failed to compile ${filePath}: ${String(error)}`);
    }
  }
}

/**
 * Searches a directory recursively and returns a list of .ts files.
 * @param dir - The directory to search.
 * @param fileList - The list of files found so far.
 * @returns A list of .ts files in the directory.
 */
export function searchDirectory(
  dir: string,
  fileList: string[] = [],
): string[] {
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

/**
 * Gets a list of .ts files in a directory, optionally including subdirectories.
 * @param dirToCompile - The directory to search.
 * @param subdirectories - Whether to include subdirectories in the search.
 * @returns A list of .ts files in the directory.
 */
export async function getFiles(
  dirToCompile: string,
  subdirectories: boolean,
): Promise<string[]> {
  let files: string[];
  if (subdirectories) {
    files = searchDirectory(dirToCompile);
  } else {
    files = (await readdir(dirToCompile)).map((file) =>
      join(dirToCompile, file),
    );
  }

  return files.filter((file) => file.endsWith('.ts'));
}

/**
 * Categorizes files based on whether they contain the string 'fileToByteArray('.
 * @param files - The list of files to categorize.
 * @returns A tuple containing two lists: files without the string and files with the string.
 */
export async function categorizeFiles(
  files: string[],
): Promise<[string[], string[]]> {
  const filesWithByteArray: string[] = [];
  const filesWithoutByteArray: string[] = [];

  await Promise.all(
    files.map(async (file) => {
      const content = await readFile(file, 'utf-8');
      if (content.includes('fileToByteArray(')) {
        filesWithByteArray.push(file);
      } else {
        filesWithoutByteArray.push(file);
      }
    }),
  );

  return [filesWithoutByteArray, filesWithByteArray];
}

/**
 * Compiles all files in a directory, optionally including subdirectories.
 * @param dirToCompile - The directory containing the files to compile.
 * @param subdirectories - Whether to include subdirectories in the compilation.
 */
export async function compileAll(
  dirToCompile: string,
  subdirectories: boolean,
): Promise<void> {
  try {
    const files = await getFiles(dirToCompile, subdirectories);
    console.info(`${files.length} files to compile`);

    const [filesWithoutByteArray, filesWithByteArray] = await categorizeFiles(
      files,
    );

    await Promise.all(filesWithoutByteArray.map((file) => compile(file)));
    await Promise.all(filesWithByteArray.map((file) => compile(file)));
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Failed to compile all files:  ${error.message}`);
    } else {
      console.error(`Failed to compile all files:  ${String(error)}`);
    }
  }
}

(async () => {
  try {
    await yargs(hideBin(process.argv))
      .command('*', 'Compile files in assembly/contracts', {}, async (argv) => {
        await compileAll(dirToCompile, Boolean(argv.subdirectories));
      })
      .option('subdirectories', {
        alias: 'r',
        type: 'boolean',
        description:
          'Compile files in assembly/contracts and its subdirectories',
      })
      .parseAsync();
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Failed to parse arguments: ${error.message}`);
    } else {
      console.error(`Failed to parse arguments: ${String(error)}`);
    }
  }
})();
