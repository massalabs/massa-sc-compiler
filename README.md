# Massa smart-contract Compiler

**Compile you smart contracts!**

## Install dependencies

```sh
npm install
```

## Build

```sh
npm run build
```

## Format code

```sh
npm run fmt
```

## Install

```sh
npm install --save-dev @massalabs/massa-sc-compiler@dev
```

## Usage

When you have not installed the package:

```sh
npx @massalabs/massa-sc-compiler
```

When you have installed the package, you can do:

```sh
npx massa-as-compile
```

This will compile all the smart contracts in `assembly/contracts`.

```sh
npx massa-as-compile -r
```

This will compile all the smart contracts in `assembly/contracts` and subdirectories.

To see the help:

```sh
npx massa-as-compile --help
```
