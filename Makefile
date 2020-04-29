SHELL = /bin/sh
.SUFFIXES:
.SUFFIXES: .pumpkinspice .html .debug.html .java .class .js .optimized.js .js.template .html.template
BUILD_VERSION := 0.0.0
BUILD_DIR := build
SRC_DIR := src
DIST_DIR := dist

PUMPKINSPICE2HTML_SOURCE_DIR := $(SRC_DIR)/pumpkinspice2html/java
PUMPKINSPICE2HTML_RESOURCE_DIR := $(SRC_DIR)/pumpkinspice2html/resources
PUMPKINSPICE2HTML_BUILD_DIR := $(BUILD_DIR)/pumpkinspice2html/classes

TOOLS_SOURCE_DIR := $(SRC_DIR)/tools/java
TOOLS_BUILD_DIR := $(BUILD_DIR)/tools/classes

JAVASCRIPT_SOURCE_DIR := $(SRC_DIR)/main/javascript
RESOURCE_DIR := $(SRC_DIR)/main/resources
BUILD_RESOURCE_DIR := $(BUILD_DIR)/resources

TEST_SOURCE_DIR := $(SRC_DIR)/test/javascript
TEST_BUILD_DIR := $(BUILD_DIR)/test

CLOSURE_COMPILER_JAR := $(wildcard lib/closure-compiler-v[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9].jar)
OUTPUT_JAR := $(DIST_DIR)/pumpkinspice2html-v$(BUILD_VERSION).jar

ifdef JAVA_HOME
JAVAC := $(JAVA_HOME)/bin/javac
JAVA := $(JAVA_HOME)/bin/java
JAR := $(JAVA_HOME)/bin/jar
else
JAVAC := javac
JAVA := java
JAR := jar
endif
MKDIR := mkdir

ifeq ($(OS),Windows_NT)
  PATH_SEPARATOR := ;
else
  PATH_SEPARATOR := :
endif

vpath %.js.template $(JAVASCRIPT_SOURCE_DIR) $(TEST_SOURCE_DIR)
vpath %.js $(JAVASCRIPT_SOURCE_DIR) $(BUILD_RESOURCE_DIR)  $(TEST_SOURCE_DIR) $(TEST_BUILD_DIR)
vpath %.optimized.js $(BUILD_RESOURCE_DIR)
vpath %.html.template $(BUILD_RESOURCE_DIR)
vpath %.html $(DIST_DIR)
vpath %.java $(TOOLS_SOURCE_DIR) $(PUMPKINSPICE2HTML_SOURCE_DIR)
vpath %.class $(PUMPKINSPICE2HTML_BUILD_DIR) $(TOOLS_BUILD_DIR)

JAVA_BUILD_CLASSES := com/nicknassar/pumpkinspice/Builder.class
JAVA_TOOLS_CLASSES := com/nicknassar/pumpkinspice/TemplateFiller.class

OPTIMIZED_RESOURCES := pumpkinspice.optimized.js index.html.template
DEBUG_RESOURCES := pumpkinspice.js index.html.template
TEST_RESOURCES := run_tests.js index.html.template
TEST_OUTPUT := run-tests.html

JAVASCRIPT_SOURCES := pumpkinspice.js.template initialize.js audio.js logger.js display.js  machine.js  legacy.js global_utilities.js code_generator_pass.js type_generator_pass.js parser.js type_manager.js
TEST_SOURCES := run_tests.js.template initialize_tests.js base_tester.js matching_tester.js parser_tests.js.template type_manager_tests.js.template testing_compiler_pass.js testing_logger.js type_generator_pass_tests.js.template testing_type_manager.js simple_call_logger.js parser.js display.js legacy.js global_utilities.js parser.js type_manager.js type_generator_pass.js

.PHONY: all
all: test.html test.debug.html pumpkinspice2html

.PHONY: test
test: $(TEST_OUTPUT)

.PHONY: pumpkinspice2html
pumpkinspice2html: $(DIST_DIR)/pumpkinspice2html $(DIST_DIR)/pumpkinspice2html.bat

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
$(TEST_BUILD_DIR):
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

