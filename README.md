# Pumpkin Spice

Pumpkin Spice is a simplistic language for interactive text
applications. It is designed to enable entertaining applications which
are small, fast, and safe.

Pumpkin Spice is a love letter to old school computing, to a time when
computing was young and memory was scarce.

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

Look through the examples folder to get started.

This package provides a tool called `pumpkinspice2html` that builds a
single page app containing all of the necessary HTML and
JavaScript. It is a launcher for a Java jar file, so the `JAVA_HOME`
environment variable must be set or the `java` binary must be in your
`PATH` for it to function.

On Linux or Mac, you can run it something like this

```
$ tar xfz pumpkinspice-js-v0.0.1.tar.gz
$ cd pumpkinspice-js-v0.0.1
$ ./pumpkinspice2html MyProgram.pumpkinspice
```

For Windows users, there's a batch file
```
C:\Users\username>cd pumpkinspice-js-v0.0.1
C:\Users\username\pumpkinspice-js-v0.0.1>pumpkinspice2html MyProgram.pumpkinspice
```

By default, this will run the JavaScript code through an optimizer.
Passing in the `--debug` option will include the JavaScript directly.

The `pumpkinspice2html` "binary" is a hack that combines the platform
specific launcher and the jar file into a single file. It takes
advantage of the fact that .jar files have thier index at the end,
while shell scripts and batch files start at the beginning.  The
Windows `.bat` version of the launcher is the same.

## Building

It's only necessary to build the code if you're interested in
modifying the compiler or the language runtime.  There are three
prerequisites for building `pumpkinspice2html` from scratch:

* GNU Make
* Java Development Kit for Java 8 or later
* The Google Closure Compiler

Get the latest source code from
https://github.com/nicknassar/pumpkinspice-js

Install Make and the JDK in the usual way for your system: XCode
and/or homebrew on macOS, `apt-get` on Debian/Ubuntu Linuxes, `yum` on
RedHat/CentOS Linuxes.  Windows has been tested with Make from
mingw/msys.

You can download a .zip of the Closure Compiler here:
https://developers.google.com/closure/compiler/docs/gettingstarted_app

Put the jar file for the Closure Compiler in `lib`, then run `make` to
build pumpkinspice2html.
