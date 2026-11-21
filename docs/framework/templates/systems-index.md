# Systems Index: [Game Title]

> **Status**: [Draft / Under Review / Approved]
> **Created**: [Date]
> **Last Updated**: [Date]
> **Source Concept**: design/gdd/game-concept.md

## System Enumeration

| ID | System | Category | Player does by hand | Ten-minute check | MVP? | Dependencies | Owner |
|---|---|---|---|---|---|---|---|
| [SYS-01] | [System name] | [Category] | [The action the player takes, not what the system tracks] | [Action → expected result] | [Yes / No] | [System IDs or None] | [Role / person] |

## Backlog

Named, not promised. Each line says what it would add, so cutting it later is a
decision rather than an accident.

| System | What it would add | Revisit when |
|---|---|---|
| [System name] | [One line] | [After X plays or Y milestone] |

## Cut

- [System] — [why the game does not need it]

## Dependency Map

### Foundation

- [System — no dependencies]

### Core

- [System] → depends on [Foundation system(s)]

### Feature

- [System] → depends on [Core system(s)]

### Presentation

- [UI/feedback system] → depends on [Gameplay system(s)]

### Polish

- [Meta/tutorial/analytics/accessibility system] → depends on [System(s)]

### Cycles and Bottlenecks

- [Circular dependency and proposed resolution, or None identified]
- [Bottleneck system(s) with many dependents]

## Recommended Design Order

1. [MVP Foundation system]
2. [MVP Core system]
3. [MVP Feature system]
4. [Vertical Slice Foundation/Core system]
5. [Remaining systems in dependency and priority order]

## High-Risk Systems

| System | Risk / reason | Mitigation or validation |
|---|---|---|
| [System name] | [Technical, design, or scope risk] | [Mitigation / validation approach] |

## Progress Tracker

| ID | System | Priority tier | GDD status | GDD path |
|---|---|---|---|---|
| [SYS-01] | [System name] | [MVP / Vertical Slice / Alpha / Full Vision] | [Not Started / In Design / Complete] | [design/gdd/system-name.md] |
