.PHONY: build dist
.DEFAULT_GOAL := help

############## Vars that shouldn't be edited ##############
NODE_MODULES           ?= "./node_modules"
NODE_MODULES_BIN       ?= "${NODE_MODULES}/.bin"

rwildcard=$(wildcard $1$2) $(foreach d,$(wildcard $1*),$(call rwildcard,$d/,$2))

FILES_TO_FORMAT        :="$(call rwildcard,test/,*.js) $(wildcard ./*.js)"

############## HELP ##############

#COLORS
RED    := $(shell tput -Txterm setaf 1)
GREEN  := $(shell tput -Txterm setaf 2)
WHITE  := $(shell tput -Txterm setaf 7)
YELLOW := $(shell tput -Txterm setaf 3)
RESET  := $(shell tput -Txterm sgr0)

# Add the following 'help' target to your Makefile
# And add help text after each target name starting with '\#\#'
# A category can be added with @category
HELP_HELPER = \
    %help; \
    while(<>) { push @{$$help{$$2 // 'options'}}, [$$1, $$3] if /^([a-zA-Z\-\%]+)\s*:.*\#\#(?:@([a-zA-Z\-\%]+))?\s(.*)$$/ }; \
    print "usage: make [target]\n\n"; \
    for (sort keys %help) { \
    print "${WHITE}$$_:${RESET}\n"; \
    for (@{$$help{$$_}}) { \
    $$sep = " " x (32 - length $$_->[0]); \
    print "  ${YELLOW}$$_->[0]${RESET}$$sep${GREEN}$$_->[1]${RESET}\n"; \
    }; \
    print "\n"; }

help: ##prints help
	@perl -e '$(HELP_HELPER)' $(MAKEFILE_LIST)

test: test-format lint test-unit ##@test run all test suite

format: ##@test run prettier
	@echo "${YELLOW} Running prettier ${RESET}"
	@echo ${FILES_TO_FORMAT} | xargs -n 1 ${NODE_MODULES_BIN}/prettier --print-width 140 --tab-width=4 --single-quote --bracket-spacing --color --write 1> /dev/null

test-format: ##@test run prettier to check that all the files were formatted
	@echo "${YELLOW} Checking if code was formatted with prettier ${RESET}"
	@echo ${FILES_TO_FORMAT} | xargs -n 1 /bin/sh -c 'cat $$0 | md5'
	@echo ${FILES_TO_FORMAT} | xargs -n 1 /bin/sh -c './node_modules/.bin/prettier --print-width 140 --tab-width=4 --single-quote --bracket-spacing --color $$0 | md5'

	@#CHECKSUM_BEFORE=`echo ${FILES_TO_FORMAT} | xargs -n 1 /bin/sh -c 'cat $$0 | md5'`; \
	 #CHECKSUM_AFTER=`echo ${FILES_TO_FORMAT} | xargs -n 1 /bin/sh -c './node_modules/.bin/prettier --print-width 140 --tab-width=4 --single-quote --bracket-spacing --color $$0 | md5' | md5`; \
	 #echo $${CHECKSUM_BEFORE}; \
	 #echo $${CHECKSUM_AFTER}; \
	 #if [[ "$${CHECKSUM_BEFORE}" != "$${CHECKSUM_AFTER}" ]]; then echo "${RED} Error: Code was not formatted with prettier ${RESET}";  exit -1; fi;

lint: ##@test run eslint
	@echo "${YELLOW} Running eslint ${RESET}"
	@${NODE_MODULES_BIN}/eslint .

test-unit: ##@test run unit tests
	@echo "${YELLOW} Running unit tests${RESET}"
	@${NODE_MODULES_BIN}/ava

test-unit-cover: ##@test run unit test with code coverage report
	@${NODE_MODULES_BIN}/nyc make test-unit

############## RELEASE ##############
changelog: ##@release generates changelog
	@echo "${YELLOW}generating changelog${RESET}"
	@"${NODE_MODULES_BIN}/git-changelog" -t false

update-package-version: ##@release updates version in package.json
	@echo "${YELLOW}updating package.json version${RESET}"
	@npm version --silent --no-git-tag-version "${RELEASE_VERSION}"

release: ##@release generates a new release
	@echo "${YELLOW}building release ${RELEASE_VERSION}${RESET}"
	@-git stash
	@make update-package-version
	@make changelog
	@git add package.json CHANGELOG.md
	@git commit -m "chore(v${RELEASE_VERSION}): bump version to ${RELEASE_VERSION}"
	@git tag -a "v${RELEASE_VERSION}" -m "version ${RELEASE_VERSION}"
	@git push origin v${RELEASE_VERSION}