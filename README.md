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

## Getting Started

The JavaScript implementation of Pumpkin Spice is entirely client
side.  It expects Pumpkin Spice code to be embedded in an HTML page
with a `<script type="text/pumpkinspice">` tag. It compiles and runs
that code on the fly. The only tools required for development are a
web browser and a text editor.  The simplest way to get started is to
load an existing Pumpkin Spice .html file into a text editor, and
alter the Pumpkin Spice code within the `<script>` tag.

This package provides a tool called `pumpkinspice2html` that inserts a
file with Pumpkin Spice code into a .html template for running the
code.

You can build a single page app containing all of the necessary HTML
and JavaScript by running the following. It is a launcher for a Java
jar file, so the `JAVA_HOME` environment variable must be set or the
`java` binary must be in your `PATH` for it to function.

```bash
pumpkinspice2html [--debug] [--title "Page Title"] filename.pumpkinspice [<filename.html>]
```

By default, this will run the JavaScript code through an optimizer.
Passing in the `--debug` option will include the JavaScript directly.

The `pumpkinspice2html` "binary" is a hack that combines the platform
specific launcher and the jar file into a single file. It takes
advantage of the fact that .jar files have thier index at the end,
while shell scripts and batch files start at the beginning.  There's a
UNIX shell version of the launcher without an extension, as well as a
Windows `.bat` version of the launcher.

## Building

It's only necessary to build the code if you're interested in
modifying the compiler or the language runtime.  There are three
prerequisites for building `pumpkinspice2html` from scratch:

* GNU Make
* Java Development Kit for Java 8 or later
* The Google Closure Compiler

Install Make and the JDK in the usual way for your system: XCode
and/or homebrew on macOS, `apt-get` on Debian/Ubuntu Linuxes, `yum` on
RedHat/CentOS Linuxes.  Windows has been tested with Make from
mingw/msys.

You can download a .zip of the Closure Compiler here:
https://developers.google.com/closure/compiler/docs/gettingstarted_app

Put the jar file for the Closure Compiler in `lib`, then run `make` or
`gmake` to build pumpkinspice2html.

The `Makefile` knows how to build html from a .pumpkinspice file, so
if you put `foo.pumpkinspice` in this folder, you can run `make
foo.html` or `make foo.debug.html` to generate a web page based on
that code.
