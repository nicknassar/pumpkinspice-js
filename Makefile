SHELL = /bin/sh
.SUFFIXES:
.SUFFIXES: .pumpkinspice .html .debug.html .java .class .js .optimized.js .js.template .html.template
BUILD_VERSION := 0.0.0
BUILD_DIR := build
SRC_DIR := src
DIST_DIR := dist

PUMPKINSPICE2HTML_SOURCE_DIR := $(SRC_DIR)/pumpkinspice2html/java
PUMPKINSPICE2HTML_BUILD_DIR := $(BUILD_DIR)/pumpkinspice2html/classes

TOOLS_SOURCE_DIR := $(SRC_DIR)/tools/java
TOOLS_BUILD_DIR := $(BUILD_DIR)/tools/classes

JAVASCRIPT_SOURCE_DIR := $(SRC_DIR)/main/javascript
RESOURCE_DIR := $(SRC_DIR)/main/resources
BUILD_RESOURCE_DIR := $(BUILD_DIR)/resources

CLOSURE_COMPILER_JAR := $(wildcard lib/closure-compiler-v[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9].jar)
OUTPUT_JAR := $(DIST_DIR)/pumpkinspice2html-v$(BUILD_VERSION).jar

JAVAC := javac
JAVA := java
JAR := jar
MKDIR := mkdir

ifeq ($(OS),Windows_NT)
  PATH_SEPARATOR := ;
else
  PATH_SEPARATOR := :
endif

vpath %.js.template $(JAVASCRIPT_SOURCE_DIR)
vpath %.js $(JAVASCRIPT_SOURCE_DIR) $(BUILD_RESOURCE_DIR)
vpath %.optimized.js $(BUILD_RESOURCE_DIR)
vpath %.html.template $(BUILD_RESOURCE_DIR)
vpath %.java $(TOOLS_SOURCE_DIR) $(PUMPKINSPICE2HTML_SOURCE_DIR)
vpath %.class $(PUMPKINSPICE2HTML_BUILD_DIR) $(TOOLS_BUILD_DIR)

JAVA_BUILD_CLASSES := com/nicknassar/pumpkinspice/Builder.class
JAVA_TOOLS_CLASSES := com/nicknassar/pumpkinspice/TemplateFiller.class

OPTIMIZED_RESOURCES := pumpkinspice.optimized.js index.html.template
DEBUG_RESOURCES := pumpkinspice.js index.html.template

JAVASCRIPT_SOURCES := pumpkinspice.js.template initialize.js audio.js logger.js display.js  machine.js  legacy.js code_generator_pass.js type_generator_pass.js compiler.js type_manager.js

.PHONY: all
all: test.html test.debug.html $(OUTPUT_JAR)

.PHONY: clean
clean:
	-rm -rf $(BUILD_DIR)
	-rm -rf $(DIST_DIR)
	-rm test.html test.debug.html $(OUTPUT_JAR)

$(PUMPKINSPICE2HTML_BUILD_DIR):
	-$(MKDIR) -p $@
$(TOOLS_BUILD_DIR):
	-$(MKDIR) -p $@
$(BUILD_RESOURCE_DIR):
	-$(MKDIR) -p $@
$(DIST_DIR):
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

com/nicknassar/pumpkinspice/Builder.class: com/nicknassar/pumpkinspice/Builder.java | $(PUMPKINSPICE2HTML_BUILD_DIR)
	$(JAVAC) -d $(PUMPKINSPICE2HTML_BUILD_DIR) $<
com/nicknassar/pumpkinspice/TemplateFiller.class: com/nicknassar/pumpkinspice/TemplateFiller.java | $(TOOLS_BUILD_DIR)
	$(JAVAC) -d $(TOOLS_BUILD_DIR) $<

pumpkinspice.js: $(JAVASCRIPT_SOURCES) $(JAVA_TOOLS_CLASSES) | $(BUILD_RESOURCE_DIR)
	$(JAVA) -classpath "$(TOOLS_BUILD_DIR)" com.nicknassar.pumpkinspice.TemplateFiller $< "$(BUILD_RESOURCE_DIR)/$@"

pumpkinspice.optimized.js: pumpkinspice.js | $(BUILD_RESOURCE_DIR) closure_compiler
	$(JAVA) -jar $(CLOSURE_COMPILER_JAR) --compilation_level ADVANCED_OPTIMIZATIONS --js "$(BUILD_RESOURCE_DIR)/$<" --js_output_file "$(BUILD_RESOURCE_DIR)/$@"

%.html.template: $(RESOURCE_DIR)/%.html.template | $(BUILD_RESOURCE_DIR)
	cp $< "$(BUILD_RESOURCE_DIR)/$@"

%.html: %.pumpkinspice $(JAVA_BUILD_CLASSES) $(OPTIMIZED_RESOURCES)
	$(JAVA) -classpath "$(BUILD_RESOURCE_DIR)$(PATH_SEPARATOR)$(PUMPKINSPICE2HTML_BUILD_DIR)" com.nicknassar.pumpkinspice.Builder $<

%.debug.html: %.pumpkinspice $(JAVA_BUILD_CLASSES) $(DEBUG_RESOURCES)
	$(JAVA) -classpath "$(BUILD_RESOURCE_DIR)$(PATH_SEPARATOR)$(PUMPKINSPICE2HTML_BUILD_DIR)" com.nicknassar.pumpkinspice.Builder --debug $<

$(OUTPUT_JAR): $(JAVA_CLASSES) $(DEBUG_RESOURCES) $(OPTIMIZED_RESOURCES) | $(DIST_DIR)
	$(JAR) cfe $@ com.nicknassar.pumpkinspice.Builder -C $(PUMPKINSPICE2HTML_BUILD_DIR) . -C $(BUILD_RESOURCE_DIR) .
