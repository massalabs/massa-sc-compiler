#!/usr/bin/env node
import { readdir, readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import asc from "assemblyscript/dist/asc.js";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

async function compile(argv: string[], options: object = {}) {
  const { error, stdout, stderr } = await asc.main(argv, options);
  console.info(argv[argv.length - 1]);
  if (error) {
    console.log("Compilation failed: " + error.message);
    console.log(stderr.toString());
  } else {
    console.log(stdout.toString());
  }
}

const dirToCompile = "./assembly/contracts";

export async function compileDirectory(): Promise<void> {
  const searchDirectory = (dir: string, fileList: string[] = []) => {
    readdirSync(dir).forEach((file) => {
      const filePath = join(dir, file);
      if (statSync(filePath).isDirectory() && file !== "__tests__") {
        fileList = searchDirectory(filePath, fileList);
      } else if (filePath.endsWith(".ts")) {
        fileList.push(filePath);
      }
    });
    return fileList;
  };

  const files = searchDirectory("./assembly/contracts");
  files.forEach(async (contract: string) => {
    await compile([
      "-o",
      join("build", contract.replace(".ts", ".wasm")),
      "-t",
      join("build", contract.replace(".ts", ".wat")),
      contract,
    ]);
  });
}

export async function compileAll() {
  readdir(
    dirToCompile,
    async function (err: NodeJS.ErrnoException | null, files: string[]) {
      if (err) {
        return console.log("Unable to read directory: " + err);
      }

      // keep only files ending with `.ts`
      files = files.filter((file) => file.endsWith(".ts"));

      // sort the file: compile deployer contract after
      files.sort((contract) => {
        return readFileSync(join(dirToCompile, contract), "utf-8").includes(
          "fileToByteArray("
        )
          ? 1
          : -1;
      });

      console.log(`${files.length} files to compile`);

      files.forEach(async (contract) => {
        await compile([
          "-o",
          join("build", contract.replace(".ts", ".wasm")),
          "-t",
          join("build", contract.replace(".ts", ".wat")),
          join(dirToCompile, contract),
        ]);
      });
    }
  );
}

(async () => {
  await yargs(hideBin(process.argv))
    .command(
      "*",
      "Compile files in assembly/contracts",
      () => {},
      async (argv) => {
        if (argv.subdirectories) {
          await compileDirectory();
        } else {
          await compileAll();
        }
      }
    )
    .option("subdirectories", {
      alias: "r",
      type: "boolean",
      description: "Compile files in assembly/contracts and subdirectories",
    })
    .parseAsync();
})();
