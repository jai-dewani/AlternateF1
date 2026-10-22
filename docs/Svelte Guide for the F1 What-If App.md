# Svelte Guide for the F1 What-If App

A reading guide for Jai: what Svelte is, which of its features this project uses, where, why, and how each one works. Read this before opening the code. It assumes Svelte 5 (runes syntax) with Vite. If the code uses the older Svelte 4 style, the ideas are the same but the syntax differs, and section 7 lists the differences.

## 1. What Svelte Is, in One Page

Svelte is a UI framework where you write components in .svelte files, each with three optional parts: a script block for logic, markup for the HTML, and a style block for CSS scoped to that component. Unlike React or Angular, Svelte does its work at build time. It compiles your components into small, plain JavaScript that updates the DOM directly, with no virtual DOM and a tiny runtime.

For a C# and Angular developer, the closest mental model is a component with a template, where assigning to a variable automatically refreshes whatever depends on it. There is no change-detection setup, no observables, and no decorators.

## 2. Project Layout You Should Expect

- index.html: the single page Vite serves.
- src/main.js: mounts the root component into the page.
- src/App.svelte: the root component, holding the selected round and arranging everything else.
- src/lib/: components and helpers. Expect RaceNavigator, RaceResultTable, StandingsTable, PointsLineChart, BumpChart, LeadChangeBanner, BeneficiariesPanel, and SeasonScrubber.
- src/lib/engine.js: the scoring engine, plain JavaScript, no Svelte in it.
- src/lib/state.svelte.js: shared state, described in section 5.
- public/data/season.json: the generated data file.
- scripts/: the Node fetch-and-compute script used by the GitHub Action.
- .github/workflows/: the refresh workflow and the Pages deploy workflow.

## 3. Feature Reference

Each entry says what the feature is, where this project uses it, why, and how it works.

### 3.1 Components and the .svelte file

- What: a file with script, markup, and style sections.
- Where: every piece of the UI is one component.
- Why: small, reusable pieces. The standings table and the result table can share one table component.
- How: the file name is the component name. You import it and use it as a tag, like RaceNavigator.

### 3.2 Reactive state with $state

- What: a rune that marks a variable as reactive. Assigning to it updates everything that reads it.
- Where: the selected round number, the current view mode (real, what-if, or both), the overlay toggle, and the loaded season data.
- Why: this is the heart of the app. One variable, the selected round, drives the arrows, the tables, the banner, and the chart marker.
- How: write let round = $state(1). Elsewhere, changing round to round + 1 re-renders every place that uses it. Objects and arrays declared with $state are deeply reactive, so changing a nested property also updates the UI.

### 3.3 Derived values with $derived

- What: a value computed from other reactive values, recomputed automatically when they change.
- Where: the selected round's data, the standings for that round, whether the lead changed, the leader's name, and the gap to the leader per driver.
- Why: keeps one source of truth. You store only the round number and derive everything else, so nothing can get out of sync.
- How: let current = $derived(season.rounds\[round - 1\]). When round changes, current is recomputed. Use $derived.by with a function for longer calculations.

### 3.4 Side effects with $effect

- What: code that runs after the DOM updates whenever the reactive values it reads change.
- Where: updating the chart when the selected round changes, and wiring up keyboard listeners.
- Why: charts built with D3 or Chart.js live outside Svelte, so they need a nudge when data changes.
- How: $effect(() => { chart.update(round) }). Svelte tracks which reactive values are read inside and reruns the effect when any change. Return a function from the effect to clean up. Use effects sparingly, since a $derived is usually the better tool.

### 3.5 Props with $props

- What: how a parent passes data into a child component.
- Where: the result table receives a list of rows, the line chart receives the series data and the selected round, and the banner receives the leader names.
- Why: keeps components simple and reusable. They render what they are given.
- How: in the child, write let { rows, highlight } = $props(). The parent passes them as attributes. Props flow downward. A child that needs to send something up uses a callback prop.

### 3.6 Template blocks: each, if, and await

- What: control flow inside the markup. The each block loops, the if block conditionally renders, and the await block shows loading, success, and error states for a promise.
- Where: each renders table rows and legend entries. If shows the lead-change banner, and the sprint tab only on sprint weekends. Await handles loading season.json.
- Why: declarative rendering, with no manual DOM building.
- How: each loops over a list and takes a key expression, such as the driver id, so Svelte can track rows when they reorder. That key matters here, because the standings reorder every round, and keyed each blocks let rows animate to their new positions.

### 3.7 Event handling

- What: attaching handlers to DOM events with attributes like onclick and onkeydown.
- Where: the left and right arrow buttons, clicking a round dot, clicking a point on the bump chart, and the play button.
- Why: this is how the user changes the selected round.
- How: onclick={() => round = Math.min(round + 1, lastRound)}. Svelte 5 uses plain attribute names, where Svelte 4 used the on: directive.

