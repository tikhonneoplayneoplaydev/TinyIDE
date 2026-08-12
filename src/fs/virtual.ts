// ─── Virtual in-memory file system + demo playground ───────────────────────
// Used in the browser demo AND as the initial workspace inside the desktop app,
// so the IDE always opens with something to explore (a showcase of 50+ languages).

import type { FsNode } from '../types';

export const DEMO_ROOT = '/comet-playground';

const F: [string, string][] = [
  [`${DEMO_ROOT}/README.md`, `# 🌠 Comet Playground

Добро пожаловать в **Comet IDE** — это виртуальная файловая система, которая
открывается при первом запуске, чтобы показать подсветку синтаксиса
для 50+ языков программирования.

## Что попробовать

| Действие | Горячая клавиша |
| --- | --- |
| Палитра команд | Ctrl + Shift + P |
| Быстрое открытие файла | Ctrl + P |
| Сохранить | Ctrl + S |
| Показать/скрыть сайдбар | Ctrl + B |

## Фишки

- 🚀 Курсор-комета с шлейфом, свечением и искрами
- 🎨 Две темы + анимированная подсветка выделения
- 📂 Проводник с контекстным меню (ПКМ)
- 🔍 Поиск по файлам

> В десктоп-приложении нажми **Open Folder** и открой любую реальную папку —
> IDE превратится в полноценный редактор с сохранением файлов.
`],
  [`${DEMO_ROOT}/.gitignore`, `node_modules/
dist/
build/
*.log
.env.local
.DS_Store
`],
  [`${DEMO_ROOT}/package.json`, `{
  "name": "comet-playground",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "typescript": "^5.7.2",
    "vite": "^6.0.5"
  }
}
`],
  [`${DEMO_ROOT}/Makefile`, `.PHONY: build test clean

build:
\tmkdir -p dist
\tcp -r src/* dist/

test:
\tpython3 -m pytest tests/

clean:
\trm -rf dist build

run:
\tpython3 src/main.py
`],
  [`${DEMO_ROOT}/Dockerfile`, `FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
`],
  [`${DEMO_ROOT}/docker-compose.yml`, `version: "3.9"

services:
  web:
    build: .
    ports:
      - "8080:80"
    environment:
      - NODE_ENV=production

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: secret
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
`],
  [`${DEMO_ROOT}/.github/workflows/ci.yml`, `name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - run: npm test
`],
  [`${DEMO_ROOT}/docs/architecture.md`, `# Архитектура

## Слои приложения

1. **UI слой** — React-компоненты, состояния, анимации.
2. **Сервисный слой** — работа с файлами, поиск, настройки.
3. **Транспорт** — Tauri IPC (Rust) или виртуальная ФС в браузере.

\`\`\`text
┌─────────────────────┐
│  React UI           │
│  Monaco Editor      │
├─────────────────────┤
│  FileSystem bridge  │
├──────────┬──────────┤
│ Tauri    │ Virtual  │
│ (Rust)   │ (demo)   │
└──────────┴──────────┘
\`\`\`

## Ключевые решения

- Monaco — тот же редактор, что в VS Code
- Собственные команды Tauri для работы с файлами
- Эмиттер событий для курсора — без лишних ре-рендеров
`],
  [`${DEMO_ROOT}/docs/api.md`, `# API

## GET /api/v1/health

\`\`\`json
{
  "status": "ok",
  "version": "1.0.0",
  "uptime": 3600
}
\`\`\`

## POST /api/v1/files

| Поле | Тип | Описание |
| --- | --- | --- |
| path | string | путь к файлу |
| content | string | содержимое |

Возвращает \`201 Created\` при успехе.
`],
  [`${DEMO_ROOT}/src/main.ts`, `// Точка входа — TypeScript
import { createServer } from './utils';

interface Config {
  port: number;
  host: string;
  cors: string[];
}

const config: Config = {
  port: 3000,
  host: '0.0.0.0',
  cors: ['http://localhost:1420'],
};

async function bootstrap(): Promise<void> {
  const server = createServer(config);
  server.listen(config.port, () => {
    console.log(\`Server running on \${config.host}:\${config.port}\`);
  });
}

bootstrap().catch((err: unknown) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
`],
  [`${DEMO_ROOT}/src/App.tsx`, `import { useState, useCallback } from 'react';
import { Header } from './components/Header';
import './styles.css';

interface Todo {
  id: number;
  title: string;
  done: boolean;
}

export function App(): JSX.Element {
  const [todos, setTodos] = useState<Todo[]>([]);

  const addTodo = useCallback((title: string) => {
    setTodos((prev) => [...prev, { id: Date.now(), title, done: false }]);
  }, []);

  const toggle = useCallback((id: number) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  }, []);

  return (
    <main className="app">
      <Header title="Comet Playground" />
      <button onClick={() => addTodo('Новая задача')}>Добавить</button>
      <ul>
        {todos.map((t) => (
          <li key={t.id} onClick={() => toggle(t.id)}>
            <input type="checkbox" checked={t.done} readOnly />
            {t.title}
          </li>
        ))}
      </ul>
    </main>
  );
}
`],
  [`${DEMO_ROOT}/src/styles.css`, `:root {
  --accent: #22d3ee;
  --radius: 8px;
}

.app {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px;
  font-family: system-ui, sans-serif;
}

button {
  background: var(--accent);
  border: none;
  border-radius: var(--radius);
  padding: 8px 16px;
  cursor: pointer;
  font-weight: 600;
}

li {
  padding: 6px 0;
  cursor: pointer;
}

li.done {
  text-decoration: line-through;
  opacity: 0.6;
}
`],
  [`${DEMO_ROOT}/src/utils.ts`, `export function createServer(config: { port: number; host: string }) {
  console.log('configured:', config.host, config.port);
  return {
    listen(port: number, cb: () => void) {
      cb();
      return this;
    },
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
`],
  [`${DEMO_ROOT}/lib/math.go`, `package math

import "errors"

// Fib возвращает n-е число Фибоначчи.
func Fib(n int) (int, error) {
	if n < 0 {
		return 0, errors.New("n must be non-negative")
	}
	if n < 2 {
		return n, nil
	}
	a, b := 0, 1
	for i := 2; i <= n; i++ {
		a, b = b, a+b
	}
	return b, nil
}

type Vec2 struct {
	X, Y float64
}

func (v Vec2) Dot(o Vec2) float64 {
	return v.X*o.X + v.Y*o.Y
}
`],
  [`${DEMO_ROOT}/lib/strings.rs`, `/// Строковые утилиты — Rust
pub fn camel_to_snake(input: &str) -> String {
    let mut out = String::with_capacity(input.len() + 4);
    for (i, ch) in input.chars().enumerate() {
        if ch.is_uppercase() {
            if i > 0 {
                out.push('_');
            }
            out.extend(ch.to_lowercase());
        } else {
            out.push(ch);
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn converts_camel_case() {
        assert_eq!(camel_to_snake("helloWorld"), "hello_world");
    }
}
`],
  [`${DEMO_ROOT}/lib/models.py`, `from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class User:
    """Модель пользователя."""

    id: int
    name: str
    email: str
    created_at: datetime = field(default_factory=datetime.utcnow)
    tags: list[str] = field(default_factory=list)

    @property
    def initials(self) -> str:
        parts = self.name.split()
        return "".join(p[0].upper() for p in parts[:2])

    def __post_init__(self) -> None:
        if "@" not in self.email:
            raise ValueError("invalid email")


def find_user(users: list[User], user_id: int) -> Optional[User]:
    return next((u for u in users if u.id == user_id), None)
`],
  [`${DEMO_ROOT}/scripts/build.sh`, `#!/usr/bin/env bash
# Сборка проекта
set -euo pipefail

echo "==> Installing dependencies..."
npm ci

echo "==> Building frontend..."
npm run build

echo "==> Done! Artifacts in ./dist"
ls -la dist
`],
  [`${DEMO_ROOT}/scripts/deploy.ps1`, `# PowerShell deployment script
$ErrorActionPreference = "Stop"

$env = "production"
$server = "deploy.example.com"

Write-Host "Deploying to $env on $server" -ForegroundColor Cyan

$artifact = "dist/app.zip"
if (-not (Test-Path $artifact)) {
    throw "Artifact not found: $artifact"
}

Write-Host "Uploading artifact..."
scp $artifact "$($env)@$($server):/srv/app/"

Write-Host "Restarting service..."
ssh "$($env)@$($server)" "sudo systemctl restart comet-app"

Write-Host "Deploy finished!" -ForegroundColor Green
`],
  [`${DEMO_ROOT}/scripts/migrate.sql`, `-- Миграция базы данных v3 → v4
BEGIN;

CREATE TABLE IF NOT EXISTS sessions (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);

ALTER TABLE users ADD COLUMN IF NOT EXISTS locale VARCHAR(8) DEFAULT 'en';

COMMIT;
`],
  [`${DEMO_ROOT}/samples/hello.c`, `#include <stdio.h>
#include <stdlib.h>

#define GREETING "Hello, C!"

typedef struct {
    char *name;
    int age;
} Person;

int main(void) {
    Person p = {.name = "Ada", .age = 36};
    printf("%s, %s (%d)\n", GREETING, p.name, p.age);

    int *nums = malloc(3 * sizeof(int));
    for (int i = 0; i < 3; i++) nums[i] = i * i;
    free(nums);

    return EXIT_SUCCESS;
}
`],
  [`${DEMO_ROOT}/samples/hello.cpp`, `#include <iostream>
#include <vector>
#include <string>

template <typename T>
T sum(const std::vector<T>& values) {
    T total{};
    for (const auto& v : values) total += v;
    return total;
}

int main() {
    std::vector<int> nums{1, 2, 3, 4, 5};
    std::cout << "Sum: " << sum(nums) << std::endl;
    return 0;
}
`],
  [`${DEMO_ROOT}/samples/hello.java`, `import java.util.List;
import java.util.stream.Collectors;

public class Hello {
    private final String name;

    public Hello(String name) {
        this.name = name;
    }

    public String greet() {
        return "Hello, " + name + "!";
    }

    public static void main(String[] args) {
        List<String> names = List.of("Java", "Kotlin", "Scala");
        String result = names.stream()
                .map(n -> new Hello(n).greet())
                .collect(Collectors.joining(" | "));
        System.out.println(result);
    }
}
`],
  [`${DEMO_ROOT}/samples/hello.rb`, `# Ruby
class Greeter
  attr_reader :name

  def initialize(name)
    @name = name
  end

  def greet(times = 1)
    Array.new(times) { "Hello, #{@name}!" }
  end
end

greeter = Greeter.new("Ruby")
greeter.greet(3).each { |msg| puts msg }

%w[ruby python rust].each do |lang|
  puts "→ #{lang}"
end
`],
  [`${DEMO_ROOT}/samples/hello.php`, `<?php

declare(strict_types=1);

namespace App;

final class Greeter
{
    public function __construct(private readonly string $name) {}

    public function greet(): string
    {
        return sprintf('Hello, %s!', $this->name);
    }

    public static function fromArray(array $data): self
    {
        return new self($data['name'] ?? 'world');
    }
}

$greeter = Greeter::fromArray(['name' => 'PHP']);
echo $greeter->greet(), PHP_EOL;
`],
  [`${DEMO_ROOT}/samples/hello.swift`, `import Foundation

struct Greeter {
    let name: String

    func greet() -> String {
        "Hello, \(name)!"
    }
}

let languages = ["Swift", "Rust", "Go"]
let messages = languages
    .map(Greeter.init)
    .map { $0.greet() }

messages.forEach { print($0) }

let result: Result<Int, Error> = .success(42)
switch result {
case .success(let value) where value > 40:
    print("big: \(value)")
default:
    break
}
`],
  [`${DEMO_ROOT}/samples/hello.kt`, `data class Greeter(val name: String) {
    fun greet(): String = "Hello, $name!"
}

suspend fun greetAll(names: List<String>): List<String> =
    names.map { Greeter(it).greet() }

fun main() {
    val names = listOf("Kotlin", "Java")
    println(greetAll(names).joinToString("\n"))
}
`],
  [`${DEMO_ROOT}/samples/hello.cs`, `using System;
using System.Linq;
using System.Collections.Generic;

namespace Demo
{
    public record Greeter(string Name)
    {
        public string Greet() => $"Hello, {Name}!";
    }

    public static class Program
    {
        public static void Main()
        {
            var names = new[] { "C#", "F#", "VB" };
            var greetings = names.Select(n => new Greeter(n).Greet());

            foreach (var g in greetings)
            {
                Console.WriteLine(g);
            }

            var dict = new Dictionary<string, int> { ["a"] = 1, ["b"] = 2 };
            Console.WriteLine(dict.Values.Sum());
        }
    }
}
`],
  [`${DEMO_ROOT}/samples/hello.scala`, `object Hello {
  sealed trait Lang
  case object Scala extends Lang
  case object Java extends Lang

  def greet(l: Lang): String = l match {
    case Scala => "Hello, Scala!"
    case Java  => "Hello, Java!"
  }

  def main(args: Array[String]): Unit = {
    val langs = List(Scala, Java)
    langs.foreach(l => println(greet(l)))

    val nums = (1 to 10).filter(_ % 2 == 0).map(_ * 2)
    println(nums.sum)
  }
}
`],
  [`${DEMO_ROOT}/samples/hello.dart`, `class Greeter {
  final String name;
  const Greeter(this.name);

  String greet() => 'Hello, $name!';
}

Future<void> main() async {
  final names = ['Dart', 'Flutter'];
  await Future.forEach(names, (n) async {
    print(Greeter(n).greet());
  });
}
`],
  [`${DEMO_ROOT}/samples/hello.lua`, `-- Lua
local Greeter = {}
Greeter.__index = Greeter

function Greeter.new(name)
  return setmetatable({ name = name }, Greeter)
end

function Greeter:greet()
  return string.format("Hello, %s!", self.name)
end

local langs = { "Lua", "LuaJIT" }
for _, lang in ipairs(langs) do
  print(Greeter.new(lang):greet())
end
`],
  [`${DEMO_ROOT}/samples/hello.r`, `# R
greeter <- function(name) {
  paste0("Hello, ", name, "!")
}

names <- c("R", "Julia", "Python")
sapply(names, greeter)

data <- data.frame(
  lang = names,
  year = c(1993, 2012, 1991)
)
summary(data)
`],
  [`${DEMO_ROOT}/samples/hello.pl`, `#!/usr/bin/perl
use strict;
use warnings;

package Greeter;
sub new { my ($class, $name) = @_; bless { name => $name }, $class }
sub greet { my $self = shift; "Hello, " . $self->{name} . "!" }

package main;
my @langs = qw(Perl Raku);
for my $lang (@langs) {
    print Greeter->new($lang)->greet(), "\n";
}
`],
  [`${DEMO_ROOT}/samples/hello.hs`, `-- Haskell
module Main where

greeter :: String -> String
greeter name = "Hello, " ++ name ++ "!"

main :: IO ()
main = do
  let langs = ["Haskell", "Agda"]
  mapM_ (putStrLn . greeter) langs

  let nums = take 10 [1 ..]
  print (sum nums)
`],
  [`${DEMO_ROOT}/samples/hello.ex`, `defmodule Greeter do
  def greet(name), do: "Hello, #{name}!"
end

langs = ["Elixir", "Erlang"]

Enum.each(langs, fn lang ->
  lang |> Greeter.greet() |> IO.puts()
end)

result =
  langs
  |> Enum.map(&String.length/1)
  |> Enum.sum()

IO.inspect(result, label: "total length")
`],
  [`${DEMO_ROOT}/samples/hello.erl`, `-module(hello).
-export([greet/1, main/0]).

greet(Name) ->
    lists:flatten(io_lib:format("Hello, ~s!", [Name])).

main() ->
    Langs = ["Erlang", "Elixir"],
    lists:foreach(fun(L) -> io:format("~s~n", [greet(L)]) end, Langs).
`],
  [`${DEMO_ROOT}/samples/hello.jl`, `# Julia
struct Greeter
    name::String
end

greet(g::Greeter) = "Hello, $(g.name)!"

langs = ["Julia", "Python"]
foreach(l -> println(greet(Greeter(l))), langs)

nums = [x^2 for x in 1:10 if iseven(x)]
println(sum(nums))
`],
  [`${DEMO_ROOT}/samples/hello.zig`, `const std = @import("std");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const alloc = gpa.allocator();

    const langs = [_][]const u8{ "Zig", "Rust" };
    for (langs) |lang| {
        const msg = try std.fmt.allocPrint(alloc, "Hello, {s}!", .{lang});
        defer alloc.free(msg);
        std.debug.print("{s}\n", .{msg});
    }
}
`],
  [`${DEMO_ROOT}/samples/hello.clj`, `(ns demo.hello)

(defn greet [name]
  (str "Hello, " name "!"))

(def langs ["Clojure" "ClojureScript"])

(doseq [lang langs]
  (println (greet lang)))

(->> (range 10)
     (filter even?)
     (map #(* % %))
     (reduce +)
     println)
`],
  [`${DEMO_ROOT}/samples/hello.fs`, `module Hello

type Greeter(name: string) =
    member _.Greet() = $"Hello, {name}!"

[<EntryPoint>]
let main _ =
    let langs = [ "F#"; "C#" ]
    langs |> List.iter (fun l -> Greeter(l).Greet() |> printfn "%s")
    0
`],
  [`${DEMO_ROOT}/samples/hello.ml`, `(* OCaml *)
type greeter = { name : string }

let greet g = Printf.sprintf "Hello, %s!" g.name

let () =
  let langs = [ { name = "OCaml" }; { name = "Reason" } ] in
  List.iter (fun g -> print_endline (greet g)) langs
`],
  [`${DEMO_ROOT}/samples/hello.vue`, `<script setup lang="ts">
import { ref, computed } from 'vue'

const name = ref('Vue')
const langs = ref(['Vue', 'Svelte', 'React'])
const greeting = computed(() => \`Hello, \${name.value}!\`)
</script>

<template>
  <section class="hello">
    <h1>{{ greeting }}</h1>
    <ul>
      <li v-for="lang in langs" :key="lang">{{ lang }}</li>
    </ul>
  </section>
</template>

<style scoped>
.hello {
  color: var(--accent);
  font-family: sans-serif;
}
</style>
`],
  [`${DEMO_ROOT}/samples/hello.svelte`, `<script lang="ts">
  export let name: string = 'Svelte';

  const langs: string[] = ['Svelte', 'SvelteKit'];
  $: greeting = \`Hello, \${name}!\`;
</script>

<main>
  <h1>{greeting}</h1>
  {#each langs as lang}
    <p>{lang}</p>
  {/each}
</main>

<style>
  main {
    text-align: center;
  }
</style>
`],
  [`${DEMO_ROOT}/samples/hello.js`, `// JavaScript
const greeter = (name) => \`Hello, \${name}!\`;

const langs = ['JavaScript', 'TypeScript'];
langs.forEach((lang) => console.log(greeter(lang)));

const nums = [1, 2, 3, 4, 5];
const doubled = nums.map((n) => n * 2).filter((n) => n > 4);
console.log(doubled);
`],
  [`${DEMO_ROOT}/samples/data.json`, `{
  "project": "comet-playground",
  "version": "1.0.0",
  "languages": [
    { "name": "Rust", "year": 2010, "paradigm": "multi" },
    { "name": "Python", "year": 1991, "paradigm": "multi" },
    { "name": "Go", "year": 2009, "paradigm": "compiled" }
  ],
  "features": {
    "syntaxHighlighting": true,
    "cometCursor": true,
    "themes": 2
  },
  "stats": { "files": 56, "languages": 50, "loc": 2400 }
}
`],
  [`${DEMO_ROOT}/samples/config.yaml`, `server:
  host: 0.0.0.0
  port: 3000
  workers: 4

database:
  url: postgres://localhost:5432/comet
  pool_size: 20
  ssl: true

features:
  - name: comet-cursor
    enabled: true
    intensity: 0.8
  - name: telemetry
    enabled: false

limits:
  max_upload_mb: 100
  rate_per_minute: 60
`],
  [`${DEMO_ROOT}/samples/config.toml`, `[server]
host = "0.0.0.0"
port = 3000

[database]
url = "postgres://localhost:5432/comet"
pool_size = 20

[logging]
level = "info"
format = "json"

[[plugins]]
name = "comet"
enabled = true
`],
  [`${DEMO_ROOT}/samples/notes.md`, `# Заметки по проекту

## Идеи

- [x] Анимированный курсор
- [x] Тёмная тема
- [ ] Плагины
- [ ] Терминал

## Ссылки

> «Пиши код так, как будто его будет сопровождать
> злой психопат, который знает, где ты живёшь»
> — классика программирования

\`\`\`python
print("code as poetry")
\`\`\`
`],
  [`${DEMO_ROOT}/samples/style.scss`, `$accent: #22d3ee;
$violet: #a78bfa;
$radius: 12px;

@mixin glow($color) {
  box-shadow: 0 0 12px rgba($color, 0.5);
}

.card {
  border-radius: $radius;
  padding: 16px;
  background: linear-gradient(135deg, $accent, $violet);
  @include glow($accent);

  &:hover {
    transform: translateY(-2px);
    transition: transform 0.2s ease;
  }

  .title {
    font-size: 1.25rem;
    font-weight: 700;
  }
}
`],
  [`${DEMO_ROOT}/samples/page.html`, `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <title>Comet Playground</title>
    <link rel="stylesheet" href="style.scss" />
  </head>
  <body>
    <header>
      <h1>Comet IDE</h1>
      <nav>
        <a href="#features">Возможности</a>
        <a href="#docs">Документация</a>
      </nav>
    </header>
    <main>
      <section id="features">
        <article class="card">
          <h2>90+ языков</h2>
          <p>Monaco — движок редактора VS Code.</p>
        </article>
      </section>
    </main>
    <script src="app.js" defer></script>
  </body>
</html>
`],
  [`${DEMO_ROOT}/samples/data.xml`, `<?xml version="1.0" encoding="UTF-8"?>
<project name="comet-playground" version="1.0.0">
  <description>Демо-проект Comet IDE</description>
  <dependencies>
    <dependency group="org.react" artifact="react" version="18.3.1"/>
    <dependency group="org.monaco" artifact="editor" version="0.52.0"/>
  </dependencies>
  <build>
    <plugins>
      <plugin id="comet-bundler"/>
    </plugins>
  </build>
</project>
`],
  [`${DEMO_ROOT}/samples/query.graphql`, `query GetProject($id: ID!) {
  project(id: $id) {
    id
    name
    languages {
      nodes {
        name
        year
        paradigm
      }
    }
    stats {
      files
      loc
    }
  }
}

mutation UpdateProject($id: ID!, $name: String!) {
  updateProject(id: $id, name: $name) {
    id
    name
  }
}
`],
  [`${DEMO_ROOT}/samples/schema.prisma`, `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  posts     Post[]
  createdAt DateTime @default(now())
}

model Post {
  id        Int     @id @default(autoincrement())
  title     String
  content   String?
  published Boolean @default(false)
  author    User    @relation(fields: [authorId], references: [id])
  authorId  Int
}
`],
  [`${DEMO_ROOT}/samples/counter.v`, `module counter #(
    parameter WIDTH = 8
) (
    input  wire             clk,
    input  wire             rst_n,
    output reg  [WIDTH-1:0] count
);

always @(posedge clk or negedge rst_n) begin
    if (!rst_n)
        count <= 0;
    else
        count <= count + 1;
end

endmodule
`],
  [`${DEMO_ROOT}/samples/counter.vhd`, `library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity counter is
    generic (WIDTH : positive := 8);
    port (
        clk   : in  std_logic;
        rst_n : in  std_logic;
        count : out std_logic_vector(WIDTH - 1 downto 0)
    );
end entity;

architecture rtl of counter is
    signal cnt : unsigned(WIDTH - 1 downto 0) := (others => '0');
begin
    process (clk, rst_n)
    begin
        if rst_n = '0' then
            cnt <= (others => '0');
        elsif rising_edge(clk) then
            cnt <= cnt + 1;
        end if;
    end process;
    count <= std_logic_vector(cnt);
end architecture;
`],
  [`${DEMO_ROOT}/samples/paper.tex`, `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[russian]{babel}
\\usepackage{amsmath}

\\title{Пример документа}
\\author{Comet IDE}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Формулы}

Уравнение Эйлера:
\\begin{equation}
    e^{i\\pi} + 1 = 0
\\end{equation}

\\begin{itemize}
    \\item Первый пункт
    \\item Второй пункт
\\end{itemize}

\\end{document}
`],
  [`${DEMO_ROOT}/samples/startup.s`, `# ARM64 startup (фрагмент)
.section .text.startup
.global _start

_start:
    # set up stack
    ldr     x0, =__stack_top
    mov     sp, x0

    # zero BSS
    ldr     x0, =__bss_start
    ldr     x1, =__bss_end
    sub     x1, x1, x0
    mov     x2, #0

.Lbss_loop:
    cbz     x1, .Lbss_done
    strb    w2, [x0], #1
    sub     x1, x1, #1
    b       .Lbss_loop

.Lbss_done:
    bl      kmain
    b       .
`],
];

