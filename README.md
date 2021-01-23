# Kotan Monorepo

Stuck inside because of global pandemics?
Can't visit your friends to play board games?
Tired of playing board games online that lack the _fun_ of physical pieces?

Introducing... Knock - Off - Catan!

Kotan is a virtual sandbox for playing board games, real time, in browser. Kotan is intended to be a virtual environment, akin to [Tabletop Simulator](https://www.tabletopsimulator.com/), while being more broadly accessible on a website, like [Jackbox Games](https://www.jackboxgames.com/).

## Getting Started

### install

```bash
git clone git@github.com:JacobJaffe/kotan.git kotan
cd kotan
npm install
```

### Running in Development

```bash
yarn dev-client
```

### Running in Production

(TODO: DOCS)

## Stack

This `Kotan` repo is a monorepo of `/client` and `/backend`. `/client` and `/backend` are intended to be independently served. See the [original](https://github.com/JacobJaffe/kotan-prototype) for a single-server implementation.

### Client

The `/client` stack runs a typescript react application on `Next JS`. The main pages, `/home`, `/game`, `/join`, `/host` are a Single Page Application (`SPA`)using `React Router`, so there is a continuous `socket io` instance for all game related logic.

The game display is built with `three js`, specifically with `react-three-fiber`.

### Backend

(TODO: DOCS)
