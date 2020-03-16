SHELL = /bin/sh
.SUFFIXES:
.SUFFIXES: .pumpkinspice .html .debug.html .java .class .jar .template .js
BUILD_VERSION := 0.0.0
BUILD_DIR := build
SRC_DIR := src
BUILD_SOURCE_DIR := $(SRC_DIR)/build/java
BUILD_OUTPUT_DIR := $(BUILD_DIR)/classes
RESOURCE_DIR := $(SRC_SIR)/resources
BUILD_RESOURCE_DIR := $(BUILD_DIR)/resources
CLOSURE_COMPILER_JAR := $(wildcard lib/closure-compiler-v[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9].jar)
OUTPUT_JAR := pumpkinspice2html-v$(BUILD_VERSION).jar
JFLAGS := -sourcepath $(BUILD_SOURCE_DIR) -d $(BUILD_OUTPUT_DIR)
JAVAC := javac
JAVA := java
JAR := jar
MKDIR := mkdir
ifeq ($(OS),Windows_NT)
  PATH_SEPARATOR := ;
else
  PATH_SEPARATOR := :
endif
vpath %.html.template $(RESOURCE_DIR)
vpath %.java $(BUILD_SOURCE_DIR)
vpath %.class $(BUILD_OUTPUT_DIR)
JAVA_CLASSES := com/nicknassar/pumpkinspice/Builder.class

OPTIMIZED_RESOURCES := $(BUILD_RESOURCE_DIR)/compiler.optimized.js $(BUILD_RESOURCE_DIR)/index.html.template
DEBUG_RESOURCES := $(BUILD_RESOURCE_DIR)/compiler.js $(BUILD_RESOURCE_DIR)/index.html.template

.PHONY: all
all: test.html test.debug.html $(OUTPUT_JAR)

.PHONY: clean
clean:
	-rm -rf build
	-rm test.html test.debug.html $(OUTPUT_JAR)

$(BUILD_OUTPUT_DIR):
	-$(MKDIR) -p $@
$(BUILD_RESOURCE_DIR):
	-$(MKDIR) -p $@

.PHONY: closure_compiler
ifeq ($(CLOSURE_COMPILER_JAR),)
closure_compiler:
	@echo "Unable to find the Closure Compiler JavaScript optimizer."
	@echo
	@echo "Please, download the Closure Compiler .jar file from"
	@echo "https://developers.google.com/closure/compiler/"
	@echo "and copy closure-compiler-vYYYYMMDD.jar to lib/"
	@echo
	exit 1
else
closure_compiler: $(CLOSURE_COMPILER_JAR)
endif

%.class: %.java | $(BUILD_OUTPUT_DIR)
	$(JAVAC) $(JFLAGS) $<

$(BUILD_RESOURCE_DIR)/compiler.js: $(SRC_DIR)/main/javascript/compiler.js | $(BUILD_RESOURCE_DIR)
	cp $< $@

$(BUILD_RESOURCE_DIR)/compiler.optimized.js: $(SRC_DIR)/main/javascript/compiler.js | $(BUILD_RESOURCE_DIR) closure_compiler
	$(JAVA) -jar $(CLOSURE_COMPILER_JAR) --compilation_level ADVANCED_OPTIMIZATIONS --js $< --js_output_file $@

$(BUILD_RESOURCE_DIR)/index.html.template: $(SRC_DIR)/resources/index.html.template | $(BUILD_RESOURCE_DIR)
	cp $< $@

%.html: %.pumpkinspice $(JAVA_CLASSES) $(OPTIMIZED_RESOURCES)
	$(JAVA) -classpath "$(BUILD_RESOURCE_DIR)$(PATH_SEPARATOR)$(BUILD_OUTPUT_DIR)" com.nicknassar.pumpkinspice.Builder $<

%.debug.html: %.pumpkinspice $(JAVA_CLASSES) $(DEBUG_RESOURCES)
	$(JAVA) -classpath "$(BUILD_RESOURCE_DIR)$(PATH_SEPARATOR)$(BUILD_OUTPUT_DIR)" com.nicknassar.pumpkinspice.Builder --debug $<

$(OUTPUT_JAR): $(JAVA_CLASSES) $(DEBUG_RESOURCES) $(OPTIMIZED_RESOURCES)
	$(JAR) cfe $@ com.nicknassar.pumpkinspice.Builder -C $(BUILD_OUTPUT_DIR) . -C $(BUILD_RESOURCE_DIR) .