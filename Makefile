SHELL = /bin/sh
.SUFFIXES:
.SUFFIXES: .pumpkinspice .html .debug.html .java .class .jar .template .js
BUILD_VERSION := 0.0.0
BUILD_DIR := build
SRC_DIR := src
BUILD_SOURCE_DIR := $(SRC_DIR)/build/java
BUILD_OUTPUT_DIR := $(BUILD_DIR)/classes
BUILD_TOOLS_DIR := $(BUILD_DIR)/tools
RESOURCE_DIR := $(SRC_SIR)/resources
BUILD_RESOURCE_DIR := $(BUILD_DIR)/resources
CLOSURE_COMPILER_JAR := $(wildcard lib/closure-compiler-v[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9].jar)
OUTPUT_JAR := pumpkinspice2html-v$(BUILD_VERSION).jar
JFLAGS := -sourcepath $(BUILD_SOURCE_DIR) -d $(BUILD_OUTPUT_DIR)
TOOLS_JFLAGS := -sourcepath $(BUILD_SOURCE_DIR) -d $(BUILD_TOOLS_DIR)
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
JAVA_BUILD_CLASSES := $(BUILD_OUTPUT_DIR)/com/nicknassar/pumpkinspice/Builder.class
JAVA_TOOLS_CLASSES := $(BUILD_TOOLS_DIR)/com/nicknassar/pumpkinspice/TemplateFiller.class

OPTIMIZED_RESOURCES := $(BUILD_RESOURCE_DIR)/pumpkinspice.optimized.js $(BUILD_RESOURCE_DIR)/index.html.template
DEBUG_RESOURCES := $(BUILD_RESOURCE_DIR)/pumpkinspice.js $(BUILD_RESOURCE_DIR)/index.html.template

JAVASCRIPT_SOURCES := $(SRC_DIR)/main/javascript/pumpkinspice.js.template $(SRC_DIR)/main/javascript/initialize.js $(SRC_DIR)/main/javascript/audio.js $(SRC_DIR)/main/javascript/logger.js $(SRC_DIR)/main/javascript/display.js  $(SRC_DIR)/main/javascript/machine.js  $(SRC_DIR)/main/javascript/legacy.js $(SRC_DIR)/main/javascript/codegen.js.template $(SRC_DIR)/main/javascript/code_generator_pass.js.template $(SRC_DIR)/main/javascript/type_generator_pass.js.template $(SRC_DIR)/main/javascript/code_generator_expression_handler.js $(SRC_DIR)/main/javascript/type_generator_expression_handler.js $(SRC_DIR)/main/javascript/compiler.js $(SRC_DIR)/main/javascript/type_manager.js

.PHONY: all
all: test.html test.debug.html $(OUTPUT_JAR)

.PHONY: clean
clean:
	-rm -rf build
	-rm test.html test.debug.html $(OUTPUT_JAR)

$(BUILD_OUTPUT_DIR):
	-$(MKDIR) -p $@
$(BUILD_TOOLS_DIR):
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

$(BUILD_OUTPUT_DIR)/com/nicknassar/pumpkinspice/Builder.class: $(BUILD_SOURCE_DIR)/com/nicknassar/pumpkinspice/Builder.java | $(BUILD_OUTPUT_DIR)
	$(JAVAC) $(JFLAGS) $<
$(BUILD_TOOLS_DIR)/com/nicknassar/pumpkinspice/TemplateFiller.class: $(BUILD_SOURCE_DIR)/com/nicknassar/pumpkinspice/TemplateFiller.java | $(BUILD_TOOLS_DIR)
	$(JAVAC) $(TOOLS_JFLAGS) $<

$(BUILD_RESOURCE_DIR)/pumpkinspice.js: $(JAVASCRIPT_SOURCES) $(JAVA_TOOLS_CLASSES) | $(BUILD_RESOURCE_DIR)
	$(JAVA) -classpath "$(BUILD_TOOLS_DIR)" com.nicknassar.pumpkinspice.TemplateFiller $< $@

$(BUILD_RESOURCE_DIR)/pumpkinspice.optimized.js: $(BUILD_RESOURCE_DIR)/pumpkinspice.js | $(BUILD_RESOURCE_DIR) closure_compiler
	$(JAVA) -jar $(CLOSURE_COMPILER_JAR) --compilation_level ADVANCED_OPTIMIZATIONS --js $< --js_output_file $@

$(BUILD_RESOURCE_DIR)/index.html.template: $(SRC_DIR)/resources/index.html.template | $(BUILD_RESOURCE_DIR)
	cp $< $@

%.html: %.pumpkinspice $(JAVA_BUILD_CLASSES) $(OPTIMIZED_RESOURCES)
	$(JAVA) -classpath "$(BUILD_RESOURCE_DIR)$(PATH_SEPARATOR)$(BUILD_OUTPUT_DIR)" com.nicknassar.pumpkinspice.Builder $<

%.debug.html: %.pumpkinspice $(JAVA_BUILD_CLASSES) $(DEBUG_RESOURCES)
	$(JAVA) -classpath "$(BUILD_RESOURCE_DIR)$(PATH_SEPARATOR)$(BUILD_OUTPUT_DIR)" com.nicknassar.pumpkinspice.Builder --debug $<

$(OUTPUT_JAR): $(JAVA_CLASSES) $(DEBUG_RESOURCES) $(OPTIMIZED_RESOURCES)
	$(JAR) cfe $@ com.nicknassar.pumpkinspice.Builder -C $(BUILD_OUTPUT_DIR) . -C $(BUILD_RESOURCE_DIR) .