$(DIST_DIR)/pumpkinspice2html: $(PUMPKINSPICE2HTML_RESOURCE_DIR)/stub.sh $(OUTPUT_JAR)
	cat "$(PUMPKINSPICE2HTML_RESOURCE_DIR)/stub.sh" "$(OUTPUT_JAR)" > "$@"
	chmod 755 "$@"

$(DIST_DIR)/pumpkinspice2html.bat: $(PUMPKINSPICE2HTML_RESOURCE_DIR)/stub.bat $(OUTPUT_JAR)
	cat "$(PUMPKINSPICE2HTML_RESOURCE_DIR)/stub.bat" "$(OUTPUT_JAR)" > "$@"

run-tests.html: $(TEST_RESOURCES) $(JAVA_BUILD_CLASSES) | $(DIST_DIR)
	$(JAVA) -classpath "$(BUILD_RESOURCE_DIR)$(PATH_SEPARATOR)$(PUMPKINSPICE2HTML_BUILD_DIR)" com.nicknassar.pumpkinspice.Builder --title "Pumpkin Spice Tests" --javascript $(TEST_BUILD_DIR)/run_tests.js --nocode "$(DIST_DIR)/run-tests.html"

run_tests.js: $(TEST_SOURCES) $(JAVA_TOOLS_CLASSES) | $(TEST_BUILD_DIR)
	$(JAVA) -classpath "$(TOOLS_BUILD_DIR)" com.nicknassar.pumpkinspice.TemplateFiller --path "$(TEST_SOURCE_DIR)$(PATH_SEPARATOR)$(JAVASCRIPT_SOURCE_DIR)" $< "$(TEST_BUILD_DIR)/$@"

com/nicknassar/pumpkinspice/Builder.class: com/nicknassar/pumpkinspice/Builder.java | $(PUMPKINSPICE2HTML_BUILD_DIR)
	$(JAVAC) -d $(PUMPKINSPICE2HTML_BUILD_DIR) $<
com/nicknassar/pumpkinspice/TemplateFiller.class: com/nicknassar/pumpkinspice/TemplateFiller.java | $(TOOLS_BUILD_DIR)
	$(JAVAC) -d $(TOOLS_BUILD_DIR) $<

pumpkinspice.js: $(JAVASCRIPT_SOURCES) $(JAVA_TOOLS_CLASSES) | $(BUILD_RESOURCE_DIR)
	$(JAVA) -classpath "$(TOOLS_BUILD_DIR)" com.nicknassar.pumpkinspice.TemplateFiller $< "$(BUILD_RESOURCE_DIR)/$@"

pumpkinspice.optimized.js: pumpkinspice.js | $(BUILD_RESOURCE_DIR) closure_compiler
	$(JAVA) -jar $(CLOSURE_COMPILER_JAR) --compilation_level ADVANCED_OPTIMIZATIONS --js "$(BUILD_RESOURCE_DIR)/$(notdir $<)" --js_output_file "$(BUILD_RESOURCE_DIR)/$@"

%.html.template: $(RESOURCE_DIR)/%.html.template | $(BUILD_RESOURCE_DIR)
	cp $< "$(BUILD_RESOURCE_DIR)/$@"

%.html: %.pumpkinspice $(JAVA_BUILD_CLASSES) $(OPTIMIZED_RESOURCES)
	$(JAVA) -classpath "$(BUILD_RESOURCE_DIR)$(PATH_SEPARATOR)$(PUMPKINSPICE2HTML_BUILD_DIR)" com.nicknassar.pumpkinspice.Builder $<

%.debug.html: %.pumpkinspice $(JAVA_BUILD_CLASSES) $(DEBUG_RESOURCES)
	$(JAVA) -classpath "$(BUILD_RESOURCE_DIR)$(PATH_SEPARATOR)$(PUMPKINSPICE2HTML_BUILD_DIR)" com.nicknassar.pumpkinspice.Builder --debug $<

$(OUTPUT_JAR): $(DEBUG_RESOURCES) $(OPTIMIZED_RESOURCES) com/nicknassar/pumpkinspice/Builder.class | $(DIST_DIR)
	$(JAR) cfe $@ com.nicknassar.pumpkinspice.Builder -C $(PUMPKINSPICE2HTML_BUILD_DIR) . -C $(BUILD_RESOURCE_DIR) .
