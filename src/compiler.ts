#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import asc from "assemblyscript/dist/asc.js";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

async function compile(argv: string[], options: object = {}): Promise<boolean> {
  const { error, stdout, stderr } = await asc.main(argv, options);
  console.info("contract to compile " + argv[argv.length - 1]);
  if (error) {
    console.log("Compilation failed: " + error.message);
    console.log("stderr " + stderr.toString());
    return Promise.resolve(false);
  } else {
    console.log(stdout.toString());
    return Promise.resolve(true);
  }
}

const dirToCompile = "./assembly/contracts";

/**
 * sort the file: compile deployer contract after
 *
 * @param files - files to sort
 */
function sortFiles(files: Array<string>): Array<string> {
  return files.sort((contract) => {
    return readFileSync(contract, "utf-8").includes("fileToByteArray(")
      ? 1
      : -1;
  });
}

function searchDirectory(dir: string, fileList: string[] = []): string[] {
  readdirSync(dir).forEach((file) => {
    const filePath = join(dir, file);
    if (statSync(filePath).isDirectory() && file !== "__tests__") {
      fileList = searchDirectory(filePath, fileList);
    } else if (filePath.endsWith(".ts")) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

export async function compileAll(subdirectories: boolean): Promise<boolean> {
  let files;
  if (subdirectories) {
    files = searchDirectory("./assembly/contracts");
  } else {
    files = readdirSync(dirToCompile).map((file) => {
      return join(dirToCompile, file);
    });
  }

  // keep only files ending with `.ts`
  files = files.filter((file) => file.endsWith(".ts"));
  files = sortFiles(files);

  console.log(`${files.length} files to compile`);

  return files.reduce(async (isOk, contract): Promise<boolean> => {
    return Promise.resolve(
      (await isOk) &&
        (await compile([
          "-o",
          join("build", contract.replace(".ts", ".wasm")),
          "-t",
          join("build", contract.replace(".ts", ".wat")),
          contract,
        ]))
    );
  }, Promise.resolve(true));
}

(async () => {
  await yargs(hideBin(process.argv))
    .command(
      "*",
      "Compile files in assembly/contracts",
      () => {},
      async (argv) => {
        let result;
        result = await compileAll(argv.subdirectories as boolean);
        process.exit(result ? 0 : 1);
      }
    )
    .option("subdirectories", {
      alias: "r",
      type: "boolean",
      description: "Compile files in assembly/contracts and its subdirectories",
    })
    .parseAsync();
})();
