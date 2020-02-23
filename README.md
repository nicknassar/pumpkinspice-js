# Pumpkin Spice

Pumpkin Spice is a simplistic language for interactive text
applications. It is designed to enable entertaining applications which
are small, fast, and safe.

Pumpkin Spice is a love letter to old school computing, to a time when
computing was young and memory was scarce. It celebrates the miracle
that there can be a high level language on systems with as little as
4k RAM.

Pumpkin Spice is designed to be very usable by people who are not
professional computer programmers. It should require skills similar to
writing HTML in the 90s or BASIC in the 80s. It should be possible to
create programs that are so simple anyone can modify them. (101 BASIC
Games or the programs in 3-2-1 Contact magazine)

## Building

The JavaScript implementation of Pumpkin Spice is entirely client side.
It expects Pumpkin Spice code to be embedded in an HTML page with a
`<script type="text/pumpkinspice">` tag. To build those pages,
this package provides a tool called `pumpkinspice2html`.

The `pumpkinspice2html` tool is written in Java.
One of the design goals of the JavaScript implementation is to be as
small as possible.  The best JavaScript minimizer available as of the
time of this writing appears to be the Google Closure Compiler,
which is written in Java, so we have Java. You need to download
that to get started.
https://developers.google.com/closure/compiler/docs/gettingstarted_app

There's a GNU Makefile for building the tool. Put the jar file for the
Closure Compiler in `lib`, then run `make` or `gmake` to build.

## Usage

You can build a single page app containing all of the necessary HTML
and JavaScript by running.

```bash
pumpkinspice2html [--debug] [--title "Page Title"] filename.pumpkinspice [<filename.html>]
```

By default, this will run the JavaScript code through an optimizer.
Passing in the `--debug` option will include the JavaScript directly.

The Makefile knows how to build html, so if you put `foo.pumpkinspice`
in this folder, you can run `make foo.html` or `make foo.debug.html`
to generate a web page based on that code.

## Language

Include more examples

### Philosophy

1. Pumpkin Spice should be designed in such a way that its programs will run just about anywhere on just about any hardware. Memory usage should be the only limiting factor.
2. Pumpkin Spice programs should be safe. You should never have to worry about malware when opening a pumpkin spice file
3. Pumpkin Spice code should be accessible to people who are not professional computer programmers. It’s meant for interactive text applications. It is not about data structures and algorithms.

### JavaScript Implementation

* It should run *everywhere*. It should run on any browser, mobile or desktop.
* It should be small and self-contained. It shouldn't pull in lots of JavaScript libraries or call external APIs.
* It should be compatible with screen readers.

### Specifics
* Pumpkin Spice uses implicit static typing. If you assign a number to a variable, the compiler should prevent you from using it as text somewhere else in the program.
* The language does not require garbage collection or even dynamic memory allocation. We can know the maximum size of a program at compile time. It should not be possible to write a program with a bug that eats all the system memory.
* There is as little error handling as possible.  The built-in APIs shouldn’t require the user to handle error cases
* There is no direct access to operating system APIs, especially the filesystem. There is no direct access to web APIs. It should always be safe to open a pumpkin spice file. 
* It should not require features that are not available in both a text terminal and web browser. It should be possible for a program to work anywhere text can be input and output. Color text and single voice audio should be supported where available.
* It should be as accessible as possible on every platform. Text is accessible to the visually impaired, and it's only natural for text based systems to embrace that

### Type System
* There is no NULL/nil/None type. Variables are always there
* There are three core types: numbers, text, and tables.
* Numbers are IEEE doubles where available, but may be less accurate floating point types on some systems. Code shouldn't depend on any particular precision.
* Text is Unicode where available. Source files are encoded as utf-8, but programs may be compiled for systems that do not provide unicode. The system character encoding should be used where unicode is not available and a best effort should be made to convert to and from unicode. Text variables have a maximum size of 255 code points. (Single unicode characters can consist of multiple code points)
* Tables are still a work in progress. The idea is to cover most of the use cases
* Tables are lists of rows containing text and numbers. They cannot contain other types.
* Tables have a fixed size.
* Tables may contain either numbers or text
* References to values outside of the table bounds are impossible

### Terminal support
* Text with ANSI 16 color foreground/8 color background
* Line input and single key input in unicode

### Audio Support
* Output single voice music in the ABC standard