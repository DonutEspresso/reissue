#
# Directories
#
ROOT		:= $(shell pwd)
NODE_MODULES	:= $(ROOT)/node_modules
NODE_BIN	:= $(NODE_MODULES)/.bin
TOOLS		:= $(ROOT)/tools
GITHOOKS_SRC	:= $(TOOLS)/githooks
GITHOOKS_DEST	:= $(ROOT)/.git/hooks


#
# Tools and binaries
#
ESLINT		:= $(NODE_BIN)/eslint
JSCS		:= $(NODE_BIN)/jscs
MOCHA		:= $(NODE_BIN)/mocha
_MOCHA		:= $(NODE_BIN)/_mocha
ISTANBUL	:= $(NODE_BIN)/istanbul
COVERALLS	:= $(NODE_BIN)/coveralls
NSP		:= $(NODE_BIN)/nsp
NPM		:= npm
NSP_BADGE	:= $(TOOLS)/nspBadge.js


#
# Files
#
GITHOOKS	:= $(shell find $(GITHOOKS_SRC) -type f -exec basename {} \;)
LIB_FILES	:= $(ROOT)/lib
TEST_FILES	:= $(ROOT)/test
COVERAGE_FILES	:= $(ROOT)/coverage
LCOV		:= $(ROOT)/coverage/lcov.info
SHRINKWRAP	:= $(ROOT)/npm-shrinkwrap.json
SRCS		:= $(shell find $(LIB_FILES) $(TEST_FILES) -name '*.js' -type f)

#
# Targets
#

.PHONY: all
all: clean node_modules lint codestyle test


node_modules: package.json
	$(NPM) install
	@touch $(NODE_MODULES)


.PHONY: githooks
githooks:
	@for hook in $(GITHOOKS_SRC)/*; do ln -sf $${hook} $(GITHOOKS_DEST)/$${hook##*/}; done


.PHONY: lint
lint: node_modules $(ESLINT) $(SRCS)
	@$(ESLINT) $(SRCS)


# make nsp always pass
.PHONY: nsp
nsp: node_modules $(NSP)
	$(NPM) shrinkwrap --dev
	@($(NSP) check) | $(NSP_BADGE)
	@rm $(SHRINKWRAP)


.PHONY: codestyle
codestyle: node_modules $(JSCS) $(SRCS)
	@$(JSCS) $(SRCS)


.PHONY: codestyle-fix
codestyle-fix: node_modules $(JSCS) $(SRCS)
	@$(JSCS) $(SRCS) --fix


.PHONY: prepush
prepush: node_modules lint codestyle test nsp


.PHONY: test
test: node_modules $(MOCHA) $(SRCS)
	@$(MOCHA) -R spec --full-trace


.PHONY: coverage
coverage: node_modules $(ISTANBUL) $(SRCS)
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
