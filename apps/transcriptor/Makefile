VENV_DIR := .venv

ifeq ($(OS),Windows_NT)
	PYTHON := python
	VENV_PYTHON := $(VENV_DIR)/Scripts/python.exe
else
	PYTHON := python3
	VENV_PYTHON := $(VENV_DIR)/bin/python
endif

.PHONY: up venv install run clean

up: install run

venv: $(VENV_PYTHON)

$(VENV_PYTHON):
	$(PYTHON) -m venv $(VENV_DIR)

install: venv requirements.txt
	$(VENV_PYTHON) -m pip install --upgrade pip
	$(VENV_PYTHON) -m pip install -r requirements.txt

run: venv
	$(VENV_PYTHON) main.py

clean:
	rm -rf $(VENV_DIR)