### 3.8 Bindings

- What: two-way links between a form element and a variable.
- Where: the season scrubber slider, the real-versus-what-if toggle, and the driver filter checkboxes.
- Why: less glue code. Moving the slider updates the variable, and the variable updates the slider.
- How: bind:value={round} on a range input. The checkbox equivalent is bind:checked.

### 3.9 Transitions and animations

- What: built-in helpers for animating elements as they enter, leave, or move.
- Where: the lead-change banner sliding in, fading between races, and standings rows moving to their new position.
- Why: the visual story of this project is rank changes, so motion helps.
- How: transition:fade or transition:slide on an element, and animate:flip on a keyed each block, which smoothly moves rows when the list order changes. Both come from the svelte/transition and svelte/animate modules.

### 3.10 Snippets and children

- What: reusable chunks of markup, and a way to pass markup into a component.
- Where: a generic table component might accept row markup from its parent.
- Why: avoids copying the same table structure for race results and standings.
- How: a snippet is declared with the snippet keyword and rendered with the render keyword. Svelte 4 used slots for this. Expect to see this only if the code builds a generic table.

### 3.11 Scoped styles

- What: CSS in a style block applies only to that component.
- Where: every component.
- Why: no class name collisions, and team colors can be applied through CSS variables.
- How: Svelte adds a unique class behind the scenes. For team colors, the code sets a style variable like --team on an element and uses it in CSS.

### 3.12 Plain JavaScript modules

- What: ordinary .js files imported into components.
- Where: the scoring engine and the data helpers.
- Why: the engine is pure logic with no UI. Keeping it Svelte-free means the Node script and the browser use the same file, and it can be unit tested on its own.
- How: a normal import statement. Nothing Svelte-specific happens.

### 3.13 Using D3 and Chart.js inside Svelte

- What: third-party chart libraries that draw into a canvas or SVG element.
- Where: the line chart and the bump chart.
- Why: they are mature, and rebuilding charts from scratch would be wasteful.
- How: bind the element with bind:this to get a reference, create the chart when the component mounts, and update it from an effect when the data or selected round changes. Destroy the chart in the effect's cleanup so nothing leaks. Alternatively, let Svelte render the SVG itself and use D3 only for scales and path math. That approach is often cleaner for a bump chart.

## 4. How the Data Flows

The browser loads season.json. App.svelte holds it in state along with the selected round. Derived values compute the current round's data, and child components receive those pieces as props and render them. User actions, like pressing an arrow, change the selected round in App.svelte, and everything downstream refreshes by itself.

## 5. Shared State

For an app this size, the simplest option is to keep state in App.svelte and pass props down. If prop passing gets awkward, there are two upgrades. One is a small shared module, named with the .svelte.js extension so runes work inside it, that exports a reactive state object any component can import. The other is Svelte's context API, for passing values to deep descendants. The shared module is the likely choice, since it has the least ceremony. Older Svelte code used stores, with the writable function and a dollar prefix to read them. You will not need those in Svelte 5 unless the code mixes styles.

## 6. Build and Deploy

- Vite builds the Svelte app into static files in a dist folder.
- A GitHub Actions workflow builds the project and publishes dist to GitHub Pages.
- Because the site is served from a sub-path, the Vite config sets the base option to the repository name. If assets fail to load after deploy, this is the first thing to check.
- A second scheduled workflow refreshes season.json after race weekends, commits the change, and triggers a redeploy.

## 7. Svelte 4 Versus Svelte 5, in Case You See Old Syntax

- Reactive variables: Svelte 4 used plain let, Svelte 5 uses $state.
- Derived values: Svelte 4 used a dollar-colon label, Svelte 5 uses $derived.
- Effects: Svelte 4 also used the dollar-colon label, Svelte 5 uses $effect.
- Props: Svelte 4 used export let, Svelte 5 uses $props.
- Events: Svelte 4 used on:click, Svelte 5 uses onclick.
- Slots versus snippets, as noted in section 3.10.

## 8. A Suggested Reading Order for the Code

1. engine.js, to see the pure logic first. It has no Svelte at all.
2. App.svelte, to see state, derived values, and layout.
3. RaceNavigator and the two tables, to see props, each blocks, and events.
4. The chart components, to see how external libraries are wired in.
5. The scripts folder and workflows, to see the fetch and refresh pipeline.

## 9. Where to Learn More

- The official Svelte tutorial at svelte.dev/tutorial covers every feature above, in small interactive steps.
- The Svelte docs section on runes explains $state, $derived, $effect, and $props in depth.
