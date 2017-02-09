#
# Directories
#
ROOT_SLASH	:= $(dir $(realpath $(firstword $(MAKEFILE_LIST))))
ROOT		:= $(patsubst %/,%,$(ROOT_SLASH))
NODE_MODULES	:= $(ROOT)/node_modules
NODE_BIN	:= $(NODE_MODULES)/.bin
TOOLS		:= $(ROOT)/tools
GITHOOKS_SRC	:= $(TOOLS)/githooks
GITHOOKS_DEST	:= $(ROOT)/.git/hooks


#
# Tools and binaries
#
NPM		:= npm
ESLINT		:= $(NODE_BIN)/eslint
JSCS		:= $(NODE_BIN)/jscs
MOCHA		:= $(NODE_BIN)/mocha
_MOCHA		:= $(NODE_BIN)/_mocha
ISTANBUL	:= $(NODE_BIN)/istanbul
COVERALLS	:= $(NODE_BIN)/coveralls
NSP		:= $(NODE_BIN)/nsp
NSP_BADGE	:= $(TOOLS)/nspBadge.js


#
# Files
#
PACKAGE_JSON	:= $(ROOT)/package.json
LIB_FILES	:= $(ROOT)/lib
TEST_FILES	:= $(ROOT)/test
COVERAGE_FILES	:= $(ROOT)/coverage
LCOV		:= $(ROOT)/coverage/lcov.info
SHRINKWRAP	:= $(ROOT)/npm-shrinkwrap.json
GITHOOKS	:= $(wildcard $(GITHOOKS_SRC)/*)
SRCS		:= $(shell find $(LIB_FILES) $(TEST_FILES) -name '*.js' -type f)


#
# Targets
#

$(NODE_MODULES): $(PACKAGE_JSON) ## Install node_modules
	$(NPM) install
	@touch $(NODE_MODULES)


.PHONY: all
all: clean node_modules lint codestyle test


.PHONY: githooks
githooks: $(GITHOOKS)## Symlink githooks
	@$(foreach hook,\
		$(GITHOOKS),\
		ln -sf $(hook) $(GITHOOKS_DEST)/$(hook##*/);\
	)


.PHONY: lint
lint: $(NODE_MODULES) $(ESLINT) $(SRCS)
	@$(ESLINT) $(SRCS)


.PHONY: nsp
nsp: $(NODE_MODULES) $(NSP)
ifeq ($(wildcard $(SHRINKWRAP)),)
	@$(NPM) shrinkwrap --dev
	@($(NSP) check) | $(NSP_BADGE)
	@rm $(SHRINKWRAP)
else
	@($(NSP) check) | $(NSP_BADGE)
endif


.PHONY: codestyle
codestyle: $(NODE_MODULES) $(JSCS) $(SRCS)
	@$(JSCS) $(SRCS)


.PHONY: codestyle-fix
codestyle-fix: $(NODE_MODULES) $(JSCS) $(SRCS)
	@$(JSCS) $(SRCS) --fix


.PHONY: prepush
prepush: $(NODE_MODULES) lint codestyle test nsp


.PHONY: test
test: $(NODE_MODULES) $(MOCHA) $(SRCS)
	@$(MOCHA) -R spec --full-trace


.PHONY: coverage
coverage: $(NODE_MODULES) $(ISTANBUL) $(SRCS)
	@$(ISTANBUL) cover $(_MOCHA) --report lcovonly -- -R spec


.PHONY: report-coverage
report-coverage: coverage
	@cat $(LCOV) | $(COVERALLS)


.PHONY: clean-coverage
clean-coverage:
	@rm -rf $(COVERAGE_FILES)


.PHONY: clean
clean: clean-coverage
	@rm -rf $(NODE_MODULES)


#
## Debug -- print out a a variable via `make print-FOO`
#
print-%  : ; @echo $* = $($*)
