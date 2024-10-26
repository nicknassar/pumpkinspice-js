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

## Software and Symmetry of Scale

It's easy for forget how small computers used to be.  The original
Apple II was sold with 4k RAM. It maxed out at 48k. A Commodore 64 had
64KB of RAM.  An IBM PC maxed out at 1MB of RAM, and only 640KB of
that was generally available for programs.  Today, a single browser
tab on a mobile device can use 10,000 times as much memory as a
Commodore 64 had available.

Programming is very different at that scale. The nature of resource
management changes.

When a system is that small, every byte of memory needs to be
accounted for.  A programmer can read the source code for the largest
program in one sitting.  She can hold every aspect of a program in her
head. Fancy algorithms are not necessary and often impossible to
implement because the size of data structures must be so small.
Features are limited by what can be held in memory.

In order to take full advantage of the hardwre, software was written
in assembly language or a high level language that could be converted
to efficient assembly-- C or Pascal.

BASIC allowed programmers to create software without such an intimate
knowledge of the machine.  It was wonderful-- It was horribly
constrained and an ugly mess.  A kid could write software herself.  It
still required all the storage to be allocated ahead of time with a
`DIM` command.  All data was global. There was no editor.  Each line
of code was given a number. Entering `10 PRINT "HELLO"` would replace
the code for line 10 with the code `PRINT "HELLO"`.

QBASIC for MS-DOS could be a bit larger and allowed for functions
rather than line numbers. Pumpkin Spice could be considered a
descendant of these later versions of BASIC.

This approach doesn't scale.  Software sucked in the late 90s and
early 2000s. It was typical for Windows 95 to crash with a "Blue
Screen of Death" once a day. Computers had 10s of megabytes of
memory. It wasn't realistic to manually curate memory layout. We
didn't know how to manage data structures that large efficiently.  It
became necessary to allocate and free objects from memory during the
course of execution.  Smaller software could rely on "garbage
collection" to automatically free unused memory, but to push the
limits of what was possible, memory had to be managed manually.  Any
mistakes in memory management would cause the program and often the
system to crash either because it ran out of memory or because memory
was used when it shouldn't have been.  The performance of allocating
are freeing memory `malloc()` and `free()` became critical to the
performance of software. I would argue [Doug Lea's malloc
implementation](https://gee.cs.oswego.edu/dl/html/malloc.html) saved
computing.

It was maybe worse than it had to be.  A snake oil methodology called
"Object Oriented Programming" took hold, personified by C++, and added
to the mess. It is centered around a modernist hierarchy of data
types. The idea is that data structures are defined in terms of
simpler data structures ("objects") with a subset of the larger
structure's implementation and interface.  Similar to the the failure
of a strict hierarchy of species in biology after the discovery of
DNA, it has become discredited.  It turns out software data types
rarely share both an interface and implementation.

We never solved that problem. Computers became larger, so we just use
garbage collected languages for most things.  Now software that would
have been written in C or C++ (or more likely C/C++) is written in
JavaScript.  Systems software is still plagued by memory management
problems.  Bugs in memory management can be used by malicious actors
to execute arbitrary code. Writing small, fast, safe software is still
very expensive.  Rust has emerged as an alternative to C, C++,
C/C++. It restricts operations to what can be validated at compile
time with a "borrow checker," allowing programmers to pay the cost of
safety up front. It gives new options for managing tradeoffs. There is
[no silver bullet](https://en.wikipedia.org/wiki/Fred_Brooks).

This project is about remembering the old way of doing things, how far
we have come, yet how
[incompetent](https://www.cve.org/About/Metrics#PublishedCVERecords)
we still are.

## Version 0.0

The initial version of Pumpkin Spice is a bit bespoke. I created
functions specifically for [Austin Seraphin's
"Barneysplat!"](https://breakintochat.com/blog/2013/05/08/austin-seraphin-creator-of-barneysplat/)
a text based game for MS-DOS bulliten board systems that I enjoyed
many years ago.  `MENU` and `ASK` are very much tied to that style of
interaction.  Maintaining accessibility and usability while making
input functionality more open ended but not overly verbose will
require some design work.

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