// ─── Virtual file system ────────────────────────────────────────────────────

export class VirtualFS {
  private map = new Map<string, string>();

  constructor() {
    for (const [p, c] of F) this.map.set(p, c);
  }

  reset() {
    this.map.clear();
    for (const [p, c] of F) this.map.set(p, c);
  }

  getTree(): FsNode {
    return buildTreeFromPaths(this.map);
  }

  readFile(path: string): string {
    return this.map.get(path) ?? '';
  }

  writeFile(path: string, content: string) {
    this.map.set(path, content);
  }

  createFile(path: string, content = '') {
    this.map.set(path, content);
  }

  deletePath(path: string) {
    for (const k of [...this.map.keys()]) {
      if (k === path || k.startsWith(path + '/')) this.map.delete(k);
    }
  }

  rename(oldPath: string, newPath: string) {
    const entries = [...this.map.entries()].filter(
      ([k]) => k === oldPath || k.startsWith(oldPath + '/')
    );
    for (const [k, v] of entries) {
      this.map.delete(k);
      this.map.set(newPath + k.slice(oldPath.length), v);
    }
  }
}

function buildTreeFromPaths(map: Map<string, string>): FsNode {
  const root: FsNode = { name: DEMO_ROOT.slice(1), path: DEMO_ROOT, kind: 'dir', children: [] };
  const dirs = new Map<string, FsNode>([[DEMO_ROOT, root]]);

  const ensureDir = (path: string): FsNode => {
    const existing = dirs.get(path);
    if (existing) return existing;
    const parentPath = path.slice(0, path.lastIndexOf('/'));
    const parent = ensureDir(parentPath);
    const node: FsNode = { name: path.slice(path.lastIndexOf('/') + 1), path, kind: 'dir', children: [] };
    parent.children!.push(node);
    dirs.set(path, node);
    return node;
  };

  for (const [path, content] of map) {
    const parentPath = path.slice(0, path.lastIndexOf('/'));
    const parent = ensureDir(parentPath);
    parent.children!.push({
      name: path.slice(path.lastIndexOf('/') + 1),
      path,
      kind: 'file',
      size: content.length,
      content,
    });
  }

  sortTree(root);
  return root;
}

function sortTree(n: FsNode) {
  if (!n.children) return;
  n.children.sort((a, b) =>
    a.kind !== b.kind ? (a.kind === 'dir' ? -1 : 1) : a.name.localeCompare(b.name)
  );
  n.children.forEach(sortTree);
}

export const DEMO_FILES = F;
